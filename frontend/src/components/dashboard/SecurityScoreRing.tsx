import { useCountUp } from "../../hooks/useCountUp";

interface SecurityScoreRingProps {
  score: number;
  size?: number;
}

export default function SecurityScoreRing({ score, size = 160 }: SecurityScoreRingProps) {
  const animatedScore = useCountUp(score, 1400);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#eab308";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };

  const getLabel = () => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  const color = getColor();

  return (
    <div className="flex flex-col items-center gap-4" role="img" aria-label={`Security score: ${score} out of 100, ${getLabel()}`}>
      <div className="relative drop-shadow-md" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 absolute inset-0" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-surface-sunken"
            strokeWidth={strokeWidth}
          />
        </svg>

        <svg width={size} height={size} className="-rotate-90 absolute inset-0 drop-shadow-sm" aria-hidden="true">
          <defs>
            <filter id="score-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-100 ease-linear"
            filter="url(#score-glow)"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-raised rounded-full m-[12px] shadow-inner border border-border/30">
          <span className="text-3xl font-bold text-text-primary tracking-tight tabular-nums">
            {animatedScore}
          </span>
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider mt-0.5">Score</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/50 bg-surface-sunken">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
        />
        <span className="text-sm font-semibold" style={{ color }}>{getLabel()}</span>
      </div>
    </div>
  );
}