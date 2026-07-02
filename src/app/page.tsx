import Link from "next/link";

const FEATURES = [
  { icon: "⬡", title: "Copy Trading", desc: "Mirror professional traders with configurable position sizing, risk multipliers, and symbol filters." },
  { icon: "◈", title: "AI Strategies", desc: "4 built-in strategies: Trend Following, Momentum, Breakout, Mean Reversion. Full auto, semi-auto, or manual approval." },
  { icon: "⚠", title: "Risk Engine", desc: "Hard limits on per-trade risk, daily/weekly/monthly loss, and account exposure. Breaches auto-pause the engine." },
  { icon: "◉", title: "Portfolio Analytics", desc: "Sharpe ratio, Sortino ratio, max drawdown, equity curve, monthly returns, asset allocation — all computed from your trade history." },
];

const STATS = [
  { label: "Avg 30d ROI", value: "+18.4%" },
  { label: "Traders Available", value: "12" },
  { label: "Risk Checks/Trade", value: "7" },
];

const PRICING = [
  { name: "Free", price: "$0", features: ["1 exchange connection", "Copy up to 3 traders", "Manual AI signals", "Basic portfolio stats"], cta: "Get started", href: "/register" },
  { name: "Pro", price: "$29/mo", features: ["3 exchange connections", "Unlimited copy traders", "Semi-auto AI signals", "Full analytics", "Email + Telegram alerts"], cta: "Start free trial", href: "/register", highlight: true },
  { name: "Elite", price: "$79/mo", features: ["Unlimited connections", "Priority signal feed", "Full-auto AI execution", "Advanced risk controls", "Discord + all channels"], cta: "Contact us", href: "/register" },
];

const FAQ = [
  { q: "Is my exchange API key safe?", a: "Keys are encrypted with AES-256-GCM before storage. Trade execution is signed in your browser — your secrets never pass through our servers." },
  { q: "Does it trade when my browser is closed?", a: "No. The copy engine runs in your browser tab. This is by design: it avoids paid server infrastructure and keeps you in control. Open the dashboard to run the engine." },
  { q: "Which exchanges are supported?", a: "Binance USDT-M Futures and Bybit V5 Unified. More exchanges can be added as the ExchangeClient interface is standardised." },
  { q: "What happens when a risk limit is breached?", a: "The engine pauses immediately, logs the breach, sends notifications, and requires you to manually resume from the Risk Settings page." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur z-10">
        <span className="font-bold tracking-widest uppercase text-sm">Copy<span className="text-blue-500">Trade</span> Engine</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-zinc-400 hover:text-white text-sm transition-colors">Sign in</Link>
          <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 rounded-full px-4 py-1.5 text-blue-400 text-sm mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Personal crypto copy trading platform
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
          Copy professional traders.<br />
          <span className="text-blue-500">Risk-first.</span>
        </h1>
        <p className="text-zinc-400 text-lg mt-6 max-w-2xl mx-auto">
          Mirror top Binance and Bybit traders with automatic position sizing, 7-layer risk protection, and AI-assisted strategies — all executed from your browser.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-base font-medium transition-colors">
            Start for free
          </Link>
          <Link href="/login" className="border border-zinc-700 hover:bg-zinc-900 text-white px-6 py-3 rounded-xl text-base transition-colors">
            Sign in
          </Link>
        </div>

        {/* Stat strip */}
        <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {STATS.map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-3">
              <p className="text-blue-400 text-2xl font-bold">{s.value}</p>
              <p className="text-zinc-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Mock terminal */}
        <div className="mt-16 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-left max-w-2xl mx-auto font-mono text-sm">
          <div className="flex gap-1.5 mb-4">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="space-y-1.5 text-xs">
            <p><span className="text-zinc-600">00:01</span> <span className="text-profit">ENGINE_STARTED</span> <span className="text-zinc-400">polling every 5s</span></p>
            <p><span className="text-zinc-600">00:06</span> <span className="text-blue-400">SIGNAL_DETECTED</span> <span className="text-zinc-300">AlphaWave → BTCUSDT LONG</span></p>
            <p><span className="text-zinc-600">00:06</span> <span className="text-zinc-500">RISK_CHECK</span> <span className="text-zinc-400">7/7 passed · notional $340 · risk 0.8%</span></p>
            <p><span className="text-zinc-600">00:06</span> <span className="text-profit">TRADE_EXECUTED</span> <span className="text-zinc-300">BTCUSDT LONG 0.005 @ $67,412</span></p>
            <p><span className="text-zinc-600">00:06</span> <span className="text-zinc-500">SL_ATTACHED</span> <span className="text-zinc-400">$65,000 · TP $72,000</span></p>
            <p><span className="text-zinc-600">04:22</span> <span className="text-profit">POSITION_CLOSED</span> <span className="text-zinc-300">BTCUSDT +$23.40 (6.9%)</span></p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-6 transition-colors">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-white font-semibold text-lg">{f.title}</h3>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">Pricing</h2>
          <p className="text-zinc-500 text-center mb-12">Start free, upgrade when you're ready.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING.map(p => (
              <div key={p.name} className={`rounded-xl p-6 flex flex-col gap-4 border ${p.highlight ? "bg-blue-600/10 border-blue-600/40" : "bg-zinc-900 border-zinc-800"}`}>
                <div>
                  <p className="text-zinc-400 text-sm">{p.name}</p>
                  <p className="text-white text-3xl font-bold mt-1">{p.price}</p>
                </div>
                <ul className="space-y-2 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="text-profit mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.href}
                  className={`block text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${p.highlight ? "bg-blue-600 hover:bg-blue-500 text-white" : "border border-zinc-700 hover:bg-zinc-800 text-white"}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20 border-t border-zinc-800">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-4">
            {FAQ.map(f => (
              <div key={f.q} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-white font-medium">{f.q}</p>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8 text-center">
        <p className="text-zinc-600 text-sm">CopyTrade Engine — personal use only. Not financial advice. Trade at your own risk.</p>
        <div className="flex justify-center gap-6 mt-4 text-zinc-600 text-sm">
          <Link href="/login" className="hover:text-zinc-400">Sign in</Link>
          <Link href="/register" className="hover:text-zinc-400">Register</Link>
          <Link href="/dashboard" className="hover:text-zinc-400">Dashboard</Link>
        </div>
      </footer>
    </div>
  );
}
