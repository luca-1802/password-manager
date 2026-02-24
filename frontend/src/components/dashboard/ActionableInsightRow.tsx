import { useState } from "react";
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { getLetterColor } from "../../lib/utils";

export interface InsightDetail {
  label: string;
  sublabel?: string;
  meta?: string;
  onClick?: () => void;
}

interface ActionableInsightRowProps {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  count: number;
  onAction: () => void;
  details?: InsightDetail[];
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: "text-danger", bg: "bg-red-600/10", border: "border-red-600/20" },
  warning: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-600/10", border: "border-amber-600/20" },
  info: { icon: Info, color: "text-info", bg: "bg-blue-600/10", border: "border-blue-600/20" },
};

export default function ActionableInsightRow({
  severity,
  title,
  description,
  count,
  onAction,
  details,
}: ActionableInsightRowProps) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[severity];
  const Icon = config.icon;
  const hasDetails = details && details.length > 0;

  return (
    <div className={cn("rounded-lg border", config.bg, config.border)}>
      <div
        className={cn(
          "flex items-center gap-3 p-3",
          hasDetails && "cursor-pointer"
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <Icon className={cn("w-4 h-4 flex-shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{title}</p>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", config.bg, config.color)}>
          {count}
        </span>
        {hasDetails ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors"
          >
            {expanded
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />
            }
          </button>
        ) : (
          <button
            onClick={onAction}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {hasDetails && expanded && (
        <div className="border-t border-border/40 px-3 pb-3">
          <div className="mt-2 space-y-1">
            {details.map((d, i) => {
              const letterColor = getLetterColor(d.label[0] || "a");
              return (
                <div
                  key={i}
                  onClick={d.onClick}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-hover/50 transition-colors",
                    d.onClick && "cursor-pointer"
                  )}
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-white text-[10px] font-semibold"
                    style={{ backgroundColor: letterColor }}
                  >
                    {d.label[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{d.label}</p>
                    {d.sublabel && (
                      <p className="text-[11px] text-text-muted truncate">{d.sublabel}</p>
                    )}
                  </div>
                  {d.meta && (
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", config.bg, config.color)}>
                      {d.meta}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}