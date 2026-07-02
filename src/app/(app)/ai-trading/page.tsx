"use client";
import { useEffect, useState, useCallback } from "react";
import { Badge, Spinner } from "@/components/ui/Badge";
import { fetchCandles, STRATEGY_FUNCTIONS, DEFAULT_SYMBOLS } from "@/lib/strategies";
import type { StrategySignal } from "@/lib/strategies";

interface Strategy {
  id: string; name: string; strategyType: string; isActive: boolean;
  approvalMode: string; allocationPct: number; maxLeverage: number;
  symbols: string[]; parametersJson: Record<string, number>;
  signals: Signal[];
}
interface Signal {
  id: string; symbol: string; side: string; confidence: number;
  entryPrice: number; stopLossPrice: number; takeProfitPrice: number;
  leverage: number; rationale: string; status: string; expiresAt: string;
  strategy: { name: string; strategyType: string; approvalMode: string };
}

const STRATEGY_INFO: Record<string, { label: string; desc: string; color: string }> = {
  TREND_FOLLOWING: { label: "Trend Following", desc: "EMA crossover with RSI confirmation. Rides established trends.", color: "text-blue-400" },
  MOMENTUM: { label: "Momentum", desc: "RSI extremes with Rate-of-Change confirmation. Catches reversals.", color: "text-purple-400" },
  BREAKOUT: { label: "Breakout", desc: "Donchian channel breakout with volume surge filter.", color: "text-yellow-400" },
  MEAN_REVERSION: { label: "Mean Reversion", desc: "Bollinger Band extremes targeting return to moving average.", color: "text-green-400" },
};

