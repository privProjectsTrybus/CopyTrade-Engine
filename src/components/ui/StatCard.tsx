interface StatCardProps {
  label: string; value: string | number;
  subtext?: string; positive?: boolean; negative?: boolean; className?: string;
}
export function StatCard({ label, value, subtext, positive, negative }: StatCardProps) {
  const color = positive ? "var(--profit)" : negative ? "var(--loss)" : "var(--text)";
  return (
    <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)",
                  borderRadius:12, padding:"14px 16px" }}>
      <p style={{ color:"var(--text-faint)", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</p>
      <p style={{ color, fontSize:22, fontWeight:600, marginTop:6 }}>{value}</p>
      {subtext && <p style={{ color:"var(--text-faint)", fontSize:11, marginTop:4 }}>{subtext}</p>}
    </div>
  );
}
