import { useEffect, useRef } from "react";

const SCREEN_LOCK_THRESHOLD = 3000;

export function useVisibilityLock(onLock: () => void, enabled: boolean) {
  const hiddenAtRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      } else if (hiddenAtRef.current > 0) {
        const elapsed = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = 0;
        if (elapsed >= SCREEN_LOCK_THRESHOLD) {
          onLock();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onLock, enabled]);
}