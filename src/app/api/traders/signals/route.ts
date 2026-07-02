// src/app/api/traders/signals/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Return all currently open signals across all tracked traders.
  // In a real integration, this would stream from exchange APIs.
  // For now it returns the seeded mock signals from our DB.
  const signals = await prisma.traderSignal.findMany({
    where: { isOpen: true },
    orderBy: { openedAt: "desc" },
  });

  return NextResponse.json(signals);
}
