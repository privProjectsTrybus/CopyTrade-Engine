"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Spinner, Badge } from "@/components/ui/Badge";
import { scoreSignal, gradeColor, gradeEmoji } from "@/lib/aiScoring";
import type { RealTrader, RealPosition } from "@/app/api/real-traders/route";

interface FeedEntry {
  id: string;
  trader: RealTrader;
  position: RealPosition;
  score: { score: number; grade: string; reasons: string[] };
  seenAt: Date;
  isNew: boolean;
}

interface MarketCtx { fearGreed: { value: number; label: string } | null; btcPrice: number | null; btcChange: number | null; btcDominance: number | null; }

function MarketBar({ ctx }: { ctx: MarketCtx | null }) {
  if (!ctx) return null;
  const fgColor = ctx.fearGreed ? ctx.fearGreed.value >= 60 ? "var(--profit)" : ctx.fearGreed.value <= 30 ? "var(--loss)" : "var(--yellow)" : "var(--text-muted)";
  return (
    <div style={{ display: "flex", gap: 0, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
      {[
        { label: "BTC Price", value: ctx.btcPrice ? `$${ctx.btcPrice.toLocaleString()}` : "—", sub: ctx.btcChange ? `${ctx.btcChange >= 0 ? "+" : ""}${ctx.btcChange.toFixed(2)}% 24h` : "", color: ctx.btcChange ? ctx.btcChange >= 0 ? "var(--profit)" : "var(--loss)" : "var(--text-muted)" },
        { label: "BTC Dominance", value: ctx.btcDominance ? `${ctx.btcDominance.toFixed(1)}%` : "—", sub: "of total market cap", color: "var(--text)" },
        { label: "Fear & Greed", value: ctx.fearGreed ? `${ctx.fearGreed.value}/100` : "—", sub: ctx.fearGreed?.label ?? "", color: fgColor },
      ].map((item, i) => (
        <div key={i} style={{ flex: 1, padding: "14px 18px", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
          <p style={{ color: "var(--text-faint)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</p>
          <p style={{ color: item.color, fontSize: 18, fontWeight: 700, marginTop: 4 }}>{item.value}</p>
          {item.sub && <p style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 2 }}>{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}

function FeedRow({ entry, balance, onJournal }: { entry: FeedEntry; balance: number; onJournal: (e: FeedEntry) => void }) {
  const [expanded, setExpanded] = useState(false);
  const s = entry.score;
  const riskAmt = balance * 0.01;
  const slDist = entry.position.entryPrice * 0.02;
  const size = slDist > 0 ? riskAmt / slDist : 0;
  const notional = size * entry.position.entryPrice;

  return (
    <div className={`animate-fade${entry.isNew ? " animate-glow" : ""}`}
      style={{ background: "var(--bg-card)", border: `1px solid ${entry.isNew ? "rgba(99,102,241,0.4)" : "var(--border)"}`, borderRadius: 12, overflow: "hidden", marginBottom: 8, transition: "all 0.4s" }}>
      <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 80px 90px 90px 80px 80px 80px 1fr", gap: 10, padding: "12px 16px", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
        <span style={{ fontSize: 16 }}>{gradeEmoji(s.grade)}</span>
        <div>
          <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>{entry.position.symbol}</span>
          <span style={{ color: "var(--text-faint)", fontSize: 11, marginLeft: 8 }}>{entry.trader.nickname}</span>
        </div>
        <Badge variant={entry.position.side === "LONG" ? "green" : "red"}>{entry.position.side}</Badge>
        <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>${entry.position.entryPrice.toLocaleString()}</span>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{entry.position.leverage}x lev</span>
        <span style={{ color: entry.position.roe >= 0 ? "var(--profit)" : "var(--loss)", fontSize: 12, fontWeight: 600 }}>{entry.position.roe >= 0 ? "+" : ""}{entry.position.roe.toFixed(1)}%</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: `conic-gradient(${gradeColor(s.grade)} ${s.score}%, var(--bg-hover) 0)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: gradeColor(s.grade) }}>{s.score}</div>
          </div>
        </div>
        <Badge variant={s.grade === "STRONG" ? "green" : s.grade === "NEUTRAL" ? "yellow" : "red"}>{s.grade}</Badge>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <a href={`https://www.bybit.com/trade/usdt/${entry.position.symbol}`} target="_blank" onClick={e => e.stopPropagation()}
            className="btn btn-primary" style={{ textDecoration: "none", padding: "4px 10px", fontSize: 11 }}>Bybit →</a>
          <button onClick={e => { e.stopPropagation(); onJournal(entry); }} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }}>+ Journal</button>
        </div>
      </div>

      {expanded && (
        <div className="animate-fade" style={{ borderTop: "1px solid var(--border)", padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <p style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>Signal Reasoning</p>
            {s.reasons.map((r, i) => <p key={i} style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4 }}>· {r}</p>)}
            <div style={{ marginTop: 10, display: "flex", gap: 10, fontSize: 12 }}>
              <span style={{ color: "var(--text-faint)" }}>Trader ROI: <span style={{ color: "var(--text)" }}>{entry.trader.roi >= 0 ? "+" : ""}{entry.trader.roi.toFixed(1)}%</span></span>
              <span style={{ color: "var(--text-faint)" }}>Win: <span style={{ color: "var(--text)" }}>{entry.trader.winRate.toFixed(0)}%</span></span>
              {entry.trader.maxDrawdown != null && <span style={{ color: "var(--text-faint)" }}>DD: <span style={{ color: "var(--loss)" }}>-{entry.trader.maxDrawdown.toFixed(1)}%</span></span>}
            </div>
          </div>
          {balance > 0 && (
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: 14, border: "1px solid var(--border)" }}>
              <p style={{ color: "var(--text-faint)", fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>At 1% risk · ${balance.toLocaleString()} balance</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["Size", `${size.toFixed(4)} ${entry.position.symbol.replace("USDT", "")}`], ["Notional", `$${notional.toFixed(0)}`], ["Margin", `$${(notional / entry.position.leverage).toFixed(0)}`], ["SL Price", `$${(entry.position.side === "LONG" ? entry.position.entryPrice * 0.98 : entry.position.entryPrice * 1.02).toFixed(2)}`]].map(([l, v]) => (
                  <div key={l}><p style={{ color: "var(--text-faint)", fontSize: 10 }}>{l}</p><p style={{ color: "var(--accent-light)", fontSize: 13, fontWeight: 600 }}>{v}</p></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function JournalModal({ entry, onClose, onSave }: { entry: FeedEntry; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ tookTrade: true, myEntry: entry.position.entryPrice, mySize: "", myExit: "", outcome: "PENDING", notes: "" });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, symbol: entry.position.symbol, side: entry.position.side, leverage: entry.position.leverage, traderNickname: entry.trader.nickname, traderSource: entry.trader.source, signalScore: entry.score.score, signalGrade: entry.score.grade }) });
    setSaving(false); onSave();
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card animate-fade" style={{ width: "100%", maxWidth: 420, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ color: "var(--text)", fontSize: 15, fontWeight: 600 }}>Log Trade — {entry.position.symbol}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={form.tookTrade} onChange={e => setForm(f => ({ ...f, tookTrade: e.target.checked }))} />
            <span style={{ color: "var(--text)", fontSize: 13 }}>I took this trade</span>
          </label>
          {form.tookTrade && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ color: "var(--text-muted)", fontSize: 12 }}>My Entry</label><input type="number" value={form.myEntry} onChange={e => setForm(f => ({ ...f, myEntry: +e.target.value }))} className="input" style={{ marginTop: 4 }} /></div>
                <div><label style={{ color: "var(--text-muted)", fontSize: 12 }}>Size</label><input type="number" value={form.mySize} onChange={e => setForm(f => ({ ...f, mySize: e.target.value }))} className="input" style={{ marginTop: 4 }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={{ color: "var(--text-muted)", fontSize: 12 }}>Exit Price (if closed)</label><input type="number" value={form.myExit} onChange={e => setForm(f => ({ ...f, myExit: e.target.value }))} className="input" style={{ marginTop: 4 }} /></div>
                <div>
                  <label style={{ color: "var(--text-muted)", fontSize: 12 }}>Outcome</label>
                  <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} className="select" style={{ marginTop: 4 }}>
                    <option value="PENDING">Pending</option><option value="WIN">Win</option><option value="LOSS">Loss</option><option value="BREAKEVEN">Breakeven</option>
                  </select>
                </div>
              </div>
            </>
          )}
          <div><label style={{ color: "var(--text-muted)", fontSize: 12 }}>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" style={{ marginTop: 4, resize: "vertical", minHeight: 60 }} /></div>
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{ width: "100%", padding: "10px" }}>{saving ? "Saving…" : "Save to Journal"}</button>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<MarketCtx | null>(null);
  const [balance, setBalance] = useState(1000);
  const [minScore, setMinScore] = useState(0);
  const [gradeFilter, setGradeFilter] = useState<"ALL" | "STRONG" | "NEUTRAL" | "WEAK">("ALL");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [journalTarget, setJournalTarget] = useState<FeedEntry | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<any>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tradersRes, ctxRes] = await Promise.all([fetch("/api/real-traders"), fetch("/api/market-context")]);
      if (ctxRes.ok) setCtx(await ctxRes.json());
      if (!tradersRes.ok) return;
      const traders: RealTrader[] = await tradersRes.json();
      const newEntries: FeedEntry[] = [];
      for (const trader of traders) {
        for (const pos of trader.positions) {
          const key = `${trader.uid}:${pos.symbol}:${pos.side}:${Math.round(pos.entryPrice)}`;
          const score = scoreSignal(trader, pos);
          newEntries.push({ id: key, trader, position: pos, score, seenAt: new Date(), isNew: !seenRef.current.has(key) });
          seenRef.current.add(key);
        }
      }
      newEntries.sort((a, b) => b.score.score - a.score.score);
      setEntries(newEntries);
      setLastUpdate(new Date());
      setTimeout(() => setEntries(e => e.map(x => ({ ...x, isNew: false }))), 5000);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh) timerRef.current = setInterval(() => load(true), 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, load]);

  const filtered = entries.filter(e => e.score.score >= minScore && (gradeFilter === "ALL" || e.score.grade === gradeFilter));

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Live Trade Feed</h1>
          <p className="page-sub">All active positions from top traders, scored by AI{lastUpdate && <span style={{ color: "var(--text-faint)" }}> · {lastUpdate.toLocaleTimeString()}</span>}</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setAutoRefresh(a => !a)} className="btn btn-ghost" style={{ fontSize: 12, color: autoRefresh ? "var(--profit)" : "var(--text-faint)", borderColor: autoRefresh ? "rgba(0,212,160,0.3)" : "var(--border)" }}>⟳ {autoRefresh ? "Auto" : "Manual"}</button>
          <button onClick={() => load()} disabled={loading} className="btn btn-primary" style={{ fontSize: 12 }}>↻ Refresh</button>
        </div>
      </div>

      <MarketBar ctx={ctx} />

      {/* Controls */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 3, background: "var(--bg)", padding: 3, borderRadius: 9, border: "1px solid var(--border)" }}>
          {(["ALL", "STRONG", "NEUTRAL", "WEAK"] as const).map(g => (
            <button key={g} onClick={() => setGradeFilter(g)} style={{ padding: "5px 12px", borderRadius: 7, border: "none", fontSize: 11, cursor: "pointer", transition: "all 0.15s", background: gradeFilter === g ? g === "STRONG" ? "rgba(0,212,160,0.2)" : g === "NEUTRAL" ? "rgba(245,158,11,0.2)" : g === "WEAK" ? "rgba(255,68,102,0.2)" : "var(--accent)" : "transparent", color: gradeFilter === g ? g === "STRONG" ? "var(--profit)" : g === "NEUTRAL" ? "var(--yellow)" : g === "WEAK" ? "var(--loss)" : "#fff" : "var(--text-faint)" }}>
              {g === "ALL" ? "All" : `${gradeEmoji(g)} ${g}`}
            </button>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
          Min Score <input type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(+e.target.value)} className="input" style={{ width: 60, marginLeft: 4 }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
          My Balance $ <input type="number" value={balance} onChange={e => setBalance(+e.target.value)} className="input" style={{ width: 90, marginLeft: 4 }} />
        </label>
        <span style={{ color: "var(--text-faint)", fontSize: 12, marginLeft: "auto" }}>{filtered.length} positions</span>
      </div>

      {/* Column headers */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 80px 90px 90px 80px 80px 80px 1fr", gap: 10, padding: "6px 16px", marginBottom: 4 }}>
          {["", "Symbol / Trader", "Side", "Entry", "Leverage", "ROE", "Score", "Grade", "Actions"].map(h => (
            <span key={h} style={{ color: "var(--text-faint)", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 80 }}>
          <Spinner size="lg" />
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Fetching live positions and scoring…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>No positions match your filters.</p>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 6 }}>Most traders don't make positions public. Try refreshing.</p>
        </div>
      ) : (
        filtered.map(e => <FeedRow key={e.id} entry={e} balance={balance} onJournal={setJournalTarget} />)
      )}

      {journalTarget && <JournalModal entry={journalTarget} onClose={() => setJournalTarget(null)} onSave={() => { setJournalTarget(null); }} />}
    </div>
  );
}
