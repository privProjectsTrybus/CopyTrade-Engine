"use client";
import { useEffect, useState, useCallback } from "react";
import { Badge, Spinner } from "@/components/ui/Badge";
import { STRATEGY_FUNCTIONS, DEFAULT_SYMBOLS } from "@/lib/strategies";
import type { StrategySignal } from "@/lib/strategies";

interface Strategy { id:string; name:string; strategyType:string; isActive:boolean; approvalMode:string; allocationPct:number; maxLeverage:number; symbols:string[]; parametersJson:Record<string,number>; signals:Signal[]; }
interface Signal { id:string; symbol:string; side:string; confidence:number; entryPrice:number; stopLossPrice:number; takeProfitPrice:number; leverage:number; rationale:string; status:string; expiresAt:string; strategy:{name:string;strategyType:string;approvalMode:string}; }

const INFO: Record<string,{label:string;desc:string;color:string}> = {
  TREND_FOLLOWING:{ label:"Trend Following", desc:"EMA crossover + RSI confirmation. Rides established trends.", color:"var(--accent)" },
  MOMENTUM:{ label:"Momentum", desc:"RSI extremes + Rate-of-Change. Catches oversold/overbought reversals.", color:"#8b5cf6" },
  BREAKOUT:{ label:"Breakout", desc:"Donchian channel breakout with volume surge confirmation.", color:"#f59e0b" },
  MEAN_REVERSION:{ label:"Mean Reversion", desc:"Bollinger Band extremes targeting return to moving average.", color:"var(--profit)" },
};
const APPROVAL = { FULL_AUTO:"Full Auto", SEMI_AUTO:"Semi Auto (60s)", MANUAL:"Manual Approval" };

async function fetchCandlesServer(symbol: string) {
  const res = await fetch(`/api/ai/candles?symbol=${symbol}&interval=4h&limit=100`);
  if (!res.ok) throw new Error(`Failed to fetch candles for ${symbol}`);
  return res.json();
}

