// src/app/api/trade/record/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const { exchangeConnectionId, copyRelationshipId, symbol, side, requestedSize, executedSize, entryPrice, stopLossPrice, takeProfitPrice } = body;

  await prisma.trade.create({
    data: {
      userId,
      exchangeConnectionId,
      copyRelationshipId: copyRelationshipId ?? null,
      symbol,
      side: side === "LONG" ? "LONG" : "SHORT",
      status: executedSize > 0 ? "OPEN" : "FAILED",
      requestedSize,
      executedSize: executedSize ?? null,
      entryPrice: entryPrice ?? null,
      stopLossPrice: stopLossPrice ?? null,
      takeProfitPrice: takeProfitPrice ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
