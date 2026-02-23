import { useState, useEffect } from "react";
import { usePasswords } from "../hooks/usePasswords";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import Header from "../components/layout/Header";
import SearchBar from "../components/vault/SearchBar";
import PasswordGrid from "../components/vault/PasswordGrid";
import AddPasswordModal from "../components/vault/AddPasswordModal";
import GeneratePasswordModal from "../components/vault/GeneratePasswordModal";

interface Props {
  onLogout: () => void;
}

export default function VaultPage({ onLogout }: Props) {
  const { passwords, fetchPasswords, editPassword, deletePassword } =
    usePasswords();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [page, setPage] = useState(1);

  useInactivityTimeout(onLogout);

  useEffect(() => {
    fetchPasswords();
  }, [fetchPasswords]);

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
    <div className="min-h-screen bg-[#09090b]">
      <Header
        passwordCount={totalPasswords}
        onAdd={() => setShowAdd(true)}
        onGenerate={() => setShowGenerate(true)}
        onLock={onLogout}
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
    </div>
  );
}