"use client";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Spinner } from "@/components/ui/Badge";
import { useEngine } from "@/context/EngineContext";

interface ActiveCopy { id:string; traderProfile:{displayName:string;riskScore:number}; allocationValue:number; allocationType:string; }

export default function DashboardPage() {
  const { isRunning, isLoading: engineLoading, events, start, stop } = useEngine();
  const [copies, setCopies] = useState<ActiveCopy[]>([]);
  const [pnl, setPnl] = useState({ today:0, thisWeek:0, thisMonth:0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/copy/list"), fetch("/api/portfolio/pnl-summary")])
      .then(async ([c, p]) => {
        if (c.ok) setCopies(await c.json());
        if (p.ok) setPnl(await p.json());
        setLoading(false);
      });
  }, []);

  const s = (n: number) => `${n >= 0 ? "+" : ""}$${n.toFixed(2)}`;

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ color:"var(--text)", fontSize:22, fontWeight:600, margin:0 }}>Dashboard</h1>
          <p style={{ color:"var(--text-muted)", fontSize:13, marginTop:4 }}>Copy engine control centre</p>
        </div>
        <button onClick={isRunning ? stop : start} disabled={engineLoading}
          style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:500,
                   background: isRunning ? "rgba(234,57,67,0.2)" : "var(--accent)",
                   color: isRunning ? "var(--loss)" : "#fff", opacity: engineLoading ? 0.5 : 1 }}>
          {engineLoading ? "Initialising…" : isRunning ? "Stop Engine" : "Start Engine"}
        </button>
      </div>

      {/* Engine banner */}
      <div style={{ border:`1px solid ${isRunning ? "rgba(22,199,132,0.3)" : "var(--border)"}`,
                    background: isRunning ? "rgba(22,199,132,0.05)" : "var(--bg-card)",
                    borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center",
                    gap:12, marginBottom:24 }}>
        <span style={{ width:10, height:10, borderRadius:"50%", flexShrink:0,
                       background: isRunning ? "var(--profit)" : "var(--text-faint)",
                       animation: isRunning ? "pulse 2s infinite" : "none" }} />
        <div>
          <p style={{ color:"var(--text)", fontSize:13, fontWeight:500, margin:0 }}>
            Engine {isRunning ? "running — monitoring trader signals every 5 seconds" : "offline"}
          </p>
          <p style={{ color:"var(--text-muted)", fontSize:12, margin:"2px 0 0" }}>
            {isRunning ? "Trades execute automatically when signals pass risk checks."
                       : "Start the engine to begin copying. Runs while this tab is open."}
          </p>
        </div>
      </div>

      {/* PnL stats */}
      {loading ? <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner /></div> : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
          <StatCard label="Today" value={s(pnl.today)} positive={pnl.today>0} negative={pnl.today<0} />
          <StatCard label="This Week" value={s(pnl.thisWeek)} positive={pnl.thisWeek>0} negative={pnl.thisWeek<0} />
          <StatCard label="This Month" value={s(pnl.thisMonth)} positive={pnl.thisMonth>0} negative={pnl.thisMonth<0} />
          <StatCard label="Active Copies" value={copies.length} subtext="copy relationships" />
        </div>
      )}

      {/* Active copies */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <h2 style={{ color:"var(--text)", fontSize:15, fontWeight:600, margin:0 }}>Active Copies</h2>
          <a href="/copy-trading" style={{ color:"var(--accent)", fontSize:13, textDecoration:"none" }}>Browse traders →</a>
        </div>
        {copies.length === 0 ? (
          <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:12,
                        padding:40, textAlign:"center" }}>
            <p style={{ color:"var(--text-muted)", margin:0 }}>No active copies.</p>
            <a href="/copy-trading" style={{ color:"var(--accent)", fontSize:13, display:"block", marginTop:8 }}>
              Browse the trader marketplace →
            </a>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {copies.map(c => (
              <div key={c.id} style={{ background:"var(--bg-card)", border:"1px solid var(--border)",
                                       borderRadius:12, padding:"12px 16px", display:"flex",
                                       alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"var(--bg-hover)",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                color:"var(--text)", fontWeight:700, fontSize:13 }}>
                    {c.traderProfile.displayName[0]}
                  </div>
                  <div>
                    <p style={{ color:"var(--text)", fontSize:13, fontWeight:500, margin:0 }}>{c.traderProfile.displayName}</p>
                    <p style={{ color:"var(--text-faint)", fontSize:12, margin:"2px 0 0" }}>
                      {c.allocationType === "FIXED_AMOUNT" ? `$${c.allocationValue}` : `${c.allocationValue}%`} allocated
                    </p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <Badge variant={c.traderProfile.riskScore < 35 ? "green" : c.traderProfile.riskScore < 60 ? "yellow" : "red"}>
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
      <div>
        <h2 style={{ color:"var(--text)", fontSize:15, fontWeight:600, marginBottom:12 }}>Engine Events</h2>
        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:12,
                      maxHeight:280, overflowY:"auto" }}>
          {events.length === 0 ? (
            <p style={{ color:"var(--text-faint)", fontSize:13, padding:16, margin:0 }}>No events yet. Start the engine to begin.</p>
          ) : events.map((e, i) => {
            const color = e.type==="TRADE_EXECUTED" ? "var(--profit)"
              : ["TRADE_REJECTED","ENGINE_ERROR"].includes(e.type) ? "var(--loss)"
              : ["ENGINE_PAUSED","RISK_LIMIT_BREACHED"].includes(e.type) ? "#f59e0b"
              : "var(--text-muted)";
            const detail = e.type==="TRADE_EXECUTED" ? `${e.side} ${e.symbol} · ${e.size.toFixed(4)} @ $${e.price.toFixed(2)}`
              : e.type==="POSITION_CLOSED" ? `${e.symbol} · PnL: ${e.realizedPnl>=0?"+":""}$${e.realizedPnl.toFixed(2)}`
              : (e as any).reason ?? (e as any).message ?? "";
            return (
              <div key={i} style={{ display:"flex", gap:12, padding:"8px 16px",
                                    borderBottom:"1px solid var(--border)", alignItems:"flex-start" }}>
                <span style={{ color, fontSize:11, fontFamily:"monospace", flexShrink:0, paddingTop:2 }}>
                  {e.type.replace(/_/g," ")}
                </span>
                <span style={{ color:"var(--text-muted)", fontSize:12 }}>{detail}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
