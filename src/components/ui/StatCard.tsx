interface StatCardProps {
  label: string; value: string | number;
  subtext?: string; positive?: boolean; negative?: boolean;
}
export function StatCard({ label, value, subtext, positive, negative }: StatCardProps) {
  const color = positive ? "var(--profit)" : negative ? "var(--loss)" : "var(--text)";
  return (
    <div className="stat-card animate-fade">
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color }}>{value}</p>
      {subtext && <p className="stat-sub">{subtext}</p>}
    </div>
  );
}
