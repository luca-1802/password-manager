import { useCountUp } from "../../hooks/useCountUp";

interface StrengthDistributionProps {
  distribution: {
    veryWeak: number;
    weak: number;
    fair: number;
    good: number;
    strong: number;
  };
  total: number;
}

const segments = [
  { key: "veryWeak", label: "Very Weak", color: "#dc2626", bg: "bg-red-500/10", text: "text-red-500" },
  { key: "weak", label: "Weak", color: "#f59e0b", bg: "bg-amber-500/10", text: "text-amber-500" },
  { key: "fair", label: "Fair", color: "#eab308", bg: "bg-yellow-500/10", text: "text-yellow-500" },
  { key: "good", label: "Good", color: "#22c55e", bg: "bg-green-500/10", text: "text-green-500" },
  { key: "strong", label: "Strong", color: "#10b981", bg: "bg-emerald-500/10", text: "text-emerald-500" },
] as const;

function AnimatedCount({ value, className }: { value: number; className: string }) {
  const animated = useCountUp(value, 800);
  return <span className={className}>{animated}</span>;
}

export default function StrengthDistribution({ distribution, total }: StrengthDistributionProps) {
  if (total === 0) {
    return (
      <div className="text-sm text-text-muted text-center py-6 bg-surface-sunken rounded-xl border border-border/50">
        No passwords to analyze
      </div>
    );
  }

  return (
    <div className="space-y-5" role="img" aria-label={`Password strength distribution: ${segments.map(s => `${s.label}: ${distribution[s.key]}`).join(", ")}`}>
      <div className="flex h-4 rounded-full overflow-hidden bg-surface-sunken border border-border/50" aria-hidden="true">
        {segments.map(({ key, color }) => {
          const count = distribution[key];
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={key}
              style={{ width: `${pct}%`, backgroundColor: color }}
              className="transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full border-r border-surface-raised last:border-r-0"
              title={`${segments.find(s => s.key === key)?.label}: ${count}`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {segments.map(({ key, label, color, bg, text }) => {
          const count = distribution[key];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={key} className={`flex flex-col p-3 rounded-xl border border-border/50 transition-all duration-300 hover:scale-[1.02] ${count > 0 ? bg : 'bg-surface-sunken opacity-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: color, boxShadow: count > 0 ? `0 0 6px ${color}40` : "none" }}
                />
                <span className="text-xs font-medium text-text-secondary">
                  {label}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <AnimatedCount
                  value={count}
                  className={`text-lg font-semibold tabular-nums ${count > 0 ? text : 'text-text-muted'}`}
                />
                <span className="text-xs text-text-muted">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}