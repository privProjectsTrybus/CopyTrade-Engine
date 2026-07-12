"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Spinner, Badge } from "@/components/ui/Badge";
import type { RealTrader, RealPosition } from "@/app/api/real-traders/route";

function playAlert() {
  try {
    const ctx = new AudioContext();
    [0,0.15,0.3].forEach((d,i)=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value=880+i*110; o.type="sine";
      g.gain.setValueAtTime(0.3,ctx.currentTime+d);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+d+0.3);
      o.start(ctx.currentTime+d); o.stop(ctx.currentTime+d+0.3);
    });
  } catch {}
}

function RiskCalc({ pos, trader, onClose }: { pos:RealPosition; trader:RealTrader; onClose:()=>void }) {
  const [bal, setBal] = useState(1000);
  const [risk, setRisk] = useState(1);
  const [sl, setSl] = useState(2);
  const [copied, setCopied] = useState(false);

  const riskAmt = bal*risk/100;
  const slDist = pos.entryPrice*sl/100;
  const size = slDist>0?riskAmt/slDist:0;
  const notional = size*pos.entryPrice;
  const margin = pos.leverage>0?notional/pos.leverage:notional;
  const slPrice = pos.side==="LONG"?pos.entryPrice-slDist:pos.entryPrice+slDist;

  function copy() {
    navigator.clipboard.writeText([
      `${pos.symbol} ${pos.side} — ${trader.nickname}`,
      `Entry: $${pos.entryPrice.toLocaleString()}`,
      `Size: ${size.toFixed(4)} ${pos.symbol.replace("USDT","")}`,
      `Notional: $${notional.toFixed(2)}`,
      `Margin: $${margin.toFixed(2)}`,
      `Leverage: ${pos.leverage}x`,
      `Stop Loss: $${slPrice.toFixed(2)} (${sl}%)`,
      `ROE: ${pos.roe>=0?"+":""}${pos.roe.toFixed(2)}%`,
    ].join("\n"));
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="card animate-fade" style={{width:"100%",maxWidth:420,padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <h2 style={{color:"var(--text)",fontSize:16,fontWeight:700}}>Risk Calculator</h2>
            <p style={{color:"var(--text-muted)",fontSize:12,marginTop:3}}>
              {pos.symbol} · <span style={{color:pos.side==="LONG"?"var(--profit)":"var(--loss)"}}>{pos.side}</span> · {pos.leverage}x · {trader.nickname}
            </p>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text-faint)",fontSize:22,cursor:"pointer",lineHeight:1}}>✕</button>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <div><label style={{color:"var(--text-muted)",fontSize:11,fontWeight:500}}>Balance (USDT)</label><input type="number" value={bal} onChange={e=>setBal(+e.target.value)} className="input" style={{marginTop:4}} /></div>
            <div><label style={{color:"var(--text-muted)",fontSize:11,fontWeight:500}}>Risk %</label><input type="number" min={0.1} max={10} step={0.1} value={risk} onChange={e=>setRisk(+e.target.value)} className="input" style={{marginTop:4}} /></div>
            <div><label style={{color:"var(--text-muted)",fontSize:11,fontWeight:500}}>Stop Loss %</label><input type="number" min={0.1} max={20} step={0.1} value={sl} onChange={e=>setSl(+e.target.value)} className="input" style={{marginTop:4}} /></div>
          </div>

          <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:12,padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              {l:"Entry Price",v:`$${pos.entryPrice.toLocaleString()}`,hi:false},
              {l:"Stop Loss",v:`$${slPrice.toFixed(2)}`,hi:false,c:"var(--loss)"},
              {l:"Risk Amount",v:`$${riskAmt.toFixed(2)}`,hi:false},
              {l:"Current ROE",v:`${pos.roe>=0?"+":""}${pos.roe.toFixed(2)}%`,hi:false,c:pos.roe>=0?"var(--profit)":"var(--loss)"},
              {l:"Position Size",v:`${size.toFixed(4)} ${pos.symbol.replace("USDT","")}`,hi:true},
              {l:"Required Margin",v:`$${margin.toFixed(2)}`,hi:true},
            ].map(r=>(
              <div key={r.l} style={{padding:"10px 12px",background:r.hi?"var(--accent-glow)":"transparent",borderRadius:9,border:r.hi?"1px solid rgba(99,102,241,0.2)":"none"}}>
                <p style={{color:"var(--text-faint)",fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em"}}>{r.l}</p>
                <p style={{color:(r as any).c??(r.hi?"var(--accent-light)":"var(--text)"),fontSize:r.hi?17:13,fontWeight:r.hi?700:400,marginTop:4}}>{r.v}</p>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={copy} className={`btn ${copied?"btn-success":"btn-ghost"}`}>{copied?"✓ Copied!":"📋 Copy Details"}</button>
            <a href={`https://www.bybit.com/trade/usdt/${pos.symbol}`} target="_blank"
              className="btn btn-primary" style={{textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>
              Open on Bybit →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({ onClose }: { onClose:()=>void }) {
  const [hist, setHist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ fetch("/api/signals/history").then(r=>r.ok?r.json():[]).then(d=>{setHist(d);setLoading(false);}); },[]);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="card animate-fade" style={{width:"100%",maxWidth:640,maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 24px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{color:"var(--text)",fontSize:15,fontWeight:600}}>Signal History</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text-faint)",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {loading ? <div style={{display:"flex",justifyContent:"center",padding:40}}><Spinner/></div>
          : hist.length===0 ? <p style={{color:"var(--text-faint)",textAlign:"center",padding:40}}>No signals logged yet.</p>
          : hist.map((h,i)=>(
            <div key={i} className="table-row" style={{display:"grid",gridTemplateColumns:"1fr 70px 90px 60px 130px",alignItems:"center",gap:8}}>
              <div><span style={{color:"var(--text)",fontWeight:600,fontSize:13}}>{h.symbol}</span><span style={{color:"var(--text-faint)",fontSize:11,marginLeft:8}}>{h.traderNickname}</span></div>
              <Badge variant={h.side==="LONG"?"green":"red"}>{h.side}</Badge>
              <span style={{color:"var(--text-muted)",fontSize:12}}>${h.entryPrice?.toLocaleString()}</span>
              <span style={{color:"var(--text-muted)",fontSize:12}}>{h.leverage}x</span>
              <span style={{color:"var(--text-faint)",fontSize:11}}>{new Date(h.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TraderCard({ trader, isNew, onSelect }: { trader:RealTrader; isNew:boolean; onSelect:(p:RealPosition)=>void }) {
  const [open, setOpen] = useState(false);

  async function alert(pos:RealPosition) {
    fetch("/api/signals/history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({trader,position:pos})}).catch(()=>{});
    const r = await fetch("/api/signals/notify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({trader,position:pos})});
    const d = await r.json();
    if(!r.ok) window.alert(d.error??"Telegram not configured");
    else window.alert("✓ Sent to Telegram");
  }

  const srcColor = trader.source==="BINANCE"?"#f59e0b":trader.source==="BYBIT_COPY"?"var(--profit)":"#fb923c";
  const srcLabel = trader.source==="BYBIT_COPY"?"COPY":trader.source;

  return (
    <div className={`card animate-fade${isNew?" animate-glow":""}`} style={{overflow:"hidden",borderColor:isNew?"rgba(0,212,160,0.4)":"var(--border)",transition:"all 0.4s"}}>
      <div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>setOpen(o=>!o)}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,color:"#fff",background:srcColor,flexShrink:0}}>
            {trader.nickname[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <span style={{color:"var(--text)",fontWeight:600,fontSize:14}}>{trader.nickname}</span>
              <Badge variant={trader.source==="BINANCE"?"yellow":trader.source==="BYBIT_COPY"?"green":"dim"}>{srcLabel}</Badge>
              {isNew&&<Badge variant="green">● New</Badge>}
              {trader.positions.length>0&&<Badge variant="blue">📡 {trader.positions.length} live</Badge>}
            </div>
            <div style={{display:"flex",gap:10,marginTop:3,flexWrap:"wrap"}}>
              <span style={{color:trader.roi>=0?"var(--profit)":"var(--loss)",fontSize:12,fontWeight:600}}>{trader.roi>=0?"+":""}{trader.roi.toFixed(1)}% ROI</span>
              <span style={{color:"var(--text-faint)",fontSize:12}}>PnL ${trader.pnl.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
              {trader.winRate>0&&<span style={{color:"var(--text-faint)",fontSize:12}}>Win {trader.winRate.toFixed(0)}%</span>}
              {trader.maxDrawdown!=null&&<span style={{color:"var(--loss)",fontSize:12}}>DD -{trader.maxDrawdown.toFixed(1)}%</span>}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <a href={trader.profileUrl} target="_blank" onClick={e=>e.stopPropagation()} style={{color:"var(--accent-light)",fontSize:12,textDecoration:"none"}}>Profile →</a>
          <span style={{color:"var(--text-faint)",fontSize:12}}>{open?"▲":"▼"}</span>
        </div>
      </div>

      {open && (
        <div className="animate-fade" style={{borderTop:"1px solid var(--border)"}}>
          {trader.positions.length===0 ? (
            <div style={{padding:20,textAlign:"center"}}>
              <p style={{color:"var(--text-faint)",fontSize:13}}>{trader.sharesPositions?"No open positions.":"Positions not public."}</p>
              <a href={trader.profileUrl} target="_blank" style={{color:"var(--accent-light)",fontSize:12,display:"inline-block",marginTop:6}}>View on {srcLabel} →</a>
            </div>
          ) : (
            <>
              <div style={{padding:"8px 18px",display:"grid",gridTemplateColumns:"130px 70px 100px 100px 60px 80px 1fr",gap:8,borderBottom:"1px solid var(--border)"}}>
                {["Symbol","Side","Entry","Mark","Lev","ROE","Actions"].map(h=><span key={h} style={{color:"var(--text-faint)",fontSize:10,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</span>)}
              </div>
              {trader.positions.map((pos,i)=>(
                <div key={i} className="table-row" style={{padding:"11px 18px",display:"grid",gridTemplateColumns:"130px 70px 100px 100px 60px 80px 1fr",gap:8,alignItems:"center"}}>
                  <span style={{color:"var(--text)",fontWeight:700,fontSize:13}}>{pos.symbol}</span>
                  <Badge variant={pos.side==="LONG"?"green":"red"}>{pos.side}</Badge>
                  <span style={{color:"var(--text-muted)",fontSize:12}}>${pos.entryPrice.toLocaleString()}</span>
                  <span style={{color:"var(--text-muted)",fontSize:12}}>${pos.markPrice.toLocaleString()}</span>
                  <span style={{color:"var(--text-muted)",fontSize:12}}>{pos.leverage}x</span>
                  <span style={{color:pos.roe>=0?"var(--profit)":"var(--loss)",fontSize:12,fontWeight:600}}>{pos.roe>=0?"+":""}{pos.roe.toFixed(1)}%</span>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{fetch("/api/signals/history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({trader,position:pos})}).catch(()=>{}); onSelect(pos);}} className="btn btn-primary" style={{padding:"5px 12px",fontSize:11}}>Calculate</button>
                    <button onClick={()=>alert(pos)} className="btn btn-ghost" style={{padding:"5px 10px",fontSize:11}}>📱</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SignalsPage() {
  const [traders, setTraders] = useState<RealTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sel, setSel] = useState<{pos:RealPosition;trader:RealTrader}|null>(null);
  const [showHist, setShowHist] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [autoAlert, setAutoAlert] = useState(true);
  const [sound, setSound] = useState(true);
  const [alertStatus, setAlertStatus] = useState("");
  const [updated, setUpdated] = useState<Date|null>(null);
  const [newUids, setNewUids] = useState<Set<string>>(new Set());
  const [minRoi, setMinRoi] = useState(0);
  const [minWr, setMinWr] = useState(0);
  const [maxDd, setMaxDd] = useState(100);
  const [src, setSrc] = useState<"ALL"|"BINANCE"|"BYBIT"|"BYBIT_COPY">("ALL");
  const [posOnly, setPosOnly] = useState(false);
  const [minScore, setMinScore] = useState(60);
  const prevRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<any>(null);

  const load = useCallback(async (silent=false) => {
    if(!silent) setLoading(true);
    try {
      const r = await fetch("/api/real-traders");
      if(!r.ok) throw new Error("Failed");
      const data: RealTrader[] = await r.json();
      const cur = new Set(data.map(t=>t.uid));
      const posUids = new Set(data.filter(t=>t.positions.length>0).map(t=>t.uid));
      const prevPos = new Set([...prevRef.current].filter(u=>traders.find(t=>t.uid===u)?.positions.length));
      const allNew = new Set([...[...cur].filter(u=>prevRef.current.size>0&&!prevRef.current.has(u)),...[...posUids].filter(u=>!prevPos.has(u))]);
      if(allNew.size>0){ setNewUids(allNew); if(sound) playAlert(); setTimeout(()=>setNewUids(new Set()),10000); }
      prevRef.current = cur;
      setTraders(data); setUpdated(new Date());
      if(autoAlert && data.length>0) {
        fetch("/api/signals/auto-alert",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({traders:data,filters:{minRoi,minWinRate:minWr,maxDrawdown:maxDd,autoAlertEnabled:true}})})
          .then(r=>r.json()).then(d=>{ if(d.alertsSent>0){ setAlertStatus(`📱 ${d.alertsSent} alert${d.alertsSent>1?"s":""} sent`); setTimeout(()=>setAlertStatus(""),8000); }}).catch(()=>{});
      }
    } catch(e){ setError(String(e)); }
    finally{ setLoading(false); }
  },[sound,autoAlert,minRoi,minWr,maxDd,traders]);

  useEffect(()=>{load();},[]);
  useEffect(()=>{ if(timerRef.current) clearInterval(timerRef.current); if(autoRefresh) timerRef.current=setInterval(()=>load(true),60000); return()=>{ if(timerRef.current) clearInterval(timerRef.current); }; },[autoRefresh,load]);

  const filtered = traders.filter(t=>src==="ALL"||t.source===src).filter(t=>t.roi>=minRoi).filter(t=>t.winRate===0||t.winRate>=minWr).filter(t=>t.maxDrawdown==null||t.maxDrawdown<=maxDd).filter(t=>!posOnly||t.positions.length>0);
  const withPos = traders.filter(t=>t.positions.length>0).length;
  const totalPos = traders.reduce((s,t)=>s+t.positions.length,0);

  return (
    <div className="page">
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 className="page-title">Live Signals</h1>
          <p className="page-sub">
            Real top traders from Binance & Bybit leaderboards
            {updated&&<span style={{color:"var(--text-faint)"}}> · {updated.toLocaleTimeString()}</span>}
            {alertStatus&&<span style={{color:"var(--purple)",fontWeight:600}}> · {alertStatus}</span>}
          </p>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setShowHist(true)} className="btn btn-ghost" style={{fontSize:12}}>📋 History</button>
          <button onClick={()=>setSound(s=>!s)} className={`btn ${sound?"btn-ghost":""}`} style={{fontSize:12,opacity:sound?1:0.5}}>{sound?"🔊":"🔇"}</button>
          <button onClick={()=>setAutoRefresh(a=>!a)} className="btn btn-ghost" style={{fontSize:12,color:autoRefresh?"var(--profit)":"var(--text-faint)",borderColor:autoRefresh?"rgba(0,212,160,0.3)":"var(--border)"}}>⟳ {autoRefresh?"Auto":"Manual"}</button>
          <button onClick={()=>setAutoAlert(a=>!a)} className="btn btn-ghost" style={{fontSize:12,color:autoAlert?"var(--purple)":"var(--text-faint)",borderColor:autoAlert?"rgba(167,139,250,0.3)":"var(--border)"}}>🤖 {autoAlert?"Alert On":"Alert Off"}</button>
          <button onClick={()=>load()} disabled={loading} className="btn btn-primary" style={{fontSize:12}}>↻ Refresh</button>
        </div>
      </div>

      {/* Stats */}
      {!loading&&traders.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
          {[["Traders",traders.length],["With Positions",withPos],["Live Positions",totalPos],["Binance",traders.filter(t=>t.source==="BINANCE").length],["Bybit",traders.filter(t=>t.source!=="BINANCE").length]].map(([l,v])=>(
            <div key={l} className="stat-card"><p className="stat-label">{l}</p><p className="stat-value">{v}</p></div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{padding:"14px 18px",marginBottom:16,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:3,background:"var(--bg)",padding:3,borderRadius:9,border:"1px solid var(--border)"}}>
          {(["ALL","BINANCE","BYBIT","BYBIT_COPY"] as const).map(f=>(
            <button key={f} onClick={()=>setSrc(f)} style={{padding:"5px 12px",borderRadius:7,border:"none",fontSize:11,cursor:"pointer",background:src===f?"var(--accent)":"transparent",color:src===f?"#fff":"var(--text-faint)",fontWeight:src===f?600:400,transition:"all 0.15s"}}>
              {f==="BYBIT_COPY"?"COPY":f}
            </button>
          ))}
        </div>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text-muted)"}}>Min ROI %<input type="number" value={minRoi} onChange={e=>setMinRoi(+e.target.value)} className="input" style={{width:65,marginLeft:4}} /></label>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text-muted)"}}>Win Rate %<input type="number" value={minWr} onChange={e=>setMinWr(+e.target.value)} className="input" style={{width:65,marginLeft:4}} /></label>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text-muted)"}}>Max DD %<input type="number" value={maxDd} onChange={e=>setMaxDd(+e.target.value)} className="input" style={{width:65,marginLeft:4}} /></label>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text-muted)"}}>Min Score<input type="number" min={0} max={100} value={minScore} onChange={e=>setMinScore(+e.target.value)} className="input" style={{width:60,marginLeft:4}} /></label>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:"var(--text-muted)"}}>
          <input type="checkbox" checked={posOnly} onChange={e=>setPosOnly(e.target.checked)} />Live positions only
        </label>
        <span style={{color:"var(--text-faint)",fontSize:12,marginLeft:"auto"}}>{filtered.length} traders</span>
      </div>

      {loading ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:80}}>
          <Spinner size="lg"/>
          <p style={{color:"var(--text-muted)",fontSize:13}}>Fetching live data from Binance & Bybit…</p>
        </div>
      ) : error ? (
        <div className="card" style={{padding:40,textAlign:"center"}}>
          <p style={{color:"var(--loss)",marginBottom:12}}>{error}</p>
          <button onClick={()=>load()} className="btn btn-ghost">Retry</button>
        </div>
      ) : filtered.length===0 ? (
        <div className="card" style={{padding:40,textAlign:"center"}}><p style={{color:"var(--text-muted)"}}>No traders match your filters.</p></div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(t=><TraderCard key={`${t.source}-${t.uid}`} trader={t} isNew={newUids.has(t.uid)} onSelect={pos=>setSel({pos,trader:t})} />)}
        </div>
      )}

      {sel&&<RiskCalc pos={sel.pos} trader={sel.trader} onClose={()=>setSel(null)} />}
      {showHist&&<HistoryPanel onClose={()=>setShowHist(false)} />}
    </div>
  );
}
