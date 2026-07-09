"use client";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";

interface RiskProfile {
  maxAccountExposurePct:number; maxTradeRiskPct:number; maxDailyLossPct:number;
  maxWeeklyLossPct:number; maxMonthlyLossPct:number; maxOpenPositions:number;
  isPaused:boolean; pausedReason:string|null; pausedAt:string|null;
}

function RiskRow({ label, desc, field, value, min, max, step=0.5, suffix="%", onChange }:any) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 0", borderBottom:"1px solid var(--border)" }}>
      <div style={{ flex:1, paddingRight:24 }}>
        <p style={{ color:"var(--text)", fontSize:13, fontWeight:500 }}>{label}</p>
        <p style={{ color:"var(--text-faint)", fontSize:11, marginTop:3, lineHeight:1.4 }}>{desc}</p>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(field,parseFloat(e.target.value))}
          className="input" style={{ width:80, textAlign:"right" }} />
        <span style={{ color:"var(--text-faint)", fontSize:12, width:24 }}>{suffix}</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [p, setP] = useState<RiskProfile|null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [unpausing, setUnpausing] = useState(false);

  useEffect(() => {
    fetch("/api/risk").then(r=>r.ok?r.json():null).then(d=>{setP(d);setLoading(false);});
  },[]);

  const set = (k:string,v:any) => { setP(p=>p?{...p,[k]:v}:p); setSaved(false); };

  async function save() {
    if(!p) return; setSaving(true);
    await fetch("/api/risk",{ method:"PUT", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ maxAccountExposurePct:p.maxAccountExposurePct, maxTradeRiskPct:p.maxTradeRiskPct,
        maxDailyLossPct:p.maxDailyLossPct, maxWeeklyLossPct:p.maxWeeklyLossPct,
        maxMonthlyLossPct:p.maxMonthlyLossPct, maxOpenPositions:p.maxOpenPositions }) });
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),3000);
  }

  async function unpause() {
    setUnpausing(true);
    await fetch("/api/risk",{ method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({isPaused:false,pausedReason:null}) });
    setP(p=>p?{...p,isPaused:false,pausedReason:null}:p); setUnpausing(false);
  }

  if(loading) return <div style={{display:"flex",justifyContent:"center",padding:80}}><Spinner size="lg"/></div>;
  if(!p) return null;

  return (
    <div className="page" style={{ maxWidth:660 }}>
      <div className="page-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 className="page-title">Risk Settings</h1>
          <p className="page-sub">All limits enforced before every trade. Breaches pause the engine automatically.</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {saved && <span style={{ color:"var(--profit)", fontSize:12 }}>✓ Saved</span>}
          <button onClick={save} disabled={saving} className="btn btn-primary">{saving?"Saving…":"Save Changes"}</button>
        </div>
      </div>

      {p.isPaused && (
        <div className="animate-fade" style={{ background:"rgba(255,68,102,0.06)", border:"1px solid rgba(255,68,102,0.25)", borderRadius:12, padding:"16px 20px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
          <div>
            <p style={{ color:"var(--loss)", fontWeight:600, fontSize:13 }}>⚠ Engine Paused</p>
            <p style={{ color:"var(--text-muted)", fontSize:12, marginTop:3 }}>{p.pausedReason}</p>
          </div>
          <button onClick={unpause} disabled={unpausing} className="btn btn-ghost">{unpausing?"…":"Resume Engine"}</button>
        </div>
      )}

      <div className="card animate-fade" style={{ padding:"0 20px" }}>
        <RiskRow label="Max Account Exposure" desc="Total notional of open positions as % of wallet." field="maxAccountExposurePct" value={p.maxAccountExposurePct} min={5} max={100} step={5} onChange={set} />
        <RiskRow label="Max Trade Risk" desc="Max loss a single trade can cause (margin × stop-loss ÷ wallet)." field="maxTradeRiskPct" value={p.maxTradeRiskPct} min={0.1} max={10} step={0.1} onChange={set} />
        <RiskRow label="Max Daily Loss" desc="No new trades open until tomorrow if this is reached." field="maxDailyLossPct" value={p.maxDailyLossPct} min={0.5} max={20} step={0.5} onChange={set} />
        <RiskRow label="Max Weekly Loss" desc="Engine pauses — requires manual reactivation." field="maxWeeklyLossPct" value={p.maxWeeklyLossPct} min={1} max={30} step={1} onChange={set} />
        <RiskRow label="Max Monthly Loss" desc="Hardest brake. Requires review before resuming." field="maxMonthlyLossPct" value={p.maxMonthlyLossPct} min={2} max={50} step={1} onChange={set} />
        <RiskRow label="Max Open Positions" desc="Engine won't open new positions past this count." field="maxOpenPositions" value={p.maxOpenPositions} min={1} max={50} step={1} suffix="pos" onChange={set} />
      </div>

      <div className="card" style={{ padding:"14px 18px", marginTop:14, fontSize:12, color:"var(--text-faint)" }}>
        Defaults: 30% · 1% · 3% · 7% · 12% · 10 positions. Leverage hard-capped at 20× regardless of settings.
      </div>
    </div>
  );
}
