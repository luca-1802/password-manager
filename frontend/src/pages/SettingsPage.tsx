import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Monitor, Upload, Download, Palette, KeyRound, Sun, Moon, Rows3, Type } from "lucide-react";
import { apiFetch } from "../api";
import type { TotpStatusResponse } from "../types";
import { usePasswords } from "../hooks/usePasswords";
import { useFolders } from "../hooks/useFolders";
import { useSidebarState } from "../hooks/useSidebarState";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { useColoredPasswords } from "../hooks/useColoredPasswords";
import { useAutoLockOnHidden } from "../hooks/useAutoLockOnHidden";
import { useVisibilityLock } from "../hooks/useVisibilityLock";
import Button from "../components/ui/Button";
import Switch from "../components/ui/Switch";
import Select from "../components/ui/Select";
import type { SelectOption } from "../components/ui/Select";
import { useTheme } from "../theme/ThemeProvider";
import { ACCENT_PRESETS } from "../theme/presets";
import type { AccentColorName } from "../theme/types";
import AppShell from "../components/layout/AppShell";
import Sidebar from "../components/layout/Sidebar";
import TwoFactorSetupModal from "../components/vault/TwoFactorSetupModal";
import ImportModal from "../components/vault/ImportModal";
import ExportModal from "../components/vault/ExportModal";
import ChangePasswordModal from "../components/vault/ChangePasswordModal";
import GeneratePasswordModal from "../components/vault/GeneratePasswordModal";

const themeModeOptions: SelectOption[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const densityOptions: SelectOption[] = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "comfortable", label: "Comfortable" },
];

const fontOptions: SelectOption[] = [
  { value: "inter", label: "Inter" },
  { value: "system", label: "System UI" },
  { value: "mono", label: "Monospace" },
];

const ACCENT_COLOR_NAMES: AccentColorName[] = ["gold", "blue", "green", "purple", "red", "teal"];

interface Props {
  onLogout: () => void;
}

