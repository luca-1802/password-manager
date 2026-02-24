import { useState, useCallback } from "react";
import type { VaultItem } from "../types";

export function useSelection() {
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

  const selectItem = useCallback((item: VaultItem) => {
    setSelectedItem(item);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
  }, []);

  return { selectedItem, selectItem, clearSelection };
}