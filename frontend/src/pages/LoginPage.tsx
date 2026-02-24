import { useState, type FormEvent } from "react";
import { Lock, ShieldCheck, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../api";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

interface Props {
  isNewVault: boolean;
  pendingTwoFa: boolean;
  onLogin: () => void;
}

const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: 0.06 * i, ease: "easeOut" },
  }),
};

export default function LoginPage({ isNewVault, pendingTwoFa, onLogin }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [totpStep, setTotpStep] = useState(pendingTwoFa);
  const [totpCode, setTotpCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isNewVault) {
      if (password.length < 12) {
        setError("Password must be at least 12 characters");
        setLoading(false);
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      const res = await apiFetch("/auth/create", {
        method: "POST",
        body: { master_password: password, confirm },
      });
      setLoading(false);
      if (res?.ok) {
        onLogin();
      } else {
        setError((res?.data?.error as string) || "Failed to create vault");
      }
    } else {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: { master_password: password },
      });
      setLoading(false);
      if (res?.ok) {
        if (res.data && (res.data as Record<string, unknown>).requires_2fa) {
          setTotpStep(true);
          setError("");
        } else {
          onLogin();
        }
      } else if (res?.status === 423) {
        const secs = (res.data as Record<string, number>)?.locked_until || 0;
        setError(`Vault is locked. Try again in ${secs} seconds.`);
      } else {
        setError((res?.data?.error as string) || "Invalid password");
      }
    }
  };

  const handleTotpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await apiFetch("/auth/2fa/verify", {
      method: "POST",
      body: { code: totpCode },
    });
    setLoading(false);
    if (res?.ok) {
      onLogin();
    } else if (res?.status === 423) {
      const secs = (res.data as Record<string, number>)?.locked_until || 0;
      setError(`Too many failed attempts. Try again in ${secs} seconds.`);
    } else {
      setError((res?.data?.error as string) || "Invalid code");
    }
  };

  return (
    <div className="h-dvh bg-bg flex items-center justify-center">
      <motion.div
        variants={fade}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[340px] px-4"
      >
        <motion.div
          variants={slideUp}
          custom={0}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-2.5 mb-8"
        >
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-accent" />
          </div>
          <span className="font-mono text-sm font-semibold text-text-primary tracking-wider">
            vault
          </span>
        </motion.div>

        <div className="bg-surface/60 border border-border-subtle rounded-xl p-5">
          <AnimatePresence mode="wait">
            {totpStep ? (
              <motion.div
                key="totp"
                variants={fade}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div variants={slideUp} custom={0} initial="hidden" animate="visible">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent-text" />
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                      {useBackupCode ? "Backup code" : "Two-factor"}
                    </p>
                  </div>
                  <p className="text-[13px] text-text-secondary mb-5">
                    {useBackupCode
                      ? "Enter one of your 8-character backup codes"
                      : "Enter the 6-digit code from your authenticator"}
                  </p>
                </motion.div>

                <form onSubmit={handleTotpSubmit} className="space-y-3">
                  <motion.div variants={slideUp} custom={1} initial="hidden" animate="visible">
                    {useBackupCode ? (
                      <Input
                        type="text"
                        placeholder="Backup code"
                        value={totpCode}
                        onChange={(e) =>
                          setTotpCode(e.target.value.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8))
                        }
                        autoComplete="one-time-code"
                        maxLength={8}
                        autoFocus
                      />
                    ) : (
                      <Input
                        type="text"
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) =>
                          setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                        className="font-mono tracking-[0.3em] text-center"
                      />
                    )}
                  </motion.div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-danger bg-danger/8 border border-danger/15 rounded-lg px-3 py-2"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.div variants={slideUp} custom={2} initial="hidden" animate="visible">
                    <Button type="submit" loading={loading} className="w-full">
                      Verify
                      {!loading && <ArrowRight className="w-3.5 h-3.5 ml-1" />}
                    </Button>
                  </motion.div>

                  <motion.div variants={slideUp} custom={3} initial="hidden" animate="visible">
                    <button
                      type="button"
                      onClick={() => {
                        setUseBackupCode(!useBackupCode);
                        setTotpCode("");
                        setError("");
                      }}
                      className="w-full text-xs text-text-muted hover:text-text-secondary transition-colors py-1"
                    >
                      {useBackupCode ? "Use authenticator code" : "Use a backup code instead"}
                    </button>
                  </motion.div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="password"
                variants={fade}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div variants={slideUp} custom={0} initial="hidden" animate="visible">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-1">
                    {isNewVault ? "New vault" : "Locked"}
                  </p>
                  <p className="text-[13px] text-text-secondary mb-5">
                    {isNewVault
                      ? "Choose a strong master password to encrypt your vault"
                      : "Enter your master password to unlock"}
                  </p>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <motion.div variants={slideUp} custom={1} initial="hidden" animate="visible">
                    <Input
                      type="password"
                      placeholder="Master password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="off"
                      autoFocus
                    />
                  </motion.div>

                  <AnimatePresence>
                    {isNewVault && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Input
                          type="password"
                          placeholder="Confirm password"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          autoComplete="off"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-danger bg-danger/8 border border-danger/15 rounded-lg px-3 py-2"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.div variants={slideUp} custom={2} initial="hidden" animate="visible">
                    <Button type="submit" loading={loading} className="w-full">
                      {isNewVault ? "Create vault" : "Unlock"}
                      {!loading && <ArrowRight className="w-3.5 h-3.5 ml-1" />}
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          variants={slideUp}
          custom={4}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-center gap-1.5 mt-5"
        >
          <Lock className="w-2.5 h-2.5 text-text-muted" />
          <span className="text-[11px] text-text-muted tracking-wide">
            Argon2id + AES-256-GCM
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}