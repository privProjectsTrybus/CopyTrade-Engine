// src/app/api/risk/pause/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const { reason } = await req.json();

  await prisma.riskProfile.update({
    where: { userId },
    data: { isPaused: true, pausedReason: reason ?? "Risk limit breached", pausedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: { userId, action: "RISK_LIMIT_BREACHED", metadata: { reason } },
  });

  return NextResponse.json({ success: true });
}
