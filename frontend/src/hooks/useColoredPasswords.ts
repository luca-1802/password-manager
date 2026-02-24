import { useState } from "react";

const STORAGE_KEY = "colored-passwords";

export function useColoredPasswords() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const toggle = () => {
    const next = !enabled;
    localStorage.setItem(STORAGE_KEY, String(next));
    setEnabled(next);
  };

  return { coloredPasswords: enabled, toggleColoredPasswords: toggle } as const;
}

export function getColoredPasswords(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === "true";
}