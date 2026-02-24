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
  { key: "veryWeak", label: "Very Weak", color: "#dc2626" },
  { key: "weak", label: "Weak", color: "#f59e0b" },
  { key: "fair", label: "Fair", color: "#eab308" },
  { key: "good", label: "Good", color: "#22c55e" },
  { key: "strong", label: "Strong", color: "#d4a843" },
] as const;

export default function StrengthDistribution({ distribution, total }: StrengthDistributionProps) {
  if (total === 0) {
    return (
      <div className="text-sm text-text-muted text-center py-4">
        No passwords to analyze
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-surface-sunken">
        {segments.map(({ key, color }) => {
          const count = distribution[key];
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={key}
              style={{ width: `${pct}%`, backgroundColor: color }}
              className="transition-all duration-500"
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {segments.map(({ key, label, color }) => {
          const count = distribution[key];
          if (count === 0) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-text-secondary">
                {label}: {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}