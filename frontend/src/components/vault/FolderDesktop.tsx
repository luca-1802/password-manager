import { useState, useRef, useEffect } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import {
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Shield,
  HardDrive,
  KeyRound,
  FileText,
  File,
  FolderPlus,
  Check,
  X,
  GripVertical,
  History,
} from "lucide-react";
import { cn, getLetterColor, LETTER_COLORS, getFolderColor, setFolderColor, renameFolderColor, deleteFolderColor } from "../../lib/utils";
import type { FolderFilter, VaultItem } from "../../types";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface FolderDesktopProps {
  folders: string[];
  folderCounts: Record<string, number>;
  folderBreachStatus?: Record<string, boolean>;
  unfiledItems: VaultItem[];
  totalCount: number;
  onSelect: (filter: FolderFilter) => void;
  onSelectItem: (item: VaultItem) => void;
  onCreate: (name: string) => Promise<unknown>;
  onRename: (oldName: string, newName: string) => Promise<unknown>;
  onDelete: (name: string) => Promise<unknown>;
  onAdd: (type: "password" | "note" | "file") => void;
  getBreachCount?: (website: string, index: number) => number | null | undefined;
  onHistory?: () => void;
}

function DroppableCard({
  id,
  children,
  className,
  onClick,
  onKeyDown,
  tabIndex,
  "aria-label": ariaLabel,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  tabIndex?: number;
  "aria-label"?: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver &&
          "!bg-brand-primary/10 !ring-2 !ring-brand-primary/40 !scale-105 !shadow-lg"
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={tabIndex}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

export function DraggableDesktopItem({
  item,
  onClick,
  breachCount,
}: {
  item: VaultItem;
  onClick: () => void;
  breachCount?: number | null;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      data: {
        website: item.key,
        index: item.index,
        username: item.type === "password" ? item.credential?.username : "",
        password: item.type === "password" ? item.credential?.password : "",
        folder: item.folder,
        entryType: item.type,
      },
    });

  const letterColor = getLetterColor(item.key[0] || "a");
  const TypeIcon =
    item.type === "password" ? KeyRound : item.type === "note" ? FileText : File;

  const subtitle =
    item.type === "password"
      ? item.credential?.username || ""
      : item.type === "note"
        ? "Secure Note"
        : item.file?.original_name || "File";

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${item.key}${subtitle ? `, ${subtitle}` : ""}`}
      className={cn(
        "group relative flex flex-col items-center gap-2.5 p-5 sm:p-6 rounded-2xl cursor-pointer transition-all duration-200",
        "hover:bg-surface-hover/60 active:scale-[0.96]",
        "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none",
        isDragging && "opacity-40 scale-[0.97] shadow-xl"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag ${item.key}`}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-lg transition-all duration-150 touch-none",
          "text-text-muted/40 hover:text-text-muted hover:bg-surface-sunken",
          "sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100",
          "cursor-grab active:cursor-grabbing"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      <div className="relative">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:shadow-md"
          style={{ backgroundColor: `${letterColor}15` }}
        >
          <TypeIcon
            className="w-7 h-7 sm:w-8 sm:h-8 transition-colors duration-200"
            style={{ color: letterColor }}
            aria-hidden="true"
          />
        </div>
        {breachCount != null && breachCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[10px] font-bold rounded-full bg-danger text-white shadow-sm">
            !
          </span>
        )}
      </div>

      <div className="text-center w-full min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">
          {item.key}
        </p>
        <p className="text-[11px] text-text-muted mt-0.5 truncate">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export default function FolderDesktop({
  folders,
  folderCounts,
  folderBreachStatus,
  unfiledItems,
  totalCount,
  onSelect,
  onSelectItem,
  onCreate,
  onRename,
  onDelete,
  onAdd,
  getBreachCount,
  onHistory,
}: FolderDesktopProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!menuOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        !target.closest("[data-menu-toggle]")
      ) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [menuOpen]);

  useEffect(() => {
    if (creating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [creating]);

  useEffect(() => {
    if (renamingFolder && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingFolder]);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (trimmed) {
      const color = selectedColor || getLetterColor(trimmed[0] || "a");
      setFolderColor(trimmed, color);
      await onCreate(trimmed);
    }
    setNewName("");
    setSelectedColor(null);
    setCreating(false);
  };

  const handleRename = async (oldName: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== oldName) {
      renameFolderColor(oldName, trimmed);
      await onRename(oldName, trimmed);
    }
    setRenamingFolder(null);
    setRenameValue("");
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        delayChildren: prefersReducedMotion ? 0 : 0.08,
      },
    },
  };

  const cardVariant = prefersReducedMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: "spring" as const, stiffness: 340, damping: 26 },
        },
      };

  const getColor = (name: string) => getFolderColor(name);

  const folderCount = folders.length;

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
            className="flex items-center gap-4 mb-10"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.35 }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/15">
              <Shield className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                Your Vault
              </h2>
              <p className="text-sm text-text-muted mt-0.5">
                {totalCount} {totalCount === 1 ? "item" : "items"} across{" "}
                {folderCount} {folderCount === 1 ? "folder" : "folders"}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {onHistory && (
                <button
                  onClick={onHistory}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                    "border",
                    "bg-surface-sunken/60 text-text-secondary border-border-subtle hover:text-text-primary hover:bg-surface-hover hover:border-border hover:shadow-sm",
                    "active:scale-[0.97]"
                  )}
                  aria-label="Password history"
                >
                  <History className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">History</span>
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => { setCreating(!creating); setNewName(""); }}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                    "border",
                    creating
                      ? "bg-brand-primary/15 text-brand-primary border-brand-primary/30 shadow-sm"
                      : "bg-surface-sunken/60 text-text-secondary border-border-subtle hover:text-text-primary hover:bg-surface-hover hover:border-border hover:shadow-sm",
                    "active:scale-[0.97]"
                  )}
                  aria-label="Create new folder"
                >
                  <FolderPlus className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">New Folder</span>
                </button>

                {creating && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
                      onClick={() => { setCreating(false); setNewName(""); setSelectedColor(null); }}
                    />
                    <div
                      className={cn(
                        "fixed z-50 bg-surface border border-border-subtle rounded-2xl shadow-2xl p-5 space-y-4",
                        "inset-x-3 bottom-3 sm:inset-auto",
                        "sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xs"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-text-primary">New Folder</h3>
                        <button
                          onClick={() => { setCreating(false); setNewName(""); setSelectedColor(null); }}
                          className="p-1.5 rounded-lg text-text-muted hover:bg-surface-hover transition-colors"
                          aria-label="Close"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                          style={{
                            backgroundColor: `${selectedColor || getLetterColor(newName[0] || "a")}15`,
                          }}
                        >
                          <Folder
                            className="w-5 h-5"
                            style={{ color: selectedColor || getLetterColor(newName[0] || "a") }}
                            aria-hidden="true"
                          />
                        </div>
                        <input
                          ref={createInputRef}
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newName.trim()) handleCreate();
                            if (e.key === "Escape") { setCreating(false); setNewName(""); setSelectedColor(null); }
                          }}
                          placeholder="Folder name..."
                          maxLength={50}
                          className="flex-1 min-w-0 text-sm font-semibold text-text-primary bg-surface-sunken border border-border-subtle rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary/30 placeholder:text-text-muted"
                          aria-label="New folder name"
                        />
                      </div>

                      <div className="flex items-center gap-2 px-0.5">
                        <span className="text-[11px] text-text-muted font-medium mr-0.5">Color</span>
                        {LETTER_COLORS.map((color) => {
                          const activeColor = selectedColor || getLetterColor(newName[0]?.toLowerCase() || "a");
                          const isActive = activeColor === color;
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setSelectedColor(color)}
                              aria-label={`Select color ${color}`}
                              aria-pressed={isActive}
                              className={cn(
                                "w-7 h-7 sm:w-6 sm:h-6 rounded-full transition-all duration-150 cursor-pointer flex-shrink-0",
                                "hover:scale-110 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none",
                                isActive
                                  ? "ring-2 ring-offset-2 ring-offset-surface scale-110 opacity-100"
                                  : "opacity-50"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2.5 pt-1">
                        <button
                          onClick={() => { setCreating(false); setNewName(""); setSelectedColor(null); }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted bg-surface-sunken hover:bg-surface-hover transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => { if (newName.trim()) handleCreate(); }}
                          disabled={!newName.trim()}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                            newName.trim()
                              ? "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm"
                              : "bg-surface-sunken text-text-muted cursor-not-allowed"
                          )}
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          Create
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
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
            </div>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {folders.map((folder) => {
              const count = folderCounts[folder] || 0;
              const color = getColor(folder);
              const hasBreaches = folderBreachStatus?.[folder] ?? false;
              const badgeColor = count > 0 ? (hasBreaches ? "#ef4444" : "#22c55e") : color;
              const isRenaming = renamingFolder === folder;

              return (
                <motion.div key={folder} variants={cardVariant}>
                  <DroppableCard
                    id={`folder-${folder}`}
                    onClick={() => {
                      if (!isRenaming) onSelect(folder);
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        !isRenaming
                      ) {
                        e.preventDefault();
                        onSelect(folder);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${folder} folder, ${count} ${count === 1 ? "item" : "items"}`}
                    className={cn(
                      "group relative flex flex-col items-center gap-2.5 p-5 sm:p-6 rounded-2xl cursor-pointer transition-all duration-200",
                      "hover:bg-surface-hover/60 active:scale-[0.96]",
                      "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
                    )}
                  >
                    <div className="relative">
                      <div
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:shadow-md"
                        style={{ backgroundColor: `${color}12` }}
                      >
                        <Folder
                          className="w-7 h-7 sm:w-8 sm:h-8 transition-all duration-200 group-hover:hidden"
                          style={{ color }}
                          aria-hidden="true"
                        />
                        <FolderOpen
                          className="w-7 h-7 sm:w-8 sm:h-8 transition-all duration-200 hidden group-hover:block"
                          style={{ color }}
                          aria-hidden="true"
                        />
                      </div>
                      {count > 0 && (
                        <span
                          className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[10px] font-bold rounded-full text-white shadow-sm"
                          style={{ backgroundColor: badgeColor }}
                        >
                          {count}
                        </span>
                      )}
                    </div>

                    <div className="text-center w-full min-w-0">
                      {isRenaming ? (
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
                            e.stopPropagation();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => handleRename(folder)}
                          className="w-full text-sm font-semibold text-text-primary text-center bg-surface-sunken border border-brand-primary/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                          aria-label={`Rename folder ${folder}`}
                        />
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {folder}
                          </p>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {count} {count === 1 ? "item" : "items"}
                          </p>
                        </>
                      )}
                    </div>

                    {!isRenaming && (
                      <button
                        data-menu-toggle
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === folder ? null : folder);
                        }}
                        className={cn(
                          "absolute top-2.5 right-2.5 p-1.5 rounded-xl transition-all duration-200",
                          "opacity-0 group-hover:opacity-100 focus:opacity-100",
                          "hover:bg-surface-sunken text-text-muted hover:text-text-secondary",
                          menuOpen === folder &&
                            "opacity-100 bg-surface-sunken text-text-secondary"
                        )}
                        aria-label={`Options for ${folder}`}
                      >
                        <MoreHorizontal
                          className="w-4 h-4"
                          aria-hidden="true"
                        />
                      </button>
                    )}

                    {menuOpen === folder && (
                        <div ref={menuRef} className="absolute top-10 right-2 w-36 bg-surface border border-border-subtle rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(null);
                              setRenamingFolder(folder);
                              setRenameValue(folder);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                          >
                            <Edit2
                              className="w-3.5 h-3.5"
                              aria-hidden="true"
                            />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(null);
                              if (
                                confirm(
                                  `Delete folder "${folder}"? Items inside will not be deleted.`
                                )
                              ) {
                                deleteFolderColor(folder);
                                onDelete(folder);
                              }
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors"
                          >
                            <Trash2
                              className="w-3.5 h-3.5"
                              aria-hidden="true"
                            />
                            Delete
                          </button>
                        </div>
                    )}
                  </DroppableCard>
                </motion.div>
              );
            })}

            {unfiledItems.map((item) => (
              <motion.div key={item.id} variants={cardVariant}>
                <DraggableDesktopItem
                  item={item}
                  onClick={() => onSelectItem(item)}
                  breachCount={
                    getBreachCount && item.type === "password"
                      ? getBreachCount(item.key, item.index)
                      : undefined
                  }
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="relative flex-shrink-0 border-t border-border-subtle bg-surface/60 backdrop-blur-sm px-6 sm:px-10 py-2.5 flex items-center gap-3">
        <HardDrive
          className="w-3.5 h-3.5 text-text-muted"
          aria-hidden="true"
        />
        <span className="text-xs text-text-muted">
          {totalCount} {totalCount === 1 ? "item" : "items"}
        </span>
        <span className="text-xs text-text-muted/40">·</span>
        <span className="text-xs text-text-muted">
          {folders.length} {folders.length === 1 ? "folder" : "folders"}
        </span>
      </div>
    </div>
  );
}