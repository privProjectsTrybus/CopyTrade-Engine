"use client";
import { useEffect, useState, useCallback } from "react";
import { Spinner, Badge } from "@/components/ui/Badge";
import type { RealTrader, RealPosition } from "@/app/api/real-traders/route";

// ── Risk Calculator ──────────────────────────────────────────────────────────

function RiskCalc({ position, onClose }: { position: RealPosition; onClose: () => void }) {
  const [balance, setBalance] = useState(1000);
  const [riskPct, setRiskPct] = useState(1);

  const slDist = position.entryPrice > 0
    ? Math.abs(position.entryPrice - (position.side === "LONG" ? position.entryPrice * 0.98 : position.entryPrice * 1.02))
    : 0;
  const riskAmount = (balance * riskPct) / 100;
  const positionSize = slDist > 0 ? (riskAmount / slDist) : 0;
  const notional = positionSize * position.entryPrice;
  const margin = position.leverage > 0 ? notional / position.leverage : notional;

  function copyOrder() {
    const txt = `${position.symbol} ${position.side}\nEntry: $${position.entryPrice}\nSize: ${positionSize.toFixed(4)}\nNotional: $${notional.toFixed(2)}\nMargin: $${margin.toFixed(2)}\nLeverage: ${position.leverage}x\nUnrealized ROE: ${position.roe.toFixed(2)}%`;
    navigator.clipboard.writeText(txt);
  }

  const inp: React.CSSProperties = {
    background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8,
    padding: "8px 12px", color: "var(--text)", fontSize: 13, width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 420, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, margin: 0 }}>Position Calculator</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "4px 0 0" }}>{position.symbol} · {position.side} · {position.leverage}x</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ color: "var(--text-muted)", fontSize: 13 }}>Your account balance (USDT)</label>
            <input type="number" value={balance} onChange={e => setBalance(+e.target.value)} style={{ ...inp, marginTop: 4 }} />
          </div>
          <div>
            <label style={{ color: "var(--text-muted)", fontSize: 13 }}>Risk per trade (%)</label>
            <input type="number" min={0.1} max={10} step={0.1} value={riskPct} onChange={e => setRiskPct(+e.target.value)} style={{ ...inp, marginTop: 4 }} />
          </div>

          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label="Entry Price" value={`$${position.entryPrice.toLocaleString()}`} />
            <Row label="Leverage" value={`${position.leverage}x`} />
            <Row label="Risk Amount" value={`$${riskAmount.toFixed(2)}`} />
            <Row label="Position Size" value={`${positionSize.toFixed(4)} ${position.symbol.replace("USDT", "")}`} highlight />
            <Row label="Notional Value" value={`$${notional.toFixed(2)}`} highlight />
            <Row label="Required Margin" value={`$${margin.toFixed(2)}`} />
            <Row label="Current ROE" value={`${position.roe >= 0 ? "+" : ""}${position.roe.toFixed(2)}%`} color={position.roe >= 0 ? "var(--profit)" : "var(--loss)"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={copyOrder}
              style={{ padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, cursor: "pointer" }}>
              📋 Copy Details
            </button>
            <a href={`https://www.bybit.com/trade/usdt/${position.symbol}`} target="_blank"
              style={{ padding: "10px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, cursor: "pointer", textAlign: "center", textDecoration: "none", display: "block" }}>
              Open on Bybit →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{label}</span>
      <span style={{ color: color ?? (highlight ? "var(--text)" : "var(--text-muted)"), fontSize: 13, fontWeight: highlight ? 600 : 400 }}>{value}</span>
    </div>
  );
}

// ── Trader Card ───────────────────────────────────────────────────────────────

function TraderCard({ trader, onSelectPosition }: { trader: RealTrader; onSelectPosition: (p: RealPosition) => void }) {
  const [expanded, setExpanded] = useState(false);
  const card: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" };

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 14, color: "#fff",
            background: trader.source === "BINANCE" ? "rgba(234,179,8,0.8)" : "rgba(249,115,22,0.8)",
          }}>
            {trader.nickname[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>{trader.nickname}</span>
              <Badge variant={trader.source === "BINANCE" ? "yellow" : "default"}>{trader.source}</Badge>
              {trader.sharesPositions && <Badge variant="green">Live Positions</Badge>}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 3 }}>
              <span style={{ color: trader.roi >= 0 ? "var(--profit)" : "var(--loss)", fontSize: 12, fontWeight: 600 }}>
                {trader.roi >= 0 ? "+" : ""}{trader.roi.toFixed(1)}% ROI
              </span>
              <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
                PnL: ${trader.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              {trader.winRate > 0 && (
                <span style={{ color: "var(--text-faint)", fontSize: 12 }}>Win: {trader.winRate.toFixed(0)}%</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href={trader.profileUrl} target="_blank" onClick={e => e.stopPropagation()}
            style={{ color: "var(--accent)", fontSize: 12, textDecoration: "none" }}>
            View Profile →
          </a>
          <span style={{ color: "var(--text-faint)", fontSize: 16 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Positions */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {trader.positions.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center" }}>
              <p style={{ color: "var(--text-faint)", fontSize: 13, margin: 0 }}>
                {trader.sharesPositions
                  ? "No open positions right now."
                  : "This trader doesn't share positions publicly."}
              </p>
              <a href={trader.profileUrl} target="_blank"
                style={{ color: "var(--accent)", fontSize: 12, display: "inline-block", marginTop: 6 }}>
                View on {trader.source} →
              </a>
            </div>
          ) : (
            <div>
              <div style={{ padding: "8px 16px", display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px 80px 100px", gap: 8, borderBottom: "1px solid var(--border)" }}>
                {["Symbol", "Side", "Entry", "Mark", "Lev", "ROE", "Action"].map(h => (
                  <span key={h} style={{ color: "var(--text-faint)", fontSize: 11, fontWeight: 500, textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {trader.positions.map((pos, i) => (
                <div key={i} style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px 80px 100px", gap: 8, alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>{pos.symbol}</span>
                  <Badge variant={pos.side === "LONG" ? "green" : "red"}>{pos.side}</Badge>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>${pos.entryPrice.toLocaleString()}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>${pos.markPrice.toLocaleString()}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{pos.leverage}x</span>
                  <span style={{ color: pos.roe >= 0 ? "var(--profit)" : "var(--loss)", fontSize: 12, fontWeight: 600 }}>
                    {pos.roe >= 0 ? "+" : ""}{pos.roe.toFixed(1)}%
                  </span>
                  <button onClick={() => onSelectPosition(pos)}
                    style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                    Calculate
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SignalsPage() {
  const [traders, setTraders] = useState<RealTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<RealPosition | null>(null);
  const [filter, setFilter] = useState<"ALL" | "BINANCE" | "BYBIT">("ALL");
  const [onlyPositions, setOnlyPositions] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/real-traders");
      if (!res.ok) throw new Error("Failed to fetch traders");
      const data = await res.json();
      setTraders(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = traders
    .filter(t => filter === "ALL" || t.source === filter)
    .filter(t => !onlyPositions || t.positions.length > 0);

  const withPositions = traders.filter(t => t.positions.length > 0).length;

  const card: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12 };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "var(--text)", fontSize: 22, fontWeight: 600, margin: 0 }}>Live Trader Signals</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Real top traders from Binance & Bybit leaderboards. Click a position to calculate your trade size.
          </p>
          {lastUpdated && (
            <p style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 2 }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button onClick={load} disabled={loading}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {/* Stats strip */}
      {!loading && traders.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Total Traders", value: traders.length },
            { label: "Sharing Positions", value: withPositions },
            { label: "Binance", value: traders.filter(t => t.source === "BINANCE").length },
            { label: "Bybit", value: traders.filter(t => t.source === "BYBIT").length },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: "12px 16px" }}>
              <p style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", margin: 0 }}>{s.label}</p>
              <p style={{ color: "var(--text)", fontSize: 20, fontWeight: 600, margin: "4px 0 0" }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", padding: 4, borderRadius: 10, border: "1px solid var(--border)" }}>
          {(["ALL", "BINANCE", "BYBIT"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, cursor: "pointer", background: filter === f ? "var(--accent)" : "transparent", color: filter === f ? "#fff" : "var(--text-muted)" }}>
              {f}
            </button>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--text-muted)", fontSize: 13 }}>
          <input type="checkbox" checked={onlyPositions} onChange={e => setOnlyPositions(e.target.checked)} />
          Show live positions only
        </label>
        <span style={{ color: "var(--text-faint)", fontSize: 12, marginLeft: "auto" }}>
          {filtered.length} traders
        </span>
      </div>

      {/* Info banner */}
      <div style={{ ...card, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 18 }}>ℹ️</span>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          Positions are only visible for traders who have made them public on their leaderboard profile.
          Click any position row to open the risk calculator, then place the trade manually on Bybit.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 60 }}>
          <Spinner size="lg" />
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Fetching live data from Binance & Bybit leaderboards…</p>
        </div>
      ) : error ? (
        <div style={{ ...card, padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--loss)", margin: 0 }}>{error}</p>
          <button onClick={load} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>No traders match your filters.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(t => (
            <TraderCard key={`${t.source}-${t.uid}`} trader={t} onSelectPosition={setSelected} />
          ))}
        </div>
      )}

      {/* Risk calculator modal */}
      {selected && <RiskCalc position={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
