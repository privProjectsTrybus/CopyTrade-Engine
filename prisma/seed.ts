// prisma/seed.ts
// Run with: npx prisma db seed
// Adds 12 realistic mock traders. Safe to run multiple times (idempotent by displayName).

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function monthlyReturns(baseRoi: number, months = 18): { month: string; roi: number }[] {
  const results = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    // Gaussian-ish noise around base
    const noise = (Math.random() - 0.45) * baseRoi * 2.5;
    results.push({ month: label, roi: parseFloat((baseRoi + noise).toFixed(2)) });
  }
  return results;
}

const TRADERS = [
  {
    displayName: "AlphaWave",
    bio: "BTC/ETH swing trader. Risk-first approach with max 3x leverage. 4 years on Binance.",
    exchange: "BINANCE" as const,
    tradingStyle: "FUTURES_SWING" as const,
    riskScore: 28,
    specialties: ["BTCUSDT", "ETHUSDT"],
    isVerified: true,
    stats: { winRate: 71.4, roi30d: 12.3, roi90d: 38.2, roi1y: 124.5, avgLeverage: 2.8, followerCount: 3421, maxDrawdown: 8.2, avgHoldingHours: 18.5 },
    signals: [
      { symbol: "BTCUSDT", side: "LONG" as const, size: 0.12, entryPrice: 67400, leverage: 3, stopLossPrice: 65000, takeProfitPrice: 72000 },
    ],
  },
  {
    displayName: "GhostScalp",
    bio: "High-frequency BTC scalper. 50-100 trades/day. Tiny positions, tight stops.",
    exchange: "BINANCE" as const,
    tradingStyle: "FUTURES_SCALPER" as const,
    riskScore: 62,
    specialties: ["BTCUSDT"],
    isVerified: true,
    stats: { winRate: 64.8, roi30d: 18.7, roi90d: 52.1, roi1y: 189.3, avgLeverage: 8.2, followerCount: 1820, maxDrawdown: 14.1, avgHoldingHours: 0.4 },
    signals: [
      { symbol: "BTCUSDT", side: "SHORT" as const, size: 0.05, entryPrice: 67600, leverage: 8, stopLossPrice: 68200, takeProfitPrice: 66800 },
    ],
  },
  {
    displayName: "StellarMomentum",
    bio: "Multi-asset futures. Trend-following with ATR-based stops. 3% max risk per trade.",
    exchange: "BYBIT" as const,
    tradingStyle: "FUTURES_SWING" as const,
    riskScore: 35,
    specialties: ["BTCUSDT", "SOLUSDT", "ETHUSDT"],
    isVerified: true,
    stats: { winRate: 58.2, roi30d: 9.1, roi90d: 29.8, roi1y: 97.4, avgLeverage: 3.5, followerCount: 2104, maxDrawdown: 11.3, avgHoldingHours: 36.2 },
    signals: [
      { symbol: "SOLUSDT", side: "LONG" as const, size: 4.5, entryPrice: 172, leverage: 3, stopLossPrice: 162, takeProfitPrice: 196 },
      { symbol: "ETHUSDT", side: "LONG" as const, size: 0.3, entryPrice: 3480, leverage: 3, stopLossPrice: 3350, takeProfitPrice: 3750 },
    ],
  },
  {
    displayName: "IronVault",
    bio: "Conservative spot/futures blend. Max 2x leverage. Capital preservation first.",
    exchange: "BINANCE" as const,
    tradingStyle: "SPOT_SWING" as const,
    riskScore: 18,
    specialties: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    isVerified: true,
    stats: { winRate: 74.1, roi30d: 6.2, roi90d: 21.4, roi1y: 67.8, avgLeverage: 1.5, followerCount: 5812, maxDrawdown: 5.1, avgHoldingHours: 72 },
    signals: [],
  },
  {
    displayName: "NeonBreak",
    bio: "Breakout specialist. Waits for clear structure breaks with volume confirmation.",
    exchange: "BYBIT" as const,
    tradingStyle: "FUTURES_SWING" as const,
    riskScore: 44,
    specialties: ["BTCUSDT", "AVAXUSDT", "LINKUSDT"],
    isVerified: false,
    stats: { winRate: 52.6, roi30d: 14.8, roi90d: 43.1, roi1y: 138.7, avgLeverage: 5, followerCount: 987, maxDrawdown: 18.9, avgHoldingHours: 14 },
    signals: [
      { symbol: "AVAXUSDT", side: "LONG" as const, size: 12, entryPrice: 38.4, leverage: 5, stopLossPrice: 35.8, takeProfitPrice: 44.2 },
    ],
  },
  {
    displayName: "QuantDelta",
    bio: "Algorithmic mean-reversion. Bollinger Bands + RSI divergence. All pairs hedged.",
    exchange: "BINANCE" as const,
    tradingStyle: "FUTURES_SCALPER" as const,
    riskScore: 51,
    specialties: ["ETHUSDT", "SOLUSDT", "DOGEUSDT"],
    isVerified: true,
    stats: { winRate: 67.3, roi30d: 11.4, roi90d: 33.9, roi1y: 108.2, avgLeverage: 6.1, followerCount: 1456, maxDrawdown: 12.7, avgHoldingHours: 1.8 },
    signals: [
      { symbol: "ETHUSDT", side: "SHORT" as const, size: 0.2, entryPrice: 3510, leverage: 5, stopLossPrice: 3600, takeProfitPrice: 3400 },
    ],
  },
  {
    displayName: "TideRider",
    bio: "Macro-driven long-only. Holds positions days to weeks. BTC dominance focus.",
    exchange: "BYBIT" as const,
    tradingStyle: "SPOT_LONG_TERM" as const,
    riskScore: 22,
    specialties: ["BTCUSDT", "ETHUSDT"],
    isVerified: true,
    stats: { winRate: 79.4, roi30d: 4.8, roi90d: 18.1, roi1y: 58.4, avgLeverage: 1, followerCount: 8234, maxDrawdown: 6.3, avgHoldingHours: 168 },
    signals: [
      { symbol: "BTCUSDT", side: "LONG" as const, size: 0.08, entryPrice: 66900, leverage: 1, stopLossPrice: 60000, takeProfitPrice: 80000 },
    ],
  },
  {
    displayName: "CryptoNova",
    bio: "Altcoin futures hunter. Catches breakouts on mid-cap assets. High risk, high reward.",
    exchange: "BYBIT" as const,
    tradingStyle: "FUTURES_SCALPER" as const,
    riskScore: 78,
    specialties: ["SUIUSDT", "ARBUSDT", "JUPUSDT"],
    isVerified: false,
    stats: { winRate: 48.1, roi30d: 28.4, roi90d: 71.2, roi1y: 241.8, avgLeverage: 12, followerCount: 642, maxDrawdown: 32.4, avgHoldingHours: 0.8 },
    signals: [
      { symbol: "SUIUSDT", side: "LONG" as const, size: 180, entryPrice: 1.06, leverage: 10, stopLossPrice: 0.98, takeProfitPrice: 1.24 },
    ],
  },
  {
    displayName: "ZenTrend",
    bio: "Patient trend follower. 200 EMA + MACD. Never chases, never FOMO.",
    exchange: "BINANCE" as const,
    tradingStyle: "FUTURES_SWING" as const,
    riskScore: 31,
    specialties: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
    isVerified: true,
    stats: { winRate: 62.7, roi30d: 8.4, roi90d: 26.2, roi1y: 84.3, avgLeverage: 2.5, followerCount: 3102, maxDrawdown: 9.8, avgHoldingHours: 48 },
    signals: [],
  },
  {
    displayName: "PulseTrack",
    bio: "Order flow analyst. Reads liquidation maps and funding rates for edge.",
    exchange: "BYBIT" as const,
    tradingStyle: "FUTURES_SWING" as const,
    riskScore: 47,
    specialties: ["BTCUSDT", "ETHUSDT"],
    isVerified: true,
    stats: { winRate: 61.1, roi30d: 15.2, roi90d: 41.8, roi1y: 132.6, avgLeverage: 4.8, followerCount: 2287, maxDrawdown: 16.2, avgHoldingHours: 8 },
    signals: [
      { symbol: "BTCUSDT", side: "LONG" as const, size: 0.09, entryPrice: 67100, leverage: 5, stopLossPrice: 65500, takeProfitPrice: 70500 },
    ],
  },
  {
    displayName: "ColdLogic",
    bio: "Systematic delta-neutral trader. Profits from volatility, not direction.",
    exchange: "BINANCE" as const,
    tradingStyle: "FUTURES_SCALPER" as const,
    riskScore: 55,
    specialties: ["BTCUSDT", "ETHUSDT"],
    isVerified: false,
    stats: { winRate: 71.8, roi30d: 7.3, roi90d: 22.4, roi1y: 76.1, avgLeverage: 5.5, followerCount: 894, maxDrawdown: 7.6, avgHoldingHours: 2.4 },
    signals: [],
  },
  {
    displayName: "VelocityX",
    bio: "News + sentiment driven. Fast entries on macro events with pre-defined exits.",
    exchange: "BYBIT" as const,
    tradingStyle: "FUTURES_SWING" as const,
    riskScore: 68,
    specialties: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "LINKUSDT"],
    isVerified: false,
    stats: { winRate: 54.9, roi30d: 21.6, roi90d: 58.4, roi1y: 196.2, avgLeverage: 7.4, followerCount: 1134, maxDrawdown: 24.7, avgHoldingHours: 6 },
    signals: [
      { symbol: "SOLUSDT", side: "SHORT" as const, size: 8, entryPrice: 175, leverage: 7, stopLossPrice: 183, takeProfitPrice: 160 },
    ],
  },
];

async function main() {
  console.log("Seeding traders...");

  for (const t of TRADERS) {
    const existing = await prisma.traderProfile.findFirst({ where: { displayName: t.displayName } });
    if (existing) {
      console.log(`  Skipping ${t.displayName} (already seeded)`);
      continue;
    }

    const trader = await prisma.traderProfile.create({
      data: {
        displayName: t.displayName,
        bio: t.bio,
        exchange: t.exchange,
        tradingStyle: t.tradingStyle,
        riskScore: t.riskScore,
        specialties: t.specialties,
        isVerified: t.isVerified,
        statistics: {
          create: {
            ...t.stats,
            monthlyReturns: monthlyReturns(t.stats.roi30d / 3),
          },
        },
        signals: {
          create: t.signals.map((s) => ({
            ...s,
            openedAt: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000),
          })),
        },
      },
    });

    console.log(`  Created ${t.displayName} (${trader.id})`);
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
