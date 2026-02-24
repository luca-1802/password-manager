import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  FolderOpen,
  Folder,
  FolderPlus,
  Inbox,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { FolderFilter } from "../../types";

interface FolderTreeProps {
  folders: string[];
  activeFolder: FolderFilter;
  onSelect: (filter: FolderFilter) => void;
  onCreate: (name: string) => Promise<unknown>;
  onRename: (oldName: string, newName: string) => Promise<unknown>;
  onDelete: (name: string) => Promise<unknown>;
}

function DroppableFolderItem({
  id,
  label,
  icon: Icon,
  isActive,
  onClick,
  onContextAction,
  showContextMenu = false,
}: {
  id: string;
  label: string;
  icon: typeof FolderOpen;
  isActive: boolean;
  onClick: () => void;
  onContextAction?: (action: "rename" | "delete") => void;
  showContextMenu?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `folder-${id}` });
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] cursor-pointer transition-colors relative",
        isActive
          ? "bg-gold-glow text-accent-text"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-hover",
        isOver && "ring-1 ring-accent/40 bg-accent-muted"
      )}
      onClick={onClick}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate flex-1">{label}</span>
      {showContextMenu && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-hover transition-all"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-surface-raised border border-border rounded-lg py-1 shadow-lg min-w-[120px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onContextAction?.("rename");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onContextAction?.("delete");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-red-600/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function FolderTree({
  folders,
  activeFolder,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: FolderTreeProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [creating]);

  useEffect(() => {
    if (renamingFolder && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingFolder]);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (trimmed) {
      await onCreate(trimmed);
    }
    setNewName("");
    setCreating(false);
  };

  const handleRename = async (oldName: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== oldName) {
      await onRename(oldName, trimmed);
    }
    setRenamingFolder(null);
    setRenameValue("");
  };

  const handleContextAction = (folder: string, action: "rename" | "delete") => {
    if (action === "rename") {
      setRenamingFolder(folder);
      setRenameValue(folder);
    } else {
      onDelete(folder);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 px-1 sticky top-0 bg-sidebar z-10 py-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Folders
        </p>
        <button
          onClick={() => setCreating(true)}
          className="p-0.5 rounded text-text-muted hover:text-accent-text transition-colors"
          title="New folder"
        >
          <FolderPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-0.5">
        <DroppableFolderItem
          id="all"
          label="All Items"
          icon={FolderOpen}
          isActive={activeFolder === "all"}
          onClick={() => onSelect("all")}
        />
        <DroppableFolderItem
          id="unfiled"
          label="Unfiled"
          icon={Inbox}
          isActive={activeFolder === "unfiled"}
          onClick={() => onSelect("unfiled")}
        />

        {folders.map((folder) =>
          renamingFolder === folder ? (
            <div key={folder} className="px-2.5 py-1">
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(folder);
                  if (e.key === "Escape") {
                    setRenamingFolder(null);
                    setRenameValue("");
                  }
                }}
                onBlur={() => handleRename(folder)}
                className="w-full bg-surface-sunken border border-accent/40 rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            </div>
          ) : (
            <DroppableFolderItem
              key={folder}
              id={folder}
              label={folder}
              icon={activeFolder === folder ? FolderOpen : Folder}
              isActive={activeFolder === folder}
              onClick={() => onSelect(folder)}
              onContextAction={(action) => handleContextAction(folder, action)}
              showContextMenu
            />
          )
        )}

        {creating && (
          <div className="px-2.5 py-1">
            <input
              ref={createInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              onBlur={handleCreate}
              placeholder="Folder name..."
              className="w-full bg-surface-sunken border border-accent/40 rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/20"
            />
          </div>
        )}
      </div>
    </div>
  );
}