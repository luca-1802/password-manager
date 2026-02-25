import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Copy, Check, Wand2, Hash, ShieldCheck, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../api";
import { cn } from "../lib/utils";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { useAutoLockOnHidden } from "../hooks/useAutoLockOnHidden";
import { useVisibilityLock } from "../hooks/useVisibilityLock";
import { useToast } from "../components/ui/Toast";
import { useClipboard } from "../hooks/useClipboard";
import { useReducedMotion } from "../hooks/useReducedMotion";
import Button from "../components/ui/Button";
import Switch from "../components/ui/Switch";
import ColoredPassword from "../components/ui/ColoredPassword";
import PasswordStrengthIndicator from "../components/ui/PasswordStrengthIndicator";
import AppShell from "../components/layout/AppShell";
import TopNav from "../components/layout/TopNav";
import BottomNav from "../components/layout/BottomNav";

interface Props {
  onLogout: () => void;
}

const LENGTH_PRESETS = [8, 12, 16, 24, 32, 48, 64] as const;

export default function GeneratorPage({ onLogout }: Props) {
  const navigate = useNavigate();
  const [length, setLength] = useState(16);
  const [password, setPassword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [includeSpecial, setIncludeSpecial] = useState(true);
  const [generationCount, setGenerationCount] = useState(0);
  const { toast } = useToast();
  const { copy, copied } = useClipboard();
  const prefersReduced = useReducedMotion();

  useInactivityTimeout(onLogout);
  const { autoLockOnHidden } = useAutoLockOnHidden();
  useVisibilityLock(onLogout, autoLockOnHidden);

  const handleNavigate = (page: string) => {
    if (page === "vault") navigate("/vault");
    else if (page === "dashboard") navigate("/dashboard");
    else if (page === "settings") navigate("/settings");
  };

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const res = await apiFetch<{ password: string }>(
      `/generate?length=${length}&special=${includeSpecial}`
    );
    if (res?.ok) {
      setPassword(res.data.password);
      setGenerationCount((c) => c + 1);
    } else {
      toast("error", "Failed to generate password");
    }
    setGenerating(false);
  }, [length, includeSpecial, toast]);

  const handleCopy = async () => {
    if (!password) return;
    await copy(password);
    toast("success", "Password copied to clipboard");
  };

  const decrementLength = () => setLength((l) => Math.max(4, l - 1));
  const incrementLength = () => setLength((l) => Math.min(64, l + 1));

  return (
    <AppShell
      topNav={
        <TopNav
          activePage="generator"
          onNavigate={handleNavigate}
          onLock={onLogout}
          onSearch={() => navigate("/vault")}
        />
      }
      bottomNav={
        <BottomNav
          activePage="generator"
          onNavigate={handleNavigate}
        />
      }
    >
      <div className="max-w-xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary shadow-lg shadow-brand-primary/15 mb-5">
            <Wand2 className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Password Generator
          </h1>
          <p className="text-text-secondary mt-2 text-base">
            Generate strong, unique passwords instantly.
          </p>
        </div>

        <div className="bg-surface/50 backdrop-blur-sm border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-sm">
          <div
            className={cn(
              "relative min-h-[72px] flex items-center justify-center rounded-2xl border transition-all duration-300 px-5 py-4",
              password
                ? "bg-surface-sunken/80 border-border"
                : "bg-surface-sunken/40 border-border-subtle border-dashed"
            )}
          >
            <AnimatePresence mode="wait">
              {password ? (
                <motion.code
                  key={`pw-${generationCount}`}
                  className="block text-base sm:text-lg font-mono break-all leading-relaxed text-center select-all"
                  initial={prefersReduced ? false : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, ease: "easeOut" as const }}
                >
                  <ColoredPassword password={password} />
                </motion.code>
              ) : (
                <motion.p
                  key="placeholder"
                  className="text-sm text-text-muted text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Click generate to create a password
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <PasswordStrengthIndicator password={password} className="mt-3 px-1" />

          <div className="flex gap-3 mt-5">
            <Button
              onClick={handleGenerate}
              loading={generating}
              icon={<RefreshCw className={cn("w-4 h-4", generating && "animate-spin")} />}
              className="flex-1 rounded-xl"
              size="lg"
            >
              Generate
            </Button>
            <Button
              variant="secondary"
              onClick={handleCopy}
              disabled={!password}
              icon={
                copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )
              }
              className="rounded-xl"
              size="lg"
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 px-2">
            Configuration
          </h2>
          <div className="bg-surface/50 backdrop-blur-sm border border-border-subtle rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-surface-sunken text-text-muted">
                    <Hash className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Length</p>
                    <p className="text-xs text-text-muted">Number of characters</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={decrementLength}
                    disabled={length <= 4}
                    className="w-8 h-8 rounded-lg bg-surface-sunken border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Decrease length"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-lg font-bold font-mono text-text-primary tabular-nums">
                    {length}
                  </span>
                  <button
                    onClick={incrementLength}
                    disabled={length >= 64}
                    className="w-8 h-8 rounded-lg bg-surface-sunken border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Increase length"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="px-1">
                <input
                  type="range"
                  min="4"
                  max="64"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full"
                  aria-label="Password length"
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-[11px] text-text-muted">4</span>
                  <span className="text-[11px] text-text-muted">64</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {LENGTH_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setLength(preset)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border",
                      length === preset
                        ? "bg-brand-primary text-white shadow-sm border-transparent"
                        : "bg-surface-sunken text-text-muted hover:text-text-primary hover:bg-surface-hover border-border-subtle"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border-subtle" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className={cn(
                  "p-2.5 rounded-xl flex-shrink-0 transition-colors duration-200",
                  includeSpecial ? "bg-brand-primary/10 text-brand-primary" : "bg-surface-sunken text-text-muted"
                )}>
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">Special characters</p>
                  <p className="text-xs text-text-muted">
                    Include symbols like !@#$%^&* for stronger passwords
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  checked={includeSpecial}
                  onChange={() => setIncludeSpecial(!includeSpecial)}
                  label="Include special characters"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}