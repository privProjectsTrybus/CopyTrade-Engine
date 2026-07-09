"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, Cell, PieChart, Pie, Tooltip, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Spinner } from "@/components/ui/Badge";

export default function PortfolioPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio/analytics").then(r=>r.ok?r.json():null).then(d=>{setData(d);setLoading(false);});
  },[]);

  const COLORS = ["#6366f1","#00d4a0","#a78bfa","#f59e0b","#ff4466","#06b6d4","#ec4899","#84cc16"];
  const TT = ({ active,payload,label }:any) => !active||!payload?.length?null:(
    <div className="card" style={{padding:"8px 12px",fontSize:12}}>
      <p style={{color:"var(--text-muted)",marginBottom:4}}>{label}</p>
      {payload.map((p:any,i:number)=><p key={i} style={{color:p.color}}>{p.name}: {typeof p.value==="number"?p.value.toFixed(2):p.value}</p>)}
    </div>
  );

  if(loading) return <div style={{display:"flex",justifyContent:"center",padding:80}}><Spinner size="lg"/></div>;

  const empty = !data || data.totalTrades===0;

  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Portfolio Analytics</h1><p className="page-sub">Performance computed from all closed positions</p></div>

      {empty ? (
        <div className="card" style={{padding:60,textAlign:"center"}}>
          <p style={{color:"var(--text-muted)"}}>No closed positions yet.</p>
          <p style={{color:"var(--text-faint)",fontSize:13,marginTop:6}}>Analytics appear once your first trade closes.</p>
        </div>
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
            <StatCard label="Total Realized PnL" value={`${data.totalRealizedPnl>=0?"+":""}$${data.totalRealizedPnl.toFixed(2)}`} positive={data.totalRealizedPnl>0} negative={data.totalRealizedPnl<0} />
            <StatCard label="Total ROI" value={`${data.totalRoi>=0?"+":""}${data.totalRoi.toFixed(2)}%`} positive={data.totalRoi>0} negative={data.totalRoi<0} />
            <StatCard label="Unrealized PnL" value={`${data.unrealizedPnl>=0?"+":""}$${data.unrealizedPnl.toFixed(2)}`} positive={data.unrealizedPnl>0} negative={data.unrealizedPnl<0} subtext={`${data.openPositionCount} open`} />
            <StatCard label="Total Trades" value={data.totalTrades} subtext={`${data.winCount}W / ${data.lossCount}L`} />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
            <StatCard label="Sharpe Ratio" value={data.sharpeRatio.toFixed(2)} positive={data.sharpeRatio>1} negative={data.sharpeRatio<0} subtext="> 1.0 is good" />
            <StatCard label="Sortino Ratio" value={data.sortinoRatio.toFixed(2)} positive={data.sortinoRatio>1} negative={data.sortinoRatio<0} subtext="> 1.0 is good" />
            <StatCard label="Max Drawdown" value={`-${data.maxDrawdown.toFixed(2)}%`} negative={data.maxDrawdown>10} subtext={`${data.maxDrawdownDuration}d`} />
            <StatCard label="Win Rate" value={`${data.winRate.toFixed(1)}%`} positive={data.winRate>55} negative={data.winRate<45} />
          </div>

          {data.equityCurve?.length>1 && (
            <div className="card animate-fade" style={{padding:20,marginBottom:14}}>
              <p className="section-title">Equity Curve</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-faint)" tick={{fontSize:10}} tickFormatter={(v:string)=>v.slice(5)} interval="preserveStartEnd" />
                  <YAxis stroke="var(--text-faint)" tick={{fontSize:10}} tickFormatter={(v:number)=>`$${v.toFixed(0)}`} />
                  <Tooltip content={<TT />} />
                  <Line type="monotone" dataKey="equity" name="Equity" stroke="var(--accent-light)" strokeWidth={2} dot={false} activeDot={{r:3}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            {data.monthlyReturns?.length>0 && (
              <div className="card animate-fade" style={{padding:20}}>
                <p className="section-title">Monthly Returns</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.monthlyReturns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--text-faint)" tick={{fontSize:10}} tickFormatter={(v:string)=>v.slice(5)} />
                    <YAxis stroke="var(--text-faint)" tick={{fontSize:10}} tickFormatter={(v:number)=>`${v.toFixed(1)}%`} />
                    <Tooltip content={<TT />} />
                    <Bar dataKey="returnPct" name="Return %" radius={[4,4,0,0]}>
                      {data.monthlyReturns.map((_:any,i:number)=><Cell key={i} fill={data.monthlyReturns[i].returnPct>=0?"var(--profit)":"var(--loss)"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {data.assetAllocation?.length>0 && (
              <div className="card animate-fade" style={{padding:20}}>
                <p className="section-title">Asset Allocation</p>
                <div style={{display:"flex",alignItems:"center",gap:16}}>
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart><Pie data={data.assetAllocation} dataKey="count" nameKey="symbol" cx="50%" cy="50%" outerRadius={65} strokeWidth={0}>
                      {data.assetAllocation.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie><Tooltip formatter={(v:any)=>[v,""]} /></PieChart>
                  </ResponsiveContainer>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                    {data.assetAllocation.map((a:any,i:number)=>(
                      <div key={a.symbol} style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{width:8,height:8,borderRadius:"50%",background:COLORS[i%COLORS.length],flexShrink:0}} />
                          <span style={{color:"var(--text-muted)"}}>{a.symbol.replace("USDT","")}</span>
                        </div>
                        <span style={{color:a.pnl>=0?"var(--profit)":"var(--loss)"}}>{a.pnl>=0?"+":""}${a.pnl.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {data.openPositions?.length>0 && (
            <div className="card animate-fade" style={{overflow:"hidden"}}>
              <div className="table-header" style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 100px 70px 120px"}}>
                {["Symbol","Side","Entry","Mark","Lev","Unrealized PnL"].map(h=><span key={h}>{h}</span>)}
              </div>
              {data.openPositions.map((p:any,i:number)=>(
                <div key={i} className="table-row" style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 100px 70px 120px",alignItems:"center"}}>
                  <span style={{color:"var(--text)",fontWeight:600,fontSize:13}}>{p.symbol}</span>
                  <Badge variant={p.side==="LONG"?"green":"red"}>{p.side}</Badge>
                  <span style={{color:"var(--text-muted)",fontSize:12}}>${p.entryPrice.toLocaleString()}</span>
                  <span style={{color:"var(--text-muted)",fontSize:12}}>${p.markPrice?.toLocaleString()??"-"}</span>
                  <span style={{color:"var(--text-muted)",fontSize:12}}>{p.leverage}x</span>
                  <span style={{color:p.unrealizedPnl>=0?"var(--profit)":"var(--loss)",fontWeight:600,fontSize:12}}>{p.unrealizedPnl>=0?"+":""}${p.unrealizedPnl.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
