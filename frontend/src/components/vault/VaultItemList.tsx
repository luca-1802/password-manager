import { Search } from "lucide-react";
import type { VaultItem } from "../../types";
import VaultItemRow from "./VaultItemRow";
import EmptyState from "./EmptyState";
import Skeleton from "../ui/Skeleton";

interface VaultItemListProps {
  items: VaultItem[];
  selectedId: string | null;
  onSelect: (item: VaultItem) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenCommandPalette: () => void;
  getBreachCount: (website: string, index: number) => number | null;
  onAdd: () => void;
  loading?: boolean;
}

export default function VaultItemList({
  items,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  onOpenCommandPalette: _onOpenCommandPalette,
  getBreachCount,
  onAdd,
  loading = false,
}: VaultItemListProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-5 sm:px-8 py-4">
        <div className="relative max-w-xl">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search in folder..."
            aria-label="Search vault entries"
            className="w-full bg-surface-sunken/50 border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/15 focus:bg-surface transition-all"
          />
        </div>
      </div>

      <div className="flex-shrink-0 px-6 sm:px-9 pb-2.5">
        <p
          className="text-[11px] font-semibold text-text-muted uppercase tracking-widest"
          aria-live="polite"
          aria-atomic="true"
        >
          {items.length} {items.length === 1 ? "Item" : "Items"}
        </p>
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 sm:px-6 pb-4"
        role="list"
        aria-label="Vault items"
      >
        {loading ? (
          <div className="space-y-1.5 max-w-4xl mx-auto">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl"
              >
                <Skeleton width={42} height={42} borderRadius={14} />
                <div className="flex-1 space-y-2.5">
                  <Skeleton width="55%" height={15} />
                  <Skeleton width="35%" height={11} />
                </div>
                <Skeleton width={28} height={28} borderRadius={14} />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <EmptyState onAdd={onAdd} />
          </div>
        ) : (
          <div className="space-y-0.5 max-w-4xl mx-auto">
            {items.map((item) => (
              <VaultItemRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                onClick={() => onSelect(item)}
                breachCount={
                  item.type === "password"
                    ? getBreachCount(item.key, item.index)
                    : null
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}