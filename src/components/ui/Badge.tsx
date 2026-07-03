interface BadgeProps { children: React.ReactNode; variant?: "default"|"green"|"red"|"blue"|"yellow"; }
const STYLES: Record<string, React.CSSProperties> = {
  default: { background:"var(--bg-hover)", color:"var(--text-muted)" },
  green:   { background:"rgba(22,199,132,0.15)", color:"var(--profit)", border:"1px solid rgba(22,199,132,0.3)" },
  red:     { background:"rgba(234,57,67,0.15)",  color:"var(--loss)",   border:"1px solid rgba(234,57,67,0.3)" },
  blue:    { background:"rgba(59,130,246,0.15)", color:"var(--accent)", border:"1px solid rgba(59,130,246,0.3)" },
  yellow:  { background:"rgba(245,158,11,0.15)", color:"#f59e0b",       border:"1px solid rgba(245,158,11,0.3)" },
};
export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span style={{ ...STYLES[variant], display:"inline-flex", alignItems:"center",
                   padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:500 }}>
      {children}
    </span>
  );
}
export function Spinner({ size = "md" }: { size?: "sm"|"md"|"lg" }) {
  const s = { sm:16, md:24, lg:32 }[size];
  return (
    <div style={{ width:s, height:s, border:"2px solid var(--border)",
                  borderTop:"2px solid var(--accent)", borderRadius:"50%",
                  animation:"spin 0.8s linear infinite" }} />
  );
}
