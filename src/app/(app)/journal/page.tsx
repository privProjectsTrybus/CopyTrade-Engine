"use client";
import { useEffect, useState } from "react";
import { Badge, Spinner } from "@/components/ui/Badge";
import { gradeColor, gradeEmoji } from "@/lib/aiScoring";

interface Entry { id:string; createdAt:string; symbol:string; side:string; leverage:number; traderNickname:string; traderSource:string; signalScore:number; signalGrade:string; tookTrade:boolean; myEntry:number; mySize:string; myExit:string; outcome:string; notes:string; }

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const r = await fetch("/api/journal");
    if(r.ok) setEntries(await r.json());
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  async function del(id:string) {
    if(!confirm("Delete this entry?")) return;
    await fetch("/api/journal",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    setEntries(e=>e.filter(x=>x.id!==id));
  }

  const wins = entries.filter(e=>e.outcome==="WIN").length;
  const losses = entries.filter(e=>e.outcome==="LOSS").length;
  const took = entries.filter(e=>e.tookTrade).length;

  if(loading) return <div style={{display:"flex",justifyContent:"center",padding:80}}><Spinner size="lg"/></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Copy Journal</h1>
        <p className="page-sub">Track which signals you followed and how they performed</p>
      </div>

      {entries.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
          {[
            {label:"Total Logged",value:entries.length},
            {label:"Trades Taken",value:took},
            {label:"Wins",value:wins,positive:true},
            {label:"Losses",value:losses,negative:true},
          ].map(s=>(
            <div key={s.label} className="stat-card">
              <p className="stat-label">{s.label}</p>
              <p className="stat-value" style={{color:(s as any).positive?"var(--profit)":(s as any).negative?"var(--loss)":"var(--text)"}}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {entries.length===0 ? (
        <div className="card" style={{padding:60,textAlign:"center"}}>
          <p style={{color:"var(--text-muted)",fontSize:16}}>No journal entries yet.</p>
          <p style={{color:"var(--text-faint)",fontSize:13,marginTop:8}}>Go to the Live Feed and click <b>+ Journal</b> on any signal to log it.</p>
        </div>
      ) : (
        <div className="card" style={{overflow:"hidden"}}>
          <div className="table-header" style={{display:"grid",gridTemplateColumns:"110px 80px 70px 80px 80px 80px 80px 80px 1fr 36px",gap:8}}>
            {["Symbol","Side","Lev","Score","Trader","Took?","My Entry","Outcome","Notes",""].map(h=><span key={h}>{h}</span>)}
          </div>
          {entries.map(e=>(
            <div key={e.id} className="table-row" style={{display:"grid",gridTemplateColumns:"110px 80px 70px 80px 80px 80px 80px 80px 1fr 36px",gap:8,alignItems:"center",padding:"12px 16px"}}>
              <div>
                <p style={{color:"var(--text)",fontWeight:600,fontSize:13}}>{e.symbol}</p>
                <p style={{color:"var(--text-faint)",fontSize:10,marginTop:1}}>{new Date(e.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge variant={e.side==="LONG"?"green":"red"}>{e.side}</Badge>
              <span style={{color:"var(--text-muted)",fontSize:12}}>{e.leverage}x</span>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:14}}>{gradeEmoji(e.signalGrade)}</span>
                <span style={{color:gradeColor(e.signalGrade),fontSize:12,fontWeight:600}}>{e.signalScore}</span>
              </div>
              <div>
                <p style={{color:"var(--text-muted)",fontSize:11}}>{e.traderNickname}</p>
                <p style={{color:"var(--text-faint)",fontSize:10}}>{e.traderSource}</p>
              </div>
              <Badge variant={e.tookTrade?"blue":"dim"}>{e.tookTrade?"Yes":"No"}</Badge>
              <span style={{color:"var(--text-muted)",fontSize:12}}>{e.myEntry?`$${Number(e.myEntry).toLocaleString()}`:"—"}</span>
              <Badge variant={e.outcome==="WIN"?"green":e.outcome==="LOSS"?"red":e.outcome==="BREAKEVEN"?"yellow":"dim"}>{e.outcome}</Badge>
              <p style={{color:"var(--text-faint)",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.notes||"—"}</p>
              <button onClick={()=>del(e.id)} style={{background:"none",border:"none",color:"var(--text-faint)",cursor:"pointer",fontSize:14,padding:0}} title="Delete">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
