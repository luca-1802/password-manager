import { useState, useEffect } from "react";
import { apiFetch } from "../api";
import type { TotpStatusResponse } from "../types";
import { usePasswords } from "../hooks/usePasswords";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import Header from "../components/layout/Header";
import SearchBar from "../components/vault/SearchBar";
import PasswordGrid from "../components/vault/PasswordGrid";
import AddPasswordModal from "../components/vault/AddPasswordModal";
import GeneratePasswordModal from "../components/vault/GeneratePasswordModal";
import TwoFactorSetupModal from "../components/vault/TwoFactorSetupModal";

interface Props {
  onLogout: () => void;
}

export default function VaultPage({ onLogout }: Props) {
  const { passwords, fetchPasswords, editPassword, deletePassword } =
    usePasswords();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = Object.entries(passwords).filter(([site]) =>
    site.toLowerCase().includes(search.toLowerCase())
  );

  const totalPasswords = Object.values(passwords).reduce(
    (acc, creds) => acc + creds.length,
    0
  );

  return (
    <div className="min-h-screen bg-bg">
      <Header
        passwordCount={totalPasswords}
        onAdd={() => setShowAdd(true)}
        onGenerate={() => setShowGenerate(true)}
        onLock={onLogout}
        onTwoFactor={() => setShow2FA(true)}
        twoFactorEnabled={twoFactorEnabled}
      />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <SearchBar value={search} onChange={setSearch} className="mb-6" />

        <PasswordGrid
          entries={filtered}
          page={page}
          setPage={setPage}
          onEdit={editPassword}
          onDelete={deletePassword}
          onAdd={() => setShowAdd(true)}
        />
      </main>

      <AddPasswordModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => {
          setShowAdd(false);
          fetchPasswords();
        }}
      />

      <GeneratePasswordModal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
      />

      <TwoFactorSetupModal
        open={show2FA}
        onClose={() => setShow2FA(false)}
        enabled={twoFactorEnabled}
        backupCodesRemaining={backupCodesRemaining}
        onStatusChange={setTwoFactorEnabled}
        onBackupCodesChange={setBackupCodesRemaining}
      />
    </div>
  );
}