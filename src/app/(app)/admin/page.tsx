"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Spinner } from "@/components/ui/Badge";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
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
    setSeeding(true); setSeedMsg("");
    const r = await fetch("/api/admin/seed-traders", { method: "POST" });
    const d = await r.json();
    setSeedMsg(r.ok ? `✓ ${d.message}` : `✗ ${d.error}`);
    setSeeding(false);
    if (r.ok) fetch("/api/admin/stats").then(r => r.json()).then(setStats);
  }

  async function toggleUser(userId: string, cur: string) {
    const status = cur === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, status }) });
    setUsers(u => u.map(x => x.id === userId ? { ...x, status } : x));
  }

  if (status === "loading" || loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spinner size="lg" /></div>;

  if (role !== "ADMIN") return (
    <div className="page" style={{ maxWidth: 540 }}>
      <div className="card" style={{ padding: 32, borderColor: "rgba(255,68,102,0.3)" }}>
        <p style={{ color: "var(--loss)", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Access Denied</p>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Run this in Neon SQL Editor to grant admin:</p>
        <code style={{ display: "block", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 9, padding: 14, fontSize: 12, color: "var(--accent-light)", lineHeight: 1.6 }}>
          UPDATE "User" SET role = 'ADMIN'<br />WHERE email = '{(session?.user as any)?.email}';
        </code>
        <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 10 }}>Then sign out and back in.</p>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><h1 className="page-title">Admin Panel</h1><p className="page-sub">Platform management</p></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {seedMsg && <span style={{ fontSize: 12, color: seedMsg.startsWith("✓") ? "var(--profit)" : "var(--loss)" }}>{seedMsg}</span>}
          <button onClick={seedTraders} disabled={seeding} className="btn btn-ghost">{seeding ? "Seeding…" : "Seed Traders"}</button>
        </div>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Users" value={stats.totalUsers} subtext={`${stats.activeUsers} active`} />
          <StatCard label="Total Trades" value={stats.totalTrades} />
          <StatCard label="Open Positions" value={stats.openPositions} />
          <StatCard label="Errors (24h)" value={stats.recentErrors} negative={stats.recentErrors > 0} positive={stats.recentErrors === 0} />
        </div>
      )}

      <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", padding: 4, borderRadius: 10, border: "1px solid var(--border)", width: "fit-content", marginBottom: 20 }}>
        {(["overview", "users", "logs"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 18px", borderRadius: 8, border: "none", fontSize: 13, cursor: "pointer", background: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "#fff" : "var(--text-muted)", transition: "all 0.15s" }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
          {[
            { title: "Seed Marketplace", desc: "Load 12 real mock traders with stats and signals.", action: seedTraders, label: seeding ? "Seeding…" : "Run Seed" },
            { title: "Neon Database", desc: "Open SQL editor to run queries directly.", href: "https://console.neon.tech" },
            { title: "GitHub", desc: "View source code and commit history.", href: "https://github.com/privProjectsTrybus/CopyTrade-Engine" },
            { title: "Vercel", desc: "Deployment settings and environment variables.", href: "https://vercel.com/privprojectstrybus/copy-trade-engine-h1ae" },
          ].map(item => (
            <div key={item.title} className="card card-interactive" style={{ padding: 20 }}>
              <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{item.title}</p>
              <p style={{ color: "var(--text-faint)", fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>{item.desc}</p>
              {(item as any).action ? (
                <button onClick={(item as any).action} disabled={seeding} className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }}>{(item as any).label}</button>
              ) : (
                <a href={(item as any).href} target="_blank" className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 14px", textDecoration: "none", display: "inline-flex" }}>Open →</a>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="table-header" style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 80px 80px 100px 80px" }}>
            {["User", "Role", "Status", "Connections", "Trades", "Joined", "Action"].map(h => <span key={h}>{h}</span>)}
          </div>
          {users.map(u => (
            <div key={u.id} className="table-row" style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 80px 80px 100px 80px", alignItems: "center" }}>
              <div><p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500 }}>{u.name ?? "—"}</p><p style={{ color: "var(--text-faint)", fontSize: 11 }}>{u.email}</p></div>
              <Badge variant={u.role === "ADMIN" ? "blue" : "dim"}>{u.role}</Badge>
              <Badge variant={u.status === "ACTIVE" ? "green" : "red"}>{u.status}</Badge>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{u._count.exchangeConnections}</span>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{u._count.trades}</span>
              <span style={{ color: "var(--text-faint)", fontSize: 11 }}>{new Date(u.createdAt).toLocaleDateString()}</span>
              <button onClick={() => toggleUser(u.id, u.status)} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }}>{u.status === "ACTIVE" ? "Disable" : "Enable"}</button>
            </div>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="table-header" style={{ display: "grid", gridTemplateColumns: "1fr 180px 160px" }}>
            {["Action", "User", "Time"].map(h => <span key={h}>{h}</span>)}
          </div>
          {logs.map(l => (
            <div key={l.id} className="table-row" style={{ display: "grid", gridTemplateColumns: "1fr 180px 160px", alignItems: "center" }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: l.action.includes("ERROR") || l.action.includes("BREACH") ? "var(--loss)" : l.action.includes("LOGIN") ? "var(--accent-light)" : "var(--text-muted)" }}>{l.action}</span>
              <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{l.user?.email ?? "system"}</span>
              <span style={{ color: "var(--text-faint)", fontSize: 11 }}>{new Date(l.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
