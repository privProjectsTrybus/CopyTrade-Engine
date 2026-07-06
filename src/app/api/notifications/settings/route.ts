import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Auto-heal missing columns and missing rows — no user action needed
async function ensureSchema() {
  try {
    // Add telegramBotToken column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "NotificationSettings"
      ADD COLUMN IF NOT EXISTS "telegramBotToken" TEXT;
    `);
  } catch {}
}

async function ensureRow(userId: string) {
  // Use raw upsert to avoid Prisma complaining about unknown columns during cold start
  await prisma.$executeRawUnsafe(`
    INSERT INTO "NotificationSettings" (id, "userId", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, now())
    ON CONFLICT ("userId") DO NOTHING;
  `, userId);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  await ensureSchema();
  await ensureRow(userId);

  const settings = await prisma.notificationSettings.findUnique({ where: { userId } });
  if (!settings) return NextResponse.json({ error: "Could not load settings" }, { status: 500 });
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  await ensureSchema();
  await ensureRow(userId);

  const body = await req.json();
  const allowed = [
    "browserEnabled", "emailEnabled", "telegramEnabled", "telegramChatId",
    "telegramBotToken", "discordEnabled", "discordWebhookUrl",
    "onTradeOpen", "onTradeClose", "onStopLossHit", "onRiskBreach",
    "onExchangeError", "onAiSignal",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) data[key] = body[key]; }

  const settings = await prisma.notificationSettings.update({
    where: { userId },
    data,
  });
  return NextResponse.json(settings);
}
