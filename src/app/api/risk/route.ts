// src/app/api/risk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  maxAccountExposurePct: z.number().min(1).max(100).optional(),
  maxTradeRiskPct: z.number().min(0.1).max(10).optional(),
  maxDailyLossPct: z.number().min(0.5).max(20).optional(),
  maxWeeklyLossPct: z.number().min(1).max(30).optional(),
  maxMonthlyLossPct: z.number().min(2).max(50).optional(),
  maxOpenPositions: z.number().int().min(1).max(50).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const profile = await prisma.riskProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: "Risk profile not found" }, { status: 404 });
  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const profile = await prisma.riskProfile.update({
    where: { userId },
    data: parsed.data,
  });

  await prisma.auditLog.create({
    data: { userId, action: "RISK_PROFILE_UPDATED", metadata: parsed.data },
  });

  return NextResponse.json(profile);
}