const APPROVAL_LABELS: Record<string, string> = {
  FULL_AUTO: "Full Auto", SEMI_AUTO: "Semi Auto (60s)", MANUAL: "Manual Approval",
};

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    strategyType: "TREND_FOLLOWING", name: "", approvalMode: "MANUAL",
    allocationPct: 10, maxLeverage: 3,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    const res = await fetch("/api/ai/strategies", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, name: form.name || STRATEGY_INFO[form.strategyType].label }),
    });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">New AI Strategy</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-zinc-400 text-sm">Strategy Type</label>
            <select value={form.strategyType} onChange={e => set("strategyType", e.target.value)}
              className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm">
              {Object.entries(STRATEGY_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <p className="text-zinc-600 text-xs mt-1">{STRATEGY_INFO[form.strategyType].desc}</p>
          </div>
          <div>
            <label className="text-zinc-400 text-sm">Name (optional)</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder={STRATEGY_INFO[form.strategyType].label}
              className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 text-sm">Approval Mode</label>
              <select value={form.approvalMode} onChange={e => set("approvalMode", e.target.value)}
                className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm">
                {Object.entries(APPROVAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-400 text-sm">Allocation %</label>
              <input type="number" min={1} max={50} value={form.allocationPct} onChange={e => set("allocationPct", +e.target.value)}
                className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm" />
            </div>
          </div>
          <div>
            <label className="text-zinc-400 text-sm">Max Leverage</label>
            <input type="number" min={1} max={10} value={form.maxLeverage} onChange={e => set("maxLeverage", +e.target.value)}
              className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm" />
          </div>
          {error && <p className="text-loss text-sm">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
            {saving ? "Creating…" : "Create Strategy"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AiTradingPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    const [sRes, sigRes] = await Promise.all([fetch("/api/ai/strategies"), fetch("/api/ai/signals")]);
    if (sRes.ok) setStrategies(await sRes.json());
    if (sigRes.ok) setSignals(await sigRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(id: string, current: boolean) {
    await fetch("/api/ai/strategies", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !current }) });
    setStrategies(s => s.map(x => x.id === id ? { ...x, isActive: !current } : x));
  }

  async function deleteStrategy(id: string) {
    if (!confirm("Delete this strategy?")) return;
    await fetch(`/api/ai/strategies?id=${id}`, { method: "DELETE" });
    setStrategies(s => s.filter(x => x.id !== id));
  }

  async function handleSignal(signalId: string, action: "approve" | "reject") {
    await fetch(`/api/ai/signals/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signalId }) });
    setSignals(s => s.map(x => x.id === signalId ? { ...x, status: action === "approve" ? "APPROVED" : "REJECTED" } : x));
  }

  async function runScan() {
    setScanning(true);
    const activeStrategies = strategies.filter(s => s.isActive);
    if (activeStrategies.length === 0) { setScanning(false); return; }

    for (const strategy of activeStrategies) {
      const symbols = strategy.symbols.length > 0 ? strategy.symbols : DEFAULT_SYMBOLS;
      const fn = STRATEGY_FUNCTIONS[strategy.strategyType as keyof typeof STRATEGY_FUNCTIONS];
      for (const symbol of symbols) {
        try {
          const candles = await fetchCandles(symbol, "4h", 100);
          const signal: StrategySignal | null = fn(candles, strategy.parametersJson);
          if (!signal) continue;
          signal.symbol = symbol;
          await fetch("/api/ai/signals", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              aiStrategyId: strategy.id, ...signal,
              expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            }),
          });
        } catch {}
      }
    }
    await load();
    setScanning(false);
  }

  const pendingSignals = signals.filter(s => s.status === "PENDING");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold">AI Trading</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Strategy engine with configurable approval modes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runScan} disabled={scanning || strategies.filter(s => s.isActive).length === 0}
            className="border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            {scanning ? "Scanning…" : "Run Scan"}
          </button>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + New Strategy
          </button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : (
        <>
          {/* Pending signals */}
          {pendingSignals.length > 0 && (
            <div className="bg-purple-900/10 border border-purple-700/30 rounded-xl p-5 space-y-3">
              <h2 className="text-white font-medium">Pending Signals ({pendingSignals.length})</h2>
              {pendingSignals.map(sig => (
                <div key={sig.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{sig.symbol}</span>
                      <Badge variant={sig.side === "LONG" ? "green" : "red"}>{sig.side}</Badge>
                      <Badge variant="blue">{(sig.confidence * 100).toFixed(0)}% confidence</Badge>
                      <span className="text-zinc-500 text-xs">{sig.strategy.name}</span>
                    </div>
                    <p className="text-zinc-400 text-xs">{sig.rationale}</p>
                    <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                      <span>Entry: <span className="text-white">${sig.entryPrice}</span></span>
                      <span>SL: <span className="text-loss">${sig.stopLossPrice}</span></span>
                      <span>TP: <span className="text-profit">${sig.takeProfitPrice}</span></span>
                      <span>Lev: <span className="text-white">{sig.leverage}x</span></span>
                    </div>
                  </div>
                  {sig.strategy.approvalMode === "MANUAL" && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleSignal(sig.id, "approve")}
                        className="bg-profit/20 hover:bg-profit/30 text-profit border border-profit/30 px-3 py-1.5 rounded-lg text-sm">
                        Approve
                      </button>
                      <button onClick={() => handleSignal(sig.id, "reject")}
                        className="bg-loss/20 hover:bg-loss/30 text-loss border border-loss/30 px-3 py-1.5 rounded-lg text-sm">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Strategies */}
          {strategies.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
              <p className="text-zinc-400">No strategies yet.</p>
              <p className="text-zinc-600 text-sm mt-1">Create a strategy and run a scan to generate signals.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategies.map(s => {
                const info = STRATEGY_INFO[s.strategyType];
                const pending = s.signals?.filter(x => x.status === "PENDING").length ?? 0;
                return (
                  <div key={s.id} className={`bg-zinc-900 border rounded-xl p-5 space-y-3 ${s.isActive ? "border-blue-600/30" : "border-zinc-800"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${info.color}`}>{info.label}</span>
                          {s.isActive && <Badge variant="blue">Active</Badge>}
                          {pending > 0 && <Badge variant="yellow">{pending} pending</Badge>}
                        </div>
                        <p className="text-white text-sm mt-0.5">{s.name}</p>
                        <p className="text-zinc-500 text-xs mt-1">{info.desc}</p>
                      </div>
                      <button onClick={() => deleteStrategy(s.id)} className="text-zinc-700 hover:text-loss text-xs">✕</button>
                    </div>
                    <div className="flex gap-3 text-xs text-zinc-500">
                      <span>Approval: <span className="text-zinc-300">{APPROVAL_LABELS[s.approvalMode]}</span></span>
                      <span>Alloc: <span className="text-zinc-300">{s.allocationPct}%</span></span>
                      <span>Max lev: <span className="text-zinc-300">{s.maxLeverage}x</span></span>
                    </div>
                    <button onClick={() => toggleActive(s.id, s.isActive)}
                      className={`w-full py-1.5 rounded-lg text-sm transition-colors ${s.isActive ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300" : "bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30"}`}>
                      {s.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent signal history */}
          {signals.filter(s => s.status !== "PENDING").length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-white font-medium mb-3">Signal History</h2>
              <div className="space-y-1">
                {signals.filter(s => s.status !== "PENDING").slice(0, 10).map(sig => (
                  <div key={sig.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white">{sig.symbol}</span>
                      <Badge variant={sig.side === "LONG" ? "green" : "red"}>{sig.side}</Badge>
                      <span className="text-zinc-500 text-xs">{sig.strategy?.name}</span>
                    </div>
                    <Badge variant={sig.status === "APPROVED" || sig.status === "EXECUTED" ? "green" : sig.status === "REJECTED" ? "red" : "default"}>
                      {sig.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}
