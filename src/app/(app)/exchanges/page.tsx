"use client";
import { useEffect, useState, useCallback } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Spinner } from "@/components/ui/Badge";

interface Connection { id:string; exchange:"BINANCE"|"BYBIT"|"OKX"; label:string; hasWithdrawPermission:boolean; lastSyncedAt:string|null; createdAt:string; }
interface Live { loading:boolean; data:any|null; error:string|null; }

export default function ExchangesPage() {
  const [conns, setConns] = useState<Connection[]>([]);
  const [live, setLive] = useState<Record<string,Live>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ exchange:"BINANCE" as any, label:"", apiKey:"", apiSecret:"", passphrase:"" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const fetchLive = useCallback(async (cs: Connection[]) => {
    for (const c of cs) {
      setLive(p=>({...p,[c.id]:{loading:true,data:null,error:null}}));
      try {
        const ctrl = new AbortController(); setTimeout(()=>ctrl.abort(),12000);
        const r = await fetch(`/api/exchange/account-info?connectionId=${c.id}`,{signal:ctrl.signal});
        const d = await r.json();
        if(!r.ok) throw new Error(d.error??"Failed");
        setLive(p=>({...p,[c.id]:{loading:false,data:d,error:null}}));
      } catch(e) {
        setLive(p=>({...p,[c.id]:{loading:false,data:null,error:String(e)}}));
      }
    }
  },[]);

  const loadConns = useCallback(async () => {
    const r = await fetch("/api/exchange/list");
    if(r.ok){ const cs=await r.json(); setConns(cs); setLoading(false); fetchLive(cs); }
  },[fetchLive]);

  useEffect(()=>{loadConns();},[loadConns]);
  useEffect(()=>{ const t=setInterval(()=>{if(conns.length>0)fetchLive(conns);},30000); return()=>clearInterval(t); },[conns,fetchLive]);

  async function connect(e:React.FormEvent) {
    e.preventDefault(); setErr(""); setSubmitting(true);
    const r = await fetch("/api/exchange/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const d = await r.json(); setSubmitting(false);
    if(!r.ok){setErr(d.error??"Failed");return;}
    setShowForm(false); setForm({exchange:"BINANCE",label:"",apiKey:"",apiSecret:"",passphrase:""});
    loadConns();
  }

  async function disconnect(id:string) {
    if(!confirm("Remove this exchange?")) return;
    await fetch("/api/exchange/disconnect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({connectionId:id})});
    setConns(c=>c.filter(x=>x.id!==id));
  }

  const exColor = (ex:string) => ex==="BINANCE"?"#f59e0b":ex==="OKX"?"var(--accent-light)":"#fb923c";
  const exLabel = (ex:string) => ex==="BINANCE"?"BNB":ex==="OKX"?"OKX":"BBT";

  if(loading) return <div style={{display:"flex",justifyContent:"center",padding:80}}><Spinner size="lg"/></div>;

  return (
    <div className="page">
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h1 className="page-title">Exchanges</h1>
          <p className="page-sub">Connect Binance, Bybit, or OKX accounts</p>
        </div>
        <button onClick={()=>setShowForm(s=>!s)} className="btn btn-primary">{showForm?"Cancel":"+ Connect Exchange"}</button>
      </div>

      {showForm && (
        <div className="card animate-fade" style={{padding:24,marginBottom:20}}>
          <p style={{color:"var(--text)",fontSize:14,fontWeight:600,marginBottom:16}}>New Connection</p>
          <form onSubmit={connect} style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Exchange</label>
                <select value={form.exchange} onChange={e=>setForm(f=>({...f,exchange:e.target.value as any}))} className="select" style={{marginTop:5}}>
                  <option value="BINANCE">Binance (USDT-M Futures)</option>
                  <option value="BYBIT">Bybit (Unified)</option>
                  <option value="OKX">OKX (Swap)</option>
                </select>
              </div>
              <div>
                <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Label</label>
                <input value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} placeholder="My account" className="input" style={{marginTop:5}} />
              </div>
            </div>
            <div>
              <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>API Key</label>
              <input required value={form.apiKey} onChange={e=>setForm(f=>({...f,apiKey:e.target.value}))} className="input" style={{marginTop:5,fontFamily:"monospace"}} placeholder="Paste API key…" />
            </div>
            <div>
              <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>API Secret</label>
              <input required type="password" value={form.apiSecret} onChange={e=>setForm(f=>({...f,apiSecret:e.target.value}))} className="input" style={{marginTop:5,fontFamily:"monospace"}} placeholder="Paste secret…" />
            </div>
            {form.exchange==="OKX" && (
              <div className="animate-fade">
                <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Passphrase</label>
                <input required type="password" value={form.passphrase} onChange={e=>setForm(f=>({...f,passphrase:e.target.value}))} className="input" style={{marginTop:5,fontFamily:"monospace"}} placeholder="OKX passphrase…" />
              </div>
            )}
            <div style={{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"var(--text-muted)"}}>
              Enable: <b>Futures/Unified Trading</b> + <b>Read</b>. No Withdrawals. Set IP restriction to <b>No Restriction</b>.
            </div>
            {err && <p style={{color:"var(--loss)",fontSize:12}}>{err}</p>}
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{alignSelf:"flex-start",padding:"9px 20px"}}>{submitting?"Connecting…":"Connect"}</button>
          </form>
        </div>
      )}

      {conns.length===0 && !showForm ? (
        <div className="card" style={{padding:60,textAlign:"center"}}>
          <p style={{color:"var(--text-muted)",fontSize:15}}>No exchanges connected</p>
          <p style={{color:"var(--text-faint)",fontSize:13,marginTop:6}}>The Signals page works without an exchange connection.</p>
          <a href="/signals" style={{color:"var(--accent-light)",fontSize:13,display:"inline-block",marginTop:12}}>View live signals →</a>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {conns.map(c=>{
            const l=live[c.id];
            return (
              <div key={c.id} className="card animate-fade" style={{padding:20,borderColor:c.hasWithdrawPermission?"rgba(245,158,11,0.3)":"var(--border)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:l?.data?16:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:44,height:44,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,color:exColor(c.exchange),background:`${exColor(c.exchange)}18`,border:`1px solid ${exColor(c.exchange)}30`}}>
                      {exLabel(c.exchange)}
                    </div>
                    <div>
                      <p style={{color:"var(--text)",fontWeight:600,fontSize:14}}>{c.label}</p>
                      <p style={{color:"var(--text-faint)",fontSize:11,marginTop:2}}>{c.exchange} · {new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {c.hasWithdrawPermission && <Badge variant="yellow">⚠ Withdraw</Badge>}
                    <Badge variant={l?.data?"green":l?.error?"red":"dim"}>{l?.loading?"Connecting…":l?.data?"Live":l?.error?"Error":"—"}</Badge>
                    <button onClick={()=>disconnect(c.id)} className="btn btn-ghost" style={{padding:"4px 10px",fontSize:12}}>Remove</button>
                  </div>
                </div>
                {l?.loading && <div style={{display:"flex",alignItems:"center",gap:10,color:"var(--text-faint)",fontSize:13,marginTop:12}}><Spinner size="sm"/>Fetching account data…</div>}
                {l?.error && <div style={{marginTop:12,padding:"10px 14px",background:"rgba(255,68,102,0.06)",border:"1px solid rgba(255,68,102,0.2)",borderRadius:9,fontSize:12,color:"var(--loss)"}}>{l.error}</div>}
                {l?.data && (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                    <StatCard label="Wallet Balance" value={`$${l.data.totalWalletBalance.toFixed(2)}`} />
                    <StatCard label="Available" value={`$${l.data.availableBalance.toFixed(2)}`} />
                    <StatCard label="Unrealized PnL" value={`${l.data.totalUnrealizedPnl>=0?"+":""}$${l.data.totalUnrealizedPnl.toFixed(2)}`} positive={l.data.totalUnrealizedPnl>0} negative={l.data.totalUnrealizedPnl<0} />
                    <StatCard label="Margin Ratio" value={`${(l.data.marginRatio*100).toFixed(1)}%`} negative={l.data.marginRatio>0.7} positive={l.data.marginRatio<0.3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
