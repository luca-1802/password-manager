import { useState, useCallback, useRef, useEffect } from "react";

export function useClipboard(clearDelay = 10000) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasSecretRef = useRef(false);

  useEffect(() => {
    const clearClipboard = () => {
      if (hasSecretRef.current) {
        navigator.clipboard.writeText("").catch(() => {});
        hasSecretRef.current = false;
        setCopied(false);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") clearClipboard();
    };

    window.addEventListener("beforeunload", clearClipboard);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearClipboard();
      window.removeEventListener("beforeunload", clearClipboard);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      hasSecretRef.current = true;
      setCopied(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        navigator.clipboard.writeText("").catch(() => {});
        hasSecretRef.current = false;
        setCopied(false);
      }, clearDelay);
    },
    [clearDelay]
  );

  return { copy, copied };
}