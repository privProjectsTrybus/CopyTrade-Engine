"use client";
// src/app/(app)/exchanges/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Badge, Spinner } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { BinanceClient } from "@/lib/exchange/binance";
import { BybitClient } from "@/lib/exchange/bybit";
import type { AccountInfo } from "@/lib/exchange/types";

interface Connection {
  id: string;
  exchange: "BINANCE" | "BYBIT";
  label: string;
  hasWithdrawPermission: boolean;
  hasTradePermission: boolean;
  hasReadPermission: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
}

interface LiveAccount extends AccountInfo {
  connectionId: string;
  error?: string;
}

const EXCHANGES = ["BINANCE", "BYBIT"] as const;

export default function ExchangesPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [liveData, setLiveData] = useState<Record<string, LiveAccount>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ exchange: "BINANCE" as "BINANCE" | "BYBIT", label: "", apiKey: "", apiSecret: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    const res = await fetch("/api/exchange/list");
    if (res.ok) setConnections(await res.json());
    setLoading(false);
  }, []);

  const loadLiveData = useCallback(async () => {
    const credsRes = await fetch("/api/exchange/credentials");
    if (!credsRes.ok) return;
    const creds: Array<{ connectionId: string; exchange: string; apiKey: string; apiSecret: string }> = await credsRes.json();

    for (const c of creds) {
      if (!c.apiKey) continue;
      try {
        const client = c.exchange === "BINANCE"
          ? new BinanceClient({ apiKey: c.apiKey, apiSecret: c.apiSecret })
          : new BybitClient({ apiKey: c.apiKey, apiSecret: c.apiSecret });
        const info = await client.getAccountInfo();
        setLiveData((prev) => ({ ...prev, [c.connectionId]: { ...info, connectionId: c.connectionId } }));
      } catch (err) {
        setLiveData((prev) => ({ ...prev, [c.connectionId]: { connectionId: c.connectionId, error: String(err) } as any }));
      }
    }
  }, []);

  useEffect(() => {
    loadConnections().then(loadLiveData);
    const interval = setInterval(loadLiveData, 15000);
    return () => clearInterval(interval);
  }, [loadConnections, loadLiveData]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/exchange/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowForm(false);
    setForm({ exchange: "BINANCE", label: "", apiKey: "", apiSecret: "" });
    await loadConnections();
    await loadLiveData();
  }

  async function handleDisconnect(connectionId: string) {
    if (!confirm("Remove this exchange connection? Active copy relationships will be paused.")) return;
    await fetch("/api/exchange/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId }),
    });
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    setLiveData((prev) => { const n = { ...prev }; delete n[connectionId]; return n; });
  }

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold">Exchanges</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Connect your Binance or Bybit accounts</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? "Cancel" : "+ Connect Exchange"}
        </button>
      </div>

      {/* Connect form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-white font-medium mb-4">New Exchange Connection</h2>
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-400 text-sm">Exchange</label>
                <select
                  value={form.exchange}
                  onChange={(e) => setForm((f) => ({ ...f, exchange: e.target.value as any }))}
                  className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm"
                >
                  {EXCHANGES.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Label (optional)</label>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="My main account"
                  className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-zinc-400 text-sm">API Key</label>
              <input
                required
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm font-mono"
                placeholder="Paste your API key…"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-sm">API Secret</label>
              <input
                required
                type="password"
                value={form.apiSecret}
                onChange={(e) => setForm((f) => ({ ...f, apiSecret: e.target.value }))}
                className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm font-mono"
                placeholder="Paste your API secret…"
              />
            </div>

            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg px-4 py-3 text-sm text-blue-300 space-y-1">
              <p className="font-medium">Required permissions only</p>
              <p className="text-blue-400 text-xs">Enable: Futures Trading · Read Info. Do NOT enable: Withdrawals or Spot Trading.</p>
            </div>

            {error && <p className="text-loss text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? "Connecting…" : "Connect"}
            </button>
          </form>
        </div>
      )}

      {/* Connection cards */}
      {connections.length === 0 && !showForm ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <p className="text-zinc-400">No exchanges connected.</p>
          <p className="text-zinc-600 text-sm mt-1">Connect a Binance or Bybit account to start copying trades.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((conn) => {
            const live = liveData[conn.id];
            return (
              <div key={conn.id} className={`bg-zinc-900 border rounded-xl p-5 space-y-4 ${conn.hasWithdrawPermission ? "border-yellow-600/50" : "border-zinc-800"}`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${conn.exchange === "BINANCE" ? "bg-yellow-500/20 text-yellow-400" : "bg-orange-500/20 text-orange-400"}`}>
                      {conn.exchange === "BINANCE" ? "BNB" : "BBT"}
                    </div>
                    <div>
                      <p className="text-white font-medium">{conn.label}</p>
                      <p className="text-zinc-500 text-xs">{conn.exchange} · Connected {new Date(conn.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {conn.hasWithdrawPermission && (
                      <Badge variant="yellow">⚠ Withdraw enabled</Badge>
                    )}
                    <Badge variant={live && !live.error ? "green" : "default"}>
                      {live ? (live.error ? "Error" : "Live") : "Connecting…"}
                    </Badge>
                    <button
                      onClick={() => handleDisconnect(conn.id)}
                      className="text-zinc-600 hover:text-loss text-xs transition-colors px-2"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                {/* Withdraw permission warning */}
                {conn.hasWithdrawPermission && (
                  <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg px-4 py-2 text-yellow-300 text-xs">
                    ⚠ This API key has withdrawal permissions enabled. We strongly recommend creating a new key with only Futures Trading and Read permissions.
                  </div>
                )}

                {/* Live account data */}
                {live && !live.error ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Wallet Balance" value={`$${live.totalWalletBalance.toFixed(2)}`} />
                    <StatCard label="Available" value={`$${live.availableBalance.toFixed(2)}`} />
                    <StatCard
                      label="Unrealized PnL"
                      value={`${live.totalUnrealizedPnl >= 0 ? "+" : ""}$${live.totalUnrealizedPnl.toFixed(2)}`}
                      positive={live.totalUnrealizedPnl > 0}
                      negative={live.totalUnrealizedPnl < 0}
                    />
                    <StatCard
                      label="Margin Ratio"
                      value={`${(live.marginRatio * 100).toFixed(1)}%`}
                      negative={live.marginRatio > 0.7}
                      positive={live.marginRatio < 0.3}
                    />
                  </div>
                ) : live?.error ? (
                  <p className="text-loss text-sm">{live.error}</p>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-500 text-sm">
                    <Spinner size="sm" /> Fetching account data…
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Security note */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-sm text-zinc-400 space-y-1">
        <p className="text-white text-sm font-medium">Security</p>
        <p>API keys are encrypted with AES-256-GCM before being stored. Requests to exchanges are signed in your browser using Web Crypto API — your secrets never pass through our servers during trade execution.</p>
      </div>
    </div>
  );
}
