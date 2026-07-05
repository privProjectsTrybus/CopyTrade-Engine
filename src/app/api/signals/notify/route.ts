// src/app/api/signals/notify/route.ts
// Sends Telegram alert for a new trader position
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { trader, position } = await req.json();

  // Get user's telegram settings
  const settings = await prisma.notificationSettings.findUnique({ where: { userId } });
  if (!settings?.telegramEnabled || !settings.telegramChatId) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });

  const side = position.side === "LONG" ? "🟢 LONG" : "🔴 SHORT";
  const roe = position.roe >= 0 ? `+${position.roe.toFixed(2)}%` : `${position.roe.toFixed(2)}%`;
  const bybitUrl = `https://www.bybit.com/trade/usdt/${position.symbol}`;

  const text = `📡 *New Signal Detected*

*Trader:* ${escapeMarkdown(trader.nickname)} \\(${trader.source}\\)
*ROI:* ${trader.roi >= 0 ? "+" : ""}${trader.roi.toFixed(1)}%

*${side}* ${escapeMarkdown(position.symbol)}
Entry: *$${escapeMarkdown(position.entryPrice.toLocaleString())}*
Leverage: *${position.leverage}x*
ROE: *${escapeMarkdown(roe)}*

[Open on Bybit](${bybitUrl})`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: settings.telegramChatId,
      text,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.description }, { status: 502 });
  return NextResponse.json({ success: true });
}
