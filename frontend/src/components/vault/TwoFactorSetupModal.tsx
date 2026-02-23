import { useState, type FormEvent } from "react";
import { ShieldCheck, ShieldOff, Copy, Check, Download, RefreshCw } from "lucide-react";
import { apiFetch } from "../../api";
import type { TotpSetupResponse, BackupCodesResponse } from "../../types";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  enabled: boolean;
  backupCodesRemaining: number;
  onStatusChange: (enabled: boolean) => void;
  onBackupCodesChange: (count: number) => void;
}

type Step = "idle" | "qr" | "backup-codes" | "verify-disable" | "regenerate" | "regenerate-codes";

export default function TwoFactorSetupModal({
  open,
  onClose,
  enabled,
  backupCodesRemaining,
  onStatusChange,
  onBackupCodesChange,
}: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("idle");
  const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  const [useBackup, setUseBackup] = useState(false);

  const reset = () => {
    setStep("idle");
    setSetupData(null);
    setBackupCodes([]);
    setCode("");
    setError("");
    setLoading(false);
    setSecretCopied(false);
    setUseBackup(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleBeginSetup = async () => {
    setError("");
    setLoading(true);
    const res = await apiFetch<TotpSetupResponse>("/auth/2fa/setup", {
      method: "POST",
    });
    setLoading(false);
    if (res?.ok && res.data) {
      setSetupData(res.data);
      setStep("qr");
    } else {
      setError((res?.data as unknown as Record<string, string>)?.error || "Failed to start 2FA setup");
    }
  };

  const handleVerifySetup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await apiFetch<BackupCodesResponse>("/auth/2fa/verify-setup", {
      method: "POST",
      body: { code },
    });
    setLoading(false);
    if (res?.ok && res.data) {
      setBackupCodes(res.data.backup_codes);
      onStatusChange(true);
      onBackupCodesChange(res.data.backup_codes.length);
      setStep("backup-codes");
    } else {
      setError((res?.data as unknown as Record<string, string>)?.error || "Invalid code");
    }
  };

  const handleDisable = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await apiFetch("/auth/2fa/disable", {
      method: "POST",
      body: { code },
    });
    setLoading(false);
    if (res?.ok) {
      toast("success", "Two-factor authentication disabled");
      onStatusChange(false);
      onBackupCodesChange(0);
      handleClose();
    } else if (res?.status === 423) {
      const secs = (res.data as Record<string, number>)?.locked_until || 0;
      setError(`Too many failed attempts. Try again in ${secs} seconds.`);
    } else {
      setError((res?.data?.error as string) || "Invalid code");
    }
  };

  const handleRegenerate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await apiFetch<BackupCodesResponse>("/auth/2fa/backup-codes", {
      method: "POST",
      body: { code },
    });
    setLoading(false);
    if (res?.ok && res.data) {
      setBackupCodes(res.data.backup_codes);
      onBackupCodesChange(res.data.backup_codes.length);
      setStep("regenerate-codes");
    } else if (res?.status === 423) {
      const secs = (res.data as unknown as Record<string, number>)?.locked_until || 0;
      setError(`Too many failed attempts. Try again in ${secs} seconds.`);
    } else {
      setError((res?.data as unknown as Record<string, string>)?.error || "Invalid code");
    }
  };

  const copySecret = async () => {
    if (!setupData) return;
    await navigator.clipboard.writeText(setupData.secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const downloadBackupCodes = () => {
    const content = [
      "Password Vault - 2FA Backup Codes",
      "==================================",
      "",
      "Each code can only be used once.",
      "",
      ...backupCodes.map((c, i) => `${String(i + 1).padStart(2, " ")}. ${c}`),
      "",
      `Generated: ${new Date().toLocaleDateString()}`,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vault-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const codeInput = (
    <Input
      type="text"
      placeholder="6-digit code"
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
      autoComplete="one-time-code"
      inputMode="numeric"
      maxLength={6}
      autoFocus
    />
  );

  const errorBlock = error && (
    <p className="text-sm text-red-500 bg-red-600/10 border border-red-600/20 rounded-lg px-3 py-2">
      {error}
    </p>
  );

  const backupCodesDisplay = (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Save these backup codes in a safe place. Each code can only be used once
        if you lose access to your authenticator app.
      </p>
      <div className="bg-zinc-800 rounded-lg p-4 grid grid-cols-2 gap-2">
        {backupCodes.map((c, i) => (
          <code key={i} className="text-sm text-zinc-300 font-mono">
            {String(i + 1).padStart(2, "\u00A0")}. {c}
          </code>
        ))}
      </div>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={downloadBackupCodes}
          icon={<Download className="w-3.5 h-3.5" />}
          className="flex-1"
        >
          Download
        </Button>
        <Button onClick={handleClose} className="flex-1">
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Two-factor authentication"
    >
      {step === "idle" && !enabled && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-zinc-400">
            <ShieldOff className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              2FA adds an extra layer of security by requiring a code from your
              authenticator app when you log in.
            </p>
          </div>
          {errorBlock}
          <Button
            onClick={handleBeginSetup}
            loading={loading}
            className="w-full"
          >
            Enable 2FA
          </Button>
        </div>
      )}

      {step === "idle" && enabled && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-green-500">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <p className="text-sm text-zinc-300">
              Two-factor authentication is currently <span className="text-green-500 font-medium">enabled</span>.
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            {backupCodesRemaining} backup {backupCodesRemaining === 1 ? "code" : "codes"} remaining
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep("regenerate")}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              className="flex-1"
            >
              New codes
            </Button>
            <Button
              variant="danger"
              onClick={() => setStep("verify-disable")}
              className="flex-1"
            >
              Disable 2FA
            </Button>
          </div>
        </div>
      )}

      {step === "qr" && setupData && (
        <form onSubmit={handleVerifySetup} className="space-y-5">
          <p className="text-sm text-zinc-400">
            Scan this QR code with your authenticator app, then enter the
            6-digit code to verify.
          </p>

          <div className="flex flex-col items-center gap-4">
            <img
              src={`data:image/png;base64,${setupData.qr_code}`}
              alt="Scan this QR code with your authenticator app"
              className="w-48 h-48 rounded-lg bg-white p-2"
            />
            <div className="text-center w-full">
              <p className="text-xs text-zinc-500 mb-1.5">Or enter this key manually:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-sm text-zinc-300 font-mono bg-zinc-800 px-3 py-1.5 rounded select-all">
                  {setupData.secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
                >
                  {secretCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {codeInput}
          {errorBlock}

          <Button type="submit" loading={loading} className="w-full">
            Verify & enable
          </Button>
        </form>
      )}

      {step === "backup-codes" && backupCodesDisplay}
      
      {step === "regenerate-codes" && backupCodesDisplay}

      {step === "regenerate" && (
        <form onSubmit={handleRegenerate} className="space-y-4">
          <p className="text-sm text-zinc-400">
            Enter your current authenticator code to generate new backup codes.
            This will invalidate all existing backup codes.
          </p>
          {codeInput}
          {errorBlock}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStep("idle");
                setCode("");
                setError("");
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Regenerate
            </Button>
          </div>
        </form>
      )}

      {step === "verify-disable" && (
        <form onSubmit={handleDisable} className="space-y-4">
          <p className="text-sm text-zinc-400">
            {useBackup
              ? "Enter one of your backup codes to disable 2FA."
              : "Enter your current authenticator code to disable 2FA."}
          </p>
          {useBackup ? (
            <Input
              type="text"
              placeholder="Backup code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8))}
              autoComplete="one-time-code"
              maxLength={8}
              autoFocus
            />
          ) : (
            codeInput
          )}
          {errorBlock}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStep("idle");
                setCode("");
                setError("");
                setUseBackup(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={loading}
              className="flex-1"
            >
              Disable
            </Button>
          </div>
          <button
            type="button"
            onClick={() => {
              setUseBackup(!useBackup);
              setCode("");
              setError("");
            }}
            className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {useBackup ? "Use authenticator code" : "Use a backup code"}
          </button>
        </form>
      )}
    </Modal>
  );
}