import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { usePasswordStrength } from "../../hooks/usePasswordStrength";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

const SEGMENT_COUNT = 4;
const INACTIVE_COLOR = "#23232a";

const particles = [
  { x: [0, -8, -4], y: [0, -14, -10] },
  { x: [0, 6, 3], y: [0, -16, -12] },
  { x: [0, 10, 6], y: [0, -12, -8] },
];

export default function PasswordStrengthIndicator({
  password,
  className,
}: PasswordStrengthIndicatorProps) {
  const strength = usePasswordStrength(password);
  const prevLevelRef = useRef(strength.level);
  const [showSparkles, setShowSparkles] = useState(false);
  const sparkleKeyRef = useRef(0);
  const [pulseLevel, setPulseLevel] = useState(strength.level);

  useEffect(() => {
    const prevLevel = prevLevelRef.current;
    prevLevelRef.current = strength.level;

    if (strength.level !== prevLevel) {
      setPulseLevel(strength.level);
    }

    if (strength.level === 4 && prevLevel !== 4) {
      sparkleKeyRef.current += 1;
      setShowSparkles(true);

      const timer = setTimeout(() => {
        setShowSparkles(false);
      }, 1200);

      return () => clearTimeout(timer);
    }

    if (strength.level !== 4) {
      setShowSparkles(false);
    }
  }, [strength.level]);

  const isVisible = password.length > 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn("overflow-hidden", className)}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="pt-2">
            <div className="flex items-center gap-3">
              <div className="relative flex flex-1 gap-1">
                {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
                  const isActive = i < strength.level;
                  const shouldPulse =
                    i === pulseLevel - 1 && pulseLevel === strength.level;

                  return (
                    <motion.div
                      key={i}
                      className="h-1.5 flex-1 rounded-full"
                      animate={{
                        backgroundColor: isActive
                          ? strength.hex
                          : INACTIVE_COLOR,
                        boxShadow: isActive
                          ? `0 0 8px ${strength.hex}66, 0 0 2px ${strength.hex}33`
                          : "0 0 0px transparent",
                        scale: shouldPulse ? [1, 1.08, 1] : 1,
                      }}
                      transition={{
                        backgroundColor: {
                          duration: 0.3,
                          delay: i * 0.06,
                          ease: "easeOut",
                        },
                        boxShadow: {
                          duration: 0.3,
                          delay: i * 0.06,
                          ease: "easeOut",
                        },
                        scale: shouldPulse
                          ? {
                              duration: 0.6,
                              repeat: 0,
                              ease: "easeInOut",
                            }
                          : {
                              duration: 0.3,
                              delay: i * 0.06,
                              ease: "easeOut",
                            },
                      }}
                    />
                  );
                })}

                <AnimatePresence>
                  {strength.level >= 3 && (
                    <motion.div
                      key="shimmer"
                      className="pointer-events-none absolute inset-y-0"
                      style={{
                        left: 0,
                        width: "40%",
                        background: `linear-gradient(90deg, transparent 0%, ${strength.hex}30 50%, transparent 100%)`,
                        borderRadius: "9999px",
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, x: ["-40%", "140%"] }}
                      exit={{ opacity: 0 }}
                      transition={{
                        opacity: { duration: 0.3, ease: "easeOut" },
                        x: {
                          duration: 1.8,
                          ease: "easeInOut",
                          repeat: Infinity,
                          repeatDelay: 2.5,
                        },
                      }}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showSparkles &&
                    particles.map((particle, index) => (
                      <motion.div
                        key={`sparkle-${sparkleKeyRef.current}-${index}`}
                        className="absolute right-0 top-1/2 h-1 w-1 rotate-45 rounded-[1px]"
                        style={{ backgroundColor: strength.hex }}
                        initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0, 1.2, 0],
                          x: particle.x,
                          y: particle.y,
                        }}
                        transition={{
                          duration: 0.8,
                          delay: 0.3 + index * 0.1,
                          ease: "easeOut",
                        }}
                      />
                    ))}
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                <motion.span
                  key={strength.label}
                  className={cn(
                    "min-w-[72px] text-right text-xs font-medium whitespace-nowrap",
                    strength.color
                  )}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  {strength.label}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}