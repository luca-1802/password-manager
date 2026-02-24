import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface BadgeProps {
  variant?: "default" | "success" | "danger" | "warning";
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantStyles = {
  default: "bg-surface-hover text-text-secondary border-border",
  success: "bg-green-600/10 text-green-500 border-green-600/20",
  danger: "bg-red-600/10 text-red-500 border-red-600/20",
  warning: "bg-amber-600/10 text-amber-500 border-amber-600/20",
};

export default function Badge({
  variant = "default",
  icon,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border",
        variantStyles[variant],
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}