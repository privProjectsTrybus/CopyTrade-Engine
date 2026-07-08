"use client";
// Shared component library — single import point

import React from "react";

// ── Toggle ──────────────────────────────────────────────────
export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`toggle-track ${checked ? "on" : ""}`}
      style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <span className="toggle-thumb" />
    </button>
  );
}

// ── Badge ───────────────────────────────────────────────────
type BadgeVariant = "default" | "green" | "red" | "indigo" | "warn";
export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: BadgeVariant }) {
  const cls = { default: "badge-default", green: "badge-green", red: "badge-red", indigo: "badge-indigo", warn: "badge-warn" }[variant];
  return <span className={`badge ${cls}`}>{children}</span>;
}

// ── Spinner ─────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: "2px solid var(--border-2)",
      borderTop: "2px solid var(--accent)",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

// ── StatCard ────────────────────────────────────────────────
export function StatCard({ label, value, sub, positive, negative }: {
  label: string; value: string | number; sub?: string; positive?: boolean; negative?: boolean;
}) {
  const color = positive ? "var(--profit)" : negative ? "var(--loss)" : "var(--text)";
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value mono" style={{ color }}>{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────
export function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`t-card ${className}`} style={style}>{children}</div>;
}

// ── Button ──────────────────────────────────────────────────
type BtnVariant = "primary" | "ghost" | "danger" | "success";
export function Button({ children, onClick, variant = "ghost", disabled, size, href, target, className = "", style }: {
  children: React.ReactNode; onClick?: () => void; variant?: BtnVariant; disabled?: boolean;
  size?: "sm" | "lg"; href?: string; target?: string; className?: string; style?: React.CSSProperties;
}) {
  const cls = `btn btn-${variant} ${size ? "btn-" + size : ""} ${className}`;
  if (href) return <a href={href} target={target} className={cls} style={style}>{children}</a>;
  return <button onClick={onClick} disabled={disabled} className={cls} style={style}>{children}</button>;
}

// ── Input ───────────────────────────────────────────────────
export function Input({ label, hint, type = "text", value, onChange, placeholder, required, style }: {
  label?: string; hint?: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 500 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="t-input" style={style} />
      {hint && <p style={{ color: "var(--text-faint)", fontSize: 11, lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

// ── Select ──────────────────────────────────────────────────
export function Select({ label, value, onChange, options, style }: {
  label?: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 500 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} className="t-input" style={style}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── ToggleRow ── for settings pages ─────────────────────────
export function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 0", borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ flex: 1, paddingRight: 20 }}>
        <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500 }}>{label}</p>
        {desc && <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ── TabBar ──────────────────────────────────────────────────
export function TabBar<T extends string>({ tabs, active, onChange }: {
  tabs: { value: T; label: string }[]; active: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{
      display: "inline-flex", gap: 2, background: "var(--bg-card-2)",
      padding: 3, borderRadius: "var(--r-md)", border: "1px solid var(--border)",
    }}>
      {tabs.map(t => (
        <button key={t.value} onClick={() => onChange(t.value)}
          style={{
            padding: "6px 16px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 500, transition: "all 0.15s",
            background: active === t.value ? "var(--accent)" : "transparent",
            color: active === t.value ? "#fff" : "var(--text-muted)",
          }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Keep backward compat for old imports
export { Spinner as default };
