import { scoreSignal } from "@/lib/aiScoring";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface RealTrader {
  uid: string;
  source: "BYBIT" | "BINANCE" | "BYBIT_COPY";
  nickname: string;
  rank: number;
  roi: number;
  pnl: number;
  winRate: number;
  followers?: number;
  avgLeverage?: number;
  maxDrawdown?: number;
  positions: RealPosition[];
  profileUrl: string;
  sharesPositions: boolean;
}

export interface RealPosition {
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  markPrice: number;
  leverage: number;
  size: number;
  unrealizedPnl: number;
  roe: number;
}

async function ft(url: string, opts: RequestInit = {}, ms = 8000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal }); }
  finally { clearTimeout(t); }
}

// ── Bybit Futures Leaderboard ────────────────────────────────────────────────
async function fetchBybitLeaderboard(): Promise<RealTrader[]> {
  try {
    const res = await ft("https://api.bybit.com/v5/leaderboard/list?category=linear&type=periodPnl&period=monthly&limit=20");
    if (!res.ok) return [];
    const json = await res.json();
    if (json.retCode !== 0) return [];
    return (json.result?.list ?? []).slice(0, 15).map((t: any, i: number) => ({
      uid: `bybit-${t.userId ?? i}`,
      source: "BYBIT",
      nickname: t.nickname || `Bybit #${i + 1}`,
      rank: i + 1,
      roi: parseFloat(t.roi ?? "0") * 100,
      pnl: parseFloat(t.pnl ?? "0"),
      winRate: parseFloat(t.winRate ?? "0") * 100,
      followers: t.followerNum ?? 0,
      positions: [],
      profileUrl: `https://www.bybit.com/copyTrade/trade-center/detail?leaderMark=${t.userId}`,
      sharesPositions: false,
    }));
  } catch { return []; }
}

// ── Bybit Copy Trading Elite Traders ────────────────────────────────────────
async function fetchBybitCopyTraders(): Promise<RealTrader[]> {
  try {
    // Bybit copy trading public leaderboard
    const res = await ft("https://api.bybit.com/v5/copy-trading/public/elite-list?limit=20");
    if (!res.ok) return [];
    const json = await res.json();
    if (json.retCode !== 0) return [];
    const list: any[] = json.result?.list ?? [];

    const traders: RealTrader[] = [];
    for (const t of list.slice(0, 10)) {
      // Try to get their open positions
      let positions: RealPosition[] = [];
      try {
        const posRes = await ft(`https://api.bybit.com/v5/copy-trading/public/leader-position?leaderId=${t.leaderId}`);
        if (posRes.ok) {
          const posJson = await posRes.json();
          if (posJson.retCode === 0) {
            positions = (posJson.result?.list ?? []).map((p: any) => ({
              symbol: p.symbol,
              side: p.side === "Buy" ? "LONG" : "SHORT",
              entryPrice: parseFloat(p.avgPrice ?? "0"),
              markPrice: parseFloat(p.markPrice ?? p.avgPrice ?? "0"),
              leverage: parseFloat(p.leverage ?? "1"),
              size: parseFloat(p.size ?? "0"),
              unrealizedPnl: parseFloat(p.unrealisedPnl ?? "0"),
              roe: parseFloat(p.unrealisedPnl ?? "0") / Math.max(1, parseFloat(p.positionValue ?? "1") / parseFloat(p.leverage ?? "1")) * 100,
            }));
          }
        }
      } catch {}

      traders.push({
        uid: `bybit-copy-${t.leaderId}`,
        source: "BYBIT_COPY",
        nickname: t.leaderName || `Bybit Copy #${traders.length + 1}`,
        rank: traders.length + 1,
        roi: parseFloat(t.roiRate ?? "0") * 100,
        pnl: parseFloat(t.totalPnl ?? "0"),
        winRate: parseFloat(t.winRate ?? "0") * 100,
        followers: parseInt(t.followerNum ?? "0"),
        avgLeverage: parseFloat(t.avgLeverage ?? "0"),
        maxDrawdown: parseFloat(t.maxDrawdownRate ?? "0") * 100,
        positions,
        profileUrl: `https://www.bybit.com/copyTrade/trade-center/detail?leaderMark=${t.leaderId}`,
        sharesPositions: positions.length > 0,
      });
    }
    return traders;
  } catch { return []; }
}

