import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreSignal, gradeEmoji } from "@/lib/aiScoring";

function esc(t: string) { return t.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&"); }

async function sendTelegram(token: string, chatId: string, trader: any, pos: any, score: any, sizeInfo: string) {
  const side = pos.side === "LONG" ? "🟢 LONG" : "🔴 SHORT";
  const text = `${gradeEmoji(score.grade)} *${esc(score.grade)} SIGNAL \\(${score.score}/100\\)*

👤 *${esc(trader.nickname)}* \\| ${esc(trader.source)}
📊 ROI: *${esc((trader.roi >= 0 ? "+" : "") + trader.roi.toFixed(1) + "%")}* \\| Win: *${esc(trader.winRate.toFixed(0) + "%")}*
${trader.maxDrawdown != null ? `📉 Max DD: *${esc(trader.maxDrawdown.toFixed(1) + "%")}*` : ""}

${side} *${esc(pos.symbol)}*
💰 Entry: *\\$${esc(pos.entryPrice.toLocaleString())}*
⚡ Leverage: *${esc(String(pos.leverage))}x*
📈 ROE: *${esc((pos.roe >= 0 ? "+" : "") + pos.roe.toFixed(2) + "%")}*
${sizeInfo ? `\n💼 ${esc(sizeInfo)}` : ""}

_${esc(score.reasons.slice(0, 2).join(" · "))}_`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId, text, parse_mode: "MarkdownV2",
      reply_markup: { inline_keyboard: [[
        { text: `Trade ${pos.symbol} on Bybit`, url: `https://www.bybit.com/trade/usdt/${pos.symbol}` }
      ]]}
    }),
  });
  return res.ok;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { traders, filters, accountBalance } = await req.json();
  if (!filters?.autoAlertEnabled) return NextResponse.json({ skipped: true });

  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "NotificationSettings" WHERE "userId" = $1 LIMIT 1`, userId).catch(() => []);
  const settings = rows[0];
  const token = settings?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = settings?.telegramChatId;
  if (!token || !chatId) return NextResponse.json({ error: "Telegram not configured" }, { status: 400 });

  // Load seen positions
  const seen = await prisma.auditLog.findMany({
    where: { userId, action: "AUTO_ALERT_SENT" },
    orderBy: { createdAt: "desc" }, take: 1000,
  });
  const seenKeys = new Set(seen.map(l => (l.metadata as any)?.positionKey));

  let alertsSent = 0;
  const minScore = filters.minScore ?? 0;

  for (const trader of traders) {
    if (trader.roi < (filters.minRoi ?? 0)) continue;
    if (trader.winRate > 0 && trader.winRate < (filters.minWinRate ?? 0)) continue;
    if (trader.maxDrawdown != null && trader.maxDrawdown > (filters.maxDrawdown ?? 100)) continue;
    if (!trader.positions?.length) continue;

    for (const pos of trader.positions) {
      const key = `${trader.uid}:${pos.symbol}:${pos.side}:${Math.round(pos.entryPrice)}`;
      if (seenKeys.has(key)) continue;

      const score = scoreSignal(trader, pos);
      if (score.score < minScore) { await prisma.auditLog.create({ data: { userId, action: "AUTO_ALERT_SENT", metadata: { positionKey: key, skipped: true, score: score.score } } }); continue; }

      // Position size hint
      let sizeInfo = "";
      if (accountBalance && pos.entryPrice > 0) {
        const riskAmt = accountBalance * 0.01;
        const slDist = pos.entryPrice * 0.02;
        const size = slDist > 0 ? riskAmt / slDist : 0;
        sizeInfo = `At 1% risk: ${size.toFixed(4)} ${pos.symbol.replace("USDT", "")} ($${(size * pos.entryPrice).toFixed(0)} notional)`;
      }

      try {
        const ok = await sendTelegram(token, chatId, trader, pos, score, sizeInfo);
        if (ok) {
          alertsSent++;
          await prisma.auditLog.create({ data: { userId, action: "AUTO_ALERT_SENT", metadata: { positionKey: key, score: score.score, grade: score.grade, symbol: pos.symbol, side: pos.side, trader: trader.nickname } } });
        }
      } catch {}
      await new Promise(r => setTimeout(r, 300)); // rate limit
    }
  }

  return NextResponse.json({ alertsSent });
}
