import { forwardRef, useRef, useCallback, type ButtonHTMLAttributes, type ReactNode, type MouseEvent } from "react";
import { cn } from "../../lib/utils";
import styles from "../../styles/effects.module.scss";

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
      onMouseDown,
      ...props
    },
    ref
  ) => {
    const btnRef = useRef<HTMLButtonElement | null>(null);

    const handleMouseDown = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        const el = btnRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          el.style.setProperty("--ripple-x", `${e.clientX - rect.left}px`);
          el.style.setProperty("--ripple-y", `${e.clientY - rect.top}px`);
          el.classList.remove("rippling");

          void el.offsetWidth;
          el.classList.add("rippling");
          const cleanup = () => {
            el.classList.remove("rippling");
            el.removeEventListener("animationend", cleanup);
          };
          el.addEventListener("animationend", cleanup);
        }
        onMouseDown?.(e);
      },
      [onMouseDown]
    );

    const setRef = useCallback(
      (node: HTMLButtonElement | null) => {
        btnRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    return (
      <button
        ref={setRef}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium rounded-lg cursor-pointer transition-all duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.97]",
          variants[variant],
          sizes[size],
          styles.rippleBtn,
          className
        )}
        disabled={disabled || loading}
        onMouseDown={handleMouseDown}
        {...props}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        ) : icon ? (
          <span aria-hidden="true">{icon}</span>
        ) : null}
        <span className="flex items-center gap-2">{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;