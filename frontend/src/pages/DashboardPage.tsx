import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { FolderFilter } from "../types";
import { usePasswords } from "../hooks/usePasswords";
import { useFolders } from "../hooks/useFolders";
import { useBreachCheck } from "../hooks/useBreachCheck";
import { useSidebarState } from "../hooks/useSidebarState";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { useAutoLockOnHidden } from "../hooks/useAutoLockOnHidden";
import { useVisibilityLock } from "../hooks/useVisibilityLock";
import { useToast } from "../components/ui/Toast";
import AppShell from "../components/layout/AppShell";
import Sidebar from "../components/layout/Sidebar";
import SecurityDashboard from "../components/dashboard/SecurityDashboard";
import GeneratePasswordModal from "../components/vault/GeneratePasswordModal";

interface Props {
  onLogout: () => void;
}

export default function DashboardPage({ onLogout }: Props) {
  const navigate = useNavigate();
  const { passwords, notes, files, serverFolders, fetchPasswords } = usePasswords();
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders(serverFolders);
  const { breachResults, checking, checkBreaches } = useBreachCheck();
  const { collapsed, toggleCollapsed } = useSidebarState();
  const { toast } = useToast();
  const [showGenerate, setShowGenerate] = useState(false);

  useInactivityTimeout(onLogout);
  const { autoLockOnHidden } = useAutoLockOnHidden();
  useVisibilityLock(onLogout, autoLockOnHidden);

  useEffect(() => { fetchPasswords(); }, [fetchPasswords]);

  const passwordCount = Object.values(passwords).reduce((a, c) => a + c.length, 0);
  useEffect(() => {
    if (passwordCount > 0 && !breachResults && !checking) {
      checkBreaches();
    }
  }, [passwordCount, breachResults, checking, checkBreaches]);

  const handleNavigate = (page: string) => {
    if (page === "vault") navigate("/vault");
    else if (page === "settings") navigate("/settings");
    else if (page === "generator") setShowGenerate(true);
  };

  const handleCheckBreaches = async () => {
    const res = await checkBreaches();
    if (res?.ok) {
      const d = res.data;
      toast(
        d.total_breached > 0 ? "error" : "success",
        d.total_breached > 0
          ? `${d.total_breached} of ${d.total_checked} passwords found in breaches`
          : `All ${d.total_checked} passwords are safe`
      );
    } else {
      toast("error", "Breach check failed");
    }
    return res;
  };

  const handleCreateFolder = useCallback(
    async (name: string) => {
      const res = await createFolder(name);
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [createFolder, fetchPasswords]
  );
  const handleRenameFolder = useCallback(
    async (old: string, newN: string) => {
      const res = await renameFolder(old, newN);
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [renameFolder, fetchPasswords]
  );
  const handleDeleteFolder = useCallback(
    async (name: string) => {
      const res = await deleteFolder(name);
      if (res?.ok) await fetchPasswords();
      return res;
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
          activeFolder={"all" as FolderFilter}
          onFolderChange={() => navigate("/vault")}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          activePage="dashboard"
          onNavigate={handleNavigate}
          onLock={onLogout}
          onSearch={() => navigate("/vault")}
          onAdd={() => navigate("/vault", { state: { openAddModal: true } })}
        />
      }
    >
      <SecurityDashboard
        passwords={passwords}
        breachResults={breachResults}
        checking={checking}
        onCheckBreaches={handleCheckBreaches}
        onNavigateToVault={() => navigate("/vault")}
        onNavigateToItem={(website, index) =>
          navigate("/vault", { state: { selectItem: { website, index } } })
        }
      />
      <GeneratePasswordModal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
      />
    </AppShell>
  );
}