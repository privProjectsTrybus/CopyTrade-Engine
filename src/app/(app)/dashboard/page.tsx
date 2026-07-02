"use client";
// src/app/(app)/dashboard/page.tsx
import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Badge";
import { useEngine } from "@/context/EngineContext";

interface ActiveCopy {
  id: string;
  traderProfile: { displayName: string; riskScore: number };
  allocationValue: number;
  allocationType: string;
  isActive: boolean;
}

interface OpenPos {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

export default function DashboardPage() {
  const { isRunning, isLoading: engineLoading, events, start, stop } = useEngine();
  const [copies, setCopies] = useState<ActiveCopy[]>([]);
  const [positions, setPositions] = useState<OpenPos[]>([]);
  const [pnl, setPnl] = useState({ today: 0, thisWeek: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [copiesRes, pnlRes, posRes] = await Promise.all([
        fetch("/api/copy/list"),
        fetch("/api/portfolio/pnl-summary"),
        fetch("/api/positions/sync"), // Will be empty initially — engine fills it
      ]);
      if (copiesRes.ok) setCopies(await copiesRes.json());
      if (pnlRes.ok) setPnl(await pnlRes.json());
      setLoading(false);
    };
    load();
  }, []);

  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Copy engine control centre</p>
        </div>
        <button
          onClick={isRunning ? stop : start}
          disabled={engineLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isRunning
              ? "bg-loss/20 text-loss border border-loss/30 hover:bg-loss/30"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {engineLoading ? "Initialising…" : isRunning ? "Stop Engine" : "Start Engine"}
        </button>
      </div>

      {/* Engine status banner */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${
        isRunning ? "border-profit/30 bg-profit/5" : "border-zinc-700 bg-zinc-900"
      }`}>
        <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? "bg-profit animate-pulse" : "bg-zinc-600"}`} />
        <div>
          <p className="text-white text-sm font-medium">
            Engine {isRunning ? "running — monitoring trader signals every 5 seconds" : "offline"}
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">
            {isRunning
              ? "Trades will execute automatically when signals are detected and pass risk checks."
              : "Start the engine to begin copying. Execution only runs while this tab is open."}
          </p>
        </div>
      </div>

      {/* PnL stats */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Today"
            value={`${pnl.today >= 0 ? "+" : ""}$${pnl.today.toFixed(2)}`}
            positive={pnl.today > 0}
            negative={pnl.today < 0}
          />
          <StatCard
            label="This Week"
            value={`${pnl.thisWeek >= 0 ? "+" : ""}$${pnl.thisWeek.toFixed(2)}`}
            positive={pnl.thisWeek > 0}
            negative={pnl.thisWeek < 0}
          />
          <StatCard
            label="This Month"
            value={`${pnl.thisMonth >= 0 ? "+" : ""}$${pnl.thisMonth.toFixed(2)}`}
            positive={pnl.thisMonth > 0}
            negative={pnl.thisMonth < 0}
          />
          <StatCard
            label="Unrealized PnL"
            value={`${totalUnrealizedPnl >= 0 ? "+" : ""}$${totalUnrealizedPnl.toFixed(2)}`}
            positive={totalUnrealizedPnl > 0}
            negative={totalUnrealizedPnl < 0}
            subtext={`${positions.length} open position${positions.length !== 1 ? "s" : ""}`}
          />
        </div>
      )}

      {/* Active copies */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-medium">Active Copies ({copies.length})</h2>
          <a href="/copy-trading" className="text-blue-500 text-sm hover:underline">Browse traders →</a>
        </div>
        {copies.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-400">No active copy relationships.</p>
            <a href="/copy-trading" className="text-blue-500 text-sm mt-2 inline-block hover:underline">
              Browse the trader marketplace →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {copies.map((c) => (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white font-bold">
                    {c.traderProfile.displayName[0]}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{c.traderProfile.displayName}</p>
                    <p className="text-zinc-500 text-xs">
                      {c.allocationType === "FIXED_AMOUNT" ? `$${c.allocationValue}` : `${c.allocationValue}%`} allocated
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.traderProfile.riskScore < 35 ? "green" : c.traderProfile.riskScore < 60 ? "yellow" : "red"}>
                    Risk {c.traderProfile.riskScore}
                  </Badge>
                  <Badge variant="green">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Engine event log */}
      <section>
        <h2 className="text-white font-medium mb-3">Engine Events</h2>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl divide-y divide-zinc-800 max-h-72 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-zinc-500 text-sm p-4">No events yet. Start the engine to begin.</p>
          ) : (
            events.map((e, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                <span className={`text-xs font-mono mt-0.5 w-36 shrink-0 ${
                  e.type === "TRADE_EXECUTED" ? "text-profit" :
                  e.type === "TRADE_REJECTED" || e.type === "ENGINE_ERROR" ? "text-loss" :
                  e.type === "ENGINE_PAUSED" || e.type === "RISK_LIMIT_BREACHED" ? "text-yellow-400" :
                  "text-zinc-400"
                }`}>
                  {e.type.replace(/_/g, " ")}
                </span>
                <span className="text-zinc-300 text-xs">
                  {e.type === "TRADE_EXECUTED"
                    ? `${e.side} ${e.symbol} · ${e.size.toFixed(4)} @ $${e.price.toFixed(2)}`
                    : e.type === "TRADE_REJECTED"
                    ? `${e.symbol}: ${e.reason}`
                    : e.type === "POSITION_CLOSED"
                    ? `${e.symbol} · PnL: ${e.realizedPnl >= 0 ? "+" : ""}$${e.realizedPnl.toFixed(2)}`
                    : (e as any).reason ?? (e as any).message ?? ""}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
