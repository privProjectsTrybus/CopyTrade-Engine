// src/app/api/signals/history/route.ts
// Logs and retrieves seen positions using AuditLog table
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const { trader, position } = await req.json();

  await prisma.auditLog.create({
    data: {
      userId,
      action: "SIGNAL_DETECTED",
      metadata: {
        traderNickname: trader.nickname,
        traderSource: trader.source,
        traderRoi: trader.roi,
        symbol: position.symbol,
        side: position.side,
        entryPrice: position.entryPrice,
        leverage: position.leverage,
        roe: position.roe,
      },
    },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const logs = await prisma.auditLog.findMany({
    where: { userId, action: "SIGNAL_DETECTED" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs.map(l => ({
    id: l.id,
    createdAt: l.createdAt,
    ...(l.metadata as any),
  })));
}
