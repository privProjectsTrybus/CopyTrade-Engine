import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TRADERS = [
  { name:"AlphaWave", bio:"BTC/ETH swing trader. Risk-first, max 3x leverage. 4 years on Binance.", exchange:"BINANCE" as const, style:"FUTURES_SWING" as const, risk:28, verified:true, specs:["BTCUSDT","ETHUSDT"], wr:71.4, r30:12.3, r90:38.2, r1y:124.5, lev:2.8, fol:3421, dd:8.2, hold:18.5, signals:[{sym:"BTCUSDT",side:"LONG" as const,size:0.12,entry:67400,lev:3,sl:65000,tp:72000}] },
  { name:"GhostScalp", bio:"High-frequency BTC scalper. Tiny positions, tight stops.", exchange:"BINANCE" as const, style:"FUTURES_SCALPER" as const, risk:62, verified:true, specs:["BTCUSDT"], wr:64.8, r30:18.7, r90:52.1, r1y:189.3, lev:8.2, fol:1820, dd:14.1, hold:0.4, signals:[{sym:"BTCUSDT",side:"SHORT" as const,size:0.05,entry:67600,lev:8,sl:68200,tp:66800}] },
  { name:"StellarMomentum", bio:"Multi-asset futures. ATR-based stops, 3% max risk per trade.", exchange:"BYBIT" as const, style:"FUTURES_SWING" as const, risk:35, verified:true, specs:["BTCUSDT","SOLUSDT","ETHUSDT"], wr:58.2, r30:9.1, r90:29.8, r1y:97.4, lev:3.5, fol:2104, dd:11.3, hold:36.2, signals:[{sym:"SOLUSDT",side:"LONG" as const,size:4.5,entry:172,lev:3,sl:162,tp:196}] },
  { name:"IronVault", bio:"Conservative spot/futures blend. Max 2x leverage. Capital preservation first.", exchange:"BINANCE" as const, style:"SPOT_SWING" as const, risk:18, verified:true, specs:["BTCUSDT","ETHUSDT","BNBUSDT"], wr:74.1, r30:6.2, r90:21.4, r1y:67.8, lev:1.5, fol:5812, dd:5.1, hold:72, signals:[] },
  { name:"NeonBreak", bio:"Breakout specialist. Donchian channel with volume confirmation.", exchange:"BYBIT" as const, style:"FUTURES_SWING" as const, risk:44, verified:false, specs:["BTCUSDT","AVAXUSDT","LINKUSDT"], wr:52.6, r30:14.8, r90:43.1, r1y:138.7, lev:5, fol:987, dd:18.9, hold:14, signals:[{sym:"AVAXUSDT",side:"LONG" as const,size:12,entry:38.4,lev:5,sl:35.8,tp:44.2}] },
  { name:"QuantDelta", bio:"Algorithmic mean-reversion. Bollinger Bands + RSI divergence.", exchange:"BINANCE" as const, style:"FUTURES_SCALPER" as const, risk:51, verified:true, specs:["ETHUSDT","SOLUSDT"], wr:67.3, r30:11.4, r90:33.9, r1y:108.2, lev:6.1, fol:1456, dd:12.7, hold:1.8, signals:[{sym:"ETHUSDT",side:"SHORT" as const,size:0.2,entry:3510,lev:5,sl:3600,tp:3400}] },
  { name:"TideRider", bio:"Macro-driven long-only. BTC dominance focus, holds days to weeks.", exchange:"BYBIT" as const, style:"SPOT_LONG_TERM" as const, risk:22, verified:true, specs:["BTCUSDT","ETHUSDT"], wr:79.4, r30:4.8, r90:18.1, r1y:58.4, lev:1, fol:8234, dd:6.3, hold:168, signals:[{sym:"BTCUSDT",side:"LONG" as const,size:0.08,entry:66900,lev:1,sl:60000,tp:80000}] },
  { name:"CryptoNova", bio:"Altcoin futures hunter. Mid-cap breakouts. High risk, high reward.", exchange:"BYBIT" as const, style:"FUTURES_SCALPER" as const, risk:78, verified:false, specs:["SUIUSDT","ARBUSDT"], wr:48.1, r30:28.4, r90:71.2, r1y:241.8, lev:12, fol:642, dd:32.4, hold:0.8, signals:[{sym:"SUIUSDT",side:"LONG" as const,size:180,entry:1.06,lev:10,sl:0.98,tp:1.24}] },
  { name:"ZenTrend", bio:"Patient trend follower. 200 EMA + MACD. Never chases, never FOMO.", exchange:"BINANCE" as const, style:"FUTURES_SWING" as const, risk:31, verified:true, specs:["BTCUSDT","ETHUSDT"], wr:62.7, r30:8.4, r90:26.2, r1y:84.3, lev:2.5, fol:3102, dd:9.8, hold:48, signals:[] },
  { name:"PulseTrack", bio:"Order flow analyst. Reads liquidation maps and funding rates.", exchange:"BYBIT" as const, style:"FUTURES_SWING" as const, risk:47, verified:true, specs:["BTCUSDT","ETHUSDT"], wr:61.1, r30:15.2, r90:41.8, r1y:132.6, lev:4.8, fol:2287, dd:16.2, hold:8, signals:[{sym:"BTCUSDT",side:"LONG" as const,size:0.09,entry:67100,lev:5,sl:65500,tp:70500}] },
  { name:"ColdLogic", bio:"Systematic delta-neutral. Profits from volatility, not direction.", exchange:"BINANCE" as const, style:"FUTURES_SCALPER" as const, risk:55, verified:false, specs:["BTCUSDT","ETHUSDT"], wr:71.8, r30:7.3, r90:22.4, r1y:76.1, lev:5.5, fol:894, dd:7.6, hold:2.4, signals:[] },
  { name:"VelocityX", bio:"News + sentiment driven. Fast entries on macro events.", exchange:"BYBIT" as const, style:"FUTURES_SWING" as const, risk:68, verified:false, specs:["BTCUSDT","ETHUSDT","SOLUSDT"], wr:54.9, r30:21.6, r90:58.4, r1y:196.2, lev:7.4, fol:1134, dd:24.7, hold:6, signals:[{sym:"SOLUSDT",side:"SHORT" as const,size:8,entry:175,lev:7,sl:183,tp:160}] },
];

