// src/app/api/ai/signals/reject/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { signalId } = await req.json();
  const signal = await prisma.aiSignal.findFirst({
    where: { id: signalId, strategy: { userId } },
  });
  if (!signal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.aiSignal.update({ where: { id: signalId }, data: { status: "REJECTED" } });
  return NextResponse.json({ success: true });
}
