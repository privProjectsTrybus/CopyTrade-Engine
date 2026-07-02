import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dispatch } from "@/lib/notifications";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  await prisma.aiSignal.updateMany({
    where: { strategy: { userId }, status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  const signals = await prisma.aiSignal.findMany({
    where: { strategy: { userId }, status: { in: ["PENDING", "APPROVED", "EXECUTED"] }, expiresAt: { gt: new Date() } },
    include: { strategy: { select: { name: true, strategyType: true, approvalMode: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(signals);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json();
  const { aiStrategyId, symbol, side, confidence, entryPrice, stopLossPrice, takeProfitPrice, leverage, rationale, expiresAt } = body;
  const strategy = await prisma.aiStrategy.findFirst({ where: { id: aiStrategyId, userId } });
  if (!strategy) return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
  const signal = await prisma.aiSignal.create({
    data: { aiStrategyId, symbol, side, confidence, entryPrice, stopLossPrice, takeProfitPrice, leverage: leverage ?? 1, rationale, expiresAt: new Date(expiresAt) },
  });
  if (strategy.approvalMode === "FULL_AUTO") {
    await prisma.aiSignal.update({ where: { id: signal.id }, data: { status: "APPROVED", executedAt: new Date() } });
  }
  await dispatch({ userId, event: "AI_SIGNAL", title: `AI Signal: ${symbol} ${side}`, body: rationale });
  return NextResponse.json({ signal });
}
