import { useState, useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useToast } from "../ui/Toast";

export type FolderFilter = "all" | "unfiled" | string;

interface Props {
  folders: string[];
  activeFilter: FolderFilter;
  onFilterChange: (filter: FolderFilter) => void;
  onCreate: (name: string) => Promise<unknown>;
  onRename: (oldName: string, newName: string) => Promise<unknown>;
  onDelete: (name: string) => Promise<unknown>;
  className?: string;
}

function DroppablePill({
  id,
  active,
  children,
  onClick,
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  const pillBase =
    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer";
  const pillActive =
    "bg-orange-500/15 text-orange-400 border border-orange-500/30";
  const pillInactive =
    "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent";
  const pillDragOver =
    "bg-orange-500/25 text-orange-300 border border-orange-500/50 ring-1 ring-orange-500/30 scale-105";

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        pillBase,
        isOver ? pillDragOver : active ? pillActive : pillInactive
      )}
    >
      {children}
    </button>
  );
}

export default function FolderBar({
  folders,
  activeFilter,
  onFilterChange,
  onCreate,
  onRename,
  onDelete,
  className,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [createValue, setCreateValue] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextFolder, setContextFolder] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!contextFolder) return;
    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setContextFolder(null);
        setConfirmDelete(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextFolder]);

  const handleCreate = async () => {
    const name = createValue.trim();
    if (!name) {
      setCreating(false);
      setCreateValue("");
      return;
    }
    const res = await onCreate(name);
    if (
      res &&
      typeof res === "object" &&
      "ok" in res &&
      (res as { ok: boolean }).ok
    ) {
      toast("success", `Folder "${name}" created`);
      onFilterChange(name);
    } else {
      const errData = res as { data?: { error?: string } } | null;
      toast("error", errData?.data?.error || "Failed to create folder");
    }
    setCreating(false);
    setCreateValue("");
  };

  const handleStartRename = (folder: string) => {
    setEditingFolder(folder);
    setEditValue(folder);
    setContextFolder(null);
  };

  const handleRename = async () => {
    if (!editingFolder || !editValue.trim()) return;
    const newName = editValue.trim();
    if (newName === editingFolder) {
      setEditingFolder(null);
      return;
    }
    const res = await onRename(editingFolder, newName);
    if (
      res &&
      typeof res === "object" &&
      "ok" in res &&
      (res as { ok: boolean }).ok
    ) {
      if (activeFilter === editingFolder) onFilterChange(newName);
      toast("success", "Folder renamed");
    } else {
      toast("error", "Failed to rename folder");
    }
    setEditingFolder(null);
  };

  const handleDelete = async (folder: string) => {
    if (confirmDelete !== folder) {
      setConfirmDelete(folder);
      setTimeout(() => setConfirmDelete(null), 3000);
      return;
    }
    const res = await onDelete(folder);
    if (
      res &&
      typeof res === "object" &&
      "ok" in res &&
      (res as { ok: boolean }).ok
    ) {
      if (activeFilter === folder) onFilterChange("all");
      toast("info", `Folder "${folder}" deleted`);
    } else {
      toast("error", "Failed to delete folder");
    }
    setConfirmDelete(null);
    setContextFolder(null);
  };

  return (
    <div
      ref={barRef}
      className={cn(
        "flex items-center gap-2 flex-wrap",
        className
      )}
    >
      <FolderOpen className="w-4 h-4 text-zinc-600 shrink-0" />

      <DroppablePill
        id="folder-all"
        active={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      >
        All
      </DroppablePill>

      {folders.map((folder) =>
        editingFolder === folder ? (
          <div key={folder} className="flex items-center gap-1 shrink-0">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setEditingFolder(null);
              }}
              autoFocus
              maxLength={50}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 w-28 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={handleRename}
              className="text-emerald-500 hover:text-emerald-400 p-1"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => setEditingFolder(null)}
              className="text-zinc-500 hover:text-zinc-300 p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div key={folder} className="relative flex items-center group/pill shrink-0">
            <DroppablePill
              id={`folder-${folder}`}
              active={activeFilter === folder}
              onClick={() => onFilterChange(folder)}
            >
              {folder}
            </DroppablePill>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setContextFolder(contextFolder === folder ? null : folder);
              }}
              className="ml-0.5 p-1 text-zinc-700 hover:text-zinc-400 transition-colors shrink-0"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {contextFolder === folder && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 py-1 min-w-[120px]"
                >
                  <button
                    onClick={() => handleStartRename(folder)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  >
                    <Pencil className="w-3 h-3" /> Rename
                  </button>
                  <button
                    onClick={() => handleDelete(folder)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-xs",
                      confirmDelete === folder
                        ? "text-red-400 bg-red-500/10"
                        : "text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    )}
                  >
                    <Trash2 className="w-3 h-3" />{" "}
                    {confirmDelete === folder ? "Confirm" : "Delete"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      )}

      <DroppablePill
        id="folder-unfiled"
        active={activeFilter === "unfiled"}
        onClick={() => onFilterChange("unfiled")}
      >
        Unfiled
      </DroppablePill>

      <div className="w-px h-5 bg-zinc-800 shrink-0" />

      {creating ? (
        <div className="flex items-center gap-1 shrink-0">
          <input
            value={createValue}
            onChange={(e) => setCreateValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setCreateValue("");
              }
            }}
            placeholder="Folder name"
            autoFocus
            maxLength={50}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 w-28 focus:outline-none focus:border-zinc-500"
          />
          <button
            onClick={handleCreate}
            className="text-emerald-500 hover:text-emerald-400 p-1"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setCreating(false);
              setCreateValue("");
            }}
            className="text-zinc-500 hover:text-zinc-300 p-1"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="p-1.5 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 rounded-lg transition-colors shrink-0"
          title="Create folder"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}