export default function SettingsPage({ onLogout }: Props) {
  const navigate = useNavigate();
  const { passwords, notes, files, serverFolders, fetchPasswords } = usePasswords();
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders(serverFolders);
  const { collapsed, toggleCollapsed } = useSidebarState();

  const { coloredPasswords, toggleColoredPasswords } = useColoredPasswords();
  const {
    accentColor, themeMode, resolvedMode, density, fontFamily,
    setAccentColor, setThemeMode, setDensity, setFontFamily,
  } = useTheme();
  const { autoLockOnHidden, toggleAutoLockOnHidden } = useAutoLockOnHidden();
  useVisibilityLock(onLogout, autoLockOnHidden);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
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

  const handleNavigate = (page: string) => {
    if (page === "vault") navigate("/vault");
    else if (page === "dashboard") navigate("/dashboard");
    else if (page === "generator") setShowGenerate(true);
  };

  const handleCreateFolder = useCallback(
    async (name: string) => {
      await createFolder(name);
      await fetchPasswords();
    },
    [createFolder, fetchPasswords]
  );

  const handleRenameFolder = useCallback(
    async (oldName: string, newName: string) => {
      await renameFolder(oldName, newName);
      await fetchPasswords();
    },
    [renameFolder, fetchPasswords]
  );

  const handleDeleteFolder = useCallback(
    async (name: string) => {
      await deleteFolder(name);
      await fetchPasswords();
    },
    [deleteFolder, fetchPasswords]
  );

  return (
    <AppShell
      sidebar={
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          folders={folders}
          activeFolder={"all"}
          onFolderChange={() => navigate("/vault")}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          activePage="settings"
          onNavigate={handleNavigate}
          onLock={onLogout}
          onSearch={() => navigate("/vault")}
          onAdd={() => navigate("/vault", { state: { openAddModal: true } })}
        />
      }
    >
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
            Security
          </h2>
          <div className="bg-surface-raised border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield
                  className={`w-4 h-4 ${twoFactorEnabled ? "text-success" : "text-text-muted"}`}
                />
                <div>
                  <p className="text-sm text-text-primary">
                    Two-factor authentication
                  </p>
                  <p className="text-xs text-text-muted">
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

            <div className="border-t border-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor
                  className={`w-4 h-4 ${autoLockOnHidden ? "text-accent" : "text-text-muted"}`}
                />
                <div>
                  <p className="text-sm text-text-primary">
                    Auto-lock on screen lock
                  </p>
                  <p className="text-xs text-text-muted">
                    Lock vault when screen is locked or minimized
                  </p>
                </div>
              </div>
              <Switch
                checked={autoLockOnHidden}
                onChange={() => toggleAutoLockOnHidden()}
              />
            </div>

            <div className="border-t border-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 text-text-muted" />
                <div>
                  <p className="text-sm text-text-primary">
                    Change master password
                  </p>
                  <p className="text-xs text-text-muted">
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
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
            Appearance
          </h2>
          <div className="bg-surface-raised border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {resolvedMode === "dark" ? (
                  <Moon className="w-4 h-4 text-accent" />
                ) : (
                  <Sun className="w-4 h-4 text-accent" />
                )}
                <div>
                  <p className="text-sm text-text-primary">Theme</p>
                  <p className="text-xs text-text-muted">
                    Choose light, dark, or system preference
                  </p>
                </div>
              </div>
              <Select
                value={themeMode}
                onChange={(v) => setThemeMode(v as "light" | "dark" | "system")}
                options={themeModeOptions}
                className="w-36"
              />
            </div>

            <div className="border-t border-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-sm text-text-primary">Accent color</p>
                  <p className="text-xs text-text-muted">
                    Customize the highlight color throughout the app
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ACCENT_COLOR_NAMES.map((name) => {
                  const preset = ACCENT_PRESETS[name];
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setAccentColor(name)}
                      title={preset.label}
                      className="w-6 h-6 rounded-full cursor-pointer transition-shadow duration-150"
                      style={{
                        backgroundColor: preset.accent,
                        boxShadow:
                          accentColor === name
                            ? `0 0 0 2px var(--color-surface-raised), 0 0 0 4px ${preset.accent}`
                            : "none",
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Rows3
                  className={`w-4 h-4 ${density !== "default" ? "text-accent" : "text-text-muted"}`}
                />
                <div>
                  <p className="text-sm text-text-primary">UI density</p>
                  <p className="text-xs text-text-muted">
                    Adjust text size and spacing
                  </p>
                </div>
              </div>
              <Select
                value={density}
                onChange={(v) => setDensity(v as "compact" | "default" | "comfortable")}
                options={densityOptions}
                className="w-36"
              />
            </div>

            <div className="border-t border-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Type
                  className={`w-4 h-4 ${fontFamily !== "inter" ? "text-accent" : "text-text-muted"}`}
                />
                <div>
                  <p className="text-sm text-text-primary">Font</p>
                  <p className="text-xs text-text-muted">
                    Change the interface typeface
                  </p>
                </div>
              </div>
              <Select
                value={fontFamily}
                onChange={(v) => setFontFamily(v as "inter" | "system" | "mono")}
                options={fontOptions}
                className="w-36"
              />
            </div>

            <div className="border-t border-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette
                  className={`w-4 h-4 ${coloredPasswords ? "text-accent" : "text-text-muted"}`}
                />
                <div>
                  <p className="text-sm text-text-primary">
                    Colored passwords
                  </p>
                  <p className="text-xs text-text-muted">
                    Alternate character colors for better readability
                  </p>
                </div>
              </div>
              <Switch
                checked={coloredPasswords}
                onChange={() => toggleColoredPasswords()}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
            Data
          </h2>
          <div className="bg-surface-raised border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="w-4 h-4 text-text-muted" />
                <div>
                  <p className="text-sm text-text-primary">Import vault data</p>
                  <p className="text-xs text-text-muted">
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

            <div className="border-t border-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-text-muted" />
                <div>
                  <p className="text-sm text-text-primary">Export vault data</p>
                  <p className="text-xs text-text-muted">
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
      </div>

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

      <GeneratePasswordModal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
      />
    </AppShell>
  );
}