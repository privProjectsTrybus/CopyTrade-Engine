// src/components/ui/StatCard.tsx
interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  positive?: boolean;
  negative?: boolean;
  className?: string;
}

export function StatCard({ label, value, subtext, positive, negative, className = "" }: StatCardProps) {
  const valueColor = positive ? "text-profit" : negative ? "text-loss" : "text-white";
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${className}`}>
      <p className="text-zinc-500 text-xs uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-semibold mt-1.5 ${valueColor}`}>{value}</p>
      {subtext && <p className="text-zinc-500 text-xs mt-1">{subtext}</p>}
    </div>
  );
}
