import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const logs = await prisma.auditLog.findMany({
    where: { userId, action: "JOURNAL_ENTRY" },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return NextResponse.json(logs.map(l => ({ id: l.id, createdAt: l.createdAt, ...(l.metadata as any) })));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json();
  await prisma.auditLog.create({ data: { userId, action: "JOURNAL_ENTRY", metadata: body } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const { id } = await req.json();
  await prisma.auditLog.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
