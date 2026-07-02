// src/app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalUsers, activeUsers, totalTrades, openPositions,
    totalTraders, activeConnections, recentErrors,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.trade.count(),
    prisma.openPosition.count(),
    prisma.traderProfile.count({ where: { isActive: true } }),
    prisma.exchangeConnection.count({ where: { isActive: true } }),
    prisma.auditLog.count({
      where: {
        action: { in: ["ENGINE_ENGINE_ERROR", "EXCHANGE_DISCONNECTED", "RISK_LIMIT_BREACHED"] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return NextResponse.json({
    totalUsers, activeUsers, totalTrades, openPositions,
    totalTraders, activeConnections, recentErrors,
  });
}
