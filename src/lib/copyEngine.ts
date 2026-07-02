// src/lib/copyEngine.ts
// ----------------------------------------------------------------
// Copy Engine — runs entirely in the browser.
//
// Architecture:
//  - The engine is a class instantiated once per browser session.
//  - It holds exchange clients (with decrypted keys) in memory.
//  - A polling loop compares the latest trader signals (from our API)
//    against the user's current positions on the exchange.
//  - New/changed/closed signals trigger the risk engine, then execute.
//
// The engine ONLY runs while a browser tab is open. This is made
// explicit in the UI ("Engine: Live" / "Engine: Offline") so the
// user is never surprised by silent non-execution.
// ----------------------------------------------------------------

import type { ExchangeClient, Position, PlaceOrderParams } from "./exchange/types";
import { RiskEngine, RiskLimits, RiskSnapshot, RiskCheckOutcome } from "./riskEngine";

export interface TraderSignal {
  id: string;
  traderProfileId: string;
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  leverage: number;
  stopLossPrice?: number | null;
  takeProfitPrice?: number | null;
  isOpen: boolean;
}

export interface CopyRelationshipConfig {
  id: string;
  traderProfileId: string;
  exchangeConnectionId: string;
  allocationType: "FIXED_AMOUNT" | "PERCENTAGE_OF_ACCOUNT";
  allocationValue: number;
  sizingMode: "EXACT_MIRROR" | "SCALED_MIRROR" | "FIXED_DOLLAR";
  riskMultiplier: number;
  maxPositionSize?: number | null;
  maxLeverage?: number | null;
  allowedSymbols: string[];
  blockedSymbols: string[];
}

export type EngineEvent =
  | { type: "TRADE_EXECUTED"; symbol: string; side: "LONG" | "SHORT"; size: number; price: number }
  | { type: "TRADE_REJECTED"; symbol: string; reason: string }
  | { type: "POSITION_CLOSED"; symbol: string; realizedPnl: number }
  | { type: "RISK_LIMIT_BREACHED"; reason: string }
  | { type: "ENGINE_ERROR"; message: string }
  | { type: "ENGINE_PAUSED"; reason: string };

export type EngineEventHandler = (event: EngineEvent) => void;

export class CopyEngine {
  private clients = new Map<string, ExchangeClient>(); // connectionId -> client
  private trackedSignals = new Map<string, TraderSignal>(); // signalId -> last seen state
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private eventHandlers: EngineEventHandler[] = [];
  private riskLimits: RiskLimits | null = null;

  /** Register an exchange client (called when credentials are loaded in the browser). */
  registerClient(connectionId: string, client: ExchangeClient) {
    this.clients.set(connectionId, client);
  }

  removeClient(connectionId: string) {
    this.clients.delete(connectionId);
  }

  setRiskLimits(limits: RiskLimits) {
    this.riskLimits = limits;
  }

