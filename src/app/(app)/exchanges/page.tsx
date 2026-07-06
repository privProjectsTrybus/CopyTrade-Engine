"use client";
import { useEffect, useState, useCallback } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Spinner } from "@/components/ui/Badge";

interface Connection {
  id: string; exchange: "BINANCE"|"BYBIT"|"OKX"; label: string;
  hasWithdrawPermission: boolean; hasTradePermission: boolean;
  lastSyncedAt: string|null; lastSyncError: string|null; createdAt: string;
}
interface LiveInfo {
  totalWalletBalance: number; availableBalance: number;
  totalUnrealizedPnl: number; marginRatio: number;
  canTrade: boolean; canWithdraw: boolean;
}
interface LiveData { loading: boolean; data: LiveInfo|null; error: string|null; }

const inp: React.CSSProperties = {
  marginTop:4, width:"100%", background:"var(--bg-input)", border:"1px solid var(--border)",
  borderRadius:8, padding:"9px 12px", color:"var(--text)", fontSize:13, boxSizing:"border-box"
};

export default function ExchangesPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [liveData, setLiveData] = useState<Record<string, LiveData>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ exchange:"BINANCE" as "BINANCE"|"BYBIT"|"OKX", label:"", apiKey:"", apiSecret:"", passphrase:"" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchLive = useCallback(async (conns: Connection[]) => {
    for (const conn of conns) {
      setLiveData(prev => ({ ...prev, [conn.id]: { loading: true, data: null, error: null } }));
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(`/api/exchange/account-info?connectionId=${conn.id}`, { signal: controller.signal });
        clearTimeout(timer);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Connection failed");
        setLiveData(prev => ({ ...prev, [conn.id]: { loading: false, data, error: null } }));
      } catch (e) {
        setLiveData(prev => ({ ...prev, [conn.id]: { loading: false, data: null, error: String(e) } }));
      }
    }
  }, []);

  const loadConnections = useCallback(async () => {
    const res = await fetch("/api/exchange/list");
    if (res.ok) {
      const conns = await res.json();
      setConnections(conns);
      setLoading(false);
      fetchLive(conns);
    }
  }, [fetchLive]);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  // Refresh every 30s
  useEffect(() => {
    const t = setInterval(() => { if (connections.length > 0) fetchLive(connections); }, 30000);
    return () => clearInterval(t);
  }, [connections, fetchLive]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSubmitting(true);
    const res = await fetch("/api/exchange/connect", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(form),
    });
    const data = await res.json(); setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Failed to connect"); return; }
    setShowForm(false);
    setForm({ exchange:"BINANCE", label:"", apiKey:"", apiSecret:"", passphrase:"" });
    await loadConnections();
  }

  async function handleDisconnect(id: string) {
    if (!confirm("Remove this exchange? Active copy relationships will be paused.")) return;
    await fetch("/api/exchange/disconnect", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({connectionId:id}) });
    setConnections(c => c.filter(x => x.id !== id));
    setLiveData(prev => { const n={...prev}; delete n[id]; return n; });
  }

  const card: React.CSSProperties = { background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:12 };

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:400}}><Spinner size="lg" /></div>;

  return (
    <div style={{padding:24,maxWidth:960,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{color:"var(--text)",fontSize:22,fontWeight:600,margin:0}}>Exchanges</h1>
          <p style={{color:"var(--text-muted)",fontSize:13,marginTop:4}}>Connect your Binance or Bybit account</p>
        </div>
        <button onClick={()=>setShowForm(s=>!s)}
          style={{padding:"8px 18px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:500,cursor:"pointer"}}>
          {showForm ? "Cancel" : "+ Connect Exchange"}
        </button>
      </div>

      {/* Connect form */}
      {showForm && (
        <div style={{...card,padding:24,marginBottom:24}}>
          <h2 style={{color:"var(--text)",fontSize:15,fontWeight:600,margin:"0 0 16px"}}>New Connection</h2>
          <form onSubmit={handleConnect} style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={{color:"var(--text-muted)",fontSize:13}}>Exchange</label>
                <select value={form.exchange} onChange={e=>setForm(f=>({...f,exchange:e.target.value as any}))} style={inp}>
                  <option value="BINANCE">Binance (USDT-M Futures)</option>
                  <option value="BYBIT">Bybit (Unified / Contract)</option>
                  <option value="OKX">OKX (Swap / Futures)</option>
                </select>
              </div>
              <div>
                <label style={{color:"var(--text-muted)",fontSize:13}}>Label (optional)</label>
                <input value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} placeholder="My main account" style={inp} />
              </div>
            </div>
            <div>
              <label style={{color:"var(--text-muted)",fontSize:13}}>API Key</label>
              <input required value={form.apiKey} onChange={e=>setForm(f=>({...f,apiKey:e.target.value}))} style={{...inp,fontFamily:"monospace"}} placeholder="Paste API key…" />
            </div>
            <div>
              <label style={{color:"var(--text-muted)",fontSize:13}}>API Secret</label>
              <input required type="password" value={form.apiSecret} onChange={e=>setForm(f=>({...f,apiSecret:e.target.value}))} style={{...inp,fontFamily:"monospace"}} placeholder="Paste API secret…" />
            </div>
            {form.exchange === "OKX" && (
              <div>
                <label style={{color:"var(--text-muted)",fontSize:13}}>Passphrase <span style={{color:"var(--text-faint)"}}>— set when you created the key</span></label>
                <input required={form.exchange==="OKX"} type="password" value={form.passphrase} onChange={e=>setForm(f=>({...f,passphrase:e.target.value}))} style={{...inp,fontFamily:"monospace"}} placeholder="OKX API passphrase…" />
              </div>
            )}
            <div style={{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:8,padding:"12px 16px",fontSize:12,color:"rgba(147,197,253,1)"}}>
              <p style={{margin:"0 0 4px",fontWeight:600}}>Required permissions</p>
              <p style={{margin:0,color:"rgba(147,197,253,0.7)"}}>Enable: <b>Futures Trading</b> + <b>Read Info</b>. Do NOT enable Withdrawals. Disable IP restriction or whitelist your IP. OKX also requires a <b>Passphrase</b> you set when creating the key.</p>
            </div>
            {error && <p style={{color:"var(--loss)",fontSize:13,margin:0}}>{error}</p>}
            <button type="submit" disabled={submitting}
              style={{padding:"10px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",fontSize:14,fontWeight:500,cursor:"pointer",opacity:submitting?0.6:1}}>
              {submitting?"Connecting…":"Connect"}
            </button>
          </form>
        </div>
      )}

      {/* Connection cards */}
      {connections.length === 0 && !showForm ? (
        <div style={{...card,padding:60,textAlign:"center"}}>
          <p style={{color:"var(--text-muted)",margin:0}}>No exchanges connected.</p>
          <p style={{color:"var(--text-faint)",fontSize:13,marginTop:8}}>Add a Binance or Bybit API key to get started.</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {connections.map(conn => {
            const live = liveData[conn.id];
            const hasWithdraw = conn.hasWithdrawPermission || live?.data?.canWithdraw;
            return (
              <div key={conn.id} style={{...card,padding:20,borderColor:hasWithdraw?"rgba(245,158,11,0.4)":"var(--border)"}}>
                {/* Header */}
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:44,height:44,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,
                                 background:conn.exchange==="BINANCE"?"rgba(234,179,8,0.15)":conn.exchange==="OKX"?"rgba(59,130,246,0.15)":"rgba(249,115,22,0.15)",
                                 color:conn.exchange==="BINANCE"?"#eab308":conn.exchange==="OKX"?"#3b82f6":"#f97316"}}>
                      {conn.exchange==="BINANCE"?"BNB":conn.exchange==="OKX"?"OKX":"BBT"}
                    </div>
                    <div>
                      <p style={{color:"var(--text)",fontWeight:500,fontSize:14,margin:0}}>{conn.label}</p>
                      <p style={{color:"var(--text-faint)",fontSize:12,margin:"2px 0 0"}}>{conn.exchange} · Added {new Date(conn.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {hasWithdraw && <Badge variant="yellow">⚠ Withdraw enabled</Badge>}
                    <Badge variant={live?.data ? "green" : live?.error ? "red" : "default"}>
                      {live?.loading ? "Connecting…" : live?.data ? "Live" : live?.error ? "Error" : "—"}
                    </Badge>
                    <button onClick={()=>handleDisconnect(conn.id)}
                      style={{background:"none",border:"none",color:"var(--text-faint)",fontSize:12,cursor:"pointer",padding:"4px 8px"}}>
                      Disconnect
                    </button>
                  </div>
                </div>

                {hasWithdraw && (
                  <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#fbbf24"}}>
                    ⚠ This API key has withdrawal permissions. Create a new key with Futures Trading + Read only.
                  </div>
                )}

                {live?.loading && (
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",color:"var(--text-faint)",fontSize:13}}>
                    <Spinner size="sm" /> Fetching account data…
                  </div>
                )}

                {live?.error && (
                  <div style={{background:"rgba(234,57,67,0.08)",border:"1px solid rgba(234,57,67,0.2)",borderRadius:8,padding:"10px 14px",fontSize:12,color:"var(--loss)"}}>
                    {live.error}
                  </div>
                )}

                {live?.data && (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                    <StatCard label="Wallet Balance" value={`$${live.data.totalWalletBalance.toFixed(2)}`} />
                    <StatCard label="Available" value={`$${live.data.availableBalance.toFixed(2)}`} />
                    <StatCard label="Unrealized PnL"
                      value={`${live.data.totalUnrealizedPnl>=0?"+":""}$${live.data.totalUnrealizedPnl.toFixed(2)}`}
                      positive={live.data.totalUnrealizedPnl>0} negative={live.data.totalUnrealizedPnl<0} />
                    <StatCard label="Margin Ratio" value={`${(live.data.marginRatio*100).toFixed(1)}%`}
                      negative={live.data.marginRatio>0.7} positive={live.data.marginRatio<0.3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{...card,padding:"14px 18px",marginTop:20,fontSize:13,color:"var(--text-faint)"}}>
        <span style={{color:"var(--text)",fontWeight:500}}>Security: </span>
        Keys are AES-256-GCM encrypted at rest. Balance checks run server-side. Trade execution is signed in your browser so exchange credentials never appear in server logs.
      </div>
    </div>
  );
}
