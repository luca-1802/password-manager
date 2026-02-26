import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus, Wand2, FileText, Upload, LayoutDashboard, Settings as SettingsIcon, ArrowLeft, FolderOpen, Search, Monitor, KeyRound, File } from "lucide-react";
import { motion } from "framer-motion";
import type { FolderFilter, RecoveryQuestion, VaultItem } from "../types";
import { cn } from "../lib/utils";
import { flattenVaultItems, filterVaultItems } from "../lib/vaultItems";
import { usePasswords } from "../hooks/usePasswords";
import { useNotes } from "../hooks/useNotes";
import { useFiles } from "../hooks/useFiles";
import { useFolders } from "../hooks/useFolders";
import { useSelection } from "../hooks/useSelection";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { useAutoLockOnHidden } from "../hooks/useAutoLockOnHidden";
import { useVisibilityLock } from "../hooks/useVisibilityLock";
import { useBreachCheck } from "../hooks/useBreachCheck";
import { useToast } from "../components/ui/Toast";
import AppShell from "../components/layout/AppShell";
import TopNav from "../components/layout/TopNav";
import BottomNav from "../components/layout/BottomNav";
import FolderDesktop, { DraggableDesktopItem } from "../components/vault/FolderDesktop";
import DetailPanel from "../components/layout/DetailPanel";
import CommandPalette from "../components/ui/CommandPalette";
import AddPasswordModal from "../components/vault/AddPasswordModal";
import AddNoteModal from "../components/vault/AddNoteModal";
import AddFileModal from "../components/vault/AddFileModal";


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

