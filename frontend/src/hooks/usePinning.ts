import { useCallback } from "react";
import { apiFetch } from "../api";
import type { VaultItemType } from "../types";

export function usePinning(fetchPasswords: () => Promise<void>) {
  const togglePin = useCallback(
    async (type: VaultItemType, key: string, index: number, pinned: boolean) => {
      await apiFetch("/passwords/pin", {
        method: "PUT",
        body: { type, key, index, pinned },
      });
      await fetchPasswords();
    },
    [fetchPasswords]
  );

  return { togglePin };
}