import { Folder, Plus, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { FolderFilter } from "../../types";
import { useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";

interface FolderNavProps {
  folders: string[];
  activeFolder: FolderFilter;
  onSelect: (filter: FolderFilter) => void;
  onCreate: (name: string) => Promise<unknown>;
  onRename: (oldName: string, newName: string) => Promise<unknown>;
  onDelete: (name: string) => Promise<unknown>;
}

function DroppableFolder({ id, onClick, children, className }: any) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        className,
        isOver && "ring-2 ring-brand-primary ring-offset-2 ring-offset-surface bg-brand-primary/10 text-brand-primary border-brand-primary/30"
      )}
    >
      {children}
    </button>
  );
}

export default function FolderNav({
  folders,
  activeFolder,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: FolderNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3 py-3 px-4 sm:px-8 border-b border-border-subtle bg-surface/50 sticky top-0 z-10 backdrop-blur-md">
      <div 
        ref={scrollRef}
        className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 -mb-1"
      >
        <button
          onClick={() => onSelect("all")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border",
            activeFolder === "all"
              ? "bg-brand-primary text-white border-brand-primary shadow-md"
              : "bg-surface-sunken text-text-secondary hover:text-text-primary hover:bg-surface hover:border-border hover:shadow-sm border-border-subtle"
          )}
        >
          All Items
        </button>

        {folders.map((folder) => (
          <div key={folder} className="relative group flex-shrink-0 flex items-center">
            <DroppableFolder
              id={`folder-${folder}`}
              onClick={() => onSelect(folder)}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border",
                activeFolder === folder
                  ? "bg-brand-primary text-white border-brand-primary shadow-md"
                  : "bg-surface-sunken text-text-secondary hover:text-text-primary hover:bg-surface hover:border-border hover:shadow-sm border-border-subtle"
              )}
            >
              <Folder className={cn("w-4 h-4", activeFolder === folder ? "text-white" : "text-text-muted group-hover:text-brand-primary")} />
              {folder}
            </DroppableFolder>
            
            <button
              onClick={() => setMenuOpen(menuOpen === folder ? null : folder)}
              className={cn(
                "absolute right-1 p-1.5 rounded-full bg-surface border border-border-subtle shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-surface-hover",
                menuOpen === folder && "opacity-100"
              )}
            >
              <MoreVertical className="w-3.5 h-3.5 text-text-secondary" />
            </button>

            {menuOpen === folder && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setMenuOpen(null)} 
                />
                <div className="absolute top-full mt-2 right-0 w-36 bg-surface border border-border-subtle rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      const newName = prompt("Rename folder:", folder);
                      if (newName && newName !== folder) onRename(folder, newName);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      if (confirm(`Delete folder "${folder}"? Items inside will not be deleted.`)) {
                        onDelete(folder);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          const name = prompt("New folder name:");
          if (name) onCreate(name);
        }}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary hover:bg-brand-primary/20 transition-all duration-200 flex-shrink-0 shadow-sm"
        title="New Folder"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}