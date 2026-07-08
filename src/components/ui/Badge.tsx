interface BadgeProps { children: React.ReactNode; variant?: "green"|"red"|"blue"|"yellow"|"purple"|"dim"; }
const MAP = { green:"badge-green", red:"badge-red", blue:"badge-blue", yellow:"badge-yellow", purple:"badge-purple", dim:"badge-dim" };
export function Badge({ children, variant = "dim" }: BadgeProps) {
  return <span className={`badge ${MAP[variant]}`}>{children}</span>;
}
export function Spinner({ size = "md" }: { size?: "sm"|"md"|"lg" }) {
  const s = { sm: 16, md: 24, lg: 36 }[size];
  return <div style={{ width:s, height:s, border:`2px solid var(--border-light)`, borderTop:`2px solid var(--accent)`, borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />;
}
