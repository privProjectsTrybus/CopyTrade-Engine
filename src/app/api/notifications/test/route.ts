import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "NotificationSettings" WHERE "userId" = $1 LIMIT 1`, userId
  ).catch(() => []);
  const s = rows[0];

  if (!s?.telegramEnabled || !s?.telegramChatId) {
    return NextResponse.json({ error: "Enable Telegram and set Chat ID first." }, { status: 400 });
  }

  const token = s.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "No bot token found. Paste it in the Telegram Bot Token field." }, { status: 400 });
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: s.telegramChatId,
      text: "✅ *CopyTrade Engine*\n\nTelegram alerts are working\\!",
      parse_mode: "MarkdownV2",
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.description ?? "Telegram error" }, { status: 502 });
  return NextResponse.json({ success: true });
}
