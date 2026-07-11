"use client";
import { useEffect, useState, useCallback } from "react";
import { Badge, Spinner } from "@/components/ui/Badge";
import { STRATEGY_FUNCTIONS, DEFAULT_SYMBOLS } from "@/lib/strategies";

interface Strategy { id:string; name:string; strategyType:string; isActive:boolean; approvalMode:string; allocationPct:number; maxLeverage:number; symbols:string[]; parametersJson:Record<string,number>; signals:Signal[]; }
interface Signal { id:string; symbol:string; side:string; confidence:number; entryPrice:number; stopLossPrice:number; takeProfitPrice:number; leverage:number; rationale:string; status:string; expiresAt:string; strategy:{name:string;strategyType:string;approvalMode:string}; }

const INFO: Record<string,{label:string;desc:string;color:string}> = {
  TREND_FOLLOWING:{ label:"Trend Following", desc:"EMA crossover + RSI. Rides established trends.", color:"var(--accent-light)" },
  MOMENTUM:{ label:"Momentum", desc:"RSI extremes + Rate-of-Change. Catches reversals.", color:"var(--purple)" },
  BREAKOUT:{ label:"Breakout", desc:"Donchian channel breakout with volume surge.", color:"var(--yellow)" },
  MEAN_REVERSION:{ label:"Mean Reversion", desc:"Bollinger Bands extremes targeting mean.", color:"var(--profit)" },
};
const APPROVAL: Record<string,string> = { FULL_AUTO:"Full Auto", SEMI_AUTO:"Semi-Auto (60s)", MANUAL:"Manual" };

