import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, direction: "below" as "below" | "above" });

  const selectedOption = options.find((o) => o.value === value);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const maxH = 240;
    const direction = spaceBelow < maxH && spaceAbove > spaceBelow ? "above" : "below";

    setPos({
      top: direction === "below" ? rect.bottom + 4 : rect.top - 4,
      left: rect.left,
      width: rect.width,
      direction,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
          setHighlightIndex(options.findIndex((o) => o.value === value));
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((i) => Math.min(i + 1, options.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < options.length) {
            onChange(options[highlightIndex]!.value);
            setOpen(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          break;
      }
    },
    [open, highlightIndex, options, onChange, value]
  );

  useEffect(() => {
    if (!open || highlightIndex < 0) return;
    const item = listRef.current?.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setHighlightIndex(options.findIndex((o) => o.value === value));
          }
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full flex items-center justify-between bg-surface-raised border border-border rounded-lg px-3 py-2.5 text-sm text-left cursor-pointer",
          "focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20",
          "transition-colors duration-150",
          open && "border-accent/40 ring-1 ring-accent/20",
          className
        )}
      >
        <span className={cn(selectedOption ? "text-text-primary" : "text-text-muted")}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon}
              {selectedOption.label}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-text-muted transition-transform duration-150 flex-shrink-0 ml-2",
            open && "rotate-180"
          )}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            onKeyDown={handleKeyDown}
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              ...(pos.direction === "below"
                ? { top: pos.top }
                : { bottom: window.innerHeight - pos.top }),
              zIndex: 9999,
            }}
            className="bg-surface-raised border border-border rounded-lg shadow-xl overflow-y-auto max-h-[min(240px,40vh)] overscroll-contain"
          >
            {options.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setHighlightIndex(i)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors duration-75 cursor-pointer",
                  i === highlightIndex && "bg-surface-hover",
                  opt.value === value
                    ? "text-accent-text"
                    : "text-text-primary"
                )}
              >
                {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.value === value && (
                  <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}