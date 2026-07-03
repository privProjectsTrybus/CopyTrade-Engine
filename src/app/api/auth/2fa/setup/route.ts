// src/app/api/auth/2fa/setup/route.ts
import { NextResponse } from "next/server";
import { authenticator } from "otplib/preset-default";
import QRCode from "qrcode";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const secret = authenticator.generateSecret();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const issuer = "CopyTrade Engine";
  const otpAuthUrl = authenticator.keyuri(user?.email ?? userId, issuer, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

  // Secret is stored but twoFactorEnabled stays false until /verify confirms
  // the user actually scanned it and can produce a valid code.
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });

  return NextResponse.json({ qrCodeDataUrl, secret });
}