function CreateModal({ onClose, onCreated }: { onClose:()=>void; onCreated:()=>void }) {
  const [form, setForm] = useState({ strategyType:"TREND_FOLLOWING", name:"", approvalMode:"MANUAL", allocationPct:10, maxLeverage:3 });
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const set = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  async function submit(e:React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    const res = await fetch("/api/ai/strategies",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, name:form.name||INFO[form.strategyType].label}) });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    onCreated();
  }

  const inp: React.CSSProperties = { marginTop:4, width:"100%", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 12px", color:"var(--text)", fontSize:13, boxSizing:"border-box" };
  const sel: React.CSSProperties = { ...inp };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:16,width:"100%",maxWidth:440,padding:24 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <h2 style={{ color:"var(--text)",fontSize:16,fontWeight:600,margin:0 }}>New AI Strategy</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"var(--text-faint)",fontSize:18,cursor:"pointer" }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <label style={{ color:"var(--text-muted)",fontSize:13 }}>Strategy Type</label>
            <select value={form.strategyType} onChange={e=>set("strategyType",e.target.value)} style={sel}>
              {Object.entries(INFO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <p style={{ color:"var(--text-faint)",fontSize:11,marginTop:4 }}>{INFO[form.strategyType].desc}</p>
          </div>
          <div>
            <label style={{ color:"var(--text-muted)",fontSize:13 }}>Name (optional)</label>
            <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder={INFO[form.strategyType].label} style={inp} />
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div>
              <label style={{ color:"var(--text-muted)",fontSize:13 }}>Approval Mode</label>
              <select value={form.approvalMode} onChange={e=>set("approvalMode",e.target.value)} style={sel}>
                {Object.entries(APPROVAL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color:"var(--text-muted)",fontSize:13 }}>Allocation %</label>
              <input type="number" min={1} max={50} value={form.allocationPct} onChange={e=>set("allocationPct",+e.target.value)} style={inp} />
            </div>
          </div>
          <div>
            <label style={{ color:"var(--text-muted)",fontSize:13 }}>Max Leverage</label>
            <input type="number" min={1} max={10} value={form.maxLeverage} onChange={e=>set("maxLeverage",+e.target.value)} style={inp} />
          </div>
          {error && <p style={{ color:"var(--loss)",fontSize:13,margin:0 }}>{error}</p>}
          <button type="submit" disabled={saving} style={{ background:"var(--accent)",color:"#fff",border:"none",borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:"pointer",opacity:saving?0.6:1 }}>
            {saving?"Creating…":"Create Strategy"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AiTradingPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanLog, setScanLog] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [sRes, sigRes] = await Promise.all([fetch("/api/ai/strategies"), fetch("/api/ai/signals")]);
    if (sRes.ok) setStrategies(await sRes.json());
    if (sigRes.ok) setSignals(await sigRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(id:string, current:boolean) {
    await fetch("/api/ai/strategies",{ method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id,isActive:!current}) });
    setStrategies(s=>s.map(x=>x.id===id?{...x,isActive:!current}:x));
  }

  async function deleteStrategy(id:string) {
    if (!confirm("Delete this strategy?")) return;
    await fetch(`/api/ai/strategies?id=${id}`,{method:"DELETE"});
    setStrategies(s=>s.filter(x=>x.id!==id));
  }

  async function handleSignal(signalId:string, action:"approve"|"reject") {
    await fetch(`/api/ai/signals/${action}`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({signalId}) });
    setSignals(s=>s.map(x=>x.id===signalId?{...x,status:action==="approve"?"APPROVED":"REJECTED"}:x));
  }

  async function runScan() {
    const active = strategies.filter(s=>s.isActive);
    if (active.length===0) return;
    setScanning(true); setScanLog([`Scanning ${active.length} active strategies…`]);
    let found = 0;
    for (const strategy of active) {
      const symbols = strategy.symbols.length>0 ? strategy.symbols : DEFAULT_SYMBOLS;
      const fn = STRATEGY_FUNCTIONS[strategy.strategyType as keyof typeof STRATEGY_FUNCTIONS];
      if (!fn) continue;
      for (const symbol of symbols) {
        setScanLog(l=>[...l, `Checking ${symbol}…`]);
        try {
          const candles = await fetchCandlesServer(symbol);
          if (!candles || candles.length < 20) continue;
          const signal: StrategySignal|null = fn(candles, strategy.parametersJson);
          if (!signal) continue;
          signal.symbol = symbol;
          const expires = new Date(Date.now() + 4*60*60*1000).toISOString();
          const res = await fetch("/api/ai/signals",{
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ aiStrategyId:strategy.id, symbol:signal.symbol, side:signal.side,
              confidence:signal.confidence, entryPrice:signal.entryPrice, stopLossPrice:signal.stopLossPrice,
              takeProfitPrice:signal.takeProfitPrice, leverage:Math.min(signal.leverage,strategy.maxLeverage),
              rationale:signal.rationale, expiresAt:expires }),
          });
          if (res.ok) { found++; setScanLog(l=>[...l, `✓ Signal: ${symbol} ${signal.side}`]); }
        } catch (e) { setScanLog(l=>[...l, `✗ ${symbol}: ${String(e).slice(0,60)}`]); }
      }
    }
    setScanLog(l=>[...l, `Done — ${found} signal${found!==1?"s":""} generated.`]);
    await load();
    setScanning(false);
  }

  const pending = signals.filter(s=>s.status==="PENDING");
  const card: React.CSSProperties = { background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:12,padding:20 };

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
        <div>
          <h1 style={{ color:"var(--text)",fontSize:22,fontWeight:600,margin:0 }}>AI Trading</h1>
          <p style={{ color:"var(--text-muted)",fontSize:13,marginTop:4 }}>Strategy engine with configurable approval modes</p>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={runScan} disabled={scanning || strategies.filter(s=>s.isActive).length===0}
            style={{ padding:"8px 16px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",
                     color:"var(--text)",fontSize:13,cursor:"pointer",opacity:scanning||strategies.filter(s=>s.isActive).length===0?0.4:1 }}>
            {scanning?"Scanning…":"Run Scan"}
          </button>
          <button onClick={()=>setShowCreate(true)}
            style={{ padding:"8px 16px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:500,cursor:"pointer" }}>
            + New Strategy
          </button>
        </div>
      </div>

      {loading ? <div style={{ display:"flex",justifyContent:"center",padding:40 }}><Spinner /></div> : (
        <>
          {/* Scan log */}
          {scanLog.length>0 && (
            <div style={{ ...card, marginBottom:20, fontFamily:"monospace", fontSize:12 }}>
              {scanLog.map((l,i)=>(
                <p key={i} style={{ margin:"2px 0", color: l.startsWith("✓")?"var(--profit)":l.startsWith("✗")?"var(--loss)":"var(--text-muted)" }}>{l}</p>
              ))}
            </div>
          )}

          {/* Pending signals */}
          {pending.length>0 && (
            <div style={{ ...card, marginBottom:20, borderColor:"rgba(139,92,246,0.3)", background:"rgba(139,92,246,0.05)" }}>
              <h2 style={{ color:"var(--text)",fontSize:15,fontWeight:600,margin:"0 0 12px" }}>Pending Signals ({pending.length})</h2>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {pending.map(sig=>(
                  <div key={sig.id} style={{ background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:10,padding:14,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                        <span style={{ color:"var(--text)",fontWeight:600,fontSize:14 }}>{sig.symbol}</span>
                        <Badge variant={sig.side==="LONG"?"green":"red"}>{sig.side}</Badge>
                        <Badge variant="blue">{(sig.confidence*100).toFixed(0)}% confidence</Badge>
                        <span style={{ color:"var(--text-faint)",fontSize:12 }}>{sig.strategy?.name}</span>
                      </div>
                      <p style={{ color:"var(--text-muted)",fontSize:12,margin:"0 0 6px" }}>{sig.rationale}</p>
                      <div style={{ display:"flex",gap:16,fontSize:12,color:"var(--text-faint)" }}>
                        <span>Entry <span style={{ color:"var(--text)" }}>${sig.entryPrice}</span></span>
                        <span>SL <span style={{ color:"var(--loss)" }}>${sig.stopLossPrice}</span></span>
                        <span>TP <span style={{ color:"var(--profit)" }}>${sig.takeProfitPrice}</span></span>
                        <span>Lev <span style={{ color:"var(--text)" }}>{sig.leverage}x</span></span>
                      </div>
                    </div>
                    {sig.strategy?.approvalMode==="MANUAL" && (
                      <div style={{ display:"flex",gap:8,flexShrink:0 }}>
                        <button onClick={()=>handleSignal(sig.id,"approve")}
                          style={{ padding:"6px 12px",borderRadius:8,border:"1px solid rgba(22,199,132,0.3)",background:"rgba(22,199,132,0.15)",color:"var(--profit)",fontSize:12,cursor:"pointer" }}>
                          Approve
                        </button>
                        <button onClick={()=>handleSignal(sig.id,"reject")}
                          style={{ padding:"6px 12px",borderRadius:8,border:"1px solid rgba(234,57,67,0.3)",background:"rgba(234,57,67,0.15)",color:"var(--loss)",fontSize:12,cursor:"pointer" }}>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategy cards */}
          {strategies.length===0 ? (
            <div style={{ ...card, textAlign:"center",padding:60 }}>
              <p style={{ color:"var(--text-muted)",margin:0 }}>No strategies yet.</p>
              <p style={{ color:"var(--text-faint)",fontSize:13,marginTop:8 }}>Create a strategy and run a scan to generate signals.</p>
            </div>
          ) : (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14 }}>
              {strategies.map(s=>{
                const info = INFO[s.strategyType] ?? { label:s.strategyType, desc:"", color:"var(--text-muted)" };
                const pCount = s.signals?.filter(x=>x.status==="PENDING").length ?? 0;
                return (
                  <div key={s.id} style={{ ...card, borderColor: s.isActive?"rgba(59,130,246,0.3)":"var(--border)", display:"flex",flexDirection:"column",gap:12 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                      <div>
                        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
                          <span style={{ color:info.color,fontSize:13,fontWeight:600 }}>{info.label}</span>
                          {s.isActive&&<Badge variant="blue">Active</Badge>}
                          {pCount>0&&<Badge variant="yellow">{pCount}</Badge>}
                        </div>
                        <p style={{ color:"var(--text)",fontSize:13,margin:0 }}>{s.name}</p>
                        <p style={{ color:"var(--text-faint)",fontSize:11,margin:"4px 0 0" }}>{info.desc}</p>
                      </div>
                      <button onClick={()=>deleteStrategy(s.id)} style={{ background:"none",border:"none",color:"var(--text-faint)",cursor:"pointer",fontSize:16,padding:0 }}>✕</button>
                    </div>
                    <div style={{ display:"flex",gap:12,fontSize:12,color:"var(--text-faint)" }}>
                      <span>{APPROVAL[s.approvalMode as keyof typeof APPROVAL]}</span>
                      <span>·</span><span>{s.allocationPct}% alloc</span>
                      <span>·</span><span>Max {s.maxLeverage}x</span>
                    </div>
                    <button onClick={()=>toggleActive(s.id,s.isActive)}
                      style={{ padding:"8px",borderRadius:8,border:`1px solid ${s.isActive?"var(--border)":"rgba(59,130,246,0.3)"}`,
                               background:s.isActive?"transparent":"rgba(59,130,246,0.1)",
                               color:s.isActive?"var(--text-muted)":"var(--accent)",fontSize:13,cursor:"pointer" }}>
                      {s.isActive?"Deactivate":"Activate"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Signal history */}
          {signals.filter(s=>s.status!=="PENDING").length>0 && (
            <div style={{ ...card, marginTop:20 }}>
              <h2 style={{ color:"var(--text)",fontSize:15,fontWeight:600,margin:"0 0 12px" }}>Signal History</h2>
              {signals.filter(s=>s.status!=="PENDING").slice(0,10).map(sig=>(
                <div key={sig.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border)" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ color:"var(--text)",fontSize:13 }}>{sig.symbol}</span>
                    <Badge variant={sig.side==="LONG"?"green":"red"}>{sig.side}</Badge>
                    <span style={{ color:"var(--text-faint)",fontSize:12 }}>{sig.strategy?.name}</span>
                  </div>
                  <Badge variant={["APPROVED","EXECUTED"].includes(sig.status)?"green":sig.status==="REJECTED"?"red":"default"}>
                    {sig.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showCreate && <CreateModal onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);load();}} />}
    </div>
  );
}
