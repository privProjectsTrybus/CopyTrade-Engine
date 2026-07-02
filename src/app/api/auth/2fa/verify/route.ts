// src/app/api/auth/2fa/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await req.json();
  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) {
    return NextResponse.json(
      { error: "No pending 2FA setup found. Call /setup first." },
      { status: 400 }
    );
  }

  const isValid = authenticator.verify({
    token: code,
    secret: user.twoFactorSecret,
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  await prisma.auditLog.create({
    data: { userId, action: "2FA_ENABLED" },
  });

  return NextResponse.json({ success: true });
}
