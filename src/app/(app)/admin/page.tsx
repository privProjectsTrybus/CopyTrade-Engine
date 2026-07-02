"use client";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Spinner } from "@/components/ui/Badge";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface Stats { totalUsers: number; activeUsers: number; totalTrades: number; openPositions: number; totalTraders: number; activeConnections: number; recentErrors: number; }
interface User { id: string; name: string | null; email: string | null; role: string; status: string; createdAt: string; twoFactorEnabled: boolean; _count: { exchangeConnections: number; copyRelationships: number; trades: number }; }
interface Log { id: string; action: string; metadata: any; createdAt: string; user: { email: string | null; name: string | null } | null; }

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "logs">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if ((session?.user as any)?.role !== "ADMIN") { window.location.href = "/dashboard"; return; }
    Promise.all([
      fetch("/api/admin/stats").then(r => r.ok ? r.json() : null),
      fetch("/api/admin/users").then(r => r.ok ? r.json() : []),
      fetch("/api/admin/logs").then(r => r.ok ? r.json() : { logs: [] }),
    ]).then(([s, u, l]) => { setStats(s); setUsers(u); setLogs(l.logs ?? []); setLoading(false); });
  }, [session, status]);

  if (status === "loading" || loading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;
  if ((session?.user as any)?.role !== "ADMIN") return null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-white text-2xl font-semibold">Admin Panel</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Platform overview and user management</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Users" value={stats.totalUsers} subtext={`${stats.activeUsers} active`} />
          <StatCard label="Total Trades" value={stats.totalTrades} />
          <StatCard label="Open Positions" value={stats.openPositions} />
          <StatCard label="Errors (24h)" value={stats.recentErrors} negative={stats.recentErrors > 0} />
          <StatCard label="Active Connections" value={stats.activeConnections} />
          <StatCard label="Traders" value={stats.totalTraders} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg w-fit border border-zinc-800">
        {(["overview", "users", "logs"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm capitalize transition-colors ${tab === t ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800">
              <tr className="text-zinc-500 text-xs uppercase">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Connections</th>
                <th className="text-right px-4 py-3">Trades</th>
                <th className="text-right px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {users.map(u => (
                <tr key={u.id} className="text-zinc-300 hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{u.name ?? "—"}</p>
                    <p className="text-zinc-500 text-xs">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === "ADMIN" ? "blue" : "default"}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.status === "ACTIVE" ? "green" : "red"}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{u._count.exchangeConnections}</td>
                  <td className="px-4 py-3 text-right">{u._count.trades}</td>
                  <td className="px-4 py-3 text-right text-zinc-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "logs" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800">
              <tr className="text-zinc-500 text-xs uppercase">
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {logs.map(l => (
                <tr key={l.id} className="text-zinc-300">
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-mono ${l.action.includes("ERROR") || l.action.includes("BREACH") ? "text-loss" : l.action.includes("LOGIN") ? "text-blue-400" : "text-zinc-300"}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500 text-xs">{l.user?.email ?? "system"}</td>
                  <td className="px-4 py-2.5 text-zinc-600 text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
