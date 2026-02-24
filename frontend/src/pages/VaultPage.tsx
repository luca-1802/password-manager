import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus, Wand2, FileText, Upload, LayoutDashboard, Settings as SettingsIcon } from "lucide-react";
import type { FolderFilter, RecoveryQuestion } from "../types";
import { flattenVaultItems, filterVaultItems } from "../lib/vaultItems";
import { usePasswords } from "../hooks/usePasswords";
import { useNotes } from "../hooks/useNotes";
import { useFiles } from "../hooks/useFiles";
import { useFolders } from "../hooks/useFolders";
import { useSelection } from "../hooks/useSelection";
import { useSidebarState } from "../hooks/useSidebarState";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { useAutoLockOnHidden } from "../hooks/useAutoLockOnHidden";
import { useVisibilityLock } from "../hooks/useVisibilityLock";
import { useBreachCheck } from "../hooks/useBreachCheck";
import { useToast } from "../components/ui/Toast";
import AppShell from "../components/layout/AppShell";
import Sidebar from "../components/layout/Sidebar";
import DetailPanel from "../components/layout/DetailPanel";
import VaultItemList from "../components/vault/VaultItemList";
import CommandPalette from "../components/ui/CommandPalette";
import AddPasswordModal from "../components/vault/AddPasswordModal";
import AddNoteModal from "../components/vault/AddNoteModal";
import AddFileModal from "../components/vault/AddFileModal";
import GeneratePasswordModal from "../components/vault/GeneratePasswordModal";

interface Props {
  onLogout: () => void;
}

interface DragData {
  website: string;
  index: number;
  username: string;
  password: string;
  folder?: string | null;
  entryType?: "password" | "note" | "file";
}

