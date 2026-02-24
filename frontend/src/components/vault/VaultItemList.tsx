import { Search } from "lucide-react";
import type { VaultItem } from "../../types";
import VaultItemRow from "./VaultItemRow";
import EmptyState from "./EmptyState";

interface VaultItemListProps {
  items: VaultItem[];
  selectedId: string | null;
  onSelect: (item: VaultItem) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenCommandPalette: () => void;
  getBreachCount: (website: string, index: number) => number | null;
}

export default function VaultItemList({
  items,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  onOpenCommandPalette,
  getBreachCount,
}: VaultItemListProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-3 py-3 border-b border-border-subtle">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search entries..."
            className="w-full bg-surface-sunken border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors"
          />
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-2 border-b border-border-subtle">
        <p className="text-[11px] text-text-muted">
          {items.length} {items.length === 1 ? "entry" : "entries"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <EmptyState onAdd={() => {}} />
        ) : (
          items.map((item) => (
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
          ))
        )}
      </div>
    </div>
  );
}