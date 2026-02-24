import { Lock, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../ui/Button";

interface Props {
  entryCount: number;
  onSettings: () => void;
  onLock: () => void;
}

export default function Header({
  entryCount,
  onSettings,
  onLock,
}: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-bg/95 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <motion.span
            initial={{ opacity: 0, letterSpacing: "0.3em" }}
            animate={{ opacity: 1, letterSpacing: "0.05em" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="font-mono text-sm font-medium text-zinc-300"
          >
            vault
          </motion.span>
          <AnimatePresence>
            {entryCount > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded font-mono"
              >
                {entryCount}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettings}
            icon={<Settings className="w-3.5 h-3.5" />}
            className="text-zinc-500"
          >
            Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLock}
            icon={<Lock className="w-3.5 h-3.5" />}
            className="text-zinc-500 hover:text-red-500"
          >
            Lock
          </Button>
        </div>
      </motion.div>
    </header>
  );
}