function FolderContentView({
  folderFilter,
  items,
  search,
  onSearchChange,
  onBack,
  onSelectItem,
  getBreachCount,
  onAdd,
}: {
  folderFilter: FolderFilter;
  items: VaultItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  onSelectItem: (item: VaultItem) => void;
  getBreachCount: (website: string, index: number) => number | null;
  onAdd: (type: "password" | "note" | "file") => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "folder-unfiled" });
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.06 },
    },
  };

  const cardVariant = {
    hidden: { opacity: 0, y: 16, scale: 0.96 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 340, damping: 26 },
    },
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none select-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-text-muted) 0.6px, transparent 0.6px)",
          backgroundSize: "28px 28px",
          opacity: 0.06,
        }}
        aria-hidden="true"
      />

      <div className="relative flex-1 overflow-y-auto">
        <div className="px-6 sm:px-10 lg:px-14 py-8 sm:py-10 max-w-6xl mx-auto">
          <motion.div
            className="flex items-center gap-4 mb-8"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-surface-sunken/80 border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all flex-shrink-0"
              aria-label="Back to desktop"
            >
              <ArrowLeft className="w-4.5 h-4.5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-5 h-5 text-brand-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight truncate">
                  {folderFilter === "unfiled" ? "Unfiled" : folderFilter}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </p>
              </div>
            </div>

            <div className="relative flex-shrink-0">
              <button
                onClick={() => setAddMenuOpen(!addMenuOpen)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                  "bg-brand-primary text-white",
                  "hover:bg-brand-primary/90 hover:shadow-md",
                  "active:scale-[0.97]"
                )}
                aria-label="Add new item"
                aria-expanded={addMenuOpen}
                aria-haspopup="menu"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Add Item</span>
              </button>

              {addMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAddMenuOpen(false)}
                  />
                  <div className="absolute top-full mt-2 right-0 w-44 bg-surface border border-border-subtle rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                    <button
                      onClick={() => { setAddMenuOpen(false); onAdd("password"); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                      Password
                    </button>
                    <button
                      onClick={() => { setAddMenuOpen(false); onAdd("note"); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      Note
                    </button>
                    <button
                      onClick={() => { setAddMenuOpen(false); onAdd("file"); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                    >
                      <File className="w-3.5 h-3.5" aria-hidden="true" />
                      File
                    </button>
                  </div>
                </>
              )}
            </div>

            <div
              ref={setNodeRef}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex-shrink-0 border border-dashed",
                isOver
                  ? "bg-brand-primary/10 border-brand-primary/40 text-brand-primary scale-105 shadow-md"
                  : "border-border-subtle text-text-muted hover:border-border hover:text-text-secondary"
              )}
            >
              <Monitor className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Drop to Desktop</span>
            </div>
          </motion.div>

          <div className="mb-6 max-w-md">
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search in folder..."
                aria-label="Search vault entries"
                className="w-full bg-surface-sunken/50 border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/15 focus:bg-surface transition-all"
              />
            </div>
          </div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {items.map((item) => (
              <motion.div key={item.id} variants={cardVariant}>
                <DraggableDesktopItem
                  item={item}
                  onClick={() => onSelectItem(item)}
                  breachCount={
                    item.type === "password"
                      ? getBreachCount(item.key, item.index)
                      : null
                  }
                />
              </motion.div>
            ))}
          </motion.div>

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FolderOpen className="w-12 h-12 text-text-muted/30 mb-4" />
              <p className="text-sm font-medium text-text-muted">
                {search ? "No items match your search" : "This folder is empty"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);

  const { selectedItem, selectItem, clearSelection } = useSelection();
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

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach((item) => {
      if (item.folder) {
        counts[item.folder] = (counts[item.folder] || 0) + 1;
      }
    });
    return counts;
  }, [allItems]);

  const folderBreachStatus = useMemo(() => {
    const status: Record<string, boolean> = {};
    allItems.forEach((item) => {
      if (item.folder && item.type === "password") {
        const count = getBreachCount(item.key, item.index);
        if (count != null && count > 0) {
          status[item.folder] = true;
        }
      }
    });
    return status;
  }, [allItems, getBreachCount]);

  const unfiledItems = useMemo(
    () => allItems.filter((item) => !item.folder),
    [allItems]
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
    else if (page === "generator") navigate("/generator");
    else if (page === "trash") navigate("/trash");
  };

  const cmdActions = useMemo(() => [
    { id: "add-password", label: "Add Password", icon: <Plus className="w-3.5 h-3.5" />, action: () => setShowAdd(true) },
    { id: "add-note", label: "Add Note", icon: <FileText className="w-3.5 h-3.5" />, action: () => setShowAddNote(true) },
    { id: "add-file", label: "Add File", icon: <Upload className="w-3.5 h-3.5" />, action: () => setShowAddFile(true) },
    { id: "generate", label: "Generate Password", icon: <Wand2 className="w-3.5 h-3.5" />, action: () => navigate("/generator") },
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
        topNav={
          <TopNav
            activePage="vault"
            onNavigate={handleNavigate}
            onLock={onLogout}
            onSearch={() => setCmdOpen(true)}
          />
        }
        bottomNav={
          <BottomNav
            activePage="vault"
            onNavigate={handleNavigate}
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
        <div className="flex flex-col h-full">
          {folderFilter === "all" ? (
            <FolderDesktop
              folders={folders}
              folderCounts={folderCounts}
              folderBreachStatus={folderBreachStatus}
              unfiledItems={unfiledItems}
              totalCount={allItems.length}
              onSelect={setFolderFilter}
              onSelectItem={selectItem}
              onCreate={handleCreateFolder}
              onRename={handleRenameFolder}
              onDelete={handleDeleteFolder}
              onAdd={(type) => {
                if (type === "note") setShowAddNote(true);
                else if (type === "file") setShowAddFile(true);
                else setShowAdd(true);
              }}
              getBreachCount={getBreachCount}
              onHistory={() => navigate("/history")}
            />
          ) : (
            <FolderContentView
              folderFilter={folderFilter}
              items={filteredItems}
              search={search}
              onSearchChange={setSearch}
              onBack={() => { setFolderFilter("all"); setSearch(""); }}
              onSelectItem={selectItem}
              getBreachCount={getBreachCount}
              onAdd={(type) => {
                if (type === "note") setShowAddNote(true);
                else if (type === "file") setShowAddFile(true);
                else setShowAdd(true);
              }}
            />
          )}
        </div>
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
        defaultFolder={folderFilter !== "all" && folderFilter !== "unfiled" ? folderFilter : undefined}
      />
      <AddNoteModal
        open={showAddNote}
        onClose={() => setShowAddNote(false)}
        onSaved={() => { setShowAddNote(false); fetchPasswords(); }}
        folders={folders}
        defaultFolder={folderFilter !== "all" && folderFilter !== "unfiled" ? folderFilter : undefined}
      />
      <AddFileModal
        open={showAddFile}
        onClose={() => setShowAddFile(false)}
        onSaved={() => { setShowAddFile(false); fetchPasswords(); }}
        folders={folders}
        defaultFolder={folderFilter !== "all" && folderFilter !== "unfiled" ? folderFilter : undefined}
      />
      <DragOverlay>
        {activeDrag && (
          <div className="bg-surface/80 backdrop-blur-xl border border-border-subtle rounded-2xl px-5 py-4 shadow-2xl opacity-95 max-w-xs scale-105 transition-transform">
            <div className="text-sm font-bold text-text-primary">{activeDrag.website}</div>
            <div className="text-xs text-text-muted mt-1 font-medium">
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