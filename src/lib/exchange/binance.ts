// src/lib/exchange/binance.ts
// Binance USDT-M Futures — browser-side client.
// All requests signed via Web Crypto and sent directly from the browser.

import { buildSignedQuery } from "./signing";
import type {
  ExchangeClient, ExchangeName, AccountInfo, Balance,
  Position, PlaceOrderParams, OrderResult, PermissionCheck, Credentials,
} from "./types";

const BASE = "https://fapi.binance.com";

export class BinanceClient implements ExchangeClient {
  readonly exchange: ExchangeName = "BINANCE";
  constructor(private readonly creds: Credentials) {}

  private get headers() {
    return { "X-MBX-APIKEY": this.creds.apiKey, "Content-Type": "application/x-www-form-urlencoded" };
  }

  private async signedGet<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
    const qs = await buildSignedQuery({ ...params, timestamp: Date.now(), recvWindow: 5000 }, this.creds.apiSecret);
    const res = await fetch(`${BASE}${path}?${qs}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Binance ${res.status}: ${await res.text()}`);
    return res.json();
  }

  private async signedPost<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
    const body = await buildSignedQuery({ ...params, timestamp: Date.now(), recvWindow: 5000 }, this.creds.apiSecret);
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers: this.headers, body });
    if (!res.ok) throw new Error(`Binance ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async ping(): Promise<boolean> {
    try { return (await fetch(`${BASE}/fapi/v1/ping`)).ok; } catch { return false; }
  }

  async getAccountInfo(): Promise<AccountInfo> {
    const raw = await this.signedGet<any>("/fapi/v2/account");
    const walletBalance = parseFloat(raw.totalWalletBalance);
    const marginBalance = parseFloat(raw.totalMarginBalance);
    const balances: Balance[] = (raw.assets ?? [])
      .filter((a: any) => parseFloat(a.walletBalance) > 0)
      .map((a: any) => ({
        asset: a.asset,
        free: parseFloat(a.availableBalance),
        locked: parseFloat(a.walletBalance) - parseFloat(a.availableBalance),
        total: parseFloat(a.walletBalance),
      }));
    return {
      totalWalletBalance: walletBalance,
      availableBalance: parseFloat(raw.availableBalance),
      totalUnrealizedPnl: parseFloat(raw.totalUnrealizedProfit),
      marginBalance,
      marginRatio: marginBalance > 0 ? parseFloat(raw.totalMaintMargin) / marginBalance : 0,
      canTrade: raw.canTrade,
      canWithdraw: raw.canWithdraw,
      balances,
    };
  }

  async getPositions(): Promise<Position[]> {
    const raw = await this.signedGet<any[]>("/fapi/v2/positionRisk");
    return raw
      .filter((p) => Math.abs(parseFloat(p.positionAmt)) > 0)
      .map((p) => {
        const size = parseFloat(p.positionAmt);
        return {
          symbol: p.symbol,
          side: size > 0 ? "LONG" : "SHORT",
          size: Math.abs(size),
          entryPrice: parseFloat(p.entryPrice),
          markPrice: parseFloat(p.markPrice),
          leverage: parseFloat(p.leverage),
          unrealizedPnl: parseFloat(p.unrealizedProfit),
          liquidationPrice: parseFloat(p.liquidationPrice),
          marginType: p.marginType === "cross" ? "cross" : "isolated",
        } as Position;
      });
  }

  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    const body: Record<string, string | number | boolean> = {
      symbol: params.symbol, side: params.side, type: params.type,
    };
    if (params.quantity !== undefined) body.quantity = params.quantity;
    if (params.price !== undefined) body.price = params.price;
    if (params.stopPrice !== undefined) body.stopPrice = params.stopPrice;
    if (params.reduceOnly !== undefined) body.reduceOnly = params.reduceOnly;
    if (params.positionSide) body.positionSide = params.positionSide;
    if (params.timeInForce) body.timeInForce = params.timeInForce;
    const raw = await this.signedPost<any>("/fapi/v1/order", body);
    return {
      orderId: String(raw.orderId), symbol: raw.symbol, status: raw.status,
      executedQty: parseFloat(raw.executedQty), avgPrice: parseFloat(raw.avgPrice),
      side: raw.side, type: raw.type, createdAt: raw.time,
    };
  }

  async cancelOrder(symbol: string, orderId: string): Promise<void> {
    await this.signedPost<unknown>("/fapi/v1/order/cancel" as string, { symbol, orderId });
  }

  async setLeverage(symbol: string, leverage: number): Promise<void> {
    await this.signedPost<unknown>("/fapi/v1/leverage", { symbol, leverage });
  }

  async checkPermissions(): Promise<PermissionCheck> {
    const info = await this.getAccountInfo();
    return { canTrade: info.canTrade, canRead: true, canWithdraw: info.canWithdraw };
  }
}
