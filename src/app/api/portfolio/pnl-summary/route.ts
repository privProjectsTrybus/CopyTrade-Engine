// src/app/api/portfolio/pnl-summary/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayPositions, weekPositions, monthPositions] = await Promise.all([
    prisma.closedPosition.aggregate({ where: { userId, closedAt: { gte: startOfDay } }, _sum: { realizedPnl: true } }),
    prisma.closedPosition.aggregate({ where: { userId, closedAt: { gte: startOfWeek } }, _sum: { realizedPnl: true } }),
    prisma.closedPosition.aggregate({ where: { userId, closedAt: { gte: startOfMonth } }, _sum: { realizedPnl: true } }),
  ]);

  return NextResponse.json({
    today: todayPositions._sum.realizedPnl ?? 0,
    thisWeek: weekPositions._sum.realizedPnl ?? 0,
    thisMonth: monthPositions._sum.realizedPnl ?? 0,
  });
}
