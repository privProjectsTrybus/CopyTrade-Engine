"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { EngineProvider, useEngine } from "@/context/EngineContext";
import { useTheme } from "@/context/ThemeContext";

const NAV = [
  { href:"/dashboard",    label:"Dashboard",     icon:"⬛" },
  { href:"/feed",         label:"Live Feed",     icon:"⚡" },
  { href:"/signals",      label:"Signals",       icon:"📡" },
  { href:"/journal",      label:"Journal",       icon:"📓" },
  { href:"/copy-trading", label:"Copy Trading",  icon:"⬡" },
  { href:"/ai-trading",   label:"AI Trading",    icon:"◉" },
  { href:"/portfolio",    label:"Portfolio",     icon:"◈" },
  { href:"/exchanges",    label:"Exchanges",     icon:"🔗" },
  { href:"/settings",     label:"Risk",          icon:"⚠" },
  { href:"/notifications",label:"Alerts",        icon:"🔔" },
  { href:"/admin",        label:"Admin",         icon:"◆" },
];

function EngineStatus() {
  const { isRunning, isLoading, start, stop } = useEngine();
  if (isLoading) return null;
  return (
    <button onClick={isRunning ? stop : start}
      style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, padding:"6px 12px",
               borderRadius:8, border:`1px solid ${isRunning?"rgba(0,212,160,0.3)":"var(--border)"}`,
               background: isRunning?"rgba(0,212,160,0.08)":"transparent",
               color: isRunning?"var(--profit)":"var(--text-faint)", cursor:"pointer",
               transition:"all 0.2s", width:"100%" }}>
      <div className={isRunning?"dot-live":"dot-offline"} />
      Engine {isRunning ? "Live" : "Offline"}
    </button>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <EngineProvider>
      <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)" }}>
        {/* Sidebar */}
        <aside style={{ width:210, flexShrink:0, background:"var(--bg-card)", borderRight:"1px solid var(--border)",
                        display:"flex", flexDirection:"column", height:"100vh", position:"sticky", top:0, zIndex:10 }}>
          {/* Logo */}
          <div style={{ padding:"20px 20px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <span style={{ fontWeight:800, fontSize:14, letterSpacing:"0.05em", color:"var(--text)" }}>Copy</span>
              <span style={{ fontWeight:800, fontSize:14, letterSpacing:"0.05em", color:"var(--accent-light)" }}>Trade</span>
            </div>
            <button onClick={toggle} title="Toggle theme"
              style={{ background:"none", border:"1px solid var(--border)", borderRadius:7, padding:"4px 7px",
                       cursor:"pointer", fontSize:14, color:"var(--text-muted)", transition:"all 0.15s" }}>
              {theme==="dark"?"☀":"🌙"}
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:"10px 10px", overflowY:"auto", display:"flex", flexDirection:"column", gap:2 }}>
            {NAV.map(n => {
              const active = path===n.href || path.startsWith(n.href+"/");
              return (
                <Link key={n.href} href={n.href}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:9,
                           textDecoration:"none", fontSize:13, fontWeight: active?600:400,
                           background: active?"var(--accent-glow)":"transparent",
                           color: active?"var(--accent-light)":"var(--text-muted)",
                           borderLeft: active?"3px solid var(--accent)":"3px solid transparent",
                           transition:"all 0.15s" }}>
                  <span style={{ fontSize:15, opacity: active?1:0.7 }}>{n.icon}</span>
                  {n.label}
                  {active && <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--accent)", marginLeft:"auto" }} />}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding:"14px", borderTop:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:8 }}>
            <EngineStatus />
            <button onClick={() => signOut({ callbackUrl:"/login" })}
              style={{ background:"none", border:"none", color:"var(--text-faint)", fontSize:12,
                       cursor:"pointer", textAlign:"left", padding:"4px 0", transition:"color 0.15s" }}
              onMouseOver={e => (e.currentTarget.style.color = "var(--loss)") }
              onMouseOut={e => (e.currentTarget.style.color = "var(--text-faint)")}>
              Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex:1, overflowY:"auto", minHeight:"100vh" }}>{children}</main>
      </div>
    </EngineProvider>
  );
}
