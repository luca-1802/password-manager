import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  loading?: boolean;
}

const variants = {
  primary:
    "bg-orange-500 hover:bg-orange-600 text-white hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]",
  secondary:
    "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700",
  ghost: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50",
  danger:
    "bg-red-600/10 text-red-500 hover:bg-red-600/20 border border-red-600/20 hover:shadow-[0_0_15px_rgba(220,38,38,0.2)]",
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
          "inline-flex items-center justify-center gap-2 font-medium rounded-lg cursor-pointer transition-all duration-150 active:scale-[0.97]",
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
