"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { EngineProvider, useEngine } from "@/context/EngineContext";
import { useTheme } from "@/context/ThemeContext";

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    icon: "▦" },
  { href: "/signals",      label: "Signals",      icon: "📡" },
  { href: "/exchanges",    label: "Exchanges",    icon: "🔗" },
  { href: "/copy-trading", label: "Copy Trading", icon: "⬡" },
  { href: "/ai-trading",   label: "AI Trading",   icon: "◉" },
  { href: "/portfolio",    label: "Portfolio",    icon: "◈" },
  { href: "/settings",     label: "Risk",         icon: "⚠" },
  { href: "/notifications",label: "Alerts",       icon: "🔔" },
  { href: "/admin",        label: "Admin",        icon: "◆" },
];

function EngineStatus() {
  const { isRunning, isLoading, start, stop } = useEngine();
  if (isLoading) return <span style={{ color: "var(--text-faint)", fontSize: 12 }}>Loading…</span>;
  return (
    <button onClick={isRunning ? stop : start}
      style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, padding:"4px 10px",
               borderRadius:999, border:`1px solid ${isRunning ? "var(--profit)" : "var(--border)"}`,
               background: isRunning ? "rgba(22,199,132,0.1)" : "transparent",
               color: isRunning ? "var(--profit)" : "var(--text-muted)", cursor:"pointer" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background: isRunning ? "var(--profit)" : "var(--text-faint)",
                     animation: isRunning ? "pulse 2s infinite" : "none" }} />
      Engine {isRunning ? "Live" : "Offline"}
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} title="Toggle theme"
      style={{ fontSize:16, background:"none", border:"none", cursor:"pointer",
               color:"var(--text-muted)", padding:"4px 6px", borderRadius:6 }}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

function Sidebar() {
  const path = usePathname();
  return (
    <aside style={{ width:200, flexShrink:0, background:"var(--bg-card)", borderRight:"1px solid var(--border)",
                    display:"flex", flexDirection:"column", height:"100vh", position:"sticky", top:0 }}>
      <div style={{ padding:"20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontWeight:700, fontSize:13, letterSpacing:"0.1em", color:"var(--text)" }}>
          Copy<span style={{ color:"var(--accent)" }}>Trade</span>
        </span>
        <ThemeToggle />
      </div>

      <nav style={{ flex:1, padding:"8px", overflowY:"auto" }}>
        {NAV.map(n => {
          const active = path === n.href || path.startsWith(n.href + "/");
          return (
            <Link key={n.href} href={n.href} style={{
              display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
              borderRadius:8, marginBottom:2, textDecoration:"none", fontSize:13,
              background: active ? "rgba(59,130,246,0.15)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-muted)",
              border: active ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
              transition:"all 0.15s",
            }}>
              <span style={{ fontSize:14 }}>{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding:"12px 16px", borderTop:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:8 }}>
        <EngineStatus />
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ background:"none", border:"none", color:"var(--text-faint)", fontSize:12,
                   cursor:"pointer", textAlign:"left", padding:0 }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <EngineProvider>
      <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)" }}>
        <Sidebar />
        <main style={{ flex:1, overflowY:"auto" }}>{children}</main>
      </div>
    </EngineProvider>
  );
}
