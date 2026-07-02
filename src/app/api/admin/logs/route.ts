// src/app/api/admin/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 50;

  const logs = await prisma.auditLog.findMany({
    where: action ? { action: { contains: action } } : {},
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.auditLog.count({
    where: action ? { action: { contains: action } } : {},
  });

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
}
