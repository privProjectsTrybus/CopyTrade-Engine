"use client";
// src/app/(app)/portfolio/page.tsx
import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, Cell, PieChart, Pie, Tooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { StatCard } from "@/components/ui";
import { Badge, Spinner } from "@/components/ui";

interface Analytics {
  totalRealizedPnl: number;
  totalRoi: number;
  unrealizedPnl: number;
  openPositionCount: number;
  equityCurve: { date: string; equity: number }[];
  monthlyReturns: { month: string; pnl: number; returnPct: number }[];
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  assetAllocation: { symbol: string; count: number; pnl: number }[];
  openPositions: Array<{
    symbol: string; side: string; size: number;
    entryPrice: number; markPrice: number; unrealizedPnl: number; leverage: number;
  }>;
}

const PIE_COLORS = ["#3b82f6", "#16c784", "#8b5cf6", "#f59e0b", "#ea3943", "#06b6d4", "#ec4899", "#84cc16"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-zinc-400 text-xs mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}</p>
      ))}
    </div>
  );
};

export default function PortfolioPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;

  const isEmpty = !data || data.totalTrades === 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-white text-2xl font-semibold">Portfolio Analytics</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Performance computed from all closed positions</p>
      </div>

      {isEmpty ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 text-center">
          <p className="text-zinc-400">No closed positions yet.</p>
          <p className="text-zinc-600 text-sm mt-1">Analytics will appear once your first trade closes.</p>
        </div>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total Realized PnL"
              value={`${data.totalRealizedPnl >= 0 ? "+" : ""}$${data.totalRealizedPnl.toFixed(2)}`}
              positive={data.totalRealizedPnl > 0} negative={data.totalRealizedPnl < 0}
            />
            <StatCard
              label="Total ROI"
              value={`${data.totalRoi >= 0 ? "+" : ""}${data.totalRoi.toFixed(2)}%`}
              positive={data.totalRoi > 0} negative={data.totalRoi < 0}
            />
            <StatCard
              label="Unrealized PnL"
              value={`${data.unrealizedPnl >= 0 ? "+" : ""}$${data.unrealizedPnl.toFixed(2)}`}
              positive={data.unrealizedPnl > 0} negative={data.unrealizedPnl < 0}
              subtext={`${data.openPositionCount} open positions`}
            />
            <StatCard label="Total Trades" value={data.totalTrades} subtext={`${data.winCount}W / ${data.lossCount}L`} />
          </div>

          {/* Risk metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Sharpe Ratio" value={data.sharpeRatio.toFixed(2)}
              positive={data.sharpeRatio > 1} negative={data.sharpeRatio < 0}
              subtext="> 1.0 is good" />
            <StatCard label="Sortino Ratio" value={data.sortinoRatio.toFixed(2)}
              positive={data.sortinoRatio > 1} negative={data.sortinoRatio < 0}
              subtext="> 1.0 is good" />
            <StatCard label="Max Drawdown" value={`-${data.maxDrawdown.toFixed(2)}%`} negative={data.maxDrawdown > 10}
              subtext={`${data.maxDrawdownDuration}d duration`} />
            <StatCard label="Win Rate" value={`${data.winRate.toFixed(1)}%`}
              positive={data.winRate > 55} negative={data.winRate < 45} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Avg Win" value={`+$${data.avgWin.toFixed(2)}`} positive />
            <StatCard label="Avg Loss" value={`-$${data.avgLoss.toFixed(2)}`} negative />
            <StatCard label="Profit Factor" value={data.profitFactor === Infinity ? "∞" : data.profitFactor.toFixed(2)}
              positive={data.profitFactor > 1.5} negative={data.profitFactor < 1}
              subtext="> 1.5 is good" />
            <StatCard label="Open Positions" value={data.openPositionCount} />
          </div>

          {/* Equity curve */}
          {data.equityCurve.length > 1 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-white font-medium mb-4">Equity Curve</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#52525b" tick={{ fontSize: 10 }}
                    tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
                  <YAxis stroke="#52525b" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="equity" name="Equity" stroke="#3b82f6"
                    strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly returns + asset allocation side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.monthlyReturns.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h2 className="text-white font-medium mb-4">Monthly Returns</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.monthlyReturns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" stroke="#52525b" tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis stroke="#52525b" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="returnPct" name="Return %" radius={[3, 3, 0, 0]}>
                      {data.monthlyReturns.map((entry, i) => (
                        <Cell key={i} fill={entry.returnPct >= 0 ? "#16c784" : "#ea3943"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.assetAllocation.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h2 className="text-white font-medium mb-4">Asset Allocation (by trades)</h2>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={data.assetAllocation} dataKey="count" nameKey="symbol"
                        cx="50%" cy="50%" outerRadius={70} strokeWidth={0}>
                        {data.assetAllocation.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [v, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {data.assetAllocation.map((asset, i) => (
                      <div key={asset.symbol} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-zinc-300">{asset.symbol.replace("USDT", "")}</span>
                        </div>
                        <span className={asset.pnl >= 0 ? "text-profit" : "text-loss"}>
                          {asset.pnl >= 0 ? "+" : ""}${asset.pnl.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Open positions table */}
          {data.openPositions.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-white font-medium mb-4">Open Positions</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                      <th className="text-left pb-2">Symbol</th>
                      <th className="text-left pb-2">Side</th>
                      <th className="text-right pb-2">Size</th>
                      <th className="text-right pb-2">Entry</th>
                      <th className="text-right pb-2">Mark</th>
                      <th className="text-right pb-2">Leverage</th>
                      <th className="text-right pb-2">Unrealized PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {data.openPositions.map((pos, i) => (
                      <tr key={i} className="text-zinc-300">
                        <td className="py-2.5 font-medium text-white">{pos.symbol}</td>
                        <td className="py-2.5">
                          <Badge variant={pos.side === "LONG" ? "green" : "red"}>{pos.side}</Badge>
                        </td>
                        <td className="py-2.5 text-right">{pos.size}</td>
                        <td className="py-2.5 text-right">${pos.entryPrice.toLocaleString()}</td>
                        <td className="py-2.5 text-right">${pos.markPrice?.toLocaleString() ?? "—"}</td>
                        <td className="py-2.5 text-right">{pos.leverage}x</td>
                        <td className={`py-2.5 text-right font-medium ${pos.unrealizedPnl >= 0 ? "text-profit" : "text-loss"}`}>
                          {pos.unrealizedPnl >= 0 ? "+" : ""}${pos.unrealizedPnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
