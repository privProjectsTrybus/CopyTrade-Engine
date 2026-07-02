"use client";
// src/app/(app)/notifications/page.tsx
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Badge";

interface Settings {
  browserEnabled: boolean; emailEnabled: boolean;
  telegramEnabled: boolean; telegramChatId: string | null;
  discordEnabled: boolean; discordWebhookUrl: string | null;
  onTradeOpen: boolean; onTradeClose: boolean; onStopLossHit: boolean;
  onRiskBreach: boolean; onExchangeError: boolean; onAiSignal: boolean;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0 cursor-pointer">
      <span className="text-zinc-300 text-sm">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors relative ${checked ? "bg-blue-600" : "bg-zinc-700"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/settings")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setSettings(d); setLoading(false); });
  }, []);

  function set<K extends keyof Settings>(key: K, val: Settings[K]) {
    setSettings(s => s ? { ...s, [key]: val } : s);
    setSaved(false);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    await fetch("/api/notifications/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function sendTest() {
    setTesting(true);
    await fetch("/api/notifications/test", { method: "POST" });
    setTesting(false); setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  }

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;
  if (!settings) return <div className="p-6 text-zinc-400">Failed to load settings.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold">Notifications</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Configure delivery channels and event triggers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={sendTest} disabled={testing}
            className="border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 px-4 py-2 rounded-lg text-sm transition-colors">
            {testing ? "Sending…" : testSent ? "✓ Sent" : "Send Test"}
          </button>
          <button onClick={save} disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Channels */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-medium">Channels</h2>

        <Toggle label="Browser (in-app notification feed)" checked={settings.browserEnabled} onChange={v => set("browserEnabled", v)} />
        <Toggle label="Email (via Resend — set RESEND_API_KEY in env)" checked={settings.emailEnabled} onChange={v => set("emailEnabled", v)} />

        <div>
          <Toggle label="Telegram" checked={settings.telegramEnabled} onChange={v => set("telegramEnabled", v)} />
          {settings.telegramEnabled && (
            <div className="mt-2 space-y-2">
              <input
                value={settings.telegramChatId ?? ""}
                onChange={e => set("telegramChatId", e.target.value)}
                placeholder="Telegram Chat ID (start a chat with your bot, then /start)"
                className="w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm"
              />
              <p className="text-zinc-600 text-xs">Set TELEGRAM_BOT_TOKEN in env. Get chat ID from @userinfobot.</p>
            </div>
          )}
        </div>

        <div>
          <Toggle label="Discord" checked={settings.discordEnabled} onChange={v => set("discordEnabled", v)} />
          {settings.discordEnabled && (
            <div className="mt-2 space-y-2">
              <input
                value={settings.discordWebhookUrl ?? ""}
                onChange={e => set("discordWebhookUrl", e.target.value)}
                placeholder="Discord Webhook URL"
                className="w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm"
              />
              <p className="text-zinc-600 text-xs">Server Settings → Integrations → Webhooks → New Webhook → Copy URL.</p>
            </div>
          )}
        </div>
      </div>

      {/* Events */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-white font-medium mb-2">Notify me when…</h2>
        <Toggle label="Trade opens" checked={settings.onTradeOpen} onChange={v => set("onTradeOpen", v)} />
        <Toggle label="Trade closes" checked={settings.onTradeClose} onChange={v => set("onTradeClose", v)} />
        <Toggle label="Stop loss hit" checked={settings.onStopLossHit} onChange={v => set("onStopLossHit", v)} />
        <Toggle label="Risk limit breached" checked={settings.onRiskBreach} onChange={v => set("onRiskBreach", v)} />
        <Toggle label="Exchange error" checked={settings.onExchangeError} onChange={v => set("onExchangeError", v)} />
        <Toggle label="AI signal generated" checked={settings.onAiSignal} onChange={v => set("onAiSignal", v)} />
      </div>
    </div>
  );
}
