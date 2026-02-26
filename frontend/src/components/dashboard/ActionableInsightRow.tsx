import { useState } from "react";
import { AlertTriangle, Info, ChevronDown, ChevronRight, ShieldAlert, KeyRound, Copy } from "lucide-react";
import { cn } from "../../lib/utils";
import { getLetterColor } from "../../lib/utils";

export interface InsightDetail {
  label: string;
  sublabel?: string;
  meta?: string;
  onClick?: () => void;
}

interface ActionableInsightRowProps {
  id?: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  count: number;
  onAction: () => void;
  details?: InsightDetail[];
}

const severityConfig = {
  critical: { 
    icon: ShieldAlert, 
    color: "text-red-500", 
    bg: "bg-red-500/10", 
    border: "border-red-500/20",
    hover: "hover:bg-red-500/20"
  },
  warning: { 
    icon: AlertTriangle, 
    color: "text-amber-500", 
    bg: "bg-amber-500/10", 
    border: "border-amber-500/20",
    hover: "hover:bg-amber-500/20"
  },
  info: { 
    icon: Info, 
    color: "text-blue-500", 
    bg: "bg-blue-500/10", 
    border: "border-blue-500/20",
    hover: "hover:bg-blue-500/20"
  },
};

export default function ActionableInsightRow({
  id,
  severity,
  title,
  description,
  count,
  onAction,
  details,
}: ActionableInsightRowProps) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[severity];
  
  let Icon = config.icon;
  if (id === "weak") Icon = KeyRound;
  if (id === "reused") Icon = Copy;
  
  const hasDetails = details && details.length > 0;

  return (
    <div className={cn("rounded-xl border overflow-hidden transition-all duration-200", expanded ? "shadow-md" : "shadow-sm", config.bg, config.border)}>
      <div
        className={cn(
          "flex items-center gap-3 px-3.5 py-3",
          hasDetails && "cursor-pointer"
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className={cn("p-2 rounded-lg", config.bg)}>
          <Icon className={cn("w-4 h-4 flex-shrink-0", config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">{title}</p>
            <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded-full", config.bg, config.color)}>
              {count}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className="text-sm font-medium text-brand-primary hover:text-brand-primary/80 px-3 py-1.5 rounded-lg hover:bg-brand-primary/10 transition-colors"
          >
            Review
          </button>
          
          {hasDetails && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className={cn("p-1.5 rounded-lg text-text-muted transition-colors", config.hover)}
            >
              {expanded
                ? <ChevronDown className="w-5 h-5" />
                : <ChevronRight className="w-5 h-5" />
              }
            </button>
          )}
        </div>
      </div>

      {hasDetails && expanded && (
        <div className="border-t border-border/40 bg-surface-raised/50 p-2">
          <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1 space-y-1">
            {details.map((d, i) => {
              const letterColor = getLetterColor(d.label[0] || "a");
              return (
                <div
                  key={i}
                  onClick={d.onClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors group",
                    d.onClick && "cursor-pointer"
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: letterColor }}
                  >
                    {d.label[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate group-hover:text-brand-primary transition-colors">{d.label}</p>
                    {d.sublabel && (
                      <p className="text-xs text-text-muted truncate">{d.sublabel}</p>
                    )}
                  </div>
                  {d.meta && (
                    <span className={cn("text-xs font-medium px-2 py-1 rounded-md", config.bg, config.color)}>
                      {d.meta}
                    </span>
                  )}
                  {d.onClick && (
                    <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
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