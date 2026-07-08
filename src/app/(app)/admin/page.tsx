"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { StatCard } from "@/components/ui";
import { Badge, Spinner } from "@/components/ui";

interface Stats { totalUsers:number; activeUsers:number; totalTrades:number; openPositions:number; totalTraders:number; activeConnections:number; recentErrors:number; }
interface User { id:string; name:string|null; email:string|null; role:string; status:string; createdAt:string; _count:{exchangeConnections:number;copyRelationships:number;trades:number}; }
interface Log { id:string; action:string; metadata:any; createdAt:string; user:{email:string|null}|null; }

export default function AdminPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const [stats, setStats] = useState<Stats|null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [tab, setTab] = useState<"overview"|"users"|"logs">("overview");
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (role !== "ADMIN") { setLoading(false); return; }
    Promise.all([
      fetch("/api/admin/stats").then(r => r.ok ? r.json() : null),
      fetch("/api/admin/users").then(r => r.ok ? r.json() : []),
      fetch("/api/admin/logs").then(r => r.ok ? r.json() : { logs: [] }),
    ]).then(([s, u, l]) => { setStats(s); setUsers(u); setLogs(l.logs ?? []); setLoading(false); });
  }, [role, status]);

  async function seedTraders() {
    setSeeding(true); setSeedMsg("Seeding traders…");
    const res = await fetch("/api/admin/seed-traders", { method: "POST" });
    const data = await res.json();
    setSeedMsg(res.ok ? `✓ ${data.message}` : `✗ ${data.error}`);
    setSeeding(false);
    if (res.ok) { const s = await fetch("/api/admin/stats").then(r=>r.json()); setStats(s); }
  }

  async function toggleUserStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await fetch("/api/admin/users", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({userId, status:newStatus}) });
    setUsers(u => u.map(x => x.id===userId ? {...x, status:newStatus} : x));
  }

  if (status === "loading" || loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:400}}><Spinner size="lg" /></div>;

  if (role !== "ADMIN") return (
    <div style={{padding:40,textAlign:"center"}}>
      <p style={{color:"var(--loss)",fontSize:16,fontWeight:600}}>Access Denied</p>
      <p style={{color:"var(--text-muted)",fontSize:13,marginTop:8}}>
        Your account doesn't have admin permissions yet.<br/>
        Run this in Neon SQL Editor:
      </p>
      <code style={{display:"block",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:8,padding:16,marginTop:12,fontSize:12,color:"var(--accent)",textAlign:"left",maxWidth:500,margin:"12px auto 0"}}>
        UPDATE "User" SET role = 'ADMIN' WHERE email = '{(session?.user as any)?.email}';
      </code>
      <p style={{color:"var(--text-faint)",fontSize:12,marginTop:8}}>Then sign out and sign back in.</p>
    </div>
  );

  const card: React.CSSProperties = { background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:12 };

  return (
    <div style={{padding:24,maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{color:"var(--text)",fontSize:22,fontWeight:600,margin:0}}>Admin Panel</h1>
          <p style={{color:"var(--text-muted)",fontSize:13,marginTop:4}}>Platform management</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {seedMsg && <span style={{fontSize:12,color:seedMsg.startsWith("✓")?"var(--profit)":"var(--loss)"}}>{seedMsg}</span>}
          <button onClick={seedTraders} disabled={seeding}
            style={{padding:"8px 16px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text)",fontSize:13,cursor:"pointer",opacity:seeding?0.5:1}}>
            {seeding?"Seeding…":"Seed Traders"}
          </button>
        </div>
      </div>

      {stats && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
          <StatCard label="Total Users" value={stats.totalUsers} subtext={`${stats.activeUsers} active`} />
          <StatCard label="Total Trades" value={stats.totalTrades} />
          <StatCard label="Open Positions" value={stats.openPositions} />
          <StatCard label="Traders" value={stats.totalTraders} />
          <StatCard label="Exchange Connections" value={stats.activeConnections} />
          <StatCard label="Errors (24h)" value={stats.recentErrors} negative={stats.recentErrors>0} positive={stats.recentErrors===0} />
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:4,background:"var(--bg-card)",padding:4,borderRadius:10,border:"1px solid var(--border)",width:"fit-content",marginBottom:20}}>
        {(["overview","users","logs"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:"6px 16px",borderRadius:8,border:"none",fontSize:13,cursor:"pointer",
                   background:tab===t?"var(--accent)":"transparent",
                   color:tab===t?"#fff":"var(--text-muted)"}}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab==="overview" && (
        <div style={{...card,padding:20}}>
          <h2 style={{color:"var(--text)",fontSize:15,fontWeight:600,margin:"0 0 16px"}}>Quick Actions</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
            <div style={{border:"1px solid var(--border)",borderRadius:10,padding:16}}>
              <p style={{color:"var(--text)",fontSize:13,fontWeight:500,margin:"0 0 6px"}}>Seed Trader Marketplace</p>
              <p style={{color:"var(--text-faint)",fontSize:12,margin:"0 0 12px"}}>Load 12 mock traders with statistics and live signals into the database.</p>
              <button onClick={seedTraders} disabled={seeding}
                style={{padding:"7px 14px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:12,cursor:"pointer",opacity:seeding?0.5:1}}>
                {seeding?"Seeding…":"Run Seed"}
              </button>
            </div>
            <div style={{border:"1px solid var(--border)",borderRadius:10,padding:16}}>
              <p style={{color:"var(--text)",fontSize:13,fontWeight:500,margin:"0 0 6px"}}>Database</p>
              <p style={{color:"var(--text-faint)",fontSize:12,margin:"0 0 12px"}}>Open Neon console to run SQL queries directly.</p>
              <a href="https://console.neon.tech" target="_blank"
                style={{display:"inline-block",padding:"7px 14px",borderRadius:8,border:"1px solid var(--border)",color:"var(--text)",fontSize:12,textDecoration:"none"}}>
                Open Neon →
              </a>
            </div>
            <div style={{border:"1px solid var(--border)",borderRadius:10,padding:16}}>
              <p style={{color:"var(--text)",fontSize:13,fontWeight:500,margin:"0 0 6px"}}>GitHub</p>
              <p style={{color:"var(--text-faint)",fontSize:12,margin:"0 0 12px"}}>View source code and commit history.</p>
              <a href="https://github.com/privProjectsTrybus/CopyTrade-Engine" target="_blank"
                style={{display:"inline-block",padding:"7px 14px",borderRadius:8,border:"1px solid var(--border)",color:"var(--text)",fontSize:12,textDecoration:"none"}}>
                Open GitHub →
              </a>
            </div>
          </div>
        </div>
      )}

      {tab==="users" && (
        <div style={{...card,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{borderBottom:"1px solid var(--border)"}}>
                {["User","Role","Status","Connections","Trades","Joined","Action"].map(h=>(
                  <th key={h} style={{textAlign:h==="Action"||h==="Connections"||h==="Trades"?"right":"left",padding:"12px 16px",color:"var(--text-faint)",fontSize:11,fontWeight:500,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.id} style={{borderBottom:"1px solid var(--border)"}}>
                  <td style={{padding:"12px 16px"}}>
                    <p style={{color:"var(--text)",margin:0,fontWeight:500}}>{u.name??"—"}</p>
                    <p style={{color:"var(--text-faint)",margin:0,fontSize:11}}>{u.email}</p>
                  </td>
                  <td style={{padding:"12px 16px"}}><Badge variant={u.role==="ADMIN"?"blue":"default"}>{u.role}</Badge></td>
                  <td style={{padding:"12px 16px"}}><Badge variant={u.status==="ACTIVE"?"green":"red"}>{u.status}</Badge></td>
                  <td style={{padding:"12px 16px",textAlign:"right",color:"var(--text-muted)"}}>{u._count.exchangeConnections}</td>
                  <td style={{padding:"12px 16px",textAlign:"right",color:"var(--text-muted)"}}>{u._count.trades}</td>
                  <td style={{padding:"12px 16px",textAlign:"right",color:"var(--text-faint)",fontSize:11}}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td style={{padding:"12px 16px",textAlign:"right"}}>
                    <button onClick={()=>toggleUserStatus(u.id,u.status)}
                      style={{padding:"4px 10px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text-muted)",fontSize:11,cursor:"pointer"}}>
                      {u.status==="ACTIVE"?"Disable":"Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==="logs" && (
        <div style={{...card,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:"1px solid var(--border)"}}>
                {["Action","User","Time"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"12px 16px",color:"var(--text-faint)",fontSize:11,fontWeight:500,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l=>(
                <tr key={l.id} style={{borderBottom:"1px solid var(--border)"}}>
                  <td style={{padding:"10px 16px",fontFamily:"monospace",
                    color:l.action.includes("ERROR")||l.action.includes("BREACH")?"var(--loss)":l.action.includes("LOGIN")?"var(--accent)":"var(--text-muted)"}}>
                    {l.action}
                  </td>
                  <td style={{padding:"10px 16px",color:"var(--text-faint)"}}>{l.user?.email??"system"}</td>
                  <td style={{padding:"10px 16px",color:"var(--text-faint)"}}>{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
