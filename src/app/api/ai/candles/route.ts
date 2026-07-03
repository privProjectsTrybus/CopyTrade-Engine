// src/app/api/ai/candles/route.ts
// Server-side candle proxy — avoids any browser CORS issues with Binance
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "BTCUSDT";
  const interval = searchParams.get("interval") ?? "4h";
  const limit = searchParams.get("limit") ?? "100";

  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
    if (!res.ok) return NextResponse.json({ error: `Binance error ${res.status}` }, { status: 502 });
    const data = await res.json();
    const candles = data.map((k: any[]) => ({
      openTime: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
    }));
    return NextResponse.json(candles);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
