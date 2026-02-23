import { useState } from "react";

const STORAGE_KEY = "auto-lock-on-hidden";

export function useAutoLockOnHidden() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? false : stored === "true";
  });

  const toggle = () => {
    const next = !enabled;
    localStorage.setItem(STORAGE_KEY, String(next));
    setEnabled(next);
  };

  return { autoLockOnHidden: enabled, toggleAutoLockOnHidden: toggle } as const;
}