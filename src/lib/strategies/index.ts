// src/lib/strategies/index.ts
// ----------------------------------------------------------------
// AI Trading Strategies — pure maths, no external AI API needed.
// Each strategy receives a window of OHLCV candles and returns a
// typed signal (or null if no trade should fire).
//
// Data source: Binance public REST API (no auth required for klines).
// Strategies run in the browser via the AI engine context, same
// execution model as the copy engine.
// ----------------------------------------------------------------

export type SignalSide = "LONG" | "SHORT";

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StrategySignal {
  symbol: string;
  side: SignalSide;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  leverage: number;
  confidence: number; // 0-1
  rationale: string;
}

export type StrategyParams = Record<string, number>;

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function sma(values: number[], period: number): number {
  if (values.length < period) return NaN;
  const slice = values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

function ema(values: number[], period: number): number {
  if (values.length < period) return NaN;
  const k = 2 / (period + 1);
  let result = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < values.length; i++) {
    result = values[i] * k + result * (1 - k);
  }
  return result;
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs = candles.slice(-(period + 1)).map((c, i, arr) => {
    if (i === 0) return c.high - c.low;
    return Math.max(c.high - c.low, Math.abs(c.high - arr[i - 1].close), Math.abs(c.low - arr[i - 1].close));
  });
  return trs.slice(1).reduce((s, v) => s + v, 0) / period;
}

function bollingerBands(closes: number[], period = 20, stdDevMult = 2) {
  const mean = sma(closes, period);
  const slice = closes.slice(-period);
  const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: mean + stdDevMult * std, middle: mean, lower: mean - stdDevMult * std, std };
}

// ----------------------------------------------------------------
// Strategy 1: Trend Following (EMA crossover + ADX filter)
// ----------------------------------------------------------------

export function trendFollowing(
  candles: Candle[],
  params: StrategyParams = {}
): StrategySignal | null {
  const fastPeriod = params.fastEma ?? 20;
  const slowPeriod = params.slowEma ?? 50;
  const atrMult = params.atrMult ?? 2.0;
  const tpMult = params.tpMult ?? 3.0;

  const closes = candles.map((c) => c.close);
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);
  const prevFast = ema(closes.slice(0, -1), fastPeriod);
  const prevSlow = ema(closes.slice(0, -1), slowPeriod);

  if (isNaN(fastEma) || isNaN(slowEma)) return null;

  const crossedUp = prevFast <= prevSlow && fastEma > slowEma;
  const crossedDown = prevFast >= prevSlow && fastEma < slowEma;

  if (!crossedUp && !crossedDown) return null;

  const currentRsi = rsi(closes);
  const currentAtr = atr(candles);
  const price = closes[closes.length - 1];
  const side: SignalSide = crossedUp ? "LONG" : "SHORT";

  // Momentum confirmation: RSI should agree with direction
  if (side === "LONG" && currentRsi < 45) return null;
  if (side === "SHORT" && currentRsi > 55) return null;

  const slDist = currentAtr * atrMult;
  const tpDist = currentAtr * tpMult;
  const stopLossPrice = side === "LONG" ? price - slDist : price + slDist;
  const takeProfitPrice = side === "LONG" ? price + tpDist : price - tpDist;

  const separation = Math.abs(fastEma - slowEma) / slowEma;
  const confidence = Math.min(0.95, 0.5 + separation * 20 + (side === "LONG" ? (currentRsi - 50) / 100 : (50 - currentRsi) / 100));

  return {
    symbol: "", side, entryPrice: price,
    stopLossPrice: round(stopLossPrice, 2),
    takeProfitPrice: round(takeProfitPrice, 2),
    leverage: params.leverage ?? 2,
    confidence: round(confidence, 2),
    rationale: `EMA${fastPeriod} crossed ${side === "LONG" ? "above" : "below"} EMA${slowPeriod}. RSI ${currentRsi.toFixed(0)}. ATR-based SL ${(atrMult).toFixed(1)}×ATR, TP ${tpMult.toFixed(1)}×ATR.`,
  };
}

// ----------------------------------------------------------------
// Strategy 2: Momentum (RSI + Rate of Change)
// ----------------------------------------------------------------

export function momentum(
  candles: Candle[],
  params: StrategyParams = {}
): StrategySignal | null {
  const rsiOverbought = params.rsiOverbought ?? 70;
  const rsiOversold = params.rsiOversold ?? 30;
  const rocPeriod = params.rocPeriod ?? 10;
  const atrMult = params.atrMult ?? 1.5;

  const closes = candles.map((c) => c.close);
  const currentRsi = rsi(closes);
  const price = closes[closes.length - 1];
  const prevPrice = closes[closes.length - 1 - rocPeriod];
  const roc = ((price - prevPrice) / prevPrice) * 100;
  const currentAtr = atr(candles);

  // Strong RSI + confirming ROC
  const longSignal = currentRsi < rsiOversold && roc > 0;
  const shortSignal = currentRsi > rsiOverbought && roc < 0;

  if (!longSignal && !shortSignal) return null;

  const side: SignalSide = longSignal ? "LONG" : "SHORT";
  const slDist = currentAtr * atrMult;
  const tpDist = slDist * 2.5;
  const stopLossPrice = side === "LONG" ? price - slDist : price + slDist;
  const takeProfitPrice = side === "LONG" ? price + tpDist : price - tpDist;

  const rsiExtreme = side === "LONG" ? rsiOversold - currentRsi : currentRsi - rsiOverbought;
  const confidence = Math.min(0.92, 0.55 + rsiExtreme / 100 + Math.abs(roc) / 200);

  return {
    symbol: "", side, entryPrice: price,
    stopLossPrice: round(stopLossPrice, 2),
    takeProfitPrice: round(takeProfitPrice, 2),
    leverage: params.leverage ?? 2,
    confidence: round(confidence, 2),
    rationale: `RSI ${currentRsi.toFixed(1)} (${side === "LONG" ? "oversold" : "overbought"}) with ${rocPeriod}-period ROC ${roc.toFixed(2)}%.`,
  };
}

