import { forwardRef, useState, useId, useEffect, useRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/utils";
import styles from "../../styles/effects.module.scss";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [shaking, setShaking] = useState(false);
    const prevError = useRef(error);
    const inputId = useId();
    const errorId = useId();
    const isPassword = type === "password";

    useEffect(() => {
      if (error && error !== prevError.current) {
        setShaking(true);
        const timer = setTimeout(() => setShaking(false), 500);
        return () => clearTimeout(timer);
      }
      prevError.current = error;
    }, [error]);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <div className={cn("relative", shaking && styles.shakeError)}>
          {icon && (
            <div
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-150",
                isFocused ? "text-text-secondary" : "text-text-muted"
              )}
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? "text" : type}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "w-full bg-surface-sunken border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20",
              "transition-colors duration-150",
              icon && "pl-10",
              isPassword && "pr-10",
              error && "border-red-600/50 focus:border-red-600/50 focus:ring-red-600/20",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors duration-150"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-red-500 mt-1.5" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;