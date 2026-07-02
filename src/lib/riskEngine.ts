// src/lib/riskEngine.ts
// ----------------------------------------------------------------
// Risk Management Engine.
// This is the absolute gatekeeper for all trade execution.
// No order reaches an exchange without passing every check here.
//
// Runs client-side (browser) so it has instant access to the
// user's current account state without a server round-trip.
// ----------------------------------------------------------------

export interface RiskLimits {
  maxAccountExposurePct: number;  // % of wallet in open positions
  maxTradeRiskPct: number;        // % of wallet at risk per single trade
  maxDailyLossPct: number;
  maxWeeklyLossPct: number;
  maxMonthlyLossPct: number;
  maxOpenPositions: number;
  isPaused: boolean;
  pausedReason?: string | null;
}

export interface RiskSnapshot {
  walletBalance: number;         // USDT
  currentExposureValue: number;  // total notional of open positions in USDT
  openPositionCount: number;
  realizedPnlToday: number;      // negative = loss; USDT
  realizedPnlThisWeek: number;
  realizedPnlThisMonth: number;
}

export interface TradeProposal {
  symbol: string;
  notionalValue: number;         // size * entryPrice
  stopLossDistance: number;      // abs(entryPrice - stopLoss) / entryPrice (ratio)
  leverage: number;
}

export type RiskCheckOutcome =
  | { allowed: true }
  | { allowed: false; reason: string; triggerPause: boolean };

export class RiskEngine {
  constructor(
    private limits: RiskLimits,
    private snapshot: RiskSnapshot
  ) {}

  /** Returns updated engine with fresh snapshot (call before each trade). */
  withSnapshot(snapshot: RiskSnapshot): RiskEngine {
    return new RiskEngine(this.limits, snapshot);
  }

  /** Master check — runs every sub-check in order. First failure blocks the trade. */
  check(proposal: TradeProposal): RiskCheckOutcome {
    if (this.limits.isPaused) {
      return {
        allowed: false,
        reason: `Engine is paused: ${this.limits.pausedReason ?? "manual pause"}`,
        triggerPause: false,
      };
    }

    const checks: RiskCheckOutcome[] = [
      this.checkDailyLoss(),
      this.checkWeeklyLoss(),
      this.checkMonthlyLoss(),
      this.checkOpenPositionCount(),
      this.checkAccountExposure(proposal.notionalValue),
      this.checkTradeRisk(proposal),
      this.checkLeverage(proposal.leverage),
    ];

    for (const outcome of checks) {
      if (!outcome.allowed) return outcome;
    }

    return { allowed: true };
  }

  private checkDailyLoss(): RiskCheckOutcome {
    const { walletBalance } = this.snapshot;
    if (walletBalance <= 0) return { allowed: true };
    const lossRatio = Math.abs(Math.min(0, this.snapshot.realizedPnlToday)) / walletBalance * 100;
    if (lossRatio >= this.limits.maxDailyLossPct) {
      return {
        allowed: false,
        reason: `Daily loss limit reached (${lossRatio.toFixed(2)}% of ${this.limits.maxDailyLossPct}% limit). Engine paused until tomorrow.`,
        triggerPause: true,
      };
    }
    return { allowed: true };
  }

  private checkWeeklyLoss(): RiskCheckOutcome {
    const { walletBalance } = this.snapshot;
    if (walletBalance <= 0) return { allowed: true };
    const lossRatio = Math.abs(Math.min(0, this.snapshot.realizedPnlThisWeek)) / walletBalance * 100;
    if (lossRatio >= this.limits.maxWeeklyLossPct) {
      return {
        allowed: false,
        reason: `Weekly loss limit reached (${lossRatio.toFixed(2)}% of ${this.limits.maxWeeklyLossPct}% limit).`,
        triggerPause: true,
      };
    }
    return { allowed: true };
  }

  private checkMonthlyLoss(): RiskCheckOutcome {
    const { walletBalance } = this.snapshot;
    if (walletBalance <= 0) return { allowed: true };
    const lossRatio = Math.abs(Math.min(0, this.snapshot.realizedPnlThisMonth)) / walletBalance * 100;
    if (lossRatio >= this.limits.maxMonthlyLossPct) {
      return {
        allowed: false,
        reason: `Monthly loss limit reached (${lossRatio.toFixed(2)}%).`,
        triggerPause: true,
      };
    }
    return { allowed: true };
  }

