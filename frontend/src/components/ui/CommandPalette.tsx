import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, KeyRound, FileText, File } from "lucide-react";
import { cn } from "../../lib/utils";
import type { VaultItem } from "../../types";
import { getLetterColor } from "../../lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: VaultItem[];
  onSelectItem: (item: VaultItem) => void;
  actions: { id: string; label: string; icon: ReactNode; action: () => void }[];
}

type ActionEntry = CommandPaletteProps["actions"][number];
type ResultEntry = ActionEntry | VaultItem;

function isAction(entry: ResultEntry): entry is ActionEntry {
  return "action" in entry;
}

export default function CommandPalette({
  open,
  onClose,
  items,
  onSelectItem,
  actions,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return items
      .filter((item) => {
        const keyMatch = item.key.toLowerCase().includes(q);
        if (item.type === "password") {
          return keyMatch || (item.credential?.username?.toLowerCase().includes(q) ?? false);
        }
        if (item.type === "note") {
          return keyMatch || (item.note?.content?.toLowerCase().includes(q) ?? false);
        }
        if (item.type === "file") {
          return keyMatch || (item.file?.original_name?.toLowerCase().includes(q) ?? false);
        }
        return keyMatch;
      })
      .slice(0, 8);
  }, [query, items]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [query, actions]);

  const totalResults: ResultEntry[] = useMemo(
    () => [...filteredActions, ...filteredItems],
    [filteredActions, filteredItems]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i < totalResults.length - 1 ? i + 1 : 0));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : totalResults.length - 1));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = totalResults[selectedIndex];
        if (selected) {
          if (isAction(selected)) {
            selected.action();
          } else {
            onSelectItem(selected);
          }
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, totalResults, selectedIndex, onClose, onSelectItem]);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const getItemIcon = (item: VaultItem) => {
    const color = getLetterColor(item.key[0] || "a");
    const Icon = item.type === "password" ? KeyRound : item.type === "note" ? FileText : File;
    return (
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + "20", color }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative w-full max-w-lg bg-surface-raised border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 border-b border-border-subtle">
              <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vault or type a command..."
                className="flex-1 bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              <kbd className="text-[10px] text-text-muted bg-surface-hover px-1.5 py-0.5 rounded font-mono">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
              {filteredActions.length > 0 && (
                <>
                  {query.trim() === "" && (
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted px-4 py-1.5">
                      Actions
                    </p>
                  )}
                  {filteredActions.map((action, i) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.action();
                        onClose();
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                        i === selectedIndex
                          ? "bg-accent-muted text-accent-text"
                          : "text-text-secondary hover:bg-surface-hover"
                      )}
                    >
                      <span className="w-7 h-7 rounded-md flex items-center justify-center bg-surface-hover flex-shrink-0">
                        {action.icon}
                      </span>
                      <span className="flex-1 text-left">{action.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                    </button>
                  ))}
                </>
              )}

              {filteredItems.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted px-4 py-1.5 mt-1">
                    Vault
                  </p>
                  {filteredItems.map((item, i) => {
                    const idx = filteredActions.length + i;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectItem(item);
                          onClose();
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                          idx === selectedIndex
                            ? "bg-accent-muted text-accent-text"
                            : "text-text-secondary hover:bg-surface-hover"
                        )}
                      >
                        {getItemIcon(item)}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm truncate">{item.key}</p>
                          <p className="text-xs text-text-muted truncate">
                            {item.type === "password"
                              ? item.credential?.username
                              : item.type === "note"
                              ? "Secure Note"
                              : item.file?.original_name}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      </button>
                    );
                  })}
                </>
              )}

              {query.trim() !== "" && totalResults.length === 0 && (
                <p className="text-sm text-text-muted text-center py-8">
                  No results found
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}