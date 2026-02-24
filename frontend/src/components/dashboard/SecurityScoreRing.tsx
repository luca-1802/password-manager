interface SecurityScoreRingProps {
  score: number;
  size?: number;
}

export default function SecurityScoreRing({ score, size = 140 }: SecurityScoreRingProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return "#16a34a";
    if (score >= 60) return "#d4a843";
    if (score >= 40) return "#f59e0b";
    return "#dc2626";
  };

  const getLabel = () => {
    if (score >= 80) return "Strong";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#23232a"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-text-primary">{score}</span>
          <span className="text-[11px] text-text-muted">/ 100</span>
        </div>
      </div>
      <p className="text-sm font-medium" style={{ color: getColor() }}>{getLabel()}</p>
    </div>
  );
}