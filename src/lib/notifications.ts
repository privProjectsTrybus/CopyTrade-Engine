import { prisma } from "./prisma";

export type NotificationEvent = "TRADE_OPEN"|"TRADE_CLOSE"|"STOP_LOSS_HIT"|"RISK_BREACH"|"EXCHANGE_ERROR"|"AI_SIGNAL";

export interface NotificationPayload {
  userId: string; event: NotificationEvent; title: string; body: string;
}

export async function dispatch(payload: NotificationPayload) {
  const settings = await prisma.notificationSettings.findUnique({ where: { userId: payload.userId } });
  if (!settings) return;

  const eventKey = ({ TRADE_OPEN:"onTradeOpen", TRADE_CLOSE:"onTradeClose", STOP_LOSS_HIT:"onStopLossHit", RISK_BREACH:"onRiskBreach", EXCHANGE_ERROR:"onExchangeError", AI_SIGNAL:"onAiSignal" } as any)[payload.event];
  if (!(settings as any)[eventKey]) return;

  await prisma.notification.create({ data: { userId: payload.userId, channel: "BROWSER", title: payload.title, body: payload.body } }).catch(() => {});

  await Promise.allSettled([
    settings.emailEnabled ? sendEmail(payload) : Promise.resolve(),
    settings.telegramEnabled && settings.telegramChatId ? sendTelegram(settings, payload) : Promise.resolve(),
    settings.discordEnabled && settings.discordWebhookUrl ? sendDiscord(settings.discordWebhookUrl, payload) : Promise.resolve(),
  ]);
}

async function sendEmail(payload: NotificationPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { email: true } });
  if (!user?.email) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "CopyTrade Engine <noreply@copytrade.app>", to: [user.email], subject: payload.title, text: payload.body }),
  });
}

async function sendTelegram(settings: any, payload: NotificationPayload) {
  // Use DB-stored token first, fall back to env var
  const token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !settings.telegramChatId) return;

  const text = `*${escMd(payload.title)}*\n${escMd(payload.body)}`;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: settings.telegramChatId, text, parse_mode: "MarkdownV2" }),
  });
}

function escMd(t: string) { return t.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&"); }

async function sendDiscord(webhookUrl: string, payload: NotificationPayload) {
  const colors: Record<NotificationEvent, number> = {
    TRADE_OPEN:0x3b82f6, TRADE_CLOSE:0x16c784, STOP_LOSS_HIT:0xea3943,
    RISK_BREACH:0xf59e0b, EXCHANGE_ERROR:0xf59e0b, AI_SIGNAL:0x8b5cf6,
  };
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [{ title: payload.title, description: payload.body, color: colors[payload.event], timestamp: new Date().toISOString(), footer: { text: "CopyTrade Engine" } }] }),
  });
}
