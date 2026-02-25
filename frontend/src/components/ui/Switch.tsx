import { cn } from "../../lib/utils";
import styles from "../../styles/effects.module.scss";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export default function Switch({
  checked,
  onChange,
  disabled = false,
  className,
  label,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-accent" : "bg-surface-hover",
        styles.switchGlow,
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-300",
          checked
            ? "translate-x-[22px] scale-110"
            : "translate-x-[3px] scale-100"
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />
    </button>
  );
}