import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Use raw SQL throughout — bypasses Prisma client column expectations entirely.
// This means we never fail due to missing columns in the DB.

async function bootstrap(userId: string) {
  // Add missing columns (IF NOT EXISTS is safe to run every time)
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "telegramBotToken" TEXT`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "browserEnabled" BOOLEAN NOT NULL DEFAULT true`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "emailEnabled" BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "telegramEnabled" BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "discordEnabled" BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "discordWebhookUrl" TEXT`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "onTradeOpen" BOOLEAN NOT NULL DEFAULT true`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "onTradeClose" BOOLEAN NOT NULL DEFAULT true`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "onStopLossHit" BOOLEAN NOT NULL DEFAULT true`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "onRiskBreach" BOOLEAN NOT NULL DEFAULT true`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "onExchangeError" BOOLEAN NOT NULL DEFAULT true`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "onAiSignal" BOOLEAN NOT NULL DEFAULT true`).catch(() => {});

  // Create "NotificationSettings" table if it doesn't exist at all
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "NotificationSettings" (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "browserEnabled" BOOLEAN NOT NULL DEFAULT true,
      "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
      "telegramEnabled" BOOLEAN NOT NULL DEFAULT false,
      "telegramChatId" TEXT,
      "telegramBotToken" TEXT,
      "discordEnabled" BOOLEAN NOT NULL DEFAULT false,
      "discordWebhookUrl" TEXT,
      "onTradeOpen" BOOLEAN NOT NULL DEFAULT true,
      "onTradeClose" BOOLEAN NOT NULL DEFAULT true,
      "onStopLossHit" BOOLEAN NOT NULL DEFAULT true,
      "onRiskBreach" BOOLEAN NOT NULL DEFAULT true,
      "onExchangeError" BOOLEAN NOT NULL DEFAULT true,
      "onAiSignal" BOOLEAN NOT NULL DEFAULT true,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    )
  `).catch(() => {});

  // Also ensure RiskProfile exists for this user
  await prisma.$executeRawUnsafe(`
    INSERT INTO "RiskProfile" (id, "userId", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, now())
    ON CONFLICT ("userId") DO NOTHING
  `, userId).catch(() => {});

  // Upsert the row
  await prisma.$executeRawUnsafe(`
    INSERT INTO "NotificationSettings" (id, "userId", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, now())
    ON CONFLICT ("userId") DO NOTHING
  `, userId).catch(() => {});
}

const DEFAULTS = {
  browserEnabled: true, emailEnabled: false,
  telegramEnabled: false, telegramChatId: null, telegramBotToken: null,
  discordEnabled: false, discordWebhookUrl: null,
  onTradeOpen: true, onTradeClose: true, onStopLossHit: true,
  onRiskBreach: true, onExchangeError: true, onAiSignal: true,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  await bootstrap(userId);

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "NotificationSettings" WHERE "userId" = $1 LIMIT 1`, userId
  ).catch(() => []);

  const row = rows[0] ?? {};
  return NextResponse.json({ ...DEFAULTS, ...row });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  await bootstrap(userId);

  const body = await req.json();
  const allowed = [
    "browserEnabled","emailEnabled","telegramEnabled","telegramChatId","telegramBotToken",
    "discordEnabled","discordWebhookUrl","onTradeOpen","onTradeClose","onStopLossHit",
    "onRiskBreach","onExchangeError","onAiSignal",
  ];

  // Build SET clause
  const fields = allowed.filter(k => k in body);
  if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  const setClause = fields.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
  const values = fields.map(k => body[k]);

  await prisma.$executeRawUnsafe(
    `UPDATE "NotificationSettings" SET ${setClause}, "updatedAt" = now() WHERE "userId" = $1`,
    userId, ...values
  );

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "NotificationSettings" WHERE "userId" = $1 LIMIT 1`, userId
  );
  return NextResponse.json({ ...DEFAULTS, ...rows[0] });
}