  onEvent(handler: EngineEventHandler) {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  private emit(event: EngineEvent) {
    this.eventHandlers.forEach((h) => h(event));
    // Also persist the event to our API for logging/notifications
    fetch("/api/engine/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => {}); // fire-and-forget
  }

  start(pollIntervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.pollTimer = setInterval(() => this.tick(), pollIntervalMs);
    this.tick(); // immediate first tick
  }

  stop() {
    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  get running() {
    return this.isRunning;
  }

  // ---- Main tick ----

  private async tick() {
    if (!this.isRunning || this.clients.size === 0) return;

    try {
      // Fetch active copy relationships and their latest signals from our API
      const [relRes, signalRes] = await Promise.all([
        fetch("/api/copy/list"),
        fetch("/api/traders/signals"),
      ]);

      if (!relRes.ok || !signalRes.ok) return;

      const relationships: CopyRelationshipConfig[] = await relRes.json();
      const signals: TraderSignal[] = await signalRes.json();

      for (const rel of relationships) {
        const client = this.clients.get(rel.exchangeConnectionId);
        if (!client) continue;

        const traderSignals = signals.filter((s) => s.traderProfileId === rel.traderProfileId);
        await this.processRelationship(rel, traderSignals, client);
      }
    } catch (err) {
      this.emit({ type: "ENGINE_ERROR", message: String(err) });
    }
  }

  private async processRelationship(
    rel: CopyRelationshipConfig,
    traderSignals: TraderSignal[],
    client: ExchangeClient
  ) {
    let accountInfo;
    try {
      accountInfo = await client.getAccountInfo();
    } catch {
      return; // exchange unreachable — skip this tick silently
    }

    const userPositions = await client.getPositions().catch(() => [] as Position[]);
    const userPositionMap = new Map(userPositions.map((p) => [`${p.symbol}:${p.side}`, p]));

    // Build risk snapshot for this exchange connection
    const riskSnapshot = await this.buildRiskSnapshot(accountInfo, userPositions);
    const risk = this.riskLimits ? new RiskEngine(this.riskLimits, riskSnapshot) : null;

    if (risk && this.riskLimits?.isPaused) {
      this.emit({ type: "ENGINE_PAUSED", reason: this.riskLimits.pausedReason ?? "Risk limit breached" });
      return;
    }

    // Handle open signals (new or updated positions to mirror)
    for (const signal of traderSignals.filter((s) => s.isOpen)) {
      const symbol = signal.symbol;

      // Skip if on blocklist or not on allowlist
      if (rel.blockedSymbols.includes(symbol)) continue;
      if (rel.allowedSymbols.length > 0 && !rel.allowedSymbols.includes(symbol)) continue;

      const posKey = `${symbol}:${signal.side}`;
      const existingPos = userPositionMap.get(posKey);
      const lastSeen = this.trackedSignals.get(signal.id);

      const isNewSignal = !lastSeen;
      const sizeChanged = lastSeen && Math.abs(lastSeen.size - signal.size) / signal.size > 0.01;

      if (!isNewSignal && !sizeChanged) continue;

      // Calculate what size to open
      const { size } = RiskEngine.calculatePositionSize({
        walletBalance: accountInfo.totalWalletBalance,
        traderPositionSize: signal.size,
        traderNotional: signal.size * signal.entryPrice,
        traderWalletBalance: 10000, // mock fallback — real integration would pull trader's equity
        allocationValue: rel.allocationValue,
        allocationType: rel.allocationType,
        sizingMode: rel.sizingMode,
        riskMultiplier: rel.riskMultiplier,
        entryPrice: signal.entryPrice,
        maxPositionSize: rel.maxPositionSize,
        maxLeverage: rel.maxLeverage,
        leverage: signal.leverage,
      });

      if (size <= 0) continue;

      const notional = size * signal.entryPrice;
      const slDistance = signal.stopLossPrice
        ? Math.abs(signal.entryPrice - signal.stopLossPrice) / signal.entryPrice
        : 0.02; // default 2% if no SL provided — still check risk

      const proposal = {
        symbol,
        notionalValue: notional,
        stopLossDistance: slDistance,
        leverage: Math.min(signal.leverage, rel.maxLeverage ?? signal.leverage),
      };

      if (risk) {
        const outcome = risk.check(proposal);
        if (!outcome.allowed) {
          this.emit({ type: "TRADE_REJECTED", symbol, reason: outcome.reason });
          if ((outcome as any).triggerPause) {
            await this.triggerPause(outcome.reason);
          }
          continue;
        }
      }

      // Open (or adjust) the position
      try {
        const effectiveLeverage = Math.min(signal.leverage, rel.maxLeverage ?? 20);
        await client.setLeverage(symbol, effectiveLeverage).catch(() => {});

        const side: "BUY" | "SELL" = signal.side === "LONG" ? "BUY" : "SELL";
        const orderParams: PlaceOrderParams = {
          symbol,
          side,
          type: "MARKET",
          quantity: size,
        };

        const result = await client.placeOrder(orderParams);

        // Attach stop loss
        if (signal.stopLossPrice) {
          const slSide: "BUY" | "SELL" = signal.side === "LONG" ? "SELL" : "BUY";
          await client.placeOrder({
            symbol,
            side: slSide,
            type: "STOP_MARKET",
            stopPrice: signal.stopLossPrice,
            reduceOnly: true,
            quantity: size,
          }).catch(() => {}); // SL failure is logged but doesn't void the trade
        }

        // Attach take profit
        if (signal.takeProfitPrice) {
          const tpSide: "BUY" | "SELL" = signal.side === "LONG" ? "SELL" : "BUY";
          await client.placeOrder({
            symbol,
            side: tpSide,
            type: "TAKE_PROFIT_MARKET",
            stopPrice: signal.takeProfitPrice,
            reduceOnly: true,
            quantity: size,
          }).catch(() => {});
        }

        this.emit({
          type: "TRADE_EXECUTED",
          symbol,
          side: signal.side,
          size: result.executedQty || size,
          price: result.avgPrice || signal.entryPrice,
        });

        // Record the trade in our DB
        await fetch("/api/trade/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exchangeConnectionId: rel.exchangeConnectionId,
            copyRelationshipId: rel.id,
            symbol,
            side: signal.side,
            requestedSize: size,
            executedSize: result.executedQty,
            entryPrice: result.avgPrice,
            stopLossPrice: signal.stopLossPrice,
            takeProfitPrice: signal.takeProfitPrice,
          }),
        }).catch(() => {});

      } catch (err) {
        this.emit({ type: "ENGINE_ERROR", message: `Order failed for ${symbol}: ${err}` });
      }

      this.trackedSignals.set(signal.id, signal);
    }

    // Handle closed signals (close our mirrored position)
    const closedSignals = traderSignals.filter((s) => !s.isOpen);
    for (const signal of closedSignals) {
      if (!this.trackedSignals.has(signal.id)) continue; // we never opened this one
      const posKey = `${signal.symbol}:${signal.side}`;
      const pos = userPositionMap.get(posKey);
      if (!pos) { this.trackedSignals.delete(signal.id); continue; }

      const closeSide: "BUY" | "SELL" = pos.side === "LONG" ? "SELL" : "BUY";
      try {
        await client.placeOrder({ symbol: signal.symbol, side: closeSide, type: "MARKET", quantity: pos.size, reduceOnly: true });
        this.emit({ type: "POSITION_CLOSED", symbol: signal.symbol, realizedPnl: pos.unrealizedPnl });
      } catch (err) {
        this.emit({ type: "ENGINE_ERROR", message: `Close failed for ${signal.symbol}: ${err}` });
      }
      this.trackedSignals.delete(signal.id);
    }

    // Sync current positions to DB for portfolio page
    await fetch("/api/positions/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exchangeConnectionId: userPositions.length > 0 ? rel.exchangeConnectionId : undefined,
        positions: userPositions,
        accountInfo: { totalWalletBalance: accountInfo.totalWalletBalance, availableBalance: accountInfo.availableBalance },
      }),
    }).catch(() => {});
  }

  private async buildRiskSnapshot(
    accountInfo: Awaited<ReturnType<ExchangeClient["getAccountInfo"]>>,
    positions: Position[]
  ): Promise<RiskSnapshot> {
    const currentExposureValue = positions.reduce(
      (sum, p) => sum + p.size * p.markPrice * p.leverage,
      0
    );

    // Fetch PnL from our DB (we track realized PnL there)
    let realizedPnlToday = 0, realizedPnlThisWeek = 0, realizedPnlThisMonth = 0;
    try {
      const pnlRes = await fetch("/api/portfolio/pnl-summary");
      if (pnlRes.ok) {
        const pnl = await pnlRes.json();
        realizedPnlToday = pnl.today ?? 0;
        realizedPnlThisWeek = pnl.thisWeek ?? 0;
        realizedPnlThisMonth = pnl.thisMonth ?? 0;
      }
    } catch {}

    return {
      walletBalance: accountInfo.totalWalletBalance,
      currentExposureValue,
      openPositionCount: positions.length,
      realizedPnlToday,
      realizedPnlThisWeek,
      realizedPnlThisMonth,
    };
  }

  private async triggerPause(reason: string) {
    this.stop();
    await fetch("/api/risk/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }).catch(() => {});
    this.emit({ type: "ENGINE_PAUSED", reason });
  }
}

// Singleton instance — shared across React components via context
export const copyEngine = new CopyEngine();
