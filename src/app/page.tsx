import Link from "next/link";

const FEATURES = [
  { icon:"📡", title:"Live Signals", desc:"Real top traders from Binance & Bybit leaderboards. See their exact positions, leverage, and ROE in real time." },
  { icon:"🤖", title:"Auto Alerts", desc:"Telegram notifications the moment a top trader opens a new position. Never miss a signal." },
  { icon:"🧮", title:"Risk Calculator", desc:"Enter your balance and risk %, get exact position size and margin required before you trade." },
  { icon:"⚠", title:"Risk Engine", desc:"Hard limits on daily, weekly, and monthly losses. Engine pauses automatically on breach." },
  { icon:"◉", title:"AI Strategies", desc:"4 built-in strategies: Trend Following, Momentum, Breakout, Mean Reversion." },
  { icon:"◈", title:"Portfolio Analytics", desc:"Sharpe ratio, Sortino ratio, drawdown, equity curve — all from your actual trade history." },
];

const STEPS = [
  { n:"01", title:"Create account", desc:"Sign up in seconds. No exchange connection required to start." },
  { n:"02", title:"Browse signals", desc:"See real top traders and their live positions from Binance & Bybit leaderboards." },
  { n:"03", title:"Set up alerts", desc:"Add your Telegram bot. Get notified the moment a trader opens a position." },
  { n:"04", title:"Execute manually", desc:"Use the risk calculator to size your trade, then place it on Bybit yourself." },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)" }}>
      {/* Nav */}
      <nav style={{ borderBottom:"1px solid var(--border)", padding:"0 40px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"rgba(10,10,15,0.85)", backdropFilter:"blur(12px)", zIndex:20 }}>
        <div>
          <span style={{ fontWeight:800, fontSize:16 }}>Copy</span>
          <span style={{ fontWeight:800, fontSize:16, color:"var(--accent-light)" }}>Trade</span>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <Link href="/login" style={{ color:"var(--text-muted)", fontSize:13, textDecoration:"none", padding:"7px 14px", borderRadius:8, transition:"color 0.15s" }}>Sign in</Link>
          <Link href="/register" className="btn btn-primary" style={{ textDecoration:"none", fontSize:13, padding:"7px 16px" }}>Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding:"100px 40px 80px", textAlign:"center", maxWidth:800, margin:"0 auto" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:999, padding:"6px 16px", marginBottom:28, fontSize:12, color:"var(--accent-light)" }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent-light)", animation:"pulse 2s infinite", display:"inline-block" }} />
          Live data from Binance & Bybit leaderboards
        </div>
        <h1 style={{ fontSize:56, fontWeight:800, lineHeight:1.1, marginBottom:20, letterSpacing:"-0.02em" }}>
          Copy top traders.<br />
          <span style={{ background:"linear-gradient(135deg,var(--accent-light),var(--purple))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Stay in control.</span>
        </h1>
        <p style={{ color:"var(--text-muted)", fontSize:18, lineHeight:1.7, marginBottom:40, maxWidth:560, margin:"0 auto 40px" }}>
          See what the best Binance and Bybit futures traders are doing right now. Get Telegram alerts instantly. Calculate your position size. Execute manually with confidence.
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <Link href="/register" className="btn btn-primary" style={{ textDecoration:"none", fontSize:15, padding:"13px 28px" }}>Start for free</Link>
          <Link href="/login" className="btn btn-ghost" style={{ textDecoration:"none", fontSize:15, padding:"13px 24px" }}>Sign in</Link>
        </div>

        {/* Mock terminal */}
        <div style={{ marginTop:64, background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:16, padding:24, textAlign:"left", fontFamily:"monospace", fontSize:12 }}>
          <div style={{ display:"flex", gap:6, marginBottom:16 }}>
            {["#ff5f57","#ffbd2e","#28c840"].map(c=><span key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }} />)}
          </div>
          {[
            ["var(--profit)","AUTO-ALERT","AlphaWave opened BTCUSDT LONG · $67,412 · 3x · +4.2% ROE"],
            ["var(--accent-light)","SIGNAL","StellarMomentum → SOLUSDT LONG · Entry $172 · Lev 3x"],
            ["var(--text-faint)","CALC","Size: 0.0041 BTC · Margin: $91.80 · Risk: 1%"],
            ["var(--profit)","TELEGRAM","Alert sent to @CopyTradeV1_bot ✓"],
            ["var(--yellow)","SIGNAL","TideRider → BTCUSDT LONG · Entry $66,900 · Lev 1x"],
          ].map(([c,tag,msg],i)=>(
            <div key={i} style={{ display:"flex", gap:12, marginBottom:6 }}>
              <span style={{ color:"var(--text-faint)", minWidth:50 }}>{String(i).padStart(2,"0")}:{String(i*7+3).padStart(2,"0")}</span>
              <span style={{ color:c as string, minWidth:90, fontWeight:600 }}>{tag}</span>
              <span style={{ color:"var(--text-muted)" }}>{msg}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:"80px 40px", borderTop:"1px solid var(--border)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <h2 style={{ textAlign:"center", fontSize:36, fontWeight:800, marginBottom:12, letterSpacing:"-0.02em" }}>Everything you need</h2>
          <p style={{ textAlign:"center", color:"var(--text-muted)", marginBottom:52, fontSize:16 }}>Built for serious traders who want data without the noise.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
            {FEATURES.map(f=>(
              <div key={f.title} className="card card-interactive" style={{ padding:24 }}>
                <div style={{ fontSize:28, marginBottom:14 }}>{f.icon}</div>
                <p style={{ color:"var(--text)", fontWeight:600, fontSize:15, marginBottom:8 }}>{f.title}</p>
                <p style={{ color:"var(--text-muted)", fontSize:13, lineHeight:1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding:"80px 40px", borderTop:"1px solid var(--border)", background:"var(--bg-card)" }}>
        <div style={{ maxWidth:800, margin:"0 auto" }}>
          <h2 style={{ textAlign:"center", fontSize:36, fontWeight:800, marginBottom:52, letterSpacing:"-0.02em" }}>How it works</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {STEPS.map((s,i)=>(
              <div key={s.n} style={{ display:"flex", gap:24, paddingBottom:i<STEPS.length-1?40:0 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:"var(--accent-glow)", border:"1px solid rgba(99,102,241,0.3)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent-light)", fontWeight:800, fontSize:13 }}>{s.n}</div>
                  {i<STEPS.length-1&&<div style={{ width:1, flex:1, background:"var(--border)", margin:"8px 0" }} />}
                </div>
                <div style={{ paddingTop:10, paddingBottom:i<STEPS.length-1?0:0 }}>
                  <p style={{ color:"var(--text)", fontWeight:600, fontSize:15, marginBottom:6 }}>{s.title}</p>
                  <p style={{ color:"var(--text-muted)", fontSize:13, lineHeight:1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:"80px 40px", borderTop:"1px solid var(--border)", textAlign:"center" }}>
        <h2 style={{ fontSize:40, fontWeight:800, marginBottom:16, letterSpacing:"-0.02em" }}>Ready to start?</h2>
        <p style={{ color:"var(--text-muted)", fontSize:16, marginBottom:36 }}>Free to use. No exchange connection required.</p>
        <Link href="/register" className="btn btn-primary" style={{ textDecoration:"none", fontSize:15, padding:"14px 32px" }}>Create free account</Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:"1px solid var(--border)", padding:"24px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div><span style={{ fontWeight:700, fontSize:13 }}>Copy</span><span style={{ fontWeight:700, fontSize:13, color:"var(--accent-light)" }}>Trade</span></div>
        <p style={{ color:"var(--text-faint)", fontSize:12 }}>Not financial advice. Trade at your own risk.</p>
        <div style={{ display:"flex", gap:16 }}>
          {[["Sign in","/login"],["Register","/register"],["Dashboard","/dashboard"]].map(([l,h])=>(
            <Link key={h} href={h} style={{ color:"var(--text-faint)", fontSize:12, textDecoration:"none" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
