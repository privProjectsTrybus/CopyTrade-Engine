"use client";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";

interface Settings {
  browserEnabled:boolean; emailEnabled:boolean;
  telegramEnabled:boolean; telegramChatId:string|null; telegramBotToken:string|null;
  discordEnabled:boolean; discordWebhookUrl:string|null;
  onTradeOpen:boolean; onTradeClose:boolean; onStopLossHit:boolean;
  onRiskBreach:boolean; onExchangeError:boolean; onAiSignal:boolean;
}

function SettingRow({ label, desc, checked, onChange }: { label:string; desc?:string; checked:boolean; onChange:(v:boolean)=>void }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 0", borderBottom:"1px solid var(--border)" }}>
      <div style={{ flex:1, paddingRight:16 }}>
        <p style={{ color:"var(--text)", fontSize:13, fontWeight:500 }}>{label}</p>
        {desc && <p style={{ color:"var(--text-faint)", fontSize:12, marginTop:2, lineHeight:1.4 }}>{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function NotificationsPage() {
  const [s, setS] = useState<Settings|null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ok:boolean;text:string}|null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/notifications/settings")
      .then(r => r.json())
      .then(d => { if(d.error) setError(d.error); else setS(d); setLoading(false); })
      .catch(() => { setError("Network error"); setLoading(false); });
  }, []);

  const set = <K extends keyof Settings>(k:K, v:Settings[K]) => { setS(p => p?{...p,[k]:v}:p); setSaved(false); };

  async function save() {
    if(!s) return;
    setSaving(true);
    const res = await fetch("/api/notifications/settings",{ method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(s) });
    setSaving(false);
    if(res.ok){ setSaved(true); setTimeout(()=>setSaved(false),3000); }
  }

  async function test() {
    if(!s) return;
    // Save first
    await fetch("/api/notifications/settings",{ method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(s) });
    setTesting(true); setTestMsg(null);
    const res = await fetch("/api/notifications/test",{ method:"POST" });
    const d = await res.json();
    setTesting(false);
    setTestMsg({ ok:res.ok, text: res.ok ? "✓ Test sent! Check Telegram." : d.error??"Failed" });
    setTimeout(()=>setTestMsg(null), 5000);
  }

  if(loading) return <div style={{ display:"flex",justifyContent:"center",padding:80 }}><Spinner size="lg"/></div>;

  if(error && !s) return (
    <div className="page">
      <div className="card" style={{ padding:24, borderColor:"rgba(255,68,102,0.3)" }}>
        <p style={{ color:"var(--loss)" }}>⚠ {error}</p>
        <button onClick={()=>window.location.reload()} className="btn btn-ghost" style={{ marginTop:12 }}>Retry</button>
      </div>
    </div>
  );
  if(!s) return null;

  return (
    <div className="page" style={{ maxWidth:640 }}>
      <div className="page-header" style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">Configure alerts for signals, trades, and risk events</p>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          {testMsg && <span style={{ fontSize:12,color:testMsg.ok?"var(--profit)":"var(--loss)" }}>{testMsg.text}</span>}
          <button onClick={test} disabled={testing||!s.telegramEnabled} className="btn btn-ghost">
            {testing?"Sending…":"Send Test"}
          </button>
          <button onClick={save} disabled={saving} className="btn btn-primary">
            {saving?"Saving…":saved?"✓ Saved":"Save"}
          </button>
        </div>
      </div>

      {/* Telegram */}
      <div className="card animate-fade" style={{ padding:20,marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
          <div>
            <p style={{ color:"var(--text)",fontSize:14,fontWeight:600 }}>📱 Telegram</p>
            <p style={{ color:"var(--text-faint)",fontSize:12,marginTop:2 }}>Instant alerts straight to your phone</p>
          </div>
          <Toggle checked={s.telegramEnabled} onChange={v=>set("telegramEnabled",v)} />
        </div>
        {s.telegramEnabled && (
          <div className="animate-fade" style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <div>
              <label style={{ color:"var(--text-muted)",fontSize:12,fontWeight:500 }}>Bot Token</label>
              <input className="input" type="password" value={s.telegramBotToken??""} onChange={e=>set("telegramBotToken",e.target.value)}
                placeholder="1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" style={{ marginTop:5 }} />
            </div>
            <div>
              <label style={{ color:"var(--text-muted)",fontSize:12,fontWeight:500 }}>Chat ID</label>
              <input className="input" value={s.telegramChatId??""} onChange={e=>set("telegramChatId",e.target.value)}
                placeholder="123456789" style={{ marginTop:5 }} />
            </div>
            <div style={{ background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:10,padding:"12px 14px" }}>
              <p style={{ color:"var(--accent-light)",fontSize:12,fontWeight:600,marginBottom:6 }}>How to set up</p>
              <ol style={{ color:"var(--text-muted)",fontSize:12,paddingLeft:16,lineHeight:2 }}>
                <li>Telegram → search <b>@BotFather</b> → send <code>/newbot</code> → copy the token</li>
                <li>Open your new bot → send <code>/start</code></li>
                <li>Search <b>@userinfobot</b> → send any message → copy the ID number</li>
                <li>Paste both above → Save → Send Test</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Discord */}
      <div className="card animate-fade" style={{ padding:20,marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom: s.discordEnabled?14:0 }}>
          <div>
            <p style={{ color:"var(--text)",fontSize:14,fontWeight:600 }}>💬 Discord</p>
            <p style={{ color:"var(--text-faint)",fontSize:12,marginTop:2 }}>Post to a Discord channel via webhook</p>
          </div>
          <Toggle checked={s.discordEnabled} onChange={v=>set("discordEnabled",v)} />
        </div>
        {s.discordEnabled && (
          <div className="animate-fade">
            <label style={{ color:"var(--text-muted)",fontSize:12,fontWeight:500 }}>Webhook URL</label>
            <input className="input" value={s.discordWebhookUrl??""} onChange={e=>set("discordWebhookUrl",e.target.value)}
              placeholder="https://discord.com/api/webhooks/…" style={{ marginTop:5 }} />
            <p style={{ color:"var(--text-faint)",fontSize:11,marginTop:6 }}>
              Discord server → Settings → Integrations → Webhooks → New Webhook → Copy URL
            </p>
          </div>
        )}
      </div>

      {/* Email */}
      <div className="card animate-fade" style={{ padding:20,marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <p style={{ color:"var(--text)",fontSize:14,fontWeight:600 }}>✉️ Email</p>
            <p style={{ color:"var(--text-faint)",fontSize:12,marginTop:2 }}>Requires RESEND_API_KEY in Vercel env vars</p>
          </div>
          <Toggle checked={s.emailEnabled} onChange={v=>set("emailEnabled",v)} />
        </div>
      </div>

      {/* Events */}
      <div className="card animate-fade" style={{ padding:20 }}>
        <p style={{ color:"var(--text)",fontSize:14,fontWeight:600,marginBottom:4 }}>Alert Events</p>
        <p style={{ color:"var(--text-faint)",fontSize:12,marginBottom:4 }}>Choose what triggers a notification</p>
        <SettingRow label="Trade opens"            checked={s.onTradeOpen}      onChange={v=>set("onTradeOpen",v)} />
        <SettingRow label="Trade closes"           checked={s.onTradeClose}     onChange={v=>set("onTradeClose",v)} />
        <SettingRow label="Stop loss hit"          checked={s.onStopLossHit}    onChange={v=>set("onStopLossHit",v)} />
        <SettingRow label="Risk limit breached"    checked={s.onRiskBreach}     onChange={v=>set("onRiskBreach",v)} />
        <SettingRow label="Exchange error"         checked={s.onExchangeError}  onChange={v=>set("onExchangeError",v)} />
        <SettingRow label="AI signal generated"    checked={s.onAiSignal}       onChange={v=>set("onAiSignal",v)} />
      </div>
    </div>
  );
}
