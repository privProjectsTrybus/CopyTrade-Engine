// src/lib/notifications.ts
// ----------------------------------------------------------------
// Notification dispatcher. Called server-side from API routes.
// Each channel is gated by the user's NotificationSettings.
// ----------------------------------------------------------------

import { prisma } from "./prisma";

export type NotificationEvent =
  | "TRADE_OPEN"
  | "TRADE_CLOSE"
  | "STOP_LOSS_HIT"
  | "RISK_BREACH"
  | "EXCHANGE_ERROR"
  | "AI_SIGNAL";

export interface NotificationPayload {
  userId: string;
  event: NotificationEvent;
  title: string;
  body: string;
}

export async function dispatch(payload: NotificationPayload) {
  const settings = await prisma.notificationSettings.findUnique({
    where: { userId: payload.userId },
  });

  if (!settings) return; // user has no preferences — skip silently

  const eventKey = eventToKey(payload.event);
  if (!(settings as any)[eventKey]) return; // user turned this event off

  // Always persist to DB for the in-app notification feed
  await prisma.notification.create({
    data: {
      userId: payload.userId,
      channel: "BROWSER",
      title: payload.title,
      body: payload.body,
    },
  }).catch(() => {});

  const results = await Promise.allSettled([
    settings.emailEnabled ? sendEmail(payload) : Promise.resolve(),
    settings.telegramEnabled && settings.telegramChatId
      ? sendTelegram(settings.telegramChatId, payload)
      : Promise.resolve(),
    settings.discordEnabled && settings.discordWebhookUrl
      ? sendDiscord(settings.discordWebhookUrl, payload)
      : Promise.resolve(),
  ]);

  // Log failures without crashing the request
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`Notification channel ${i} failed:`, r.reason);
    }
  });
}

function eventToKey(event: NotificationEvent): string {
  return {
    TRADE_OPEN: "onTradeOpen",
    TRADE_CLOSE: "onTradeClose",
    STOP_LOSS_HIT: "onStopLossHit",
    RISK_BREACH: "onRiskBreach",
    EXCHANGE_ERROR: "onExchangeError",
    AI_SIGNAL: "onAiSignal",
  }[event];
}

// ---- Email via Resend ----

async function sendEmail(payload: NotificationPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { email: true },
  });
  if (!user?.email) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "CopyTrade Engine <noreply@copytrade.app>",
      to: [user.email],
      subject: payload.title,
      html: `<div style="font-family:monospace;background:#000;color:#fff;padding:24px;border-radius:8px">
        <h2 style="color:#3b82f6;margin:0 0 12px">${payload.title}</h2>
        <p style="color:#a1a1aa;margin:0">${payload.body}</p>
        <hr style="border-color:#27272a;margin:16px 0">
        <p style="color:#52525b;font-size:12px">CopyTrade Engine — manage your settings at /settings</p>
      </div>`,
    }),
  });
}

// ---- Telegram ----

async function sendTelegram(chatId: string, payload: NotificationPayload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const text = `*${escapeMarkdown(payload.title)}*\n${escapeMarkdown(payload.body)}`;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "MarkdownV2" }),
  });
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

// ---- Discord ----

async function sendDiscord(webhookUrl: string, payload: NotificationPayload) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: payload.title,
        description: payload.body,
        color: colorForEvent(payload.event),
        timestamp: new Date().toISOString(),
        footer: { text: "CopyTrade Engine" },
      }],
    }),
  });
}

function colorForEvent(event: NotificationEvent): number {
  return {
    TRADE_OPEN: 0x3b82f6,    // blue
    TRADE_CLOSE: 0x16c784,   // green
    STOP_LOSS_HIT: 0xea3943, // red
    RISK_BREACH: 0xf59e0b,   // amber
    EXCHANGE_ERROR: 0xf59e0b,
    AI_SIGNAL: 0x8b5cf6,     // purple
  }[event] ?? 0x71717a;
}