function makeMonthlyReturns(base: number) {
  const res = [];
  const now = new Date();
  for (let i = 17; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const roi = parseFloat((base + (Math.random()-0.45)*base*2.5).toFixed(2));
    res.push({ month, roi });
  }
  return res;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let created = 0;
  let skipped = 0;

  for (const t of TRADERS) {
    const exists = await prisma.traderProfile.findFirst({ where: { displayName: t.name } });
    if (exists) { skipped++; continue; }

    await prisma.traderProfile.create({
      data: {
        displayName: t.name, bio: t.bio, exchange: t.exchange,
        tradingStyle: t.style, riskScore: t.risk, specialties: t.specs,
        isVerified: t.verified,
        statistics: {
          create: {
            winRate: t.wr, roi30d: t.r30, roi90d: t.r90, roi1y: t.r1y,
            avgLeverage: t.lev, followerCount: t.fol, maxDrawdown: t.dd,
            avgHoldingHours: t.hold, monthlyReturns: makeMonthlyReturns(t.r30/3),
          },
        },
        signals: {
          create: t.signals.map(s => ({
            symbol: s.sym, side: s.side, size: s.size, entryPrice: s.entry,
            leverage: s.lev, stopLossPrice: s.sl, takeProfitPrice: s.tp, isOpen: true,
          })),
        },
      },
    });
    created++;
  }

  return NextResponse.json({ message: `Seeded ${created} traders (${skipped} already existed).` });
}
