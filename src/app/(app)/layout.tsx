"use client";
// src/app/(app)/layout.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { EngineProvider, useEngine } from "@/context/EngineContext";

function EngineStatus() {
  const { isRunning, isLoading, start, stop } = useEngine();

  if (isLoading) return <span className="text-zinc-500 text-xs">Loading…</span>;

  return (
    <button
      onClick={isRunning ? stop : start}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
        isRunning
          ? "border-profit/40 text-profit bg-profit/10 hover:bg-profit/20"
          : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-profit animate-pulse" : "bg-zinc-600"}`} />
      Engine {isRunning ? "Live" : "Offline"}
    </button>
  );
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "⬛" },
  { href: "/exchanges", label: "Exchanges", icon: "🔗" },
  { href: "/copy-trading", label: "Copy Trading", icon: "⬡" },
  { href: "/portfolio", label: "Portfolio", icon: "◈" },
  { href: "/ai-trading", label: "AI Trading", icon: "◉" },
  { href: "/settings", label: "Risk", icon: "⚠" },
  { href: "/notifications", label: "Alerts", icon: "🔔" },
  { href: "/admin", label: "Admin", icon: "◆" },
];

function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-52 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800">
        <span className="text-white font-bold text-sm tracking-widest uppercase">
          Copy<span className="text-blue-500">Trade</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {NAV.map((n) => {
          const active = path === n.href || path.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <span className="text-base leading-none">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-zinc-800 space-y-3">
        <EngineStatus />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-zinc-500 hover:text-white text-xs transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <EngineProvider>
      <div className="flex min-h-screen bg-black">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </EngineProvider>
  );
}
