// src/lib/analytics.ts
// ----------------------------------------------------------------
// Portfolio analytics computed entirely from closed position history.
// All maths runs server-side in the API route — no external service needed.
// ----------------------------------------------------------------

export interface ClosedPos {
  realizedPnl: number;
  closedAt: Date;
  symbol: string;
  side: "LONG" | "SHORT";
}

export interface DailyReturn {
  date: string; // YYYY-MM-DD
  pnl: number;
  returnPct: number; // daily % return on starting equity
}

export interface MonthlyReturn {
  month: string; // YYYY-MM
  pnl: number;
  returnPct: number;
}

export interface PortfolioAnalytics {
  totalRealizedPnl: number;
  totalRoi: number;              // %
  dailyReturns: DailyReturn[];
  monthlyReturns: MonthlyReturn[];
  equityCurve: { date: string; equity: number }[];
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;           // % as positive number
  maxDrawdownDuration: number;   // calendar days
  winRate: number;               // %
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  assetAllocation: { symbol: string; count: number; pnl: number }[];
}

const RISK_FREE_DAILY = 0.00013; // ~5% annual / 365, daily
const ANNUALISATION = Math.sqrt(252);

export function computeAnalytics(
  positions: ClosedPos[],
  startingEquity: number
): PortfolioAnalytics {
  if (positions.length === 0) return emptyAnalytics(startingEquity);

  // Sort chronologically
  const sorted = [...positions].sort((a, b) => a.closedAt.getTime() - b.closedAt.getTime());

  // --- Daily PnL buckets ---
  const dayBuckets = new Map<string, number>();
  for (const p of sorted) {
    const key = p.closedAt.toISOString().slice(0, 10);
    dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + p.realizedPnl);
  }

  // Fill in calendar days (no gaps) between first and last trade
  const allDays = fillDays(sorted[0].closedAt, sorted[sorted.length - 1].closedAt);

  let runningEquity = startingEquity;
  const dailyReturns: DailyReturn[] = [];
  const equityCurve: { date: string; equity: number }[] = [
    { date: allDays[0], equity: startingEquity },
  ];

  for (const date of allDays) {
    const pnl = dayBuckets.get(date) ?? 0;
    const returnPct = startingEquity > 0 ? (pnl / runningEquity) * 100 : 0;
    dailyReturns.push({ date, pnl, returnPct });
    runningEquity += pnl;
    equityCurve.push({ date, equity: Math.max(0, runningEquity) });
  }

  // --- Monthly buckets ---
  const monthBuckets = new Map<string, number>();
  for (const { date, pnl } of dailyReturns) {
    const key = date.slice(0, 7);
    monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + pnl);
  }

  let mRunning = startingEquity;
  const monthlyReturns: MonthlyReturn[] = [];
  for (const [month, pnl] of [...monthBuckets.entries()].sort()) {
    const returnPct = mRunning > 0 ? (pnl / mRunning) * 100 : 0;
    monthlyReturns.push({ month, pnl, returnPct });
    mRunning += pnl;
  }

  // --- Sharpe & Sortino ---
  const rets = dailyReturns.map((d) => d.returnPct / 100);
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const excess = rets.map((r) => r - RISK_FREE_DAILY);
  const variance = excess.reduce((s, e) => s + e * e, 0) / excess.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (ANNUALISATION * (mean - RISK_FREE_DAILY)) / stdDev : 0;

  const downside = rets.filter((r) => r < 0).map((r) => r * r);
  const downsideStd = downside.length > 0
    ? Math.sqrt(downside.reduce((s, d) => s + d, 0) / downside.length)
    : 0;
  const sortinoRatio = downsideStd > 0 ? (ANNUALISATION * (mean - RISK_FREE_DAILY)) / downsideStd : 0;

  // --- Max drawdown ---
  let peak = startingEquity;
  let maxDD = 0;
  let ddStart: string | null = null;
  let maxDDDuration = 0;
  let currentDDStart: string | null = null;

  for (const { date, equity } of equityCurve) {
    if (equity > peak) {
      peak = equity;
      currentDDStart = null;
    } else {
      if (!currentDDStart) currentDDStart = date;
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      if (dd > maxDD) {
        maxDD = dd;
        ddStart = currentDDStart;
        maxDDDuration = daysBetween(currentDDStart!, date);
      }
    }
  }

  // --- Win/Loss stats ---
  const wins = sorted.filter((p) => p.realizedPnl > 0);
  const losses = sorted.filter((p) => p.realizedPnl < 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + p.realizedPnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, p) => s + p.realizedPnl, 0) / losses.length) : 0;
  const grossProfit = wins.reduce((s, p) => s + p.realizedPnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, p) => s + p.realizedPnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // --- Asset allocation ---
  const assetMap = new Map<string, { count: number; pnl: number }>();
  for (const p of sorted) {
    const existing = assetMap.get(p.symbol) ?? { count: 0, pnl: 0 };
    assetMap.set(p.symbol, { count: existing.count + 1, pnl: existing.pnl + p.realizedPnl });
  }
  const assetAllocation = [...assetMap.entries()]
    .map(([symbol, data]) => ({ symbol, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const totalRealizedPnl = sorted.reduce((s, p) => s + p.realizedPnl, 0);

  return {
    totalRealizedPnl,
    totalRoi: startingEquity > 0 ? (totalRealizedPnl / startingEquity) * 100 : 0,
    dailyReturns,
    monthlyReturns,
    equityCurve,
    sharpeRatio: round(sharpeRatio, 2),
    sortinoRatio: round(sortinoRatio, 2),
    maxDrawdown: round(maxDD, 2),
    maxDrawdownDuration: maxDDDuration,
    winRate: sorted.length > 0 ? (wins.length / sorted.length) * 100 : 0,
    avgWin: round(avgWin, 2),
    avgLoss: round(avgLoss, 2),
    profitFactor: round(profitFactor, 2),
    totalTrades: sorted.length,
    winCount: wins.length,
    lossCount: losses.length,
    assetAllocation,
  };
}

function emptyAnalytics(startingEquity: number): PortfolioAnalytics {
  return {
    totalRealizedPnl: 0, totalRoi: 0, dailyReturns: [], monthlyReturns: [],
    equityCurve: [], sharpeRatio: 0, sortinoRatio: 0, maxDrawdown: 0,
    maxDrawdownDuration: 0, winRate: 0, avgWin: 0, avgLoss: 0,
    profitFactor: 0, totalTrades: 0, winCount: 0, lossCount: 0, assetAllocation: [],
  };
}

function fillDays(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function round(n: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}
