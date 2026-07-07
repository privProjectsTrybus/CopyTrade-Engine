// src/app/api/signals/auto-alert/route.ts
// Called by the client every 60s (same poll as the signals page).
// Compares current trader positions against what was last seen (stored in DB via AuditLog).
// Sends Telegram automatically for any new position that passes quality filters.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function esc(t: string) { return t.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&"); }

async function sendTelegram(token: string, chatId: string, trader: any, position: any) {
  const side = position.side === "LONG" ? "🟢 LONG" : "🔴 SHORT";
  const roe = `${position.roe >= 0 ? "+" : ""}${position.roe.toFixed(2)}%`;

  const text = `🚨 *AUTO\\-ALERT: New Position Detected*

👤 *${esc(trader.nickname)}* \\(${esc(trader.source)}\\)
📊 ROI: *${esc((trader.roi >= 0 ? "+" : "") + trader.roi.toFixed(1) + "%")}* \\| Win Rate: *${esc(trader.winRate.toFixed(0) + "%")}*

${side} *${esc(position.symbol)}*
💰 Entry: *\\$${esc(position.entryPrice.toLocaleString())}*
⚡ Leverage: *${esc(String(position.leverage))}x*
📈 ROE: *${esc(roe)}*

_Open Bybit and place manually_`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [[
          { text: `📱 Trade ${position.symbol} on Bybit`, url: `https://www.bybit.com/trade/usdt/${position.symbol}` },
        ]],
      },
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { traders, filters } = await req.json();
  // traders: RealTrader[] from the client's current fetch
  // filters: { minRoi, minWinRate, maxDrawdown, autoAlertEnabled }

  if (!filters?.autoAlertEnabled) return NextResponse.json({ skipped: true });

  // Get Telegram settings
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "NotificationSettings" WHERE "userId" = $1 LIMIT 1`, userId
  ).catch(() => []);
  const settings = rows[0];
  const token = settings?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = settings?.telegramChatId;

  if (!token || !chatId) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 400 });
  }

  // Load previously seen position keys from AuditLog
  const seenLogs = await prisma.auditLog.findMany({
    where: { userId, action: "AUTO_ALERT_SENT" },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const seenKeys = new Set(seenLogs.map(l => (l.metadata as any)?.positionKey));

  let alertsSent = 0;
  const newSeen: string[] = [];

  for (const trader of traders) {
    // Quality filter
    if (trader.roi < (filters.minRoi ?? 0)) continue;
    if (trader.winRate > 0 && trader.winRate < (filters.minWinRate ?? 0)) continue;
    if (trader.maxDrawdown != null && trader.maxDrawdown > (filters.maxDrawdown ?? 100)) continue;
    if (!trader.positions || trader.positions.length === 0) continue;

    for (const pos of trader.positions) {
      // Unique key per trader+symbol+side+entry (changes if entry price changes = new position)
      const key = `${trader.uid}:${pos.symbol}:${pos.side}:${pos.entryPrice}`;
      if (seenKeys.has(key)) continue;

      // New position — send alert
      try {
        await sendTelegram(token, chatId, trader, pos);
        alertsSent++;

        // Log it so we don't alert again
        await prisma.auditLog.create({
          data: {
            userId,
            action: "AUTO_ALERT_SENT",
            metadata: {
              positionKey: key,
              traderNickname: trader.nickname,
              traderSource: trader.source,
              symbol: pos.symbol,
              side: pos.side,
              entryPrice: pos.entryPrice,
              leverage: pos.leverage,
            },
          },
        });
        newSeen.push(key);
      } catch (e) {
        console.error("Auto-alert send failed:", e);
      }
    }
  }

  return NextResponse.json({ alertsSent, newPositions: newSeen.length });
}
