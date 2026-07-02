// src/app/api/exchange/disconnect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ connectionId: z.string().cuid() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const conn = await prisma.exchangeConnection.findFirst({
    where: { id: parsed.data.connectionId, userId },
  });

  if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft-delete: keep the record for audit purposes but mark inactive
  await prisma.exchangeConnection.update({
    where: { id: conn.id },
    data: { isActive: false },
  });

  // Deactivate any copy relationships tied to this connection
  await prisma.copyRelationship.updateMany({
    where: { exchangeConnectionId: conn.id, userId },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: { userId, action: "EXCHANGE_DISCONNECTED", metadata: { connectionId: conn.id, exchange: conn.exchange } },
  });

  return NextResponse.json({ success: true });
}
