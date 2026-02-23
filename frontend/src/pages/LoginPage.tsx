import { useState, type FormEvent } from "react";
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          {totpStep ? (
            <Shield className="w-4 h-4 text-zinc-600" />
          ) : (
            <Lock className="w-4 h-4 text-zinc-600" />
          )}
          <span className="font-mono text-sm text-zinc-500 tracking-wider">vault</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h1 className="text-lg font-semibold text-zinc-100 mb-1">
            {totpStep
              ? "Two-factor authentication"
              : isNewVault
                ? "Create master password"
                : "Unlock vault"}
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            {totpStep
              ? useBackupCode
                ? "Enter one of your 8-character backup codes"
                : "Enter the 6-digit code from your authenticator app"
              : isNewVault
                ? "Choose a strong master password"
                : "Enter your master password to continue"}
          </p>

          {totpStep ? (
            <form onSubmit={handleTotpSubmit} className="space-y-4">
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

              {error && (
                <p className="text-sm text-red-500 bg-red-600/10 border border-red-600/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Verify
              </Button>

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
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                autoFocus
              />

              {isNewVault && (
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="off"
                />
              )}

              {error && (
                <p className="text-sm text-red-500 bg-red-600/10 border border-red-600/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                {isNewVault ? "Create vault" : "Unlock"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">Argon2id + AES-256-GCM encrypted</p>
      </div>
    </div>
  );
}