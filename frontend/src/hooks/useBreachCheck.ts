import { useState, useCallback } from "react";
import { apiFetch } from "../api";
import type { BreachCheckResponse, BreachResults } from "../types";

export function useBreachCheck() {
  const [breachResults, setBreachResults] = useState<BreachResults | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkBreaches = useCallback(async () => {
    setChecking(true);
    const res = await apiFetch<BreachCheckResponse>("/breach/check", {
      method: "POST",
    });
    if (res?.ok) {
      setBreachResults(res.data.results);
      setLastChecked(new Date());
    }
    setChecking(false);
    return res;
  }, []);

  const clearBreachResults = useCallback(() => {
    setBreachResults(null);
    setLastChecked(null);
  }, []);

  const getBreachCount = useCallback(
    (website: string, index: number): number | null => {
      if (breachResults === null) return null;
      const key = `${website}:${index}`;
      return key in breachResults ? breachResults[key]! : null;
    },
    [breachResults]
  );

  return {
    breachResults,
    checking,
    lastChecked,
    checkBreaches,
    clearBreachResults,
    getBreachCount,
  };
}