// ── Binance Leaderboard ──────────────────────────────────────────────────────
async function fetchBinanceTraders(): Promise<RealTrader[]> {
  try {
    const res = await ft(
      "https://www.binance.com/bapi/futures/v3/public/future/leaderboard/getLeaderboardRank",
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isShared: true, isTrader: false, periodType: "MONTHLY", statisticsType: "ROI", tradeType: "PERPETUAL" }) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const list: any[] = json.data ?? [];
    const traders: RealTrader[] = [];

    // Process in parallel batches of 5 to stay within timeout
    const chunks = [];
    for (let i = 0; i < Math.min(list.length, 20); i += 5) chunks.push(list.slice(i, i + 5));

    for (const chunk of chunks) {
      const results = await Promise.allSettled(chunk.map(async (t: any) => {
        let roi = 0, pnl = 0, winRate = 0, sharesPositions = false;
        let positions: RealPosition[] = [];

        try {
          const infoRes = await ft(
            "https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getOtherLeaderboardBaseInfo",
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ encryptedUid: t.encryptedUid }) },
            4000
          );
          if (infoRes.ok) {
            const info = await infoRes.json();
            const d = info.data ?? {};
            roi = parseFloat(d.roiValue ?? "0") * 100;
            pnl = parseFloat(d.pnlValue ?? "0");
            winRate = parseFloat(d.winRate ?? "0") * 100;
            sharesPositions = d.positionShared ?? false;
          }
        } catch {}

        if (sharesPositions) {
          try {
            const posRes = await ft(
              "https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getOtherPosition",
              { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ encryptedUid: t.encryptedUid, tradeType: "PERPETUAL" }) },
              4000
            );
            if (posRes.ok) {
              const posJson = await posRes.json();
              positions = (posJson.data?.otherPositionRetList ?? []).map((p: any) => ({
                symbol: p.symbol,
                side: parseFloat(p.amount) > 0 ? "LONG" : "SHORT",
                entryPrice: parseFloat(p.entryPrice ?? "0"),
                markPrice: parseFloat(p.markPrice ?? "0"),
                leverage: parseFloat(p.leverage ?? "1"),
                size: Math.abs(parseFloat(p.amount ?? "0")),
                unrealizedPnl: parseFloat(p.pnl ?? "0"),
                roe: parseFloat(p.roe ?? "0") * 100,
              }));
            }
          } catch {}
        }

        return { uid: `binance-${t.encryptedUid}`, source: "BINANCE" as const, nickname: t.nickName || "Binance Trader",
          rank: traders.length + 1, roi, pnl, winRate, positions, sharesPositions,
          profileUrl: `https://www.binance.com/en/futures-activity/leaderboard/user?encryptedUid=${t.encryptedUid}` };
      }));

      for (const r of results) {
        if (r.status === "fulfilled") traders.push(r.value);
      }
    }
    return traders;
  } catch { return []; }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [bybit, bybitCopy, binance] = await Promise.all([
    fetchBybitLeaderboard(),
    fetchBybitCopyTraders(),
    fetchBinanceTraders(),
  ]);

  const all = [...binance, ...bybitCopy, ...bybit]
    .filter(t => t.roi !== 0 || t.pnl !== 0)
    .map(t => ({
      ...t,
      positions: t.positions.map(p => ({
        ...p,
        aiScore: scoreSignal(t, p),
      })),
    }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 40);

  return NextResponse.json(all, { headers: { "Cache-Control": "public, max-age=120" } });
}
