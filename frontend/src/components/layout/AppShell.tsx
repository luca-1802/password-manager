import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Lock } from "lucide-react";
import { cn } from "../../lib/utils";

interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  detailPanel?: ReactNode;
  detailOpen?: boolean;
  onDetailClose?: () => void;
  className?: string;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export default function AppShell({
  sidebar,
  children,
  detailPanel,
  detailOpen = false,
  onDetailClose,
  className,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isTabletUp = useMediaQuery("(min-width: 768px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    if (isTabletUp) setMobileMenuOpen(false);
  }, [isTabletUp]);

  return (
    <div className={cn("flex h-dvh overflow-hidden bg-bg", className)}>
      {!isTabletUp && (
        <div className="fixed top-0 left-0 right-0 h-12 bg-sidebar border-b border-border-subtle z-30 flex items-center px-3 gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center">
              <Lock className="w-3 h-3 text-accent" />
            </div>
            <span className="font-mono text-sm font-semibold text-text-primary tracking-wider">
              vault
            </span>
          </div>
        </div>
      )}

      {isTabletUp ? (
        sidebar
      ) : (
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black/60"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed inset-0 z-50"
              >
                {sidebar}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      <main className={cn("flex-1 overflow-y-auto", !isTabletUp && "pt-12")}>
        {children}
      </main>

      <AnimatePresence>
        {detailOpen && detailPanel && (
          <>
            {!isDesktop && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-30 bg-black/50"
                onClick={onDetailClose}
              />
            )}

            {isDesktop ? (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="h-screen overflow-hidden border-l border-border-subtle bg-surface flex-shrink-0"
              >
                <div className="w-[380px] h-full overflow-y-auto">
                  {detailPanel}
                </div>
              </motion.aside>
            ) : (
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="fixed right-0 top-0 h-full z-40 w-full sm:w-[380px] border-l border-border-subtle bg-surface overflow-y-auto"
              >
                {detailPanel}
              </motion.aside>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}