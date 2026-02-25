import { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useCountUp(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);
  const prefersReduced = useReducedMotion();
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prefersReduced) {
      setCurrent(target);
      return;
    }

    const start = prevTarget.current !== target ? current : 0;
    prevTarget.current = target;

    if (target === start) return;

    let raf: number;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const value = Math.round(start + (target - start) * eased);
      setCurrent(value);

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, prefersReduced]);

  return current;
}