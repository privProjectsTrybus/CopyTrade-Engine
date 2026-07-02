// src/components/ui/Badge.tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "green" | "red" | "blue" | "yellow";
}

const VARIANTS = {
  default: "bg-zinc-800 text-zinc-300",
  green: "bg-profit/15 text-profit border border-profit/30",
  red: "bg-loss/15 text-loss border border-loss/30",
  blue: "bg-blue-600/15 text-blue-400 border border-blue-600/30",
  yellow: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${VARIANTS[variant]}`}>
      {children}
    </span>
  );
}

// src/components/ui/Spinner.tsx
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" }[size];
  return (
    <div className={`${s} border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin`} />
  );
}
