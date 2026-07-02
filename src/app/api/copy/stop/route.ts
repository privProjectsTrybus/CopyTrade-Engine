// src/app/api/copy/stop/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ relationshipId: z.string().cuid() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const rel = await prisma.copyRelationship.findFirst({
    where: { id: parsed.data.relationshipId, userId },
  });
  if (!rel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.copyRelationship.update({
    where: { id: rel.id },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: { userId, action: "COPY_STOPPED", metadata: { relationshipId: rel.id } },
  });

  return NextResponse.json({ success: true });
}
