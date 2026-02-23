import { useEffect, useRef } from "react";

export function useInactivityTimeout(
  onTimeout: () => void,
  duration = 4.5 * 60 * 1000
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const reset = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(onTimeout, duration);
    };

    const events = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
      "scroll",
    ];
    events.forEach((evt) => window.addEventListener(evt, reset));
    reset();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [onTimeout, duration]);
}