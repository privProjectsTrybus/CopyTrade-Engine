// src/app/api/ai/strategies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  strategyType: z.enum(["TREND_FOLLOWING", "MOMENTUM", "BREAKOUT", "MEAN_REVERSION"]),
  approvalMode: z.enum(["FULL_AUTO", "SEMI_AUTO", "MANUAL"]).default("MANUAL"),
  allocationPct: z.number().min(1).max(50).default(10),
  maxLeverage: z.number().min(1).max(10).default(3),
  symbols: z.array(z.string()).default([]),
  parametersJson: z.record(z.number()).default({}),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const strategies = await prisma.aiStrategy.findMany({
    where: { userId },
    include: { signals: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 20 } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(strategies);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  const count = await prisma.aiStrategy.count({ where: { userId } });
  if (count >= 10) return NextResponse.json({ error: "Max 10 strategies per account" }, { status: 400 });

  const strategy = await prisma.aiStrategy.create({
    data: { userId, ...parsed.data },
  });
  return NextResponse.json({ strategy });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { id, ...updates } = await req.json();
  const strategy = await prisma.aiStrategy.findFirst({ where: { id, userId } });
  if (!strategy) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.aiStrategy.update({ where: { id }, data: updates });
  return NextResponse.json({ strategy: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const strategy = await prisma.aiStrategy.findFirst({ where: { id, userId } });
  if (!strategy) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.aiStrategy.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
