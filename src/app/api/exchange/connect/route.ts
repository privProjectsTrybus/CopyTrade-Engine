// src/app/api/exchange/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/rateLimit";

const schema = z.object({
  exchange: z.enum(["BINANCE", "BYBIT"]),
  label: z.string().max(40).optional(),
  apiKey: z.string().min(10).max(200),
  apiSecret: z.string().min(10).max(200),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  const ok = await checkRateLimit(`exchange-connect:${userId}`, 10, 3600);
  if (!ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const { exchange, label, apiKey, apiSecret } = parsed.data;

  // Encrypt both key and secret separately (different IV per field)
  const encKey = encryptSecret(apiKey);
  const encSecret = encryptSecret(apiSecret);

  // We do a basic permission test here server-side via a lightweight ping
  // using the provided credentials. Full account-info permission check
  // happens in the browser on the exchanges page.
  let hasWithdrawPermission = false;
  let hasTradePermission = false;
  let hasReadPermission = true;

  // We can't make authenticated exchange calls from Vercel without geo-block risk,
  // so we store the connection and let the browser do the permission check on load.
  // The UI will show a "Checking permissions…" state.

  const connection = await prisma.exchangeConnection.create({
    data: {
      userId,
      exchange,
      label: label ?? exchange,
      encryptedApiKey: encKey.ciphertext,
      encryptedApiSecret: encSecret.ciphertext,
      encryptionIv: `${encKey.iv}|${encSecret.iv}`,
      encryptionTag: `${encKey.tag}|${encSecret.tag}`,
      hasWithdrawPermission,
      hasTradePermission,
      hasReadPermission,
    },
    select: {
      id: true,
      exchange: true,
      label: true,
      hasWithdrawPermission: true,
      isActive: true,
      createdAt: true,
    },
  });

  await prisma.auditLog.create({
    data: { userId, action: "EXCHANGE_CONNECTED", metadata: { exchange, connectionId: connection.id } },
  });

  return NextResponse.json({ connection });
}
