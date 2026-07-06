import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function esc(t: string) { return t.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&"); }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { trader, position } = await req.json();

  const settings = await prisma.notificationSettings.findUnique({ where: { userId } });
  const token = (settings as any)?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = settings?.telegramChatId;

  if (!token || !chatId) {
    return NextResponse.json({ error: "Telegram not configured. Go to Notifications → enter your Bot Token and Chat ID → Save." }, { status: 400 });
  }

  const side = position.side === "LONG" ? "🟢 LONG" : "🔴 SHORT";
  const roe = `${position.roe >= 0 ? "+" : ""}${position.roe.toFixed(2)}%`;

  const text = `📡 *New Signal*

Trader: *${esc(trader.nickname)}* \\(${esc(trader.source)}\\)
ROI: *${esc((trader.roi >= 0 ? "+" : "") + trader.roi.toFixed(1) + "%")}*

${side} *${esc(position.symbol)}*
Entry: *$${esc(position.entryPrice.toLocaleString())}*
Leverage: *${esc(String(position.leverage))}x*
ROE: *${esc(roe)}*`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId, text, parse_mode: "MarkdownV2",
      reply_markup: { inline_keyboard: [[{ text: "Open on Bybit", url: `https://www.bybit.com/trade/usdt/${position.symbol}` }]] },
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.description ?? "Telegram error" }, { status: 502 });
  return NextResponse.json({ success: true });
}