// ----------------------------------------------------------------
// Strategy 3: Breakout (Donchian channel breakout + volume surge)
// ----------------------------------------------------------------

export function breakout(
  candles: Candle[],
  params: StrategyParams = {}
): StrategySignal | null {
  const channelPeriod = params.channelPeriod ?? 20;
  const volumeSurgeMultiplier = params.volumeSurge ?? 1.5;
  const atrMult = params.atrMult ?? 1.5;

  if (candles.length < channelPeriod + 1) return null;

  const lookback = candles.slice(-(channelPeriod + 1), -1);
  const current = candles[candles.length - 1];
  const highs = lookback.map((c) => c.high);
  const lows = lookback.map((c) => c.low);
  const volumes = lookback.map((c) => c.volume);

  const channelHigh = Math.max(...highs);
  const channelLow = Math.min(...lows);
  const avgVolume = volumes.reduce((s, v) => s + v, 0) / volumes.length;
  const currentAtr = atr(candles);

  const breakUp = current.close > channelHigh && current.volume > avgVolume * volumeSurgeMultiplier;
  const breakDown = current.close < channelLow && current.volume > avgVolume * volumeSurgeMultiplier;

  if (!breakUp && !breakDown) return null;

  const side: SignalSide = breakUp ? "LONG" : "SHORT";
  const price = current.close;
  const stopLossPrice = side === "LONG" ? channelHigh - currentAtr : channelLow + currentAtr;
  const tpDist = Math.abs(price - stopLossPrice) * 2;
  const takeProfitPrice = side === "LONG" ? price + tpDist : price - tpDist;
  const volumeRatio = current.volume / avgVolume;
  const confidence = Math.min(0.9, 0.5 + (volumeRatio - 1) / 4);

  return {
    symbol: "", side, entryPrice: price,
    stopLossPrice: round(stopLossPrice, 2),
    takeProfitPrice: round(takeProfitPrice, 2),
    leverage: params.leverage ?? 2,
    confidence: round(confidence, 2),
    rationale: `Price broke ${side === "LONG" ? "above" : "below"} ${channelPeriod}-period Donchian channel with ${volumeRatio.toFixed(1)}× average volume.`,
  };
}

// ----------------------------------------------------------------
// Strategy 4: Mean Reversion (Bollinger Bands + RSI divergence)
// ----------------------------------------------------------------

export function meanReversion(
  candles: Candle[],
  params: StrategyParams = {}
): StrategySignal | null {
  const bbPeriod = params.bbPeriod ?? 20;
  const bbStd = params.bbStd ?? 2;
  const rsiOversold = params.rsiOversold ?? 35;
  const rsiOverbought = params.rsiOverbought ?? 65;

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const { upper, lower, middle, std } = bollingerBands(closes, bbPeriod, bbStd);
  const currentRsi = rsi(closes);
  const currentAtr = atr(candles);

  const longSignal = price <= lower && currentRsi < rsiOversold;
  const shortSignal = price >= upper && currentRsi > rsiOverbought;

  if (!longSignal && !shortSignal) return null;

  const side: SignalSide = longSignal ? "LONG" : "SHORT";
  const stopLossPrice = side === "LONG" ? price - currentAtr * 1.5 : price + currentAtr * 1.5;
  const takeProfitPrice = middle; // target: return to mean
  const bandWidth = (upper - lower) / middle;
  const confidence = Math.min(0.88, 0.45 + bandWidth * 2 + (side === "LONG" ? (rsiOversold - currentRsi) / 100 : (currentRsi - rsiOverbought) / 100));

  return {
    symbol: "", side, entryPrice: price,
    stopLossPrice: round(stopLossPrice, 2),
    takeProfitPrice: round(takeProfitPrice, 2),
    leverage: params.leverage ?? 1,
    confidence: round(confidence, 2),
    rationale: `Price touched ${side === "LONG" ? "lower" : "upper"} Bollinger Band (${bbStd}σ). RSI ${currentRsi.toFixed(1)}. TP at BB middle (${middle.toFixed(2)}).`,
  };
}

// ----------------------------------------------------------------
// Candle fetcher (Binance public API — no auth required)
// ----------------------------------------------------------------

export async function fetchCandles(symbol: string, interval = "4h", limit = 100): Promise<Candle[]> {
  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Candle fetch failed for ${symbol}`);
  const raw: any[][] = await res.json();
  return raw.map((k) => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

function round(n: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

export const STRATEGY_FUNCTIONS = {
  TREND_FOLLOWING: trendFollowing,
  MOMENTUM: momentum,
  BREAKOUT: breakout,
  MEAN_REVERSION: meanReversion,
} as const;

export const DEFAULT_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "AVAXUSDT", "LINKUSDT",
];