  private checkOpenPositionCount(): RiskCheckOutcome {
    if (this.snapshot.openPositionCount >= this.limits.maxOpenPositions) {
      return {
        allowed: false,
        reason: `Max open positions limit (${this.limits.maxOpenPositions}) reached.`,
        triggerPause: false,
      };
    }
    return { allowed: true };
  }

  private checkAccountExposure(proposalNotional: number): RiskCheckOutcome {
    const { walletBalance, currentExposureValue } = this.snapshot;
    if (walletBalance <= 0) return { allowed: true };
    const newExposurePct = ((currentExposureValue + proposalNotional) / walletBalance) * 100;
    if (newExposurePct > this.limits.maxAccountExposurePct) {
      return {
        allowed: false,
        reason: `Trade would bring total account exposure to ${newExposurePct.toFixed(1)}%, exceeding the ${this.limits.maxAccountExposurePct}% limit.`,
        triggerPause: false,
      };
    }
    return { allowed: true };
  }

  private checkTradeRisk(proposal: TradeProposal): RiskCheckOutcome {
    // Risk per trade = (notional / leverage) * stopLossDistance
    const margin = proposal.notionalValue / Math.max(1, proposal.leverage);
    const riskAmount = margin * proposal.stopLossDistance;
    const riskPct = (riskAmount / Math.max(1, this.snapshot.walletBalance)) * 100;
    if (riskPct > this.limits.maxTradeRiskPct) {
      return {
        allowed: false,
        reason: `Trade risk ${riskPct.toFixed(2)}% exceeds per-trade limit of ${this.limits.maxTradeRiskPct}%.`,
        triggerPause: false,
      };
    }
    return { allowed: true };
  }

  private checkLeverage(leverage: number): RiskCheckOutcome {
    // Hard cap: never allow leverage > 20 regardless of user settings
    const HARD_CAP = 20;
    if (leverage > HARD_CAP) {
      return {
        allowed: false,
        reason: `Leverage ${leverage}x exceeds the platform hard cap of ${HARD_CAP}x.`,
        triggerPause: false,
      };
    }
    return { allowed: true };
  }

  /** Calculate the correctly-sized position given the user's allocation and sizing mode. */
  static calculatePositionSize(opts: {
    walletBalance: number;
    traderPositionSize: number;    // base qty
    traderNotional: number;        // traderSize * traderEntryPrice
    traderWalletBalance: number;   // notional estimate of trader's wallet (for SCALED_MIRROR)
    allocationValue: number;
    allocationType: "FIXED_AMOUNT" | "PERCENTAGE_OF_ACCOUNT";
    sizingMode: "EXACT_MIRROR" | "SCALED_MIRROR" | "FIXED_DOLLAR";
    riskMultiplier: number;
    entryPrice: number;
    maxPositionSize?: number | null;
    maxLeverage?: number | null;
    leverage: number;
  }): { size: number; clampedByMax: boolean } {
    const {
      walletBalance, traderPositionSize, traderNotional, traderWalletBalance,
      allocationValue, allocationType, sizingMode, riskMultiplier,
      entryPrice, maxPositionSize, leverage,
    } = opts;

    const allocatedCapital =
      allocationType === "PERCENTAGE_OF_ACCOUNT"
        ? (allocationValue / 100) * walletBalance
        : allocationValue;

    let notional: number;

    switch (sizingMode) {
      case "EXACT_MIRROR":
        notional = traderNotional * riskMultiplier;
        break;

      case "SCALED_MIRROR":
        // Scale the trader's position relative to their wallet proportionally to ours
        const traderRatio = traderWalletBalance > 0 ? traderNotional / traderWalletBalance : 0;
        notional = traderRatio * allocatedCapital * riskMultiplier;
        break;

      case "FIXED_DOLLAR":
        // allocatedCapital IS the target notional (pre-leverage)
        notional = allocatedCapital * leverage * riskMultiplier;
        break;

      default:
        notional = 0;
    }

    let size = entryPrice > 0 ? notional / entryPrice : 0;

    const clampedByMax = maxPositionSize != null && size > maxPositionSize;
    if (clampedByMax) size = maxPositionSize!;

    return { size: Math.max(0, size), clampedByMax };
  }
}