export default function VaultPage({ onLogout }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { passwords, notes, files, serverFolders, fetchPasswords, editPassword, deletePassword } =
    usePasswords();
  const { editNote, deleteNote } = useNotes(fetchPasswords);
  const { editFile, deleteFile, downloadFile } = useFiles(fetchPasswords);
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders(serverFolders);

  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddFile, setShowAddFile] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);

  const { selectedItem, selectItem, clearSelection } = useSelection();
  const { collapsed, toggleCollapsed } = useSidebarState();
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  const { toast } = useToast();
  const { breachResults, checking: checkingBreaches, checkBreaches, clearBreachResults, getBreachCount } =
    useBreachCheck();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  useInactivityTimeout(onLogout);
  const { autoLockOnHidden } = useAutoLockOnHidden();
  useVisibilityLock(onLogout, autoLockOnHidden);

  useEffect(() => { fetchPasswords(); }, [fetchPasswords]);
  useEffect(() => { clearBreachResults(); }, [passwords, clearBreachResults]);

  const passwordCount = useMemo(
    () => Object.values(passwords).reduce((a, c) => a + c.length, 0),
    [passwords]
  );
  useEffect(() => {
    if (passwordCount > 0 && !breachResults && !checkingBreaches) {
      checkBreaches();
    }
  }, [passwordCount, breachResults, checkingBreaches, checkBreaches]);

  const allItems = useMemo(
    () => flattenVaultItems(passwords, notes, files),
    [passwords, notes, files]
  );

  const filteredItems = useMemo(
    () => filterVaultItems(allItems, search, folderFilter),
    [allItems, search, folderFilter]
  );

  useKeyboardNavigation(filteredItems, selectedItem, selectItem, clearSelection);

  useEffect(() => {
    if (selectedItem) {
      const updated = allItems.find((i) => i.id === selectedItem.id);
      if (updated) {
        selectItem(updated);
      } else {
        clearSelection();
      }
    }
  }, [allItems]);

  useEffect(() => {
    const state = location.state as { selectItem?: { website: string; index: number }; openAddModal?: boolean } | null;
    if (state?.selectItem && allItems.length > 0) {
      const { website, index } = state.selectItem;
      const target = allItems.find(
        (i) => i.type === "password" && i.key === website && i.index === index
      );
      if (target) {
        selectItem(target);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
    if (state?.openAddModal) {
      setShowAdd(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [allItems, location.state, selectItem, navigate, location.pathname]);

  const handleCreateFolder = useCallback(
    async (name: string) => {
      const res = await createFolder(name);
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [createFolder, fetchPasswords]
  );

  const handleRenameFolder = useCallback(
    async (oldName: string, newName: string) => {
      const res = await renameFolder(oldName, newName);
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

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (data) setActiveDrag(data);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const data = active.data.current as DragData | undefined;
    if (!data) return;

    const targetId = over.id as string;
    let targetFolder: string | null = null;

    if (targetId === "folder-unfiled") {
      targetFolder = null;
    } else if (targetId === "folder-all") {
      return;
    } else if (targetId.startsWith("folder-")) {
      targetFolder = targetId.replace("folder-", "");
    } else {
      return;
    }

    if ((data.folder || null) === targetFolder) return;

    let res;
    if (data.entryType === "file") {
      res = await editFile(data.website, data.index, undefined, targetFolder);
    } else if (data.entryType === "note") {
      res = await editNote(data.website, data.index, undefined, targetFolder);
    } else {
      res = await editPassword(data.website, data.index, data.username, data.password, targetFolder);
    }
    if (res && typeof res === "object" && "ok" in res && (res as { ok: boolean }).ok) {
      toast("success", targetFolder ? `Moved to "${targetFolder}"` : "Moved to unfiled");
    } else {
      toast("error", "Failed to move entry");
    }
  };

  const handleNavigate = (page: string) => {
    if (page === "settings") navigate("/settings");
    else if (page === "dashboard") navigate("/dashboard");
    else if (page === "generator") setShowGenerate(true);
  };

  const handleAddMenu = () => {
    setShowAdd(true);
  };

  const cmdActions = useMemo(() => [
    { id: "add-password", label: "Add Password", icon: <Plus className="w-3.5 h-3.5" />, action: () => setShowAdd(true) },
    { id: "add-note", label: "Add Note", icon: <FileText className="w-3.5 h-3.5" />, action: () => setShowAddNote(true) },
    { id: "add-file", label: "Add File", icon: <Upload className="w-3.5 h-3.5" />, action: () => setShowAddFile(true) },
    { id: "generate", label: "Generate Password", icon: <Wand2 className="w-3.5 h-3.5" />, action: () => setShowGenerate(true) },
    { id: "dashboard", label: "Security", icon: <LayoutDashboard className="w-3.5 h-3.5" />, action: () => navigate("/dashboard") },
    { id: "settings", label: "Settings", icon: <SettingsIcon className="w-3.5 h-3.5" />, action: () => navigate("/settings") },
  ], [navigate]);

  const handleEditPassword = useCallback(
    async (website: string, index: number, username: string, password: string, folder?: string | null, notes?: string | null, recovery_questions?: RecoveryQuestion[] | null) => {
      const res = await editPassword(website, index, username, password, folder, notes, recovery_questions);
      return res;
    },
    [editPassword]
  );

  const handleEditNote = useCallback(
    async (title: string, index: number, content?: string, folder?: string | null, recovery_questions?: RecoveryQuestion[] | null) => {
      const res = await editNote(title, index, content, folder, recovery_questions);
      return res;
    },
    [editNote]
  );

  const handleEditFile = useCallback(
    async (label: string, index: number, description?: string, folder?: string | null) => {
      const res = await editFile(label, index, description, folder);
      return res;
    },
    [editFile]
  );

  const handleDownloadFile = useCallback(
    async (label: string, index: number) => {
      const item = allItems.find(
        (i) => i.type === "file" && i.key === label && i.index === index
      );
      const originalName = item?.file?.original_name || label;
      return downloadFile(label, index, originalName);
    },
    [downloadFile, allItems]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <AppShell
        sidebar={
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
            folders={folders}
            activeFolder={folderFilter}
            onFolderChange={setFolderFilter}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            activePage="vault"
            onNavigate={handleNavigate}
            onLock={onLogout}
            onSearch={() => setCmdOpen(true)}
            onAdd={handleAddMenu}
          />
        }
        detailPanel={
          selectedItem ? (
            <DetailPanel
              item={selectedItem}
              onClose={clearSelection}
              onEditPassword={handleEditPassword}
              onDeletePassword={deletePassword}
              onEditNote={handleEditNote}
              onDeleteNote={deleteNote}
              onEditFile={handleEditFile}
              onDeleteFile={deleteFile}
              onDownloadFile={handleDownloadFile}
              folders={folders}
              breachCount={
                selectedItem.type === "password"
                  ? getBreachCount(selectedItem.key, selectedItem.index)
                  : undefined
              }
            />
          ) : undefined
        }
        detailOpen={!!selectedItem}
        onDetailClose={clearSelection}
      >
        <VaultItemList
          items={filteredItems}
          selectedId={selectedItem?.id ?? null}
          onSelect={selectItem}
          search={search}
          onSearchChange={setSearch}
          onOpenCommandPalette={() => setCmdOpen(true)}
          getBreachCount={getBreachCount}
        />
      </AppShell>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        items={allItems}
        onSelectItem={(item) => {
          selectItem(item);
          setFolderFilter("all");
          setSearch("");
        }}
        actions={cmdActions}
      />

      <AddPasswordModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => { setShowAdd(false); fetchPasswords(); }}
        folders={folders}
      />
      <AddNoteModal
        open={showAddNote}
        onClose={() => setShowAddNote(false)}
        onSaved={() => { setShowAddNote(false); fetchPasswords(); }}
        folders={folders}
      />
      <AddFileModal
        open={showAddFile}
        onClose={() => setShowAddFile(false)}
        onSaved={() => { setShowAddFile(false); fetchPasswords(); }}
        folders={folders}
      />
      <GeneratePasswordModal
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
      />

      <DragOverlay>
        {activeDrag && (
          <div className="bg-surface-raised border border-border rounded-lg px-4 py-3 shadow-2xl opacity-90 max-w-xs">
            <div className="text-sm font-semibold text-text-primary">{activeDrag.website}</div>
            <div className="text-xs text-text-muted mt-0.5">
              {activeDrag.entryType === "file"
                ? "Secure File"
                : activeDrag.username
                ? activeDrag.username
                : "Secure Note"}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}