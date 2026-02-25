import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let nextId = 0;

const iconMap: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" aria-hidden="true" />,
  error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />,
  info: <Info className="w-5 h-5 text-blue-500 shrink-0" aria-hidden="true" />,
};

const borderMap: Record<ToastType, string> = {
  success: "border-green-600/20",
  error: "border-red-600/20",
  info: "border-blue-600/20",
};

const glowMap: Record<ToastType, string> = {
  success: "shadow-green-500/10",
  error: "shadow-red-500/10",
  info: "shadow-blue-500/10",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions removals"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              layout
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`flex items-center gap-3 px-4 py-3 bg-surface-raised border border-border rounded-lg shadow-lg max-w-sm ${borderMap[t.type]} ${glowMap[t.type]} shadow-xl`}
            >
              {iconMap[t.type]}
              <span className="text-sm text-text-secondary">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-auto text-text-muted hover:text-text-secondary transition-colors shrink-0 p-0.5 rounded"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}