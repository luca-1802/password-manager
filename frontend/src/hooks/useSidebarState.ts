import { useState, useCallback } from "react";

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  return { collapsed, toggleCollapsed };
}