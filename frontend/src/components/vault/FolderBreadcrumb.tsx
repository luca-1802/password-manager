import { ArrowLeft, ChevronRight, FolderOpen, Archive } from "lucide-react";
import type { FolderFilter } from "../../types";

interface FolderBreadcrumbProps {
  folder: FolderFilter;
  itemCount: number;
  onBack: () => void;
}

export default function FolderBreadcrumb({
  folder,
  itemCount,
  onBack,
}: FolderBreadcrumbProps) {
  const isUnfiled = folder === "unfiled";

  return (
    <div className="flex items-center gap-2.5 px-5 sm:px-8 py-3 border-b border-border-subtle bg-surface/70 backdrop-blur-xl sticky top-0 z-10">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors rounded-xl px-2.5 py-1.5 hover:bg-surface-hover -ml-1.5"
        aria-label="Back to all folders"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline font-medium">Vault</span>
      </button>

      <ChevronRight
        className="w-3.5 h-3.5 text-text-muted/50 flex-shrink-0"
        aria-hidden="true"
      />

      <div className="flex items-center gap-2 min-w-0">
        {isUnfiled ? (
          <div className="w-6 h-6 rounded-lg bg-surface-sunken flex items-center justify-center flex-shrink-0">
            <Archive className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-lg bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-3.5 h-3.5 text-brand-primary" aria-hidden="true" />
          </div>
        )}
        <span className="text-sm font-bold text-text-primary truncate">
          {isUnfiled ? "Unfiled" : folder}
        </span>
      </div>

      <span
        className="text-[11px] font-medium text-text-muted ml-auto flex-shrink-0 px-2.5 py-1 rounded-full bg-surface-sunken/70 border border-border-subtle"
        aria-live="polite"
      >
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </span>
    </div>
  );
}