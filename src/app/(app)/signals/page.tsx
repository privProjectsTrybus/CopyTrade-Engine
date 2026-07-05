"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Spinner, Badge } from "@/components/ui/Badge";
import type { RealTrader, RealPosition } from "@/app/api/real-traders/route";

// ── Sound alert (Web Audio API, no external files) ───────────────────────────
function playAlert() {
  try {
    const ctx = new AudioContext();
    [0, 0.15, 0.3].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880 + i * 110;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
  } catch {}
}

// ── Risk Calculator modal ────────────────────────────────────────────────────
function RiskCalc({ position, trader, onClose }: { position: RealPosition; trader: RealTrader; onClose: () => void }) {
  const [balance, setBalance] = useState(1000);
  const [riskPct, setRiskPct] = useState(1);
  const [slPct, setSlPct] = useState(2);
  const [copied, setCopied] = useState(false);

  const riskAmount = (balance * riskPct) / 100;
  const slDistance = position.entryPrice * (slPct / 100);
  const positionSize = slDistance > 0 ? riskAmount / slDistance : 0;
  const notional = positionSize * position.entryPrice;
  const margin = position.leverage > 0 ? notional / position.leverage : notional;

  function copyDetails() {
    const txt = [
      `${position.symbol} ${position.side} — ${trader.nickname} (${trader.source})`,
      `Entry: $${position.entryPrice.toLocaleString()}`,
      `Size: ${positionSize.toFixed(4)} ${position.symbol.replace("USDT", "")}`,
      `Notional: $${notional.toFixed(2)}`,
      `Margin needed: $${margin.toFixed(2)}`,
      `Leverage: ${position.leverage}x`,
      `Stop Loss: $${(position.side === "LONG" ? position.entryPrice - slDistance : position.entryPrice + slDistance).toFixed(2)} (${slPct}%)`,
      `Current ROE: ${position.roe >= 0 ? "+" : ""}${position.roe.toFixed(2)}%`,
    ].join("\n");
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inp: React.CSSProperties = { background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 13, width: "100%", boxSizing: "border-box", marginTop: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 440, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, margin: 0 }}>Position Calculator</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "4px 0 0" }}>
              {position.symbol} · <span style={{ color: position.side === "LONG" ? "var(--profit)" : "var(--loss)" }}>{position.side}</span> · {position.leverage}x · {trader.nickname}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ color: "var(--text-muted)", fontSize: 12 }}>Account Balance (USDT)</label>
              <input type="number" value={balance} onChange={e => setBalance(+e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ color: "var(--text-muted)", fontSize: 12 }}>Risk per Trade (%)</label>
              <input type="number" min={0.1} max={10} step={0.1} value={riskPct} onChange={e => setRiskPct(+e.target.value)} style={inp} />
            </div>
          </div>
          <div>
            <label style={{ color: "var(--text-muted)", fontSize: 12 }}>Stop Loss Distance (%)</label>
            <input type="number" min={0.1} max={20} step={0.1} value={slPct} onChange={e => setSlPct(+e.target.value)} style={inp} />
          </div>

          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { l: "Entry Price", v: `$${position.entryPrice.toLocaleString()}`, big: false },
              { l: "Current ROE", v: `${position.roe >= 0 ? "+" : ""}${position.roe.toFixed(2)}%`, big: false, color: position.roe >= 0 ? "var(--profit)" : "var(--loss)" },
              { l: "Risk Amount", v: `$${riskAmount.toFixed(2)}`, big: false },
              { l: "Stop Loss", v: `$${(position.side === "LONG" ? position.entryPrice - slDistance : position.entryPrice + slDistance).toFixed(2)}`, big: false },
              { l: "Position Size", v: `${positionSize.toFixed(4)} ${position.symbol.replace("USDT", "")}`, big: true },
              { l: "Required Margin", v: `$${margin.toFixed(2)}`, big: true },
            ].map(r => (
              <div key={r.l} style={{ padding: "8px 10px", background: r.big ? "rgba(59,130,246,0.08)" : "transparent", borderRadius: 6, border: r.big ? "1px solid rgba(59,130,246,0.2)" : "none" }}>
                <p style={{ color: "var(--text-faint)", fontSize: 10, textTransform: "uppercase", margin: 0 }}>{r.l}</p>
                <p style={{ color: (r as any).color ?? (r.big ? "var(--accent)" : "var(--text)"), fontSize: r.big ? 16 : 13, fontWeight: r.big ? 700 : 400, margin: "3px 0 0" }}>{r.v}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={copyDetails}
              style={{ padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: copied ? "rgba(22,199,132,0.1)" : "transparent", color: copied ? "var(--profit)" : "var(--text)", fontSize: 13, cursor: "pointer" }}>
              {copied ? "✓ Copied!" : "📋 Copy Details"}
            </button>
            <a href={`https://www.bybit.com/trade/usdt/${position.symbol}`} target="_blank"
              style={{ padding: "10px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 500, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              Open on Bybit →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Signal History panel ──────────────────────────────────────────────────────
function HistoryPanel({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/signals/history").then(r => r.ok ? r.json() : []).then(d => { setHistory(d); setLoading(false); });
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, margin: 0 }}>Signal History</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading ? <Spinner /> : history.length === 0 ? (
            <p style={{ color: "var(--text-faint)", textAlign: "center", padding: 40 }}>No signals logged yet. They appear here when you view positions.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {history.map((h, i) => (
                <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 120px", gap: 8, alignItems: "center" }}>
                  <div>
                    <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>{h.symbol}</span>
                    <span style={{ color: "var(--text-faint)", fontSize: 11, marginLeft: 8 }}>{h.traderNickname}</span>
                  </div>
                  <Badge variant={h.side === "LONG" ? "green" : "red"}>{h.side}</Badge>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>${h.entryPrice?.toLocaleString()}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{h.leverage}x</span>
                  <span style={{ color: "var(--text-faint)", fontSize: 11 }}>{new Date(h.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Trader Card ───────────────────────────────────────────────────────────────
function TraderCard({ trader, onSelect, isNew }: { trader: RealTrader; onSelect: (p: RealPosition) => void; isNew: boolean }) {
  const [expanded, setExpanded] = useState(false);

  async function logAndSelect(pos: RealPosition) {
    fetch("/api/signals/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trader, position: pos }) }).catch(() => {});
    onSelect(pos);
  }

  async function sendTelegram(pos: RealPosition) {
    const res = await fetch("/api/signals/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trader, position: pos }) });
    if (!res.ok) alert("Telegram not configured. Go to Alerts → set up Telegram first.");
    else alert("Sent to Telegram ✓");
  }

  const sourceBg = trader.source === "BINANCE" ? "rgba(234,179,8,0.85)" : trader.source === "BYBIT_COPY" ? "rgba(22,199,132,0.85)" : "rgba(249,115,22,0.85)";
  const sourceLabel = trader.source === "BYBIT_COPY" ? "BYBIT COPY" : trader.source;

  return (
    <div style={{ background: "var(--bg-card)", border: `1px solid ${isNew ? "rgba(22,199,132,0.5)" : "var(--border)"}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.5s" }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#fff", background: sourceBg, flexShrink: 0 }}>
            {trader.nickname[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>{trader.nickname}</span>
              <Badge variant={trader.source === "BINANCE" ? "yellow" : trader.source === "BYBIT_COPY" ? "green" : "default"}>{sourceLabel}</Badge>
              {isNew && <Badge variant="green">● New</Badge>}
              {trader.sharesPositions && <Badge variant="blue">📡 Live Positions</Badge>}
              {trader.positions.length > 0 && <Badge variant="blue">{trader.positions.length} open</Badge>}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 3, flexWrap: "wrap" }}>
              <span style={{ color: trader.roi >= 0 ? "var(--profit)" : "var(--loss)", fontSize: 12, fontWeight: 600 }}>{trader.roi >= 0 ? "+" : ""}{trader.roi.toFixed(1)}% ROI</span>
              <span style={{ color: "var(--text-faint)", fontSize: 12 }}>PnL: ${trader.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              {trader.winRate > 0 && <span style={{ color: "var(--text-faint)", fontSize: 12 }}>Win: {trader.winRate.toFixed(0)}%</span>}
              {trader.followers != null && trader.followers > 0 && <span style={{ color: "var(--text-faint)", fontSize: 12 }}>Followers: {trader.followers.toLocaleString()}</span>}
              {trader.maxDrawdown != null && <span style={{ color: "var(--loss)", fontSize: 12 }}>DD: -{trader.maxDrawdown.toFixed(1)}%</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href={trader.profileUrl} target="_blank" onClick={e => e.stopPropagation()} style={{ color: "var(--accent)", fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>
            Profile →
          </a>
          <span style={{ color: "var(--text-faint)" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {trader.positions.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center" }}>
              <p style={{ color: "var(--text-faint)", fontSize: 13, margin: 0 }}>
                {trader.sharesPositions ? "No open positions." : "Positions not public. View their profile directly."}
              </p>
              <a href={trader.profileUrl} target="_blank" style={{ color: "var(--accent)", fontSize: 12, display: "inline-block", marginTop: 6 }}>View on {sourceLabel} →</a>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div style={{ padding: "8px 16px", display: "grid", gridTemplateColumns: "140px 70px 100px 100px 60px 80px 1fr", gap: 8, borderBottom: "1px solid var(--border)" }}>
                {["Symbol", "Side", "Entry", "Mark", "Lev", "ROE", "Actions"].map(h => (
                  <span key={h} style={{ color: "var(--text-faint)", fontSize: 11, fontWeight: 500, textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {trader.positions.map((pos, i) => (
                <div key={i} style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "140px 70px 100px 100px 60px 80px 1fr", gap: 8, alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>{pos.symbol}</span>
                  <Badge variant={pos.side === "LONG" ? "green" : "red"}>{pos.side}</Badge>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>${pos.entryPrice.toLocaleString()}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>${pos.markPrice.toLocaleString()}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{pos.leverage}x</span>
                  <span style={{ color: pos.roe >= 0 ? "var(--profit)" : "var(--loss)", fontSize: 12, fontWeight: 600 }}>{pos.roe >= 0 ? "+" : ""}{pos.roe.toFixed(1)}%</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => logAndSelect(pos)}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                      Calculate
                    </button>
                    <button onClick={() => sendTelegram(pos)}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                      📱 Alert
                    </button>
                  </div>
                </div>
              ))}
            </>
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
  const [selected, setSelected] = useState<{ pos: RealPosition; trader: RealTrader } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newUids, setNewUids] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Filters
  const [minRoi, setMinRoi] = useState(0);
  const [minWinRate, setMinWinRate] = useState(0);
  const [maxDrawdown, setMaxDrawdown] = useState(100);
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "BINANCE" | "BYBIT" | "BYBIT_COPY">("ALL");
  const [onlyPositions, setOnlyPositions] = useState(false);

  const prevUidsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/real-traders");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: RealTrader[] = await res.json();

      // Detect new traders/positions since last fetch
      const currentUids = new Set(data.map(t => t.uid));
      const newOnes = new Set([...currentUids].filter(u => prevUidsRef.current.size > 0 && !prevUidsRef.current.has(u)));

      // Detect new positions on existing traders
      const positionUids = new Set(data.filter(t => t.positions.length > 0).map(t => t.uid));
      const prevPositionUids = new Set([...prevUidsRef.current].filter(u => {
        const prev = traders.find(t => t.uid === u);
        return prev && prev.positions.length > 0;
      }));
      const newPositionTraders = new Set([...positionUids].filter(u => !prevPositionUids.has(u)));

      const allNew = new Set([...newOnes, ...newPositionTraders]);
      if (allNew.size > 0) {
        setNewUids(allNew);
        if (soundEnabled) playAlert();
        setTimeout(() => setNewUids(new Set()), 10000);
      }

      prevUidsRef.current = currentUids;
      setTraders(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [soundEnabled, traders]);

  useEffect(() => { load(); }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh) {
      timerRef.current = setInterval(() => load(true), 60000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, load]);

  const filtered = traders
    .filter(t => sourceFilter === "ALL" || t.source === sourceFilter)
    .filter(t => t.roi >= minRoi)
    .filter(t => t.winRate === 0 || t.winRate >= minWinRate)
    .filter(t => t.maxDrawdown == null || t.maxDrawdown <= maxDrawdown)
    .filter(t => !onlyPositions || t.positions.length > 0);

  const withPositions = traders.filter(t => t.positions.length > 0).length;
  const totalPositions = traders.reduce((s, t) => s + t.positions.length, 0);

  const card: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12 };
  const filterInp: React.CSSProperties = { background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--text)", fontSize: 12, width: 70 };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: "var(--text)", fontSize: 22, fontWeight: 600, margin: 0 }}>Live Signals</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Real top traders from Binance & Bybit. Auto-refreshes every 60s.
            {lastUpdated && <span style={{ color: "var(--text-faint)" }}> Last: {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowHistory(true)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
            📋 History
          </button>
          <button onClick={() => setSoundEnabled(s => !s)}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: soundEnabled ? "rgba(59,130,246,0.1)" : "transparent", color: soundEnabled ? "var(--accent)" : "var(--text-faint)", fontSize: 13, cursor: "pointer" }}>
            {soundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
          </button>
          <button onClick={() => setAutoRefresh(a => !a)}
            style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${autoRefresh ? "rgba(22,199,132,0.4)" : "var(--border)"}`, background: autoRefresh ? "rgba(22,199,132,0.08)" : "transparent", color: autoRefresh ? "var(--profit)" : "var(--text-faint)", fontSize: 13, cursor: "pointer" }}>
            {autoRefresh ? "⟳ Auto On" : "⟳ Auto Off"}
          </button>
          <button onClick={() => load()} disabled={loading}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && traders.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { l: "Traders", v: traders.length },
            { l: "With Positions", v: withPositions },
            { l: "Live Positions", v: totalPositions },
            { l: "Binance", v: traders.filter(t => t.source === "BINANCE").length },
            { l: "Bybit", v: traders.filter(t => t.source !== "BINANCE").length },
          ].map(s => (
            <div key={s.l} style={{ ...card, padding: "10px 14px" }}>
              <p style={{ color: "var(--text-faint)", fontSize: 10, textTransform: "uppercase", margin: 0 }}>{s.l}</p>
              <p style={{ color: "var(--text)", fontSize: 20, fontWeight: 600, margin: "3px 0 0" }}>{s.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ ...card, padding: "14px 16px", marginBottom: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--bg)", padding: 3, borderRadius: 8, border: "1px solid var(--border)" }}>
          {(["ALL", "BINANCE", "BYBIT", "BYBIT_COPY"] as const).map(f => (
            <button key={f} onClick={() => setSourceFilter(f)}
              style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 11, cursor: "pointer", background: sourceFilter === f ? "var(--accent)" : "transparent", color: sourceFilter === f ? "#fff" : "var(--text-faint)", fontWeight: sourceFilter === f ? 600 : 400 }}>
              {f === "BYBIT_COPY" ? "COPY" : f}
            </button>
          ))}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
          Min ROI %
          <input type="number" value={minRoi} onChange={e => setMinRoi(+e.target.value)} style={filterInp} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
          Min Win Rate %
          <input type="number" value={minWinRate} onChange={e => setMinWinRate(+e.target.value)} style={filterInp} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
          Max Drawdown %
          <input type="number" value={maxDrawdown} onChange={e => setMaxDrawdown(+e.target.value)} style={filterInp} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}>
          <input type="checkbox" checked={onlyPositions} onChange={e => setOnlyPositions(e.target.checked)} />
          Positions only
        </label>
        <span style={{ color: "var(--text-faint)", fontSize: 12, marginLeft: "auto" }}>{filtered.length} traders</span>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 60 }}>
          <Spinner size="lg" />
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Fetching live data from Binance & Bybit leaderboards…</p>
        </div>
      ) : error ? (
        <div style={{ ...card, padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--loss)", margin: "0 0 12px" }}>{error}</p>
          <button onClick={() => load()} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, cursor: "pointer" }}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>No traders match your filters.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(t => (
            <TraderCard
              key={`${t.source}-${t.uid}`}
              trader={t}
              isNew={newUids.has(t.uid)}
              onSelect={pos => setSelected({ pos, trader: t })}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {selected && <RiskCalc position={selected.pos} trader={selected.trader} onClose={() => setSelected(null)} />}
      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
    </div>
  );
}
