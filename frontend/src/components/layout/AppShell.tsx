import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface AppShellProps {
  topNav: ReactNode;
  bottomNav?: ReactNode;
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
  topNav,
  bottomNav,
  children,
  detailPanel,
  detailOpen = false,
  onDetailClose,
  className,
}: AppShellProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  return (
    <div className={cn("flex flex-col h-dvh overflow-hidden bg-background text-text-primary font-sans selection:bg-brand-primary/30 selection:text-brand-primary", className)}>
      {topNav}

      <div className="flex flex-1 overflow-hidden relative">
        <main id="main-content" className="flex-1 overflow-y-auto pb-16 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
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
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                  onClick={onDetailClose}
                  aria-hidden="true"
                />
              )}

              {isDesktop ? (
                <motion.aside
                  role="complementary"
                  aria-label="Item details"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 400, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full overflow-hidden border-l border-border-subtle bg-surface/95 backdrop-blur-xl flex-shrink-0 shadow-2xl z-30"
                >
                  <div className="w-[400px] h-full overflow-y-auto">
                    {detailPanel}
                  </div>
                </motion.aside>
              ) : (
                <motion.aside
                  role="complementary"
                  aria-label="Item details"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed right-0 top-0 h-full z-50 w-full sm:w-[400px] border-l border-border-subtle bg-surface/95 backdrop-blur-xl overflow-y-auto shadow-2xl"
                >
                  {detailPanel}
                </motion.aside>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
      
      {bottomNav}
    </div>
  );
}