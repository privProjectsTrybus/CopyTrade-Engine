// src/lib/exchange/bybit.ts
// Bybit V5 Unified — browser-side client.
// All requests signed via Web Crypto and sent directly from the browser.

import { hmacSha256 } from "./signing";
import type {
  ExchangeClient, ExchangeName, AccountInfo, Balance,
  Position, PlaceOrderParams, OrderResult, PermissionCheck, Credentials,
} from "./types";

const BASE = "https://api.bybit.com";
const RECV_WINDOW = "5000";

export class BybitClient implements ExchangeClient {
  readonly exchange: ExchangeName = "BYBIT";
  constructor(private readonly creds: Credentials) {}

  private async signedHeaders(timestamp: string, queryString: string): Promise<Record<string, string>> {
    const signStr = `${timestamp}${this.creds.apiKey}${RECV_WINDOW}${queryString}`;
    const signature = await hmacSha256(this.creds.apiSecret, signStr);
    return {
      "X-BAPI-API-KEY": this.creds.apiKey,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": RECV_WINDOW,
      "X-BAPI-SIGN": signature,
      "Content-Type": "application/json",
    };
  }

  private async get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString();
    const timestamp = String(Date.now());
    const headers = await this.signedHeaders(timestamp, qs);
    const res = await fetch(`${BASE}${path}?${qs}`, { headers });
    if (!res.ok) throw new Error(`Bybit ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.retCode !== 0) throw new Error(`Bybit error ${json.retCode}: ${json.retMsg}`);
    return json.result as T;
  }

  private async post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
    const timestamp = String(Date.now());
    const bodyStr = JSON.stringify(body);
    const headers = await this.signedHeaders(timestamp, bodyStr);
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: bodyStr });
    if (!res.ok) throw new Error(`Bybit ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.retCode !== 0) throw new Error(`Bybit error ${json.retCode}: ${json.retMsg}`);
    return json.result as T;
  }

  async ping(): Promise<boolean> {
    try { return (await fetch(`${BASE}/v5/market/time`)).ok; } catch { return false; }
  }

  async getAccountInfo(): Promise<AccountInfo> {
    const raw = await this.get<any>("/v5/account/wallet-balance", { accountType: "UNIFIED" });
    const account = raw.list?.[0] ?? {};
    const coins: any[] = account.coin ?? [];
    const usdtCoin = coins.find((c: any) => c.coin === "USDT");
    const walletBalance = parseFloat(account.totalWalletBalance ?? "0");
    const marginBalance = parseFloat(account.totalMarginBalance ?? walletBalance.toString());
    const availableBalance = parseFloat(account.totalAvailableBalance ?? "0");
    const unrealizedPnl = parseFloat(account.totalPerpUPL ?? "0");
    const maintMargin = parseFloat(account.totalMaintenanceMargin ?? "0");
    const balances: Balance[] = coins
      .filter((c: any) => parseFloat(c.walletBalance ?? "0") > 0)
      .map((c: any) => ({
        asset: c.coin,
        free: parseFloat(c.availableToWithdraw ?? c.walletBalance ?? "0"),
        locked: parseFloat(c.locked ?? "0"),
        total: parseFloat(c.walletBalance ?? "0"),
      }));
    return {
      totalWalletBalance: walletBalance,
      availableBalance,
      totalUnrealizedPnl: unrealizedPnl,
      marginBalance,
      marginRatio: marginBalance > 0 ? maintMargin / marginBalance : 0,
      canTrade: true,
      canWithdraw: false, // permission check done separately
      balances,
    };
  }

  async getPositions(): Promise<Position[]> {
    const raw = await this.get<any>("/v5/position/list", { category: "linear", settleCoin: "USDT" });
    return (raw.list ?? [])
      .filter((p: any) => parseFloat(p.size) > 0)
      .map((p: any) => ({
        symbol: p.symbol,
        side: p.side === "Buy" ? "LONG" : "SHORT",
        size: parseFloat(p.size),
        entryPrice: parseFloat(p.avgPrice),
        markPrice: parseFloat(p.markPrice),
        leverage: parseFloat(p.leverage),
        unrealizedPnl: parseFloat(p.unrealisedPnl),
        liquidationPrice: parseFloat(p.liqPrice ?? "0"),
        marginType: p.tradeMode === 0 ? "cross" : "isolated",
      } as Position));
  }

  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    const body: Record<string, unknown> = {
      category: "linear",
      symbol: params.symbol,
      side: params.side === "BUY" ? "Buy" : "Sell",
      orderType: params.type === "MARKET" ? "Market" : "Limit",
      qty: String(params.quantity ?? 0),
    };
    if (params.price !== undefined) body.price = String(params.price);
    if (params.stopPrice !== undefined) body.triggerPrice = String(params.stopPrice);
    if (params.reduceOnly) body.reduceOnly = true;
    if (params.timeInForce) body.timeInForce = params.timeInForce;
    const raw = await this.post<any>("/v5/order/create", body);
    return {
      orderId: raw.orderId,
      symbol: params.symbol,
      status: "NEW",
      executedQty: 0,
      avgPrice: 0,
      side: params.side,
      type: params.type,
      createdAt: Date.now(),
    };
  }

  async cancelOrder(symbol: string, orderId: string): Promise<void> {
    await this.post<unknown>("/v5/order/cancel", { category: "linear", symbol, orderId });
  }

  async setLeverage(symbol: string, leverage: number): Promise<void> {
    await this.post<unknown>("/v5/position/set-leverage", {
      category: "linear", symbol,
      buyLeverage: String(leverage), sellLeverage: String(leverage),
    });
  }

  async checkPermissions(): Promise<PermissionCheck> {
    const raw = await this.get<any>("/v5/user/query-api");
    const perms: string[] = raw.permissions?.ContractTrade ?? [];
    return {
      canTrade: perms.includes("Order"),
      canRead: true,
      canWithdraw: (raw.permissions?.Withdraw ?? []).length > 0,
    };
  }
}
