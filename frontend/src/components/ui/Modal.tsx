import { useEffect, useRef, useId, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      const firstFocusable = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      firstFocusable?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab" && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";

      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open]);

  const transition = prefersReduced ? { duration: 0 } : { duration: 0.15, ease: "easeOut" as const };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : "Dialog"}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={contentRef}
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={transition}
            className={cn(
              "relative w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] bg-surface-raised border border-border rounded-xl flex flex-col overflow-hidden",
              className
            )}
          >
            {title && (
              <div className="flex items-center justify-between px-6 pt-5 pb-0 flex-shrink-0">
                <h2 id={titleId} className="text-lg font-semibold text-text-primary">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="text-text-muted hover:text-text-secondary p-1 rounded-lg hover:bg-surface-hover transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="p-6 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}