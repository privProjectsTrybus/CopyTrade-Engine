"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Spinner } from "@/components/ui/Badge";

interface Trader { id:string; displayName:string; bio:string|null; exchange:string; tradingStyle:string; riskScore:number; specialties:string[]; isVerified:boolean; statistics:{ winRate:number; roi30d:number; roi90d:number; roi1y:number; avgLeverage:number; followerCount:number; maxDrawdown:number; avgHoldingHours:number; }|null; }
interface Conn { id:string; exchange:string; label:string; }

const STYLE: Record<string,string> = { FUTURES_SCALPER:"Scalper", FUTURES_SWING:"Swing", SPOT_SWING:"Spot Swing", SPOT_LONG_TERM:"Long-term" };
const SORT = [["roi30d","30d ROI"],["roi90d","90d ROI"],["winRate","Win Rate"],["followers","Followers"],["drawdown","Low DD"],["risk","Low Risk"]];

function TraderCard({ t, onCopy }: { t:Trader; onCopy:()=>void }) {
  const s = t.statistics;
  return (
    <div className="card card-interactive animate-fade" style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,var(--accent),var(--purple))",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:15,flexShrink:0}}>
            {t.displayName[0]}
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{color:"var(--text)",fontWeight:600,fontSize:14}}>{t.displayName}</span>
              {t.isVerified&&<span style={{color:"var(--accent-light)",fontSize:11}}>✓</span>}
            </div>
            <p style={{color:"var(--text-faint)",fontSize:11,marginTop:2}}>{t.exchange} · {STYLE[t.tradingStyle]}</p>
          </div>
        </div>
        <Badge variant={t.riskScore<35?"green":t.riskScore<60?"yellow":"red"}>Risk {t.riskScore}</Badge>
      </div>

      {s && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
          {[["30d ROI",`${s.roi30d>=0?"+":""}${s.roi30d.toFixed(1)}%`,s.roi30d>=0?"var(--profit)":"var(--loss)"],
            ["Win Rate",`${s.winRate.toFixed(1)}%`,"var(--text)"],
            ["Max DD",`-${s.maxDrawdown.toFixed(1)}%`,"var(--loss)"],
            ["Avg Lev",`${s.avgLeverage.toFixed(1)}x`,"var(--text)"],
            ["Followers",s.followerCount.toLocaleString(),"var(--text)"],
            ["1Y ROI",`${s.roi1y>=0?"+":""}${s.roi1y.toFixed(0)}%`,s.roi1y>=0?"var(--profit)":"var(--loss)"],
          ].map(([l,v,c])=>(
            <div key={l as string} style={{background:"var(--bg)",borderRadius:8,padding:"8px 10px",border:"1px solid var(--border)"}}>
              <p style={{color:"var(--text-faint)",fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em"}}>{l}</p>
              <p style={{color:c as string,fontSize:13,fontWeight:600,marginTop:3}}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {t.specialties.length>0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {t.specialties.slice(0,4).map(s=><span key={s} style={{background:"var(--bg-hover)",color:"var(--text-faint)",fontSize:10,padding:"2px 8px",borderRadius:999}}>{s.replace("USDT","")}</span>)}
        </div>
      )}

      <div style={{display:"flex",gap:8}}>
        <button onClick={onCopy} className="btn btn-primary" style={{flex:1,padding:"9px"}}>Copy Trader</button>
        <Link href={`/traders/${t.id}`} className="btn btn-ghost" style={{padding:"9px 14px",textDecoration:"none"}}>Profile</Link>
      </div>
    </div>
  );
}

function CopyModal({ t, conns, onClose, onDone }: { t:Trader; conns:Conn[]; onClose:()=>void; onDone:()=>void }) {
  const [form, setForm] = useState({ connectionId:conns[0]?.id??"", allocationType:"FIXED_AMOUNT", allocationValue:500, sizingMode:"SCALED_MIRROR", riskMultiplier:1, maxLeverage:10 });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  const s = (k:string,v:any) => setForm(f=>({...f,[k]:v}));

  async function submit(e:React.FormEvent) {
    e.preventDefault(); setErr(""); setSaving(true);
    const r = await fetch("/api/copy/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({traderProfileId:t.id,...form})});
    const d = await r.json(); setSaving(false);
    if(!r.ok){setErr(d.error);return;} onDone();
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="card animate-fade" style={{width:"100%",maxWidth:440,padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{color:"var(--text)",fontSize:16,fontWeight:600}}>Copy {t.displayName}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text-faint)",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        {conns.length===0 ? (
          <div style={{textAlign:"center",padding:20}}>
            <p style={{color:"var(--text-muted)"}}>No exchange connected.</p>
            <p style={{color:"var(--text-faint)",fontSize:12,marginTop:6}}>You can still view signals on the Signals page without connecting an exchange.</p>
            <Link href="/exchanges" style={{color:"var(--accent-light)",fontSize:13,display:"inline-block",marginTop:8}}>Connect exchange →</Link>
          </div>
        ) : (
          <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Exchange Account</label>
              <select value={form.connectionId} onChange={e=>s("connectionId",e.target.value)} className="select" style={{marginTop:5}}>
                {conns.map(c=><option key={c.id} value={c.id}>{c.label} ({c.exchange})</option>)}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Allocation Type</label>
                <select value={form.allocationType} onChange={e=>s("allocationType",e.target.value)} className="select" style={{marginTop:5}}>
                  <option value="FIXED_AMOUNT">Fixed $</option>
                  <option value="PERCENTAGE_OF_ACCOUNT">% of account</option>
                </select>
              </div>
              <div>
                <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>{form.allocationType==="FIXED_AMOUNT"?"Amount (USD)":"Percentage"}</label>
                <input type="number" min={1} value={form.allocationValue} onChange={e=>s("allocationValue",+e.target.value)} className="input" style={{marginTop:5}} />
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Sizing Mode</label>
                <select value={form.sizingMode} onChange={e=>s("sizingMode",e.target.value)} className="select" style={{marginTop:5}}>
                  <option value="SCALED_MIRROR">Scaled Mirror</option>
                  <option value="EXACT_MIRROR">Exact Mirror</option>
                  <option value="FIXED_DOLLAR">Fixed Dollar</option>
                </select>
              </div>
              <div>
                <label style={{color:"var(--text-muted)",fontSize:12,fontWeight:500}}>Risk Multiplier</label>
                <select value={form.riskMultiplier} onChange={e=>s("riskMultiplier",+e.target.value)} className="select" style={{marginTop:5}}>
                  {[0.25,0.5,1,1.5,2].map(v=><option key={v} value={v}>{v}x</option>)}
                </select>
              </div>
            </div>
            {err && <p style={{color:"var(--loss)",fontSize:12}}>{err}</p>}
            <button type="submit" disabled={saving} className="btn btn-primary" style={{width:"100%",padding:"11px"}}>{saving?"Starting…":"Start Copying"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CopyTradingPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [conns, setConns] = useState<Conn[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("roi30d");
  const [style, setStyle] = useState("");
  const [riskMax, setRiskMax] = useState(100);
  const [copy, setCopy] = useState<Trader|null>(null);
  const [success, setSuccess] = useState(false);

  const load = async () => {
    const p = new URLSearchParams({sortBy:sort}); if(style) p.set("style",style); p.set("riskMax",String(riskMax));
    const [tr,co] = await Promise.all([fetch(`/api/traders?${p}`),fetch("/api/exchange/list")]);
    if(tr.ok) setTraders(await tr.json());
    if(co.ok) setConns(await co.json());
    setLoading(false);
  };
  useEffect(()=>{load();},[sort,style,riskMax]);

  return (
    <div className="page">
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><h1 className="page-title">Trader Marketplace</h1><p className="page-sub">Browse and copy verified professional traders</p></div>
      </div>

      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{color:"var(--text-faint)",fontSize:12}}>Sort</label>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="select" style={{width:"auto"}}>
            {SORT.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{color:"var(--text-faint)",fontSize:12}}>Style</label>
          <select value={style} onChange={e=>setStyle(e.target.value)} className="select" style={{width:"auto"}}>
            <option value="">All</option>
            {Object.entries(STYLE).map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{color:"var(--text-faint)",fontSize:12}}>Risk</label>
          <select value={riskMax} onChange={e=>setRiskMax(+e.target.value)} className="select" style={{width:"auto"}}>
            <option value={100}>All</option><option value={35}>Low only</option><option value={60}>Low & Medium</option>
          </select>
        </div>
        <span style={{color:"var(--text-faint)",fontSize:12,marginLeft:"auto"}}>{traders.length} traders</span>
      </div>

      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:60}}><Spinner size="lg"/></div>
      ) : traders.length===0 ? (
        <div className="card" style={{padding:60,textAlign:"center"}}>
          <p style={{color:"var(--text-muted)"}}>No traders in the marketplace yet.</p>
          <a href="/admin" style={{color:"var(--accent-light)",fontSize:13,display:"inline-block",marginTop:8}}>Go to Admin → Seed Traders →</a>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
          {traders.map(t=><TraderCard key={t.id} t={t} onCopy={()=>{setSuccess(false);setCopy(t);}} />)}
        </div>
      )}

      {success && (
        <div className="animate-fade" style={{position:"fixed",bottom:24,right:24,background:"rgba(0,212,160,0.15)",border:"1px solid rgba(0,212,160,0.3)",borderRadius:12,padding:"12px 18px",color:"var(--profit)",fontSize:13}}>
          ✓ Now copying trader. <a href="/dashboard" style={{color:"var(--profit)"}}>View dashboard →</a>
        </div>
      )}

      {copy && <CopyModal t={copy} conns={conns} onClose={()=>setCopy(null)} onDone={()=>{setCopy(null);setSuccess(true);}} />}
    </div>
  );
}
