import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { motion } from "framer-motion";
import { Plus, Wand2, FileText, Upload, ShieldAlert, Loader2 } from "lucide-react";
import type { Credential, SecureNote, SecureFile } from "../types";
import { usePasswords } from "../hooks/usePasswords";
import { useNotes } from "../hooks/useNotes";
import { useFiles } from "../hooks/useFiles";
import { useFolders } from "../hooks/useFolders";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { useAutoLockOnHidden } from "../hooks/useAutoLockOnHidden";
import { useVisibilityLock } from "../hooks/useVisibilityLock";
import { useBreachCheck } from "../hooks/useBreachCheck";
import { useToast } from "../components/ui/Toast";
import Header from "../components/layout/Header";
import SearchBar from "../components/vault/SearchBar";
import FolderBar, { type FolderFilter } from "../components/vault/FolderBar";
import PasswordGrid from "../components/vault/PasswordGrid";
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
  const { passwords, notes, files, serverFolders, fetchPasswords, editPassword, deletePassword } =
    usePasswords();
  const { editNote, deleteNote } = useNotes(fetchPasswords);
  const { editFile, deleteFile, downloadFile } = useFiles(fetchPasswords);
  const { folders, createFolder, renameFolder, deleteFolder } =
    useFolders(serverFolders);
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddFile, setShowAddFile] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [page, setPage] = useState(1);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const { toast } = useToast();
  const { checking, checkBreaches, clearBreachResults, getBreachCount } =
    useBreachCheck();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  useInactivityTimeout(onLogout);
  const { autoLockOnHidden } = useAutoLockOnHidden();
  useVisibilityLock(onLogout, autoLockOnHidden);

  useEffect(() => {
    fetchPasswords();
  }, [fetchPasswords]);

  useEffect(() => {
    setPage(1);
  }, [search, folderFilter]);

  useEffect(() => {
    clearBreachResults();
  }, [passwords, clearBreachResults]);

  const filtered = Object.entries(passwords)
    .map(([site, creds]) => {
      const filteredCreds = creds.filter((c: Credential) => {
        if (folderFilter === "unfiled") return !c.folder;
        if (folderFilter !== "all") return c.folder === folderFilter;
        return true;
      });
      return [site, filteredCreds] as [string, Credential[]];
    })
    .filter(([site, creds]) => {
      if (creds.length === 0) return false;
      return site.toLowerCase().includes(search.toLowerCase());
    });

  const filteredNotes = Object.entries(notes)
    .map(([title, noteEntries]) => {
      const filteredEntries = noteEntries.filter((n: SecureNote) => {
        if (folderFilter === "unfiled") return !n.folder;
        if (folderFilter !== "all") return n.folder === folderFilter;
        return true;
      });
      return [title, filteredEntries] as [string, SecureNote[]];
    })
    .filter(([title, noteEntries]) => {
      if (noteEntries.length === 0) return false;
      return (
        title.toLowerCase().includes(search.toLowerCase()) ||
        noteEntries.some((n) =>
          n.content.toLowerCase().includes(search.toLowerCase())
        )
      );
    });

  const filteredFiles = Object.entries(files)
    .map(([label, fileEntries]) => {
      const filteredEntries = fileEntries.filter((f: SecureFile) => {
        if (folderFilter === "unfiled") return !f.folder;
        if (folderFilter !== "all") return f.folder === folderFilter;
        return true;
      });
      return [label, filteredEntries] as [string, SecureFile[]];
    })
    .filter(([label, fileEntries]) => {
      if (fileEntries.length === 0) return false;
      const q = search.toLowerCase();
      return (
        label.toLowerCase().includes(q) ||
        fileEntries.some(
          (f) =>
            f.original_name.toLowerCase().includes(q) ||
            (f.description && f.description.toLowerCase().includes(q))
        )
      );
    });

  const totalFiles = Object.values(files).reduce(
    (acc, fileEntries) => acc + fileEntries.length,
    0
  );

  const totalPasswords = Object.values(passwords).reduce(
    (acc, creds) => acc + creds.length,
    0
  );

  const totalNotes = Object.values(notes).reduce(
    (acc, noteEntries) => acc + noteEntries.length,
    0
  );

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
      res = await editPassword(
        data.website,
        data.index,
        data.username,
        data.password,
        targetFolder
      );
    }
    if (
      res &&
      typeof res === "object" &&
      "ok" in res &&
      (res as { ok: boolean }).ok
    ) {
      toast(
        "success",
        targetFolder
          ? `Moved to "${targetFolder}"`
          : "Moved to unfiled"
      );
    } else {
      toast("error", "Failed to move entry");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-bg">
        <Header
          entryCount={totalPasswords + totalNotes + totalFiles}
          onSettings={() => navigate("/settings")}
          onLock={onLogout}
        />

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl mx-auto px-4 py-8"
        >
          <SearchBar value={search} onChange={setSearch} className="mb-4" />

          <FolderBar
            folders={folders}
            activeFilter={folderFilter}
            onFilterChange={setFolderFilter}
            onCreate={handleCreateFolder}
            onRename={handleRenameFolder}
            onDelete={handleDeleteFolder}
            className="mb-4"
          />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-all cursor-pointer active:scale-[0.97] hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </motion.button>
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                onClick={() => setShowGenerate(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all cursor-pointer active:scale-[0.97]"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Generate
              </motion.button>
            </div>
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              onClick={async () => {
                const res = await checkBreaches();
                if (res?.ok) {
                  const d = res.data;
                  toast(
                    d.total_breached > 0 ? "error" : "success",
                    d.total_breached > 0
                      ? `${d.total_breached} of ${d.total_checked} password${d.total_checked === 1 ? "" : "s"} found in breaches`
                      : `All ${d.total_checked} password${d.total_checked === 1 ? "" : "s"} are safe`
                  );
                } else {
                  toast("error", "Breach check failed");
                }
              }}
              disabled={checking || totalPasswords === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]"
            >
              {checking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5" />
              )}
              {checking ? "Checking…" : "Breach Check"}
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              onClick={() => setShowAddNote(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all cursor-pointer active:scale-[0.97]"
            >
              <FileText className="w-3.5 h-3.5" />
              Note
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              onClick={() => setShowAddFile(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all cursor-pointer active:scale-[0.97]"
            >
              <Upload className="w-3.5 h-3.5" />
              File
            </motion.button>
          </div>

          <PasswordGrid
            entries={filtered}
            notes={filteredNotes}
            files={filteredFiles}
            page={page}
            setPage={setPage}
            folders={folders}
            onEdit={editPassword}
            onDelete={deletePassword}
            onEditNote={editNote}
            onDeleteNote={deleteNote}
            onEditFile={editFile}
            onDeleteFile={deleteFile}
            onDownloadFile={downloadFile}
            onAdd={() => setShowAdd(true)}
            getBreachCount={getBreachCount}
          />
        </motion.main>

        <AddPasswordModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            fetchPasswords();
          }}
          folders={folders}
        />

        <AddNoteModal
          open={showAddNote}
          onClose={() => setShowAddNote(false)}
          onSaved={() => {
            setShowAddNote(false);
            fetchPasswords();
          }}
          folders={folders}
        />

        <AddFileModal
          open={showAddFile}
          onClose={() => setShowAddFile(false)}
          onSaved={() => {
            setShowAddFile(false);
            fetchPasswords();
          }}
          folders={folders}
        />

        <GeneratePasswordModal
          open={showGenerate}
          onClose={() => setShowGenerate(false)}
        />
      </div>

      <DragOverlay>
        {activeDrag && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 shadow-2xl opacity-90 max-w-xs">
            <div className="text-sm font-semibold text-zinc-100">
              {activeDrag.website}
            </div>
            {activeDrag.entryType === "file" ? (
              <div className="text-xs text-zinc-500 mt-0.5">
                Secure File
              </div>
            ) : activeDrag.username ? (
              <div className="text-xs text-zinc-500 mt-0.5">
                {activeDrag.username}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 mt-0.5">
                Secure Note
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
