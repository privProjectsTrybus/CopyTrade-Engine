"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LineChart, Line, BarChart, Bar, Cell, Tooltip, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Badge, Spinner } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";

const STYLE: Record<string,string> = { FUTURES_SCALPER:"Futures Scalper", FUTURES_SWING:"Futures Swing", SPOT_SWING:"Spot Swing", SPOT_LONG_TERM:"Long-term" };

function fmtHrs(h:number) { if(h<1) return `${Math.round(h*60)}m`; if(h<24) return `${h.toFixed(1)}h`; return `${(h/24).toFixed(1)}d`; }

export default function TraderProfilePage() {
  const { id } = useParams() as { id:string };
  const router = useRouter();
  const [trader, setTrader] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetch(`/api/traders/${id}`).then(r=>r.ok?r.json():null).then(d=>{setTrader(d);setLoading(false);});
  },[id]);

  if(loading) return <div style={{display:"flex",justifyContent:"center",padding:80}}><Spinner size="lg"/></div>;
  if(!trader) return <div className="page"><p style={{color:"var(--text-muted)"}}>Trader not found.</p></div>;

  const s = trader.statistics;
  const monthly: {month:string;roi:number}[] = Array.isArray(s?.monthlyReturns)?s.monthlyReturns:[];
  let eq=1000;
  const equity = monthly.map(m=>{ eq=eq*(1+m.roi/100); return {month:m.month.slice(5),equity:+eq.toFixed(2)}; });
  const TT = ({active,payload,label}:any)=>!active||!payload?.length?null:(
    <div className="card" style={{padding:"8px 12px",fontSize:12}}>
      <p style={{color:"var(--text-faint)",marginBottom:3}}>{label}</p>
      {payload.map((p:any,i:number)=><p key={i} style={{color:p.color}}>{p.name}: {typeof p.value==="number"?p.value.toFixed(2):p.value}</p>)}
    </div>
  );

  return (
    <div className="page">
      <button onClick={()=>router.back()} className="btn btn-ghost" style={{fontSize:12,marginBottom:20}}>← Back</button>

      {/* Header */}
      <div className="card animate-fade" style={{padding:24,marginBottom:14,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,var(--accent),var(--purple))",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:22,flexShrink:0}}>
            {trader.displayName[0]}
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <h1 style={{color:"var(--text)",fontSize:20,fontWeight:700}}>{trader.displayName}</h1>
              {trader.isVerified&&<Badge variant="blue">✓ Verified</Badge>}
            </div>
            <p style={{color:"var(--text-muted)",fontSize:13}}>{trader.exchange} · {STYLE[trader.tradingStyle]}</p>
            {trader.bio&&<p style={{color:"var(--text-faint)",fontSize:12,marginTop:6,maxWidth:500,lineHeight:1.5}}>{trader.bio}</p>}
          </div>
        </div>
        <a href={`/copy-trading`} className="btn btn-primary" style={{textDecoration:"none",flexShrink:0}}>Copy Trader</a>
      </div>

      {/* Stats */}
      {s&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
          <StatCard label="30d ROI" value={`${s.roi30d>=0?"+":""}${s.roi30d.toFixed(2)}%`} positive={s.roi30d>0} negative={s.roi30d<0} />
          <StatCard label="90d ROI" value={`${s.roi90d>=0?"+":""}${s.roi90d.toFixed(2)}%`} positive={s.roi90d>0} negative={s.roi90d<0} />
          <StatCard label="1Y ROI" value={`${s.roi1y>=0?"+":""}${s.roi1y.toFixed(1)}%`} positive={s.roi1y>0} negative={s.roi1y<0} />
          <StatCard label="Win Rate" value={`${s.winRate.toFixed(1)}%`} />
          <StatCard label="Max Drawdown" value={`-${s.maxDrawdown.toFixed(1)}%`} negative />
          <StatCard label="Avg Leverage" value={`${s.avgLeverage.toFixed(1)}x`} />
          <StatCard label="Avg Hold Time" value={fmtHrs(s.avgHoldingHours)} />
          <StatCard label="Followers" value={s.followerCount.toLocaleString()} />
        </div>
      )}

      {equity.length>1&&(
        <div className="card animate-fade" style={{padding:20,marginBottom:14}}>
          <p className="section-title">Equity Curve (Starting $1,000)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={equity}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-faint)" tick={{fontSize:10}} />
              <YAxis stroke="var(--text-faint)" tick={{fontSize:10}} tickFormatter={(v:number)=>`$${v}`} />
              <Tooltip content={<TT />} />
              <Line type="monotone" dataKey="equity" name="Equity" stroke="var(--accent-light)" strokeWidth={2} dot={false} activeDot={{r:3,fill:"var(--accent-light)"}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {monthly.length>0&&(
        <div className="card animate-fade" style={{padding:20,marginBottom:14}}>
          <p className="section-title">Monthly Returns</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-faint)" tick={{fontSize:10}} tickFormatter={(v:string)=>v.slice(5)} />
              <YAxis stroke="var(--text-faint)" tick={{fontSize:10}} tickFormatter={(v:number)=>`${v}%`} />
              <Tooltip content={<TT />} />
              <Bar dataKey="roi" name="ROI %" radius={[4,4,0,0]}>
                {monthly.map((m,i)=><Cell key={i} fill={m.roi>=0?"var(--profit)":"var(--loss)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {trader.signals?.length>0&&(
        <div className="card animate-fade" style={{overflow:"hidden"}}>
          <div style={{padding:"16px 18px",borderBottom:"1px solid var(--border)"}}>
            <p className="section-title" style={{margin:0}}>Open Positions ({trader.signals.length})</p>
          </div>
          <div className="table-header" style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 70px 110px 110px"}}>
            {["Symbol","Side","Entry","Lev","Stop Loss","Take Profit"].map(h=><span key={h}>{h}</span>)}
          </div>
          {trader.signals.map((sig:any)=>(
            <div key={sig.id} className="table-row" style={{padding:"12px 18px",display:"grid",gridTemplateColumns:"1fr 80px 110px 70px 110px 110px",alignItems:"center"}}>
              <span style={{color:"var(--text)",fontWeight:700,fontSize:13}}>{sig.symbol}</span>
              <Badge variant={sig.side==="LONG"?"green":"red"}>{sig.side}</Badge>
              <span style={{color:"var(--text-muted)",fontSize:12}}>${sig.entryPrice.toLocaleString()}</span>
              <span style={{color:"var(--text-muted)",fontSize:12}}>{sig.leverage}x</span>
              <span style={{color:"var(--loss)",fontSize:12}}>{sig.stopLossPrice?`$${sig.stopLossPrice.toLocaleString()}`:"—"}</span>
              <span style={{color:"var(--profit)",fontSize:12}}>{sig.takeProfitPrice?`$${sig.takeProfitPrice.toLocaleString()}`:"—"}</span>
            </div>
          ))}
        </div>
      )}

      {trader.specialties?.length>0&&(
        <div className="card animate-fade" style={{padding:20,marginTop:14}}>
          <p className="section-title">Trading Pairs</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
            {trader.specialties.map((sp:string)=><span key={sp} className="badge badge-dim" style={{borderRadius:8,padding:"5px 12px",fontSize:12}}>{sp}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