function CreateModal({ onClose, onDone }: { onClose:()=>void; onDone:()=>void }) {
  const [form, setForm] = useState({ strategyType:"TREND_FOLLOWING", name:"", approvalMode:"MANUAL", allocationPct:10, maxLeverage:3 });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  const s = (k:string,v:any) => setForm(f=>({...f,[k]:v}));
  async function submit(e:React.FormEvent) {
    e.preventDefault(); setErr(""); setSaving(true);
    const r = await fetch("/api/ai/strategies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,name:form.name||INFO[form.strategyType].label})});
    const d = await r.json(); setSaving(false);
    if(!r.ok){setErr(d.error);return;} onDone();
  }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="card animate-fade" style={{width:"100%",maxWidth:440,padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{color:"var(--text)",fontSize:16,fontWeight:600}}>New AI Strategy</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text-faint)",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Strategy Type</label>
            <select value={form.strategyType} onChange={e=>s("strategyType",e.target.value)} className="select" style={{marginTop:5}}>
              {Object.entries(INFO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <p style={{color:"var(--text-faint)",fontSize:11,marginTop:5}}>{INFO[form.strategyType].desc}</p>
          </div>
          <div>
            <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Name (optional)</label>
            <input value={form.name} onChange={e=>s("name",e.target.value)} placeholder={INFO[form.strategyType].label} className="input" style={{marginTop:5}} />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Approval Mode</label>
              <select value={form.approvalMode} onChange={e=>s("approvalMode",e.target.value)} className="select" style={{marginTop:5}}>
                {Object.entries(APPROVAL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Allocation %</label>
              <input type="number" min={1} max={50} value={form.allocationPct} onChange={e=>s("allocationPct",+e.target.value)} className="input" style={{marginTop:5}} />
            </div>
          </div>
          <div>
            <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Max Leverage</label>
            <input type="number" min={1} max={10} value={form.maxLeverage} onChange={e=>s("maxLeverage",+e.target.value)} className="input" style={{marginTop:5}} />
          </div>
          {err&&<p style={{color:"var(--loss)",fontSize:12}}>{err}</p>}
          <button type="submit" disabled={saving} className="btn btn-primary" style={{width:"100%",padding:"11px"}}>{saving?"Creating…":"Create Strategy"}</button>
        </form>
      </div>
    </div>
  );
}

export default function AiTradingPage() {
  const [strats, setStrats] = useState<Strategy[]>([]);
  const [sigs, setSigs] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanLog, setScanLog] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [sr,si] = await Promise.all([fetch("/api/ai/strategies"),fetch("/api/ai/signals")]);
    if(sr.ok) setStrats(await sr.json());
    if(si.ok) setSigs(await si.json());
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  async function toggleActive(id:string, cur:boolean) {
    await fetch("/api/ai/strategies",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,isActive:!cur})});
    setStrats(s=>s.map(x=>x.id===id?{...x,isActive:!cur}:x));
  }

  async function del(id:string) {
    if(!confirm("Delete this strategy?")) return;
    await fetch(`/api/ai/strategies?id=${id}`,{method:"DELETE"});
    setStrats(s=>s.filter(x=>x.id!==id));
  }

  async function handleSig(id:string, action:"approve"|"reject") {
    await fetch(`/api/ai/signals/${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({signalId:id})});
    setSigs(s=>s.map(x=>x.id===id?{...x,status:action==="approve"?"APPROVED":"REJECTED"}:x));
  }

  async function runScan() {
    const active = strats.filter(s=>s.isActive);
    if(!active.length) return;
    setScanning(true); setScanLog([`Scanning ${active.length} strategy…`]);
    let found=0;
    for(const strat of active) {
      const syms = strat.symbols.length>0?strat.symbols:DEFAULT_SYMBOLS;
      const fn = STRATEGY_FUNCTIONS[strat.strategyType as keyof typeof STRATEGY_FUNCTIONS];
      if(!fn) continue;
      for(const sym of syms) {
        setScanLog(l=>[...l,`Checking ${sym}…`]);
        try {
          const r = await fetch(`/api/ai/candles?symbol=${sym}&interval=4h&limit=100`);
          if(!r.ok) continue;
          const candles = await r.json();
          if(candles.length<20) continue;
          const sig = fn(candles, strat.parametersJson);
          if(!sig) continue;
          sig.symbol=sym;
          const res = await fetch("/api/ai/signals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({aiStrategyId:strat.id,symbol:sig.symbol,side:sig.side,confidence:sig.confidence,entryPrice:sig.entryPrice,stopLossPrice:sig.stopLossPrice,takeProfitPrice:sig.takeProfitPrice,leverage:Math.min(sig.leverage,strat.maxLeverage),rationale:sig.rationale,expiresAt:new Date(Date.now()+4*60*60*1000).toISOString()})});
          if(res.ok){found++;setScanLog(l=>[...l,`✓ ${sym} ${sig.side}`]);}
        } catch(e){setScanLog(l=>[...l,`✗ ${sym}: ${String(e).slice(0,50)}`]);}
      }
    }
    setScanLog(l=>[...l,`Done — ${found} signal${found!==1?"s":""} found`]);
    await load(); setScanning(false);
  }

  const pending = sigs.filter(s=>s.status==="PENDING");

  return (
    <div className="page">
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h1 className="page-title">AI Trading</h1>
          <p className="page-sub">Automated signal generation with configurable approval modes</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={runScan} disabled={scanning||!strats.some(s=>s.isActive)} className="btn btn-ghost">{scanning?"Scanning…":"Run Scan"}</button>
          <button onClick={()=>setShowCreate(true)} className="btn btn-primary">+ New Strategy</button>
        </div>
      </div>

      {loading ? <div style={{display:"flex",justifyContent:"center",padding:60}}><Spinner size="lg"/></div> : (
        <>
          {/* Scan log */}
          {scanLog.length>0&&(
            <div className="card animate-fade" style={{padding:16,marginBottom:16,fontFamily:"monospace",fontSize:12}}>
              {scanLog.map((l,i)=><p key={i} style={{margin:"2px 0",color:l.startsWith("✓")?"var(--profit)":l.startsWith("✗")?"var(--loss)":"var(--text-muted)"}}>{l}</p>)}
            </div>
          )}

          {/* Pending signals */}
          {pending.length>0&&(
            <div className="animate-fade" style={{background:"rgba(167,139,250,0.05)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:14,padding:20,marginBottom:20}}>
              <p style={{color:"var(--purple)",fontSize:14,fontWeight:600,marginBottom:12}}>Pending Signals ({pending.length})</p>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {pending.map(sig=>(
                  <div key={sig.id} className="card animate-fade" style={{padding:16,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{color:"var(--text)",fontWeight:700,fontSize:14}}>{sig.symbol}</span>
                        <Badge variant={sig.side==="LONG"?"green":"red"}>{sig.side}</Badge>
                        <Badge variant="blue">{(sig.confidence*100).toFixed(0)}%</Badge>
                        <span style={{color:"var(--text-faint)",fontSize:12}}>{sig.strategy?.name}</span>
                      </div>
                      <p style={{color:"var(--text-muted)",fontSize:12,marginBottom:6}}>{sig.rationale}</p>
                      <div style={{display:"flex",gap:14,fontSize:12,color:"var(--text-faint)"}}>
                        <span>Entry <span style={{color:"var(--text)"}}>${sig.entryPrice}</span></span>
                        <span>SL <span style={{color:"var(--loss)"}}>${sig.stopLossPrice}</span></span>
                        <span>TP <span style={{color:"var(--profit)"}}>${sig.takeProfitPrice}</span></span>
                        <span>Lev <span style={{color:"var(--text)"}}>{sig.leverage}x</span></span>
                      </div>
                    </div>
                    {sig.strategy?.approvalMode==="MANUAL"&&(
                      <div style={{display:"flex",gap:8,flexShrink:0}}>
                        <button onClick={()=>handleSig(sig.id,"approve")} className="btn btn-success" style={{padding:"6px 12px",fontSize:12}}>Approve</button>
                        <button onClick={()=>handleSig(sig.id,"reject")} className="btn btn-danger" style={{padding:"6px 12px",fontSize:12}}>Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategy cards */}
          {strats.length===0 ? (
            <div className="card" style={{padding:60,textAlign:"center"}}>
              <p style={{color:"var(--text-muted)"}}>No strategies yet.</p>
              <p style={{color:"var(--text-faint)",fontSize:13,marginTop:6}}>Create a strategy and run a scan to generate signals.</p>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
              {strats.map(s=>{
                const info = INFO[s.strategyType]??{label:s.strategyType,desc:"",color:"var(--text-muted)"};
                const p = s.signals?.filter(x=>x.status==="PENDING").length??0;
                return (
                  <div key={s.id} className={`card animate-fade${s.isActive?" animate-glow":""}`} style={{padding:20,display:"flex",flexDirection:"column",gap:12,borderColor:s.isActive?"rgba(99,102,241,0.3)":"var(--border)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                          <span style={{color:info.color,fontSize:13,fontWeight:700}}>{info.label}</span>
                          {s.isActive&&<Badge variant="blue">Active</Badge>}
                          {p>0&&<Badge variant="yellow">{p}</Badge>}
                        </div>
                        <p style={{color:"var(--text)",fontSize:13,fontWeight:500}}>{s.name}</p>
                        <p style={{color:"var(--text-faint)",fontSize:11,marginTop:3,lineHeight:1.4}}>{info.desc}</p>
                      </div>
                      <button onClick={()=>del(s.id)} style={{background:"none",border:"none",color:"var(--text-faint)",cursor:"pointer",fontSize:18,lineHeight:1,padding:0}}>✕</button>
                    </div>
                    <div style={{display:"flex",gap:10,fontSize:11,color:"var(--text-faint)"}}>
                      <span>{APPROVAL[s.approvalMode]}</span>
                      <span>·</span><span>{s.allocationPct}% alloc</span>
                      <span>·</span><span>Max {s.maxLeverage}x</span>
                    </div>
                    <button onClick={()=>toggleActive(s.id,s.isActive)} className={`btn ${s.isActive?"btn-ghost":"btn-ghost"}`}
                      style={{borderColor:s.isActive?"var(--border)":"rgba(99,102,241,0.3)",color:s.isActive?"var(--text-muted)":"var(--accent-light)"}}>
                      {s.isActive?"Deactivate":"Activate"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Signal history */}
          {sigs.filter(s=>s.status!=="PENDING").length>0&&(
            <div className="card" style={{overflow:"hidden",marginTop:20}}>
              <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)"}}><p className="section-title" style={{margin:0}}>Signal History</p></div>
              {sigs.filter(s=>s.status!=="PENDING").slice(0,10).map(sig=>(
                <div key={sig.id} className="table-row" style={{padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:"var(--text)",fontSize:13,fontWeight:500}}>{sig.symbol}</span>
                    <Badge variant={sig.side==="LONG"?"green":"red"}>{sig.side}</Badge>
                    <span style={{color:"var(--text-faint)",fontSize:12}}>{sig.strategy?.name}</span>
                  </div>
                  <Badge variant={["APPROVED","EXECUTED"].includes(sig.status)?"green":sig.status==="REJECTED"?"red":"dim"}>{sig.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {showCreate&&<CreateModal onClose={()=>setShowCreate(false)} onDone={()=>{setShowCreate(false);load();}} />}
    </div>
  );
}
