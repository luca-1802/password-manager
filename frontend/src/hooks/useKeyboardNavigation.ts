import { useEffect } from "react";
import type { VaultItem } from "../types";

export function useKeyboardNavigation(
  items: VaultItem[],
  selectedItem: VaultItem | null,
  onSelect: (item: VaultItem) => void,
  onClear: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (items.length === 0) return;

        const currentIndex = selectedItem
          ? items.findIndex((item) => item.id === selectedItem.id)
          : -1;

        let nextIndex: number;
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }

        onSelect(items[nextIndex]!);
      }

      if (e.key === "Escape") {
        onClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedItem, onSelect, onClear]);
}