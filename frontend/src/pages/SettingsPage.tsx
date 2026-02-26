import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Monitor, Upload, Download, Palette, KeyRound, Sun, Moon, Rows3, Type } from "lucide-react";
import { apiFetch } from "../api";
import type { TotpStatusResponse } from "../types";
import { usePasswords } from "../hooks/usePasswords";
import { useFolders } from "../hooks/useFolders";
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
import TopNav from "../components/layout/TopNav";
import BottomNav from "../components/layout/BottomNav";
import TwoFactorSetupModal from "../components/vault/TwoFactorSetupModal";
import ImportModal from "../components/vault/ImportModal";
import ExportModal from "../components/vault/ExportModal";
import ChangePasswordModal from "../components/vault/ChangePasswordModal";

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
  const { serverFolders, fetchPasswords } = usePasswords();
  const { folders } = useFolders(serverFolders);

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
    else if (page === "generator") navigate("/generator");
    else if (page === "trash") navigate("/trash");
  };

  return (
    <AppShell
      topNav={
        <TopNav
          activePage="settings"
          onNavigate={handleNavigate}
          onLock={onLogout}
          onSearch={() => navigate("/vault")}
        />
      }
      bottomNav={
        <BottomNav
          activePage="settings"
          onNavigate={handleNavigate}
        />
      }
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Settings</h1>
          <p className="text-text-secondary mt-2 text-lg">Manage your account, security preferences, and app appearance.</p>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 px-2">
            Security
          </h2>
          <div className="bg-surface/50 backdrop-blur-sm border border-border-subtle rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl mt-1 ${twoFactorEnabled ? "bg-success/10 text-success" : "bg-surface-sunken text-text-muted"}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-base font-medium text-text-primary">
                    Two-factor authentication
                  </p>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                    {twoFactorEnabled
                      ? `Enabled \u00b7 ${backupCodesRemaining} backup codes remaining`
                      : "Not enabled"}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                className="rounded-xl sm:ml-auto flex-shrink-0"
                onClick={() => setShow2FA(true)}
              >
                Configure
              </Button>
            </div>

            <div className="border-t border-border-subtle" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className={`p-2.5 rounded-xl mt-1 flex-shrink-0 ${autoLockOnHidden ? "bg-brand-primary/10 text-brand-primary" : "bg-surface-sunken text-text-muted"}`}>
                  <Monitor className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-medium text-text-primary">
                    Auto-lock on screen lock
                  </p>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                    Lock vault when screen is locked or minimized
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  checked={autoLockOnHidden}
                  onChange={() => toggleAutoLockOnHidden()}
                />
              </div>
            </div>

            <div className="border-t border-border-subtle" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl mt-1 bg-surface-sunken text-text-muted">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-base font-medium text-text-primary">
                    Change master password
                  </p>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                    Re-encrypt your vault with a new password
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                className="rounded-xl sm:ml-auto flex-shrink-0"
                onClick={() => setShowChangePassword(true)}
              >
                Change
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 px-2">
            Appearance
          </h2>
          <div className="bg-surface/50 backdrop-blur-sm border border-border-subtle rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl mt-1 bg-surface-sunken text-text-muted">
                  {resolvedMode === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl mt-1 bg-surface-sunken text-text-muted">
                  <Palette className="w-5 h-5" />
                </div>
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl mt-1 bg-surface-sunken text-text-muted">
                  <Rows3 className="w-5 h-5" />
                </div>
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl mt-1 bg-surface-sunken text-text-muted">
                  <Type className="w-5 h-5" />
                </div>
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

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="p-2.5 rounded-xl mt-1 bg-surface-sunken text-text-muted flex-shrink-0">
                  <Palette className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-text-primary">
                    Colored passwords
                  </p>
                  <p className="text-xs text-text-muted">
                    Alternate character colors for better readability
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  checked={coloredPasswords}
                  onChange={() => toggleColoredPasswords()}
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 px-2">
            Data
          </h2>
          <div className="bg-surface/50 backdrop-blur-sm border border-border-subtle rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl mt-1 bg-surface-sunken text-text-muted">
                  <Upload className="w-5 h-5" />
                </div>
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl mt-1 bg-surface-sunken text-text-muted">
                  <Download className="w-5 h-5" />
                </div>
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

    </AppShell>
  );
}