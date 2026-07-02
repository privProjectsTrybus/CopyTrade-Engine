// src/app/api/portfolio/analytics/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeAnalytics } from "@/lib/analytics";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;

  const [closedPositions, connections] = await Promise.all([
    prisma.closedPosition.findMany({
      where: { userId },
      orderBy: { closedAt: "asc" },
    }),
    prisma.exchangeConnection.findMany({
      where: { userId, isActive: true },
    }),
  ]);

  // Estimate starting equity from total wallet balance across connections
  // (approximated — real multi-account equity tracking is a Stage 4 concern)
  const openPositionSum = await prisma.openPosition.aggregate({
    where: { userId },
    _sum: { unrealizedPnl: true },
  });

  const positions = closedPositions.map((p) => ({
    realizedPnl: p.realizedPnl,
    closedAt: p.closedAt,
    symbol: p.symbol,
    side: p.side as "LONG" | "SHORT",
  }));

  const totalPnl = positions.reduce((s, p) => s + p.realizedPnl, 0);
  // Starting equity estimate: current gains removed = approximation of initial capital
  const startingEquity = Math.max(1000, 10000 - totalPnl);

  const analytics = computeAnalytics(positions, startingEquity);

  // Open position summary
  const openPositions = await prisma.openPosition.findMany({ where: { userId } });

  return NextResponse.json({
    ...analytics,
    unrealizedPnl: openPositionSum._sum.unrealizedPnl ?? 0,
    openPositionCount: openPositions.length,
    openPositions: openPositions.map((p) => ({
      symbol: p.symbol,
      side: p.side,
      size: p.size,
      entryPrice: p.entryPrice,
      markPrice: p.markPrice,
      unrealizedPnl: p.unrealizedPnl,
      leverage: p.leverage,
    })),
  });
}
