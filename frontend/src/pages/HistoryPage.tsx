import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  History,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { getLetterColor } from "../lib/utils";
import { usePasswords } from "../hooks/usePasswords";
import { useClipboard } from "../hooks/useClipboard";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { useAutoLockOnHidden } from "../hooks/useAutoLockOnHidden";
import { useVisibilityLock } from "../hooks/useVisibilityLock";
import AppShell from "../components/layout/AppShell";
import TopNav from "../components/layout/TopNav";
import BottomNav from "../components/layout/BottomNav";
import ColoredPassword from "../components/ui/ColoredPassword";

interface Props {
  onLogout: () => void;
}

interface HistoryEntry {
  website: string;
  username: string;
  index: number;
  password: string;
  changed_at: string;
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }

  return new Date(isoDate).toLocaleDateString();
}

function HistoryRow({
  entry,
  visible,
  onToggle,
  onCopy,
  isCopied,
  onClick,
}: {
  entry: HistoryEntry;
  visible: boolean;
  onToggle: () => void;
  onCopy: () => void;
  isCopied: boolean;
  onClick: () => void;
}) {
  const letterColor = getLetterColor(entry.website[0] || "a");

  return (
    <div className="group relative bg-surface/50 backdrop-blur-sm border border-border-subtle rounded-2xl p-4 sm:p-5 hover:border-border hover:shadow-sm transition-all duration-200">
      <div className="flex items-start gap-3 sm:gap-4">
        <button
          onClick={onClick}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-sm hover:scale-105 transition-transform cursor-pointer"
          style={{ backgroundColor: letterColor }}
          aria-label={`View ${entry.website} in vault`}
        >
          {entry.website[0]?.toUpperCase() || "?"}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onClick}
              className="text-sm font-semibold text-text-primary truncate hover:text-brand-primary transition-colors cursor-pointer"
            >
              {entry.website}
            </button>
          </div>
          <p className="text-xs text-text-muted truncate mt-0.5">
            {entry.username}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 font-mono text-sm bg-surface-sunken rounded-lg px-3 py-2 border border-border-subtle min-w-0 overflow-hidden">
              {visible ? (
                <ColoredPassword password={entry.password} />
              ) : (
                <span className="text-text-muted tracking-widest">
                  {"•".repeat(12)}
                </span>
              )}
            </div>
            <button
              onClick={onToggle}
              aria-label={
                visible ? "Hide historical password" : "Show historical password"
              }
              className="p-2 rounded-xl text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-all duration-200 flex-shrink-0"
            >
              {visible ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            <button
              onClick={onCopy}
              aria-label="Copy historical password"
              className="p-2 rounded-xl text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-all duration-200 flex-shrink-0"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-success" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-2 sm:absolute sm:top-5 sm:right-5 sm:mt-0">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <time dateTime={entry.changed_at} title={new Date(entry.changed_at).toLocaleString()}>
              {formatRelativeTime(entry.changed_at)}
            </time>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage({ onLogout }: Props) {
  const navigate = useNavigate();
  const { passwords, loading, fetchPasswords } = usePasswords();
  const { copied, copy } = useClipboard();
  const [search, setSearch] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set()
  );

  useInactivityTimeout(onLogout);
  const { autoLockOnHidden } = useAutoLockOnHidden();
  useVisibilityLock(onLogout, autoLockOnHidden);

  useEffect(() => {
    fetchPasswords();
  }, [fetchPasswords]);

  const allHistory = useMemo(() => {
    const entries: HistoryEntry[] = [];
    for (const [website, creds] of Object.entries(passwords)) {
      creds.forEach((cred, index) => {
        if (cred.history) {
          for (const h of cred.history) {
            entries.push({
              website,
              username: cred.username,
              index,
              password: h.password,
              changed_at: h.changed_at,
            });
          }
        }
      });
    }
    entries.sort(
      (a, b) =>
        new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
    );
    return entries;
  }, [passwords]);

  const filtered = useMemo(() => {
    if (!search) return allHistory;
    const q = search.toLowerCase();
    return allHistory.filter(
      (e) =>
        e.website.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q)
    );
  }, [allHistory, search]);

  const toggleVisible = useCallback((key: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleNavigate = (page: string) => {
    if (page === "vault") navigate("/vault");
    else if (page === "dashboard") navigate("/dashboard");
    else if (page === "generator") navigate("/generator");
    else if (page === "settings") navigate("/settings");
    else if (page === "trash") navigate("/trash");
  };

  const navigateToItem = (website: string, index: number) => {
    navigate("/vault", { state: { selectItem: { website, index } } });
  };

  return (
    <AppShell
      topNav={
        <TopNav
          activePage="vault"
          onNavigate={handleNavigate}
          onLock={onLogout}
          onSearch={() => navigate("/vault")}
        />
      }
      bottomNav={
        <BottomNav activePage="vault" onNavigate={handleNavigate} />
      }
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/vault")}
            className="w-10 h-10 rounded-xl bg-surface-sunken/80 border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all flex-shrink-0"
            aria-label="Back to vault"
          >
            <ArrowLeft className="w-4.5 h-4.5" aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              Password History
            </h1>
            <p className="text-text-secondary mt-2 text-base">
              {allHistory.length === 0
                ? "No password changes recorded"
                : `${allHistory.length} ${allHistory.length === 1 ? "change" : "changes"} across your vault`}
            </p>
          </div>
        </div>

        {allHistory.length > 0 && (
          <div className="max-w-md">
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by website or username..."
                aria-label="Search password history"
                className="w-full bg-surface-sunken/50 border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/15 focus:bg-surface transition-all"
              />
            </div>
          </div>
        )}

        {loading && allHistory.length === 0 && (
          <div
            className="flex items-center justify-center py-20"
            role="status"
            aria-label="Loading password history"
          >
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
            <span className="sr-only">Loading...</span>
          </div>
        )}

        {!loading && allHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-sunken flex items-center justify-center mb-5">
              <History className="w-8 h-8 text-text-muted/40" aria-hidden="true" />
            </div>
            <p className="text-lg font-medium text-text-muted">
              No password history yet
            </p>
            <p className="text-sm text-text-muted/70 mt-2 max-w-sm">
              When you change a password in your vault, the previous password
              will be recorded here. Up to 20 historical passwords are kept per
              credential.
            </p>
          </div>
        )}

        {filtered.length === 0 && search && allHistory.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <KeyRound className="w-10 h-10 text-text-muted/30 mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-text-muted">
              No results for &ldquo;{search}&rdquo;
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((entry) => {
              const key = `${entry.website}-${entry.index}-${entry.changed_at}`;
              return (
                <HistoryRow
                  key={key}
                  entry={entry}
                  visible={visiblePasswords.has(key)}
                  onToggle={() => toggleVisible(key)}
                  onCopy={() => copy(entry.password)}
                  isCopied={copied}
                  onClick={() => navigateToItem(entry.website, entry.index)}
                />
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}