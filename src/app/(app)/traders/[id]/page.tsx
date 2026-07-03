"use client";
// src/app/(app)/traders/[id]/page.tsx
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { Badge, Spinner } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";

interface MonthlyReturn { month: string; roi: number; }

interface TraderDetail {
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
    monthlyReturns: MonthlyReturn[];
  } | null;
  signals: Array<{
    id: string;
    symbol: string;
    side: "LONG" | "SHORT";
    size: number;
    entryPrice: number;
    leverage: number;
    stopLossPrice: number | null;
    takeProfitPrice: number | null;
    openedAt: string;
  }>;
}

const STYLE_LABELS: Record<string, string> = {
  FUTURES_SCALPER: "Futures Scalper",
  FUTURES_SWING: "Futures Swing",
  SPOT_SWING: "Spot Swing",
  SPOT_LONG_TERM: "Spot Long-Term",
};

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

// Build a synthetic equity curve from monthly returns
function buildEquityCurve(returns: MonthlyReturn[]): { month: string; equity: number }[] {
  let equity = 1000;
  return returns.map((r) => {
    equity = equity * (1 + r.roi / 100);
    return { month: r.month.slice(5), equity: parseFloat(equity.toFixed(2)) };
  });
}

export default function TraderProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [trader, setTrader] = useState<TraderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    fetch(`/api/traders/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setTrader(d); setLoading(false); });
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;
  if (!trader) return <div className="p-6 text-zinc-400">Trader not found.</div>;

  const s = trader.statistics;
  const monthlyReturns: MonthlyReturn[] = Array.isArray(s?.monthlyReturns) ? s.monthlyReturns : [];
  const equityCurve = buildEquityCurve(monthlyReturns);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.back()} className="text-zinc-500 hover:text-white text-sm transition-colors">
        ← Back to marketplace
      </button>

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-bold text-xl">
            {trader.displayName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white text-xl font-semibold">{trader.displayName}</h1>
              {trader.isVerified && <Badge variant="blue">Verified</Badge>}
            </div>
            <p className="text-zinc-400 text-sm mt-0.5">{trader.exchange} · {STYLE_LABELS[trader.tradingStyle]}</p>
            {trader.bio && <p className="text-zinc-500 text-sm mt-2 max-w-lg">{trader.bio}</p>}
          </div>
        </div>
        <button
          onClick={() => router.push(`/copy-trading?copy=${trader.id}`)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          Copy Trader
        </button>
      </div>

      {/* Stats overview */}
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="30d ROI" value={`${s.roi30d >= 0 ? "+" : ""}${s.roi30d.toFixed(2)}%`} positive={s.roi30d > 0} negative={s.roi30d < 0} />
          <StatCard label="90d ROI" value={`${s.roi90d >= 0 ? "+" : ""}${s.roi90d.toFixed(2)}%`} positive={s.roi90d > 0} negative={s.roi90d < 0} />
          <StatCard label="1Y ROI" value={`${s.roi1y >= 0 ? "+" : ""}${s.roi1y.toFixed(1)}%`} positive={s.roi1y > 0} negative={s.roi1y < 0} />
          <StatCard label="Win Rate" value={`${s.winRate.toFixed(1)}%`} />
          <StatCard label="Max Drawdown" value={`-${s.maxDrawdown.toFixed(1)}%`} negative />
          <StatCard label="Avg Leverage" value={`${s.avgLeverage.toFixed(1)}x`} />
          <StatCard label="Avg Hold Time" value={formatHours(s.avgHoldingHours)} />
          <StatCard label="Followers" value={s.followerCount.toLocaleString()} />
        </div>
      )}

      {/* Equity curve */}
      {equityCurve.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white font-medium mb-4">Equity Curve (Starting $1,000)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#52525b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#52525b" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#16c784" }}
                formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Equity"]}
              />
              <Line
                type="monotone" dataKey="equity" stroke="#3b82f6"
                strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#3b82f6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly returns bar chart */}
      {monthlyReturns.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white font-medium mb-4">Monthly Returns</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyReturns}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#52525b" tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="#52525b" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                formatter={(v: any) => [`${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`, "ROI"]}
              />
              <Bar dataKey="roi" radius={[3, 3, 0, 0]}>
                {monthlyReturns.map((entry, i) => (
                  <Cell key={i} fill={entry.roi >= 0 ? "#16c784" : "#ea3943"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Open positions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-white font-medium mb-4">Current Open Positions ({trader.signals.length})</h2>
        {trader.signals.length === 0 ? (
          <p className="text-zinc-500 text-sm">No open positions right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                  <th className="text-left pb-2">Symbol</th>
                  <th className="text-left pb-2">Side</th>
                  <th className="text-right pb-2">Size</th>
                  <th className="text-right pb-2">Entry</th>
                  <th className="text-right pb-2">Leverage</th>
                  <th className="text-right pb-2">Stop Loss</th>
                  <th className="text-right pb-2">Take Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {trader.signals.map((sig) => (
                  <tr key={sig.id} className="text-zinc-300">
                    <td className="py-2.5 font-medium text-white">{sig.symbol}</td>
                    <td className="py-2.5">
                      <Badge variant={sig.side === "LONG" ? "green" : "red"}>{sig.side}</Badge>
                    </td>
                    <td className="py-2.5 text-right">{sig.size}</td>
                    <td className="py-2.5 text-right">${sig.entryPrice.toLocaleString()}</td>
                    <td className="py-2.5 text-right">{sig.leverage}x</td>
                    <td className="py-2.5 text-right text-loss">{sig.stopLossPrice ? `$${sig.stopLossPrice.toLocaleString()}` : "—"}</td>
                    <td className="py-2.5 text-right text-profit">{sig.takeProfitPrice ? `$${sig.takeProfitPrice.toLocaleString()}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Specialties */}
      {trader.specialties.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white font-medium mb-3">Trading Pairs</h2>
          <div className="flex flex-wrap gap-2">
            {trader.specialties.map((s) => (
              <span key={s} className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg text-sm">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
