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
  success: <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
};

const borderMap: Record<ToastType, string> = {
  success: "border-green-600/20",
  error: "border-red-600/20",
  info: "border-blue-600/20",
};

const leftBorderMap: Record<ToastType, string> = {
  success: "border-l-2 border-l-green-500",
  error: "border-l-2 border-l-red-500",
  info: "border-l-2 border-l-blue-500",
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
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              layout
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className={`relative overflow-hidden flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg shadow-black/30 max-w-sm ${borderMap[t.type]} ${leftBorderMap[t.type]}`}
            >
              {iconMap[t.type]}
              <span className="text-sm text-zinc-300">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-auto text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 p-0.5 rounded"
              >
                <X className="w-4 h-4" />
              </button>
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 bg-current opacity-20"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 4, ease: "linear" }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
