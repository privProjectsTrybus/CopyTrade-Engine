"use client";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Spinner } from "@/components/ui/Badge";
import { useEngine } from "@/context/EngineContext";
import Link from "next/link";

interface ActiveCopy { id:string; traderProfile:{displayName:string;riskScore:number}; allocationValue:number; allocationType:string; }

export default function DashboardPage() {
  const { isRunning, isLoading:engineLoading, events, start, stop } = useEngine();
  const [copies, setCopies] = useState<ActiveCopy[]>([]);
  const [pnl, setPnl] = useState({ today:0, thisWeek:0, thisMonth:0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/copy/list"), fetch("/api/portfolio/pnl-summary")])
      .then(async ([c,p]) => {
        if(c.ok) setCopies(await c.json());
        if(p.ok) setPnl(await p.json());
        setLoading(false);
      });
  }, []);

  const fmt = (n:number) => `${n>=0?"+":"-"}$${Math.abs(n).toFixed(2)}`;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Your trading command centre</p>
        </div>
        <button onClick={isRunning?stop:start} disabled={engineLoading} className={`btn ${isRunning?"btn-danger":"btn-primary"}`}>
          {engineLoading ? "…" : isRunning ? "Stop Engine" : "Start Engine"}
        </button>
      </div>

      {/* Engine banner */}
      <div className="animate-fade" style={{ background: isRunning?"rgba(0,212,160,0.05)":"var(--bg-card)",
                  border:`1px solid ${isRunning?"rgba(0,212,160,0.2)":"var(--border)"}`,
                  borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
        <div className={isRunning?"dot-live":"dot-offline"} />
        <div>
          <p style={{ color:"var(--text)", fontSize:14, fontWeight:500 }}>
            Copy Engine {isRunning?"running":"offline"}
          </p>
          <p style={{ color:"var(--text-muted)", fontSize:12, marginTop:2 }}>
            {isRunning ? "Monitoring trader signals every 5 seconds. Trades execute automatically."
                       : "Start the engine to begin automatic copy trading."}
          </p>
        </div>
        <div style={{ marginLeft:"auto" }}>
          <Link href="/signals" className="btn btn-ghost" style={{ fontSize:12 }}>View Signals →</Link>
        </div>
      </div>

      {/* PnL */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
          {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height:80 }} />)}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
          <StatCard label="Today" value={fmt(pnl.today)} positive={pnl.today>0} negative={pnl.today<0} />
          <StatCard label="This Week" value={fmt(pnl.thisWeek)} positive={pnl.thisWeek>0} negative={pnl.thisWeek<0} />
          <StatCard label="This Month" value={fmt(pnl.thisMonth)} positive={pnl.thisMonth>0} negative={pnl.thisMonth<0} />
          <StatCard label="Active Copies" value={copies.length} subtext="copy relationships" />
        </div>
      )}

      {/* Quick links when no exchange */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
        {[
          { href:"/signals", icon:"📡", title:"Live Signals", desc:"Real top traders from Binance & Bybit leaderboards", color:"var(--accent-light)" },
          { href:"/copy-trading", icon:"⬡", title:"Copy Trading", desc:"Browse and copy verified traders manually", color:"var(--profit)" },
          { href:"/ai-trading", icon:"◉", title:"AI Strategies", desc:"Automated signal generation from 4 strategies", color:"var(--purple)" },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration:"none" }}>
            <div className="card card-interactive animate-fade" style={{ padding:20, cursor:"pointer" }}>
              <div style={{ fontSize:24, marginBottom:10 }}>{item.icon}</div>
              <p style={{ color:item.color, fontSize:14, fontWeight:600 }}>{item.title}</p>
              <p style={{ color:"var(--text-muted)", fontSize:12, marginTop:4, lineHeight:1.5 }}>{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Active copies */}
      <div className="section">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <p className="section-title">Active Copy Relationships ({copies.length})</p>
          <Link href="/copy-trading" style={{ color:"var(--accent-light)", fontSize:12, textDecoration:"none" }}>Browse traders →</Link>
        </div>
        {copies.length===0 ? (
          <div className="card" style={{ padding:32, textAlign:"center" }}>
            <p style={{ color:"var(--text-muted)" }}>No active copies yet.</p>
            <Link href="/copy-trading" style={{ color:"var(--accent-light)", fontSize:13, display:"inline-block", marginTop:8 }}>
              Browse the marketplace →
            </Link>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {copies.map(c => (
              <div key={c.id} className="card animate-fade" style={{ padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"var(--accent-glow)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent-light)", fontWeight:700, fontSize:14 }}>
                    {c.traderProfile.displayName[0]}
                  </div>
                  <div>
                    <p style={{ color:"var(--text)", fontWeight:500, fontSize:13 }}>{c.traderProfile.displayName}</p>
                    <p style={{ color:"var(--text-faint)", fontSize:11, marginTop:2 }}>
                      {c.allocationType==="FIXED_AMOUNT"?`$${c.allocationValue}`:`${c.allocationValue}%`} allocated
                    </p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <Badge variant={c.traderProfile.riskScore<35?"green":c.traderProfile.riskScore<60?"yellow":"red"}>
                    Risk {c.traderProfile.riskScore}
                  </Badge>
                  <Badge variant="green">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event log */}
      <div className="section">
        <p className="section-title">Engine Events</p>
        <div className="card" style={{ maxHeight:260, overflowY:"auto" }}>
          {events.length===0 ? (
            <p style={{ color:"var(--text-faint)", fontSize:13, padding:"20px 16px" }}>No events. Start the engine to begin.</p>
          ) : events.map((e,i) => {
            const color = e.type==="TRADE_EXECUTED"?"var(--profit)":["TRADE_REJECTED","ENGINE_ERROR"].includes(e.type)?"var(--loss)":["ENGINE_PAUSED","RISK_LIMIT_BREACHED"].includes(e.type)?"var(--yellow)":"var(--text-muted)";
            const detail = e.type==="TRADE_EXECUTED"?`${e.side} ${e.symbol} · ${e.size.toFixed(4)} @ $${e.price.toFixed(2)}`:e.type==="POSITION_CLOSED"?`${e.symbol} · ${(e as any).realizedPnl>=0?"+":""}$${(e as any).realizedPnl?.toFixed(2)}`:(e as any).reason??(e as any).message??"";
            return (
              <div key={i} className="table-row" style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <span style={{ color, fontSize:11, fontFamily:"monospace", flexShrink:0, paddingTop:1, minWidth:140 }}>{e.type.replace(/_/g," ")}</span>
                <span style={{ color:"var(--text-muted)", fontSize:12 }}>{detail}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
