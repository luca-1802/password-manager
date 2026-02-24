import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Shield } from "lucide-react";
import { apiFetch } from "../api";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

interface Props {
  isNewVault: boolean;
  pendingTwoFa: boolean;
  onLogin: () => void;
}

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.04)_0%,transparent_70%)]" />

      <motion.div
        className="w-full max-w-sm relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="flex items-center gap-2 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {totpStep ? (
              <Shield className="w-4 h-4 text-zinc-600" />
            ) : (
              <Lock className="w-4 h-4 text-zinc-600" />
            )}
          </motion.div>
          <span className="font-mono text-sm text-zinc-500 tracking-wider">vault</span>
        </motion.div>

        <motion.div
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 200, delay: 0.1 }}
        >
          <motion.h1
            className="text-lg font-semibold text-zinc-100 mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {totpStep
              ? "Two-factor authentication"
              : isNewVault
                ? "Create master password"
                : "Unlock vault"}
          </motion.h1>
          <motion.p
            className="text-sm text-zinc-500 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            {totpStep
              ? useBackupCode
                ? "Enter one of your 8-character backup codes"
                : "Enter the 6-digit code from your authenticator app"
              : isNewVault
                ? "Choose a strong master password"
                : "Enter your master password to continue"}
          </motion.p>

          <AnimatePresence mode="wait">
            {totpStep ? (
              <motion.form
                key="totp-form"
                onSubmit={handleTotpSubmit}
                className="space-y-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
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
                      placeholder="6-digit code"
                      value={totpCode}
                      onChange={(e) =>
                        setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                    />
                  )}
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      key="totp-error"
                      className="text-sm text-red-500 bg-red-600/10 border border-red-600/20 rounded-lg px-3 py-2"
                      initial={{ opacity: 0, x: 0 }}
                      animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <Button type="submit" loading={loading} className="w-full">
                    Verify
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode);
                      setTotpCode("");
                      setError("");
                    }}
                    className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {useBackupCode ? "Use authenticator code" : "Use a backup code"}
                  </button>
                </motion.div>
              </motion.form>
            ) : (
              <motion.form
                key="password-form"
                onSubmit={handleSubmit}
                className="space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <Input
                    type="password"
                    placeholder="Master password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    autoFocus
                  />
                </motion.div>

                {isNewVault && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
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

                <AnimatePresence>
                  {error && (
                    <motion.p
                      key="password-error"
                      className="text-sm text-red-500 bg-red-600/10 border border-red-600/20 rounded-lg px-3 py-2"
                      initial={{ opacity: 0, x: 0 }}
                      animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: isNewVault ? 0.5 : 0.4, duration: 0.3 }}
                >
                  <Button type="submit" loading={loading} className="w-full">
                    {isNewVault ? "Create vault" : "Unlock"}
                  </Button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p
          className="text-center text-xs text-zinc-600 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          Argon2id + AES-256-GCM encrypted
        </motion.p>
      </motion.div>
    </div>
  );
}
