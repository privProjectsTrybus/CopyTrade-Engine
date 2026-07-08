"use client";
// src/app/(app)/copy-trading/page.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Spinner } from "@/components/ui";

interface Trader {
  id: string;
  displayName: string;
  bio: string | null;
  exchange: string;
  tradingStyle: string;
  riskScore: number;
  specialties: string[];
  isVerified: boolean;
  statistics: {
    winRate: number;
    roi30d: number;
    roi90d: number;
    roi1y: number;
    avgLeverage: number;
    followerCount: number;
    maxDrawdown: number;
    avgHoldingHours: number;
  } | null;
}

interface Connection {
  id: string;
  exchange: string;
  label: string;
}

interface CopyModal {
  trader: Trader;
  connectionId: string;
  allocationType: "FIXED_AMOUNT" | "PERCENTAGE_OF_ACCOUNT";
  allocationValue: number;
  sizingMode: "EXACT_MIRROR" | "SCALED_MIRROR" | "FIXED_DOLLAR";
  riskMultiplier: number;
  maxLeverage: number;
}

const STYLE_LABELS: Record<string, string> = {
  FUTURES_SCALPER: "Scalper",
  FUTURES_SWING: "Swing",
  SPOT_SWING: "Spot Swing",
  SPOT_LONG_TERM: "Long-term",
};

const SORT_OPTIONS = [
  { value: "roi30d", label: "30d ROI" },
  { value: "roi90d", label: "90d ROI" },
  { value: "winRate", label: "Win Rate" },
  { value: "followers", label: "Followers" },
  { value: "drawdown", label: "Low Drawdown" },
  { value: "risk", label: "Low Risk" },
];

function RiskBadge({ score }: { score: number }) {
  if (score < 35) return <Badge variant="green">Low Risk</Badge>;
  if (score < 60) return <Badge variant="yellow">Medium Risk</Badge>;
  return <Badge variant="red">High Risk</Badge>;
}

