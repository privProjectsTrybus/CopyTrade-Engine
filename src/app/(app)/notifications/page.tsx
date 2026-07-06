"use client";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Badge";

interface Settings {
  browserEnabled: boolean; emailEnabled: boolean;
  telegramEnabled: boolean; telegramChatId: string | null;
  telegramBotToken: string | null;
  discordEnabled: boolean; discordWebhookUrl: string | null;
  onTradeOpen: boolean; onTradeClose: boolean; onStopLossHit: boolean;
  onRiskBreach: boolean; onExchangeError: boolean; onAiSignal: boolean;
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <p style={{ color: "var(--text)", fontSize: 14, margin: 0 }}>{label}</p>
        {desc && <p style={{ color: "var(--text-faint)", fontSize: 12, margin: "2px 0 0" }}>{desc}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        style={{ width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer", position: "relative", background: checked ? "var(--accent)" : "var(--bg-hover)", transition: "background 0.2s", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 3, width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "transform 0.2s", transform: checked ? "translateX(22px)" : "translateX(3px)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
      </button>
    </div>
  );
}

const inp: React.CSSProperties = { marginTop: 6, width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text)", fontSize: 13, boxSizing: "border-box" };
const card: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 };

export default function NotificationsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/notifications/settings")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setSettings(d);
        setLoading(false);
      })
      .catch(() => { setError("Network error loading settings."); setLoading(false); });
  }, []);

  function set<K extends keyof Settings>(key: K, val: Settings[K]) {
    setSettings(s => s ? { ...s, [key]: val } : s);
    setSaved(false);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    const res = await fetch("/api/notifications/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setError("Failed to save");
  }

  async function sendTest() {
    setTesting(true); setTestResult(null);
    // Save first so the token/chatId is persisted before testing
    if (settings) {
      await fetch("/api/notifications/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    }
    const res = await fetch("/api/notifications/test", { method: "POST" });
    const data = await res.json();
    setTesting(false);
    setTestResult({ ok: res.ok, msg: res.ok ? "✓ Test sent! Check your Telegram." : data.error ?? "Failed" });
    setTimeout(() => setTestResult(null), 5000);
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spinner size="lg" /></div>;

  if (error && !settings) return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <div style={{ ...card, borderColor: "rgba(234,57,67,0.3)" }}>
        <p style={{ color: "var(--loss)", margin: 0 }}>⚠ {error}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, cursor: "pointer" }}>
          Retry
        </button>
      </div>
    </div>
  );

  if (!settings) return null;

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "var(--text)", fontSize: 22, fontWeight: 600, margin: 0 }}>Notifications</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Configure how you get alerted about signals and trades</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {testResult && <span style={{ color: testResult.ok ? "var(--profit)" : "var(--loss)", fontSize: 13 }}>{testResult.msg}</span>}
          <button onClick={sendTest} disabled={testing || !settings.telegramEnabled}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", opacity: testing || !settings.telegramEnabled ? 0.4 : 1 }}>
            {testing ? "Sending…" : "Send Test"}
          </button>
          <button onClick={save} disabled={saving}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Telegram */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h2 style={{ color: "var(--text)", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>📱 Telegram</h2>
        <p style={{ color: "var(--text-faint)", fontSize: 12, margin: "0 0 12px" }}>Get instant alerts on your phone when signals appear.</p>
        <Toggle label="Enable Telegram alerts" checked={settings.telegramEnabled} onChange={v => set("telegramEnabled", v)} />
        {settings.telegramEnabled && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Bot Token <span style={{ color: "var(--text-faint)" }}>— from @BotFather on Telegram</span>
              </label>
              <input type="password" value={settings.telegramBotToken ?? ""} onChange={e => set("telegramBotToken", e.target.value)}
                placeholder="1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" style={inp} />
            </div>
            <div>
              <label style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Your Chat ID <span style={{ color: "var(--text-faint)" }}>— send /start to your bot, then message @userinfobot</span>
              </label>
              <input value={settings.telegramChatId ?? ""} onChange={e => set("telegramChatId", e.target.value)}
                placeholder="123456789" style={inp} />
            </div>
            <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "rgba(147,197,253,1)" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 600 }}>Setup steps</p>
              <ol style={{ margin: 0, paddingLeft: 16, color: "rgba(147,197,253,0.8)", lineHeight: 1.8 }}>
                <li>Open Telegram → search <b>@BotFather</b> → send <code>/newbot</code></li>
                <li>Copy the token it gives you → paste above</li>
                <li>Search your new bot → send it <code>/start</code></li>
                <li>Search <b>@userinfobot</b> → send any message → copy the ID it replies with</li>
                <li>Click Save → Send Test</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Discord */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h2 style={{ color: "var(--text)", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>💬 Discord</h2>
        <p style={{ color: "var(--text-faint)", fontSize: 12, margin: "0 0 12px" }}>Post alerts to a Discord channel via webhook.</p>
        <Toggle label="Enable Discord alerts" checked={settings.discordEnabled} onChange={v => set("discordEnabled", v)} />
        {settings.discordEnabled && (
          <div style={{ marginTop: 14 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 13 }}>Webhook URL</label>
            <input value={settings.discordWebhookUrl ?? ""} onChange={e => set("discordWebhookUrl", e.target.value)}
              placeholder="https://discord.com/api/webhooks/…" style={inp} />
            <p style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 6 }}>Discord server → Settings → Integrations → Webhooks → New Webhook → Copy URL</p>
          </div>
        )}
      </div>

      {/* Email */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h2 style={{ color: "var(--text)", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>✉️ Email</h2>
        <p style={{ color: "var(--text-faint)", fontSize: 12, margin: "0 0 12px" }}>Requires RESEND_API_KEY in Vercel environment variables.</p>
        <Toggle label="Enable email alerts" checked={settings.emailEnabled} onChange={v => set("emailEnabled", v)} />
      </div>

      {/* Events */}
      <div style={{ ...card }}>
        <h2 style={{ color: "var(--text)", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Alert Events</h2>
        <p style={{ color: "var(--text-faint)", fontSize: 12, margin: "0 0 4px" }}>Choose which events trigger a notification.</p>
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
