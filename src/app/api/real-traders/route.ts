// src/app/api/real-traders/route.ts
// Aggregates real top traders from Bybit and Binance public leaderboard APIs.
// No authentication required — all public data.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface RealTrader {
  uid: string;
  source: "BYBIT" | "BINANCE";
  nickname: string;
  rank: number;
  roi: number;       // percentage
  pnl: number;       // USDT
  winRate: number;   // percentage
  followers?: number;
  avgLeverage?: number;
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
  roe: number; // return on equity %
}

const TIMEOUT = 8000;

async function fetchTimeout(url: string, options: RequestInit = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ── Bybit public leaderboard ────────────────────────────────────────────────

async function fetchBybitTraders(): Promise<RealTrader[]> {
  try {
    const res = await fetchTimeout(
      "https://api.bybit.com/v5/leaderboard/list?category=linear&type=periodPnl&period=monthly&limit=20"
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (json.retCode !== 0) return [];

    const list: any[] = json.result?.list ?? [];

    return list.slice(0, 15).map((t, i) => ({
      uid: t.userId ?? String(i),
      source: "BYBIT",
      nickname: t.nickname || `Bybit Trader #${i + 1}`,
      rank: i + 1,
      roi: parseFloat(t.roi ?? "0") * 100,
      pnl: parseFloat(t.pnl ?? "0"),
      winRate: parseFloat(t.winRate ?? "0") * 100,
      followers: t.followerNum ?? 0,
      avgLeverage: undefined,
      positions: [],
      profileUrl: `https://www.bybit.com/copyTrade/trade-center/detail?leaderMark=${t.userId}`,
      sharesPositions: false,
    }));
  } catch {
    return [];
  }
}

// ── Binance public leaderboard ──────────────────────────────────────────────

async function fetchBinanceTraders(): Promise<RealTrader[]> {
  try {
    // Fetch top traders by ROI (30 day)
    const res = await fetchTimeout(
      "https://www.binance.com/bapi/futures/v3/public/future/leaderboard/getLeaderboardRank",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isShared: true,
          isTrader: false,
          periodType: "MONTHLY",
          statisticsType: "ROI",
          tradeType: "PERPETUAL",
        }),
      }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const list: any[] = json.data ?? [];

    const traders: RealTrader[] = [];

    for (const t of list.slice(0, 15)) {
      // Fetch detailed stats for each trader
      let roi = 0, pnl = 0, winRate = 0;
      let positions: RealPosition[] = [];
      let sharesPositions = false;

      try {
        const perfRes = await fetchTimeout(
          "https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getOtherLeaderboardBaseInfo",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ encryptedUid: t.encryptedUid }),
          }
        );
        if (perfRes.ok) {
          const perf = await perfRes.json();
          const d = perf.data ?? {};
          roi = parseFloat(d.roiValue ?? "0") * 100;
          pnl = parseFloat(d.pnlValue ?? "0");
          winRate = parseFloat(d.winRate ?? "0") * 100;
          sharesPositions = d.positionShared ?? false;
        }
      } catch {}

      // Fetch open positions if trader shares them publicly
      if (sharesPositions) {
        try {
          const posRes = await fetchTimeout(
            "https://www.binance.com/bapi/futures/v2/public/future/leaderboard/getOtherPosition",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ encryptedUid: t.encryptedUid, tradeType: "PERPETUAL" }),
            }
          );
          if (posRes.ok) {
            const posJson = await posRes.json();
            const posList: any[] = posJson.data?.otherPositionRetList ?? [];
            positions = posList.map(p => ({
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

      traders.push({
        uid: t.encryptedUid,
        source: "BINANCE",
        nickname: t.nickName || `Binance Trader #${traders.length + 1}`,
        rank: traders.length + 1,
        roi,
        pnl,
        winRate,
        followers: undefined,
        positions,
        profileUrl: `https://www.binance.com/en/futures-activity/leaderboard/user?encryptedUid=${t.encryptedUid}`,
        sharesPositions,
      });
    }

    return traders;
  } catch {
    return [];
  }
}

// ── Combined endpoint ───────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [bybit, binance] = await Promise.all([
    fetchBybitTraders(),
    fetchBinanceTraders(),
  ]);

  // Merge and sort by ROI descending
  const all = [...binance, ...bybit]
    .filter(t => t.roi !== 0 || t.pnl !== 0)
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 30);

  return NextResponse.json(all, {
    headers: { "Cache-Control": "public, max-age=180" }, // cache 3 min
  });
}
