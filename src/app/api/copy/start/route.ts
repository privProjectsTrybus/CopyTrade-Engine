// src/app/api/copy/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  traderProfileId: z.string().cuid(),
  exchangeConnectionId: z.string().cuid(),
  allocationType: z.enum(["FIXED_AMOUNT", "PERCENTAGE_OF_ACCOUNT"]).default("FIXED_AMOUNT"),
  allocationValue: z.number().positive().max(1_000_000),
  sizingMode: z.enum(["EXACT_MIRROR", "SCALED_MIRROR", "FIXED_DOLLAR"]).default("SCALED_MIRROR"),
  riskMultiplier: z.number().min(0.25).max(2).default(1),
  maxPositionSize: z.number().positive().optional().nullable(),
  maxLeverage: z.number().min(1).max(20).optional().nullable(),
  allowedSymbols: z.array(z.string().toUpperCase()).default([]),
  blockedSymbols: z.array(z.string().toUpperCase()).default([]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });

  // Verify the exchange connection belongs to this user
  const conn = await prisma.exchangeConnection.findFirst({
    where: { id: parsed.data.exchangeConnectionId, userId, isActive: true },
  });
  if (!conn) return NextResponse.json({ error: "Exchange connection not found" }, { status: 404 });

  // Verify the trader exists
  const trader = await prisma.traderProfile.findFirst({
    where: { id: parsed.data.traderProfileId, isActive: true },
  });
  if (!trader) return NextResponse.json({ error: "Trader not found" }, { status: 404 });

  // Upsert — if already copying this trader on this connection, update settings
  const existing = await prisma.copyRelationship.findFirst({
    where: { userId, traderProfileId: parsed.data.traderProfileId, exchangeConnectionId: parsed.data.exchangeConnectionId },
  });

  let relationship;
  if (existing) {
    relationship = await prisma.copyRelationship.update({
      where: { id: existing.id },
      data: { ...parsed.data, isActive: true },
    });
  } else {
    relationship = await prisma.copyRelationship.create({ data: { userId, ...parsed.data } });
  }

  await prisma.auditLog.create({
    data: { userId, action: "COPY_STARTED", metadata: { traderProfileId: parsed.data.traderProfileId } },
  });

  return NextResponse.json({ relationship });
}
