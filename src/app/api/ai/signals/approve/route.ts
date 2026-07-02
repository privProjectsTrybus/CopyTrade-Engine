// src/app/api/ai/signals/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dispatch } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { signalId } = await req.json();
  const signal = await prisma.aiSignal.findFirst({
    where: { id: signalId, strategy: { userId } },
    include: { strategy: true },
  });

  if (!signal) return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  if (signal.status !== "PENDING") return NextResponse.json({ error: "Signal is no longer pending" }, { status: 400 });
  if (signal.expiresAt < new Date()) {
    await prisma.aiSignal.update({ where: { id: signalId }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Signal has expired" }, { status: 400 });
  }

  await prisma.aiSignal.update({
    where: { id: signalId },
    data: { status: "APPROVED", executedAt: new Date() },
  });

  // The actual order placement happens client-side via the AI engine context
  // (same browser-side execution pattern as the copy engine).
  // This route records the approval decision and triggers notifications.

  await dispatch({
    userId,
    event: "AI_SIGNAL",
    title: `AI Signal Approved: ${signal.symbol} ${signal.side}`,
    body: `${signal.strategy.name} — ${signal.rationale}`,
  });

  return NextResponse.json({ success: true });
}
