// src/app/api/engine/event/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: true }); // silently ignore if not authed
  const userId = (session.user as any).id as string;

  const event = await req.json();

  await prisma.auditLog.create({
    data: { userId, action: `ENGINE_${event.type}`, metadata: event },
  }).catch(() => {}); // non-critical

  // Also persist notable events as notifications
  if (["RISK_LIMIT_BREACHED", "ENGINE_PAUSED", "TRADE_REJECTED"].includes(event.type)) {
    await prisma.notification.create({
      data: {
        userId,
        channel: "BROWSER",
        title: event.type.replace(/_/g, " "),
        body: event.reason ?? event.message ?? JSON.stringify(event),
      },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