function TraderCard({ trader, onCopy }: { trader: Trader; onCopy: () => void }) {
  const s = trader.statistics;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-bold text-sm">
            {trader.displayName[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-medium text-sm">{trader.displayName}</span>
              {trader.isVerified && <span className="text-blue-400 text-xs">✓</span>}
            </div>
            <p className="text-zinc-500 text-xs">{trader.exchange} · {STYLE_LABELS[trader.tradingStyle]}</p>
          </div>
        </div>
        <RiskBadge score={trader.riskScore} />
      </div>

      {/* Stats grid */}
      {s && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/40 rounded-lg px-3 py-2 text-center">
            <p className="text-zinc-500 text-[10px] uppercase">30d ROI</p>
            <p className={`text-sm font-semibold ${s.roi30d >= 0 ? "text-profit" : "text-loss"}`}>
              {s.roi30d >= 0 ? "+" : ""}{s.roi30d.toFixed(1)}%
            </p>
          </div>
          <div className="bg-black/40 rounded-lg px-3 py-2 text-center">
            <p className="text-zinc-500 text-[10px] uppercase">Win Rate</p>
            <p className="text-sm font-semibold text-white">{s.winRate.toFixed(1)}%</p>
          </div>
          <div className="bg-black/40 rounded-lg px-3 py-2 text-center">
            <p className="text-zinc-500 text-[10px] uppercase">Max DD</p>
            <p className="text-sm font-semibold text-loss">-{s.maxDrawdown.toFixed(1)}%</p>
          </div>
          <div className="bg-black/40 rounded-lg px-3 py-2 text-center">
            <p className="text-zinc-500 text-[10px] uppercase">Avg Lev</p>
            <p className="text-sm font-semibold text-white">{s.avgLeverage.toFixed(1)}x</p>
          </div>
          <div className="bg-black/40 rounded-lg px-3 py-2 text-center">
            <p className="text-zinc-500 text-[10px] uppercase">Followers</p>
            <p className="text-sm font-semibold text-white">{s.followerCount.toLocaleString()}</p>
          </div>
          <div className="bg-black/40 rounded-lg px-3 py-2 text-center">
            <p className="text-zinc-500 text-[10px] uppercase">1y ROI</p>
            <p className={`text-sm font-semibold ${s.roi1y >= 0 ? "text-profit" : "text-loss"}`}>
              {s.roi1y >= 0 ? "+" : ""}{s.roi1y.toFixed(0)}%
            </p>
          </div>
        </div>
      )}

      {/* Specialties */}
      {trader.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {trader.specialties.slice(0, 4).map((s) => (
            <span key={s} className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded">
              {s.replace("USDT", "")}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCopy}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded-lg font-medium transition-colors"
        >
          Copy Trader
        </button>
        <Link
          href={`/traders/${trader.id}`}
          className="px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm rounded-lg transition-colors"
        >
          Profile
        </Link>
      </div>
    </div>
  );
}

function CopyModal({ trader, connections, onClose, onSuccess }: {
  trader: Trader;
  connections: Connection[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<Omit<CopyModal, "trader">>({
    connectionId: connections[0]?.id ?? "",
    allocationType: "FIXED_AMOUNT",
    allocationValue: 500,
    sizingMode: "SCALED_MIRROR",
    riskMultiplier: 1,
    maxLeverage: 10,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/copy/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ traderProfileId: trader.id, ...form }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    onSuccess();
  }

  const set = (key: keyof typeof form, val: any) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Copy {trader.displayName}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>

        {connections.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-zinc-400">No exchange connections found.</p>
            <Link href="/exchanges" className="text-blue-500 text-sm mt-2 inline-block">Connect an exchange first →</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-zinc-400 text-sm">Exchange Account</label>
              <select value={form.connectionId} onChange={(e) => set("connectionId", e.target.value)}
                className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm">
                {connections.map((c) => <option key={c.id} value={c.id}>{c.label} ({c.exchange})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-sm">Allocation Type</label>
                <select value={form.allocationType} onChange={(e) => set("allocationType", e.target.value)}
                  className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm">
                  <option value="FIXED_AMOUNT">Fixed $</option>
                  <option value="PERCENTAGE_OF_ACCOUNT">% of account</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-sm">
                  {form.allocationType === "FIXED_AMOUNT" ? "Amount (USD)" : "Percentage"}
                </label>
                <input type="number" min={1} value={form.allocationValue}
                  onChange={(e) => set("allocationValue", parseFloat(e.target.value))}
                  className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-sm">Position Sizing</label>
                <select value={form.sizingMode} onChange={(e) => set("sizingMode", e.target.value)}
                  className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm">
                  <option value="SCALED_MIRROR">Scaled Mirror</option>
                  <option value="EXACT_MIRROR">Exact Mirror</option>
                  <option value="FIXED_DOLLAR">Fixed Dollar</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-sm">Risk Multiplier</label>
                <select value={form.riskMultiplier} onChange={(e) => set("riskMultiplier", parseFloat(e.target.value))}
                  className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm">
                  {[0.25, 0.5, 1, 1.5, 2].map((v) => <option key={v} value={v}>{v}x</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-zinc-400 text-sm">Max Leverage Cap</label>
              <input type="number" min={1} max={20} value={form.maxLeverage}
                onChange={(e) => set("maxLeverage", parseInt(e.target.value))}
                className="mt-1 w-full bg-black border border-zinc-700 rounded-md px-3 py-2 text-white text-sm" />
            </div>

            {error && <p className="text-loss text-sm">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors">
              {submitting ? "Starting…" : "Start Copying"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CopyTradingPage() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("roi30d");
  const [styleFilter, setStyleFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState(100);
  const [copyTarget, setCopyTarget] = useState<Trader | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const loadTraders = async () => {
    const params = new URLSearchParams({ sortBy });
    if (styleFilter) params.set("style", styleFilter);
    params.set("riskMax", String(riskFilter));
    const [tradersRes, connRes] = await Promise.all([
      fetch(`/api/traders?${params}`),
      fetch("/api/exchange/list"),
    ]);
    if (tradersRes.ok) setTraders(await tradersRes.json());
    if (connRes.ok) setConnections(await connRes.json());
    setLoading(false);
  };

  useEffect(() => { loadTraders(); }, [sortBy, styleFilter, riskFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-white text-2xl font-semibold">Trader Marketplace</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Browse and copy verified professional traders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="text-zinc-500 text-xs uppercase mr-2">Sort</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white text-sm">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-zinc-500 text-xs uppercase mr-2">Style</label>
          <select value={styleFilter} onChange={(e) => setStyleFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white text-sm">
            <option value="">All</option>
            {Object.entries(STYLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-zinc-500 text-xs uppercase mr-2">Risk</label>
          <select value={riskFilter} onChange={(e) => setRiskFilter(parseInt(e.target.value))}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white text-sm">
            <option value={100}>All</option>
            <option value={35}>Low only</option>
            <option value={60}>Low & Medium</option>
          </select>
        </div>
        <span className="text-zinc-600 text-sm ml-auto">{traders.length} traders</span>
      </div>

      {/* Trader grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : traders.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 text-center">
          <p className="text-zinc-400 text-lg font-medium">No traders in the marketplace yet.</p>
          <p className="text-zinc-500 text-sm mt-2 mb-6">An admin needs to seed the trader data first.</p>
          <a href="/admin" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Go to Admin → Seed Traders
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {traders.map((t) => (
            <TraderCard
              key={t.id}
              trader={t}
              onCopy={() => { setSuccessId(null); setCopyTarget(t); }}
            />
          ))}
        </div>
      )}

      {/* Success toast */}
      {successId && (
        <div className="fixed bottom-6 right-6 bg-profit/20 border border-profit/40 text-profit px-4 py-3 rounded-xl text-sm">
          ✓ Now copying trader. Check the <a href="/dashboard" className="underline">dashboard</a>.
        </div>
      )}

      {/* Copy modal */}
      {copyTarget && (
        <CopyModal
          trader={copyTarget}
          connections={connections}
          onClose={() => setCopyTarget(null)}
          onSuccess={() => { setCopyTarget(null); setSuccessId(copyTarget?.id ?? null); }}
        />
      )}
    </div>
  );
}
