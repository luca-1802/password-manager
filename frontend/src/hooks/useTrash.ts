import { useState, useCallback } from "react";
import { fetchTrash, restoreTrashItem, permanentDeleteTrashItem, emptyTrash } from "../api";
import type { TrashItem } from "../types";

export function useTrash(onRestored?: () => Promise<void>) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    const res = await fetchTrash();
    if (res?.ok) setItems((res.data as any).items ?? []);
    setLoading(false);
  }, []);

  const restore = useCallback(async (id: string) => {
    const res = await restoreTrashItem(id);
    if (res?.ok) {
      await loadTrash();
      if (onRestored) await onRestored();
    }
    return res;
  }, [loadTrash, onRestored]);

  const permanentDelete = useCallback(async (id: string) => {
    const res = await permanentDeleteTrashItem(id);
    if (res?.ok) await loadTrash();
    return res;
  }, [loadTrash]);

  const emptyAll = useCallback(async () => {
    const res = await emptyTrash();
    if (res?.ok) setItems([]);
    return res;
  }, []);

  return { items, loading, loadTrash, restore, permanentDelete, emptyAll };
}