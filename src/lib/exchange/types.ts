// src/lib/exchange/types.ts
// ----------------------------------------------------------------
// Exchange-agnostic types. Both Binance and Bybit clients implement
// ExchangeClient so the copy engine doesn't care which exchange it's on.
// ----------------------------------------------------------------

export type ExchangeName = "BINANCE" | "BYBIT";

export interface Credentials {
  apiKey: string;
  apiSecret: string;
}

// ---- Account ----

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export interface AccountInfo {
  totalWalletBalance: number;   // USDT equivalent
  availableBalance: number;
  totalUnrealizedPnl: number;
  marginBalance: number;
  marginRatio: number;          // 0-1
  canTrade: boolean;
  canWithdraw: boolean;
  balances: Balance[];
}

// ---- Positions ----

export type PositionSide = "LONG" | "SHORT";

export interface Position {
  symbol: string;
  side: PositionSide;
  size: number;           // base currency quantity
  entryPrice: number;
  markPrice: number;
  leverage: number;
  unrealizedPnl: number;
  liquidationPrice: number;
  marginType: "cross" | "isolated";
}

// ---- Orders ----

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "STOP_MARKET" | "TAKE_PROFIT_MARKET";
export type OrderStatus = "NEW" | "FILLED" | "PARTIALLY_FILLED" | "CANCELED" | "REJECTED";

export interface PlaceOrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity?: number;
  price?: number;
  stopPrice?: number;
  reduceOnly?: boolean;
  positionSide?: "BOTH" | "LONG" | "SHORT";
  timeInForce?: "GTC" | "IOC" | "FOK";
}

export interface OrderResult {
  orderId: string;
  symbol: string;
  status: OrderStatus;
  executedQty: number;
  avgPrice: number;
  side: OrderSide;
  type: OrderType;
  createdAt: number; // unix ms
}

// ---- Exchange client interface ----

export interface ExchangeClient {
  readonly exchange: ExchangeName;
  getAccountInfo(): Promise<AccountInfo>;
  getPositions(): Promise<Position[]>;
  placeOrder(params: PlaceOrderParams): Promise<OrderResult>;
  cancelOrder(symbol: string, orderId: string): Promise<void>;
  setLeverage(symbol: string, leverage: number): Promise<void>;
  ping(): Promise<boolean>;
}

// ---- Permission check result ----

export interface PermissionCheck {
  canTrade: boolean;
  canRead: boolean;
  canWithdraw: boolean;
}
