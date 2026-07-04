// OKX V5 API — server-side and browser-side compatible.
// Signing: HMAC-SHA256 of (timestamp + method + path + body), base64-encoded.
import { hmacSha256 } from "./signing";
import type { ExchangeClient, ExchangeName, AccountInfo, Balance, Position, PlaceOrderParams, OrderResult, Credentials } from "./types";

const BASE = "https://www.okx.com";

export interface OkxCredentials extends Credentials {
  passphrase: string; // OKX requires a passphrase in addition to key+secret
}

async function okxSign(secret: string, timestamp: string, method: string, path: string, body = "") {
  const msg = `${timestamp}${method}${path}${body}`;
  const raw = await hmacSha256(secret, msg);
  // OKX needs base64, not hex — convert
  const bytes = raw.match(/.{2}/g)!.map(b => parseInt(b, 16));
  return btoa(String.fromCharCode(...bytes));
}

export class OkxClient implements ExchangeClient {
  readonly exchange: ExchangeName = "OKX" as any;
  private passphrase: string;

  constructor(private readonly creds: OkxCredentials) {
    this.passphrase = creds.passphrase;
  }

  private async headers(method: string, path: string, body = ""): Promise<Record<string, string>> {
    const ts = new Date().toISOString().replace(/\.\d{3}/, ".000"); // OKX format: 2024-01-01T00:00:00.000Z
    const sig = await okxSign(this.creds.apiSecret, ts, method, path, body);
    return {
      "OK-ACCESS-KEY": this.creds.apiKey,
      "OK-ACCESS-SIGN": sig,
      "OK-ACCESS-TIMESTAMP": ts,
      "OK-ACCESS-PASSPHRASE": this.passphrase,
      "Content-Type": "application/json",
    };
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : "";
    const fullPath = path + qs;
    const res = await fetch(`${BASE}${fullPath}`, { headers: await this.headers("GET", fullPath) });
    if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== "0") throw new Error(`OKX ${json.code}: ${json.msg}`);
    return json.data as T;
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const bodyStr = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers: await this.headers("POST", path, bodyStr), body: bodyStr });
    if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== "0") throw new Error(`OKX ${json.code}: ${json.msg}`);
    return json.data as T;
  }

  async ping(): Promise<boolean> {
    try { return (await fetch(`${BASE}/api/v5/public/time`)).ok; } catch { return false; }
  }

  async getAccountInfo(): Promise<AccountInfo> {
    const data = await this.get<any[]>("/api/v5/account/balance");
    const account = data[0] ?? {};
    const details: any[] = account.details ?? [];
    const totalEq = parseFloat(account.totalEq ?? "0");
    const adjEq = parseFloat(account.adjEq ?? String(totalEq));
    const mgnRatio = parseFloat(account.mgnRatio ?? "0");

    const balances: Balance[] = details
      .filter(d => parseFloat(d.eq ?? "0") > 0)
      .map(d => ({
        asset: d.ccy,
        free: parseFloat(d.availBal ?? "0"),
        locked: parseFloat(d.frozenBal ?? "0"),
        total: parseFloat(d.eq ?? "0"),
      }));

    return {
      totalWalletBalance: totalEq,
      availableBalance: adjEq,
      totalUnrealizedPnl: parseFloat(account.upl ?? "0"),
      marginBalance: adjEq,
      marginRatio: mgnRatio > 0 ? 1 / mgnRatio : 0, // OKX mgnRatio is inverse
      canTrade: true,
      canWithdraw: false,
      balances,
    };
  }

  async getPositions(): Promise<Position[]> {
    const data = await this.get<any[]>("/api/v5/account/positions", { instType: "SWAP" });
    return data
      .filter(p => parseFloat(p.pos ?? "0") !== 0)
      .map(p => ({
        symbol: p.instId.replace("-", "").replace("SWAP", "USDT"),
        side: p.posSide === "long" || (p.posSide === "net" && parseFloat(p.pos) > 0) ? "LONG" : "SHORT",
        size: Math.abs(parseFloat(p.pos ?? "0")),
        entryPrice: parseFloat(p.avgPx ?? "0"),
        markPrice: parseFloat(p.markPx ?? "0"),
        leverage: parseFloat(p.lever ?? "1"),
        unrealizedPnl: parseFloat(p.upl ?? "0"),
        liquidationPrice: parseFloat(p.liqPx ?? "0"),
        marginType: p.mgnMode === "cross" ? "cross" : "isolated",
      } as Position));
  }

  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    // Convert symbol from BTCUSDT to BTC-USDT-SWAP
    const instId = params.symbol.replace("USDT", "-USDT-SWAP");
    const body: Record<string, unknown> = {
      instId,
      tdMode: "cross",
      side: params.side === "BUY" ? "buy" : "sell",
      ordType: params.type === "MARKET" ? "market" : params.type === "LIMIT" ? "limit" : "conditional",
      sz: String(params.quantity ?? 0),
    };
    if (params.price) body.px = String(params.price);
    if (params.reduceOnly) body.reduceOnly = true;

    const data = await this.post<any[]>("/api/v5/trade/order", body);
    const order = data[0] ?? {};
    return {
      orderId: order.ordId ?? "",
      symbol: params.symbol,
      status: order.sCode === "0" ? "NEW" : "REJECTED",
      executedQty: 0,
      avgPrice: 0,
      side: params.side,
      type: params.type,
      createdAt: Date.now(),
    };
  }

  async cancelOrder(symbol: string, orderId: string): Promise<void> {
    const instId = symbol.replace("USDT", "-USDT-SWAP");
    await this.post<unknown>("/api/v5/trade/cancel-order", { instId, ordId: orderId });
  }

  async setLeverage(symbol: string, leverage: number): Promise<void> {
    const instId = symbol.replace("USDT", "-USDT-SWAP");
    await this.post<unknown>("/api/v5/account/set-leverage", { instId, lever: String(leverage), mgnMode: "cross" }).catch(() => {});
  }
}
