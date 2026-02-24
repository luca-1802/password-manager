import { useState } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SearchBar({ value, onChange, className }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "flex items-center bg-zinc-900 border border-zinc-800 rounded-lg transition-all duration-200 focus-within:border-zinc-600",
        focused && "shadow-[0_0_0_3px_rgba(249,115,22,0.06)]"
      )}>
        <div className="pl-3 pr-2 flex items-center justify-center">
          <Search className={cn(
            "w-4 h-4 transition-all duration-200",
            focused ? "text-zinc-400 scale-110" : "text-zinc-500 scale-100"
          )} />
        </div>
        <input
          type="text"
          placeholder="Search vault..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent border-none py-2.5 pl-2 pr-10 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
        />
        <div className="absolute right-3 flex items-center">
          <AnimatePresence>
            {value ? (
              <motion.button
                initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                transition={{ duration: 0.15 }}
                onClick={() => onChange("")}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}