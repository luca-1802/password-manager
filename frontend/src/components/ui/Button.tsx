import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent-ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  loading?: boolean;
}

const variants = {
  primary: "bg-accent hover:bg-accent-hover text-[#0a0a0b] font-semibold",
  secondary:
    "bg-surface-raised hover:bg-surface-hover text-text-secondary border border-border",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-hover",
  danger:
    "bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-600/20",
  "accent-ghost": "text-accent-text hover:text-accent hover:bg-accent-muted",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      icon,
      loading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium rounded-lg cursor-pointer transition-colors duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        <span className="flex items-center gap-2">{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;