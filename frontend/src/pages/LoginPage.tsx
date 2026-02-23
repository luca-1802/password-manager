import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { apiFetch } from "../api";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

interface Props {
  isNewVault: boolean;
  onLogin: () => void;
}

export default function LoginPage({ isNewVault, onLogin }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        onLogin();
      } else if (res?.status === 423) {
        const secs = (res.data as Record<string, number>)?.locked_until || 0;
        setError(`Vault is locked. Try again in ${secs} seconds.`);
      } else {
        setError((res?.data?.error as string) || "Invalid password");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#09090b]">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-4 h-4 text-zinc-600" />
          <span className="font-mono text-sm text-zinc-500 tracking-wider">vault</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h1 className="text-lg font-semibold text-zinc-100 mb-1">
            {isNewVault ? "Create master password" : "Unlock vault"}
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            {isNewVault
              ? "Choose a strong master password"
              : "Enter your master password to continue"}
          </p>

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
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">AES-256 encrypted</p>
      </div>
    </div>
  );
}