// src/app/api/exchange/list/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;

  const connections = await prisma.exchangeConnection.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      exchange: true,
      label: true,
      hasWithdrawPermission: true,
      hasTradePermission: true,
      hasReadPermission: true,
      lastSyncedAt: true,
      lastSyncError: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(connections);
}
