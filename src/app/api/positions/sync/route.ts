// src/app/api/positions/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { exchangeConnectionId, positions } = await req.json();
  if (!exchangeConnectionId) return NextResponse.json({ ok: true }); // nothing to sync

  // Verify connection belongs to user
  const conn = await prisma.exchangeConnection.findFirst({
    where: { id: exchangeConnectionId, userId, isActive: true },
  });
  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Replace open positions in DB with current exchange state
  await prisma.$transaction([
    prisma.openPosition.deleteMany({ where: { userId, exchangeConnectionId } }),
    ...positions.map((p: any) =>
      prisma.openPosition.create({
        data: {
          userId,
          exchangeConnectionId,
          symbol: p.symbol,
          side: p.side === "LONG" ? "LONG" : "SHORT",
          size: p.size,
          entryPrice: p.entryPrice,
          markPrice: p.markPrice,
          leverage: p.leverage,
          unrealizedPnl: p.unrealizedPnl,
          stopLossPrice: null,
          takeProfitPrice: null,
        },
      })
    ),
  ]);

  await prisma.exchangeConnection.update({
    where: { id: exchangeConnectionId },
    data: { lastSyncedAt: new Date(), lastSyncError: null },
  });

  return NextResponse.json({ ok: true });
}
