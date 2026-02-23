import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Shield, Monitor, Upload, Download, Palette, KeyRound } from "lucide-react";
import { apiFetch } from "../api";
import type { TotpStatusResponse } from "../types";
import { usePasswords } from "../hooks/usePasswords";
import { useFolders } from "../hooks/useFolders";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { useColoredPasswords } from "../hooks/useColoredPasswords";
import { useAutoLockOnHidden } from "../hooks/useAutoLockOnHidden";
import { useVisibilityLock } from "../hooks/useVisibilityLock";
import { cn } from "../lib/utils";
import Button from "../components/ui/Button";
import TwoFactorSetupModal from "../components/vault/TwoFactorSetupModal";
import ImportModal from "../components/vault/ImportModal";
import ExportModal from "../components/vault/ExportModal";
import ChangePasswordModal from "../components/vault/ChangePasswordModal";

interface Props {
  onLogout: () => void;
}

export default function SettingsPage({ onLogout }: Props) {
  const navigate = useNavigate();
  const { serverFolders, fetchPasswords } = usePasswords();
  const { folders } = useFolders(serverFolders);

  const { coloredPasswords, toggleColoredPasswords } = useColoredPasswords();
  const { autoLockOnHidden, toggleAutoLockOnHidden } = useAutoLockOnHidden();
  useVisibilityLock(onLogout, autoLockOnHidden);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);

  useInactivityTimeout(onLogout);

  useEffect(() => {
    fetchPasswords();
  }, [fetchPasswords]);

  useEffect(() => {
    const check2FA = async () => {
      const res = await apiFetch<TotpStatusResponse>("/auth/2fa/status");
      if (res?.ok && res.data) {
        setTwoFactorEnabled(res.data.enabled);
        setBackupCodesRemaining(res.data.backup_codes_remaining ?? 0);
      }
    };
    check2FA();
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-bg/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/vault")}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <span className="font-mono text-sm font-medium text-zinc-300 tracking-wider">
            settings
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            icon={<Lock className="w-3.5 h-3.5" />}
            className="text-zinc-500 hover:text-red-500"
          >
            Lock
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Security
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield
                  className={`w-4 h-4 ${twoFactorEnabled ? "text-green-500" : "text-zinc-500"}`}
                />
                <div>
                  <p className="text-sm text-zinc-200">
                    Two-factor authentication
                  </p>
                  <p className="text-xs text-zinc-500">
                    {twoFactorEnabled
                      ? `Enabled \u00b7 ${backupCodesRemaining} backup codes remaining`
                      : "Not enabled"}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShow2FA(true)}
              >
                Configure
              </Button>
            </div>

            <div className="border-t border-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor
                  className={`w-4 h-4 ${autoLockOnHidden ? "text-orange-500" : "text-zinc-500"}`}
                />
                <div>
                  <p className="text-sm text-zinc-200">
                    Auto-lock on screen lock
                  </p>
                  <p className="text-xs text-zinc-500">
                    Lock vault when screen is locked or minimized
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoLockOnHidden}
                onClick={toggleAutoLockOnHidden}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
                  autoLockOnHidden ? "bg-orange-500" : "bg-zinc-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200",
                    autoLockOnHidden ? "translate-x-[18px]" : "translate-x-[3px]"
                  )}
                />
              </button>
            </div>

            <div className="border-t border-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-200">
                    Change master password
                  </p>
                  <p className="text-xs text-zinc-500">
                    Re-encrypt your vault with a new password
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowChangePassword(true)}
              >
                Change
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Appearance
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette
                  className={`w-4 h-4 ${coloredPasswords ? "text-orange-500" : "text-zinc-500"}`}
                />
                <div>
                  <p className="text-sm text-zinc-200">
                    Colored passwords
                  </p>
                  <p className="text-xs text-zinc-500">
                    Alternate character colors for better readability
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={coloredPasswords}
                onClick={toggleColoredPasswords}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
                  coloredPasswords ? "bg-orange-500" : "bg-zinc-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200",
                    coloredPasswords ? "translate-x-[18px]" : "translate-x-[3px]"
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Data
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-200">Import vault data</p>
                  <p className="text-xs text-zinc-500">
                    Import passwords and notes from JSON or CSV file
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowImport(true)}
              >
                Import
              </Button>
            </div>

            <div className="border-t border-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-200">Export vault data</p>
                  <p className="text-xs text-zinc-500">
                    Download passwords and notes as JSON or CSV
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowExport(true)}
              >
                Export
              </Button>
            </div>
          </div>
        </section>
      </main>

      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        folders={folders}
      />

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={fetchPasswords}
      />

      <TwoFactorSetupModal
        open={show2FA}
        onClose={() => setShow2FA(false)}
        enabled={twoFactorEnabled}
        backupCodesRemaining={backupCodesRemaining}
        onStatusChange={setTwoFactorEnabled}
        onBackupCodesChange={setBackupCodesRemaining}
      />

      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onLogout={onLogout}
      />
    </div>
  );
}