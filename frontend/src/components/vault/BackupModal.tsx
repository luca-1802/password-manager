import { useState, useEffect, useCallback } from "react";
import { Clock, RotateCcw, HardDrive, ShieldCheck } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";
import { fetchBackups, restoreBackup } from "../../api";

interface BackupEntry {
  filename: string;
  timestamp: string;
  size: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function BackupModal({ open, onClose }: Props) {
  const { toast } = useToast();
  const [vaultBackups, setVaultBackups] = useState<BackupEntry[]>([]);
  const [totpBackups, setTotpBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ filename: string; target: "vault" | "totp" } | null>(null);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    const res = await fetchBackups();
    if (res?.ok && res.data) {
      setVaultBackups(res.data.vault_backups);
      setTotpBackups(res.data.totp_backups);
    } else {
      toast("error", "Failed to load backups");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (open) loadBackups();
  }, [open, loadBackups]);

  const handleRestore = async () => {
    if (!confirmTarget) return;
    setRestoring(confirmTarget.filename);
    const res = await restoreBackup(confirmTarget.filename, confirmTarget.target);
    if (res?.ok) {
      toast("success", "Backup restored successfully");
      setConfirmTarget(null);
      loadBackups();
    } else {
      const err = (res?.data as Record<string, string>)?.error || "Failed to restore backup";
      toast("error", err);
    }
    setRestoring(null);
  };

  const handleClose = () => {
    setConfirmTarget(null);
    setRestoring(null);
    onClose();
  };

  const renderBackupList = (backups: BackupEntry[], target: "vault" | "totp") => {
    if (backups.length === 0) {
      return (
        <p className="text-sm text-text-muted py-3 text-center">
          No backups yet. Backups are created automatically when the vault is modified.
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {backups.map((b) => (
          <div
            key={b.filename}
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-surface-sunken/50 border border-border-subtle"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-primary truncate">
                {formatTimestamp(b.timestamp)}
              </p>
              <p className="text-xs text-text-muted">
                {formatBytes(b.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={() => setConfirmTarget({ filename: b.filename, target })}
              disabled={restoring !== null}
            >
              Restore
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal open={open} onClose={handleClose} title="Vault Backups">
      {confirmTarget ? (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-600/10 border border-amber-600/20">
            <p className="text-sm text-amber-500">
              This will replace your current {confirmTarget.target === "vault" ? "vault" : "2FA secrets"} with
              the selected backup. A safety backup of the current state will be created first.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRestore}
              loading={restoring !== null}
            >
              Confirm Restore
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="w-4 h-4 text-text-muted" />
                  <h3 className="text-sm font-medium text-text-primary">Vault Backups</h3>
                </div>
                {renderBackupList(vaultBackups, "vault")}
              </div>

              {totpBackups.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-text-muted" />
                    <h3 className="text-sm font-medium text-text-primary">2FA Backups</h3>
                  </div>
                  {renderBackupList(totpBackups, "totp")}
                </div>
              )}

              <div className="flex items-start gap-2 pt-2">
                <Clock className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" />
                <p className="text-xs text-text-muted leading-relaxed">
                  Backups are created automatically before each vault change. Up to 20 recent backups are retained.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}