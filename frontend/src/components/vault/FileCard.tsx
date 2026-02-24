import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  File,
  Download,
  Pencil,
  Trash2,
  Check,
  X,
  GripVertical,
  FolderOpen,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useToast } from "../ui/Toast";

interface Props {
  label: string;
  index: number;
  originalName: string;
  size: number;
  description?: string | null;
  folder?: string | null;
  uploadedAt: string;
  folders: string[];
  onEdit: (
    label: string,
    index: number,
    description?: string | null,
    folder?: string | null
  ) => Promise<unknown>;
  onDelete: (label: string, index: number) => Promise<unknown>;
  onDownload: (label: string, index: number, originalName: string) => Promise<unknown>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileCard({
  label,
  index,
  originalName,
  size,
  description,
  folder,
  uploadedAt,
  folders,
  onEdit,
  onDelete,
  onDownload,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(description || "");
  const [editFolder, setEditFolder] = useState<string>(folder || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const dragId = `file-${label}-${index}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dragId,
      data: { website: label, index, username: "", password: "", folder, entryType: "file" },
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.5 : undefined,
      }
    : undefined;

  const handleDownload = async () => {
    setDownloading(true);
    const success = await onDownload(label, index, originalName);
    setDownloading(false);
    if (success) {
      toast("success", "File download started");
    } else {
      toast("error", "Failed to download file");
    }
  };

  const handleSave = async () => {
    const newDescription = editDescription.trim() || null;
    const newFolder = editFolder.trim() || null;
    const res = await onEdit(label, index, newDescription, newFolder);
    if (
      res &&
      typeof res === "object" &&
      "ok" in res &&
      (res as { ok: boolean }).ok
    ) {
      setEditing(false);
      toast("success", "File updated");
    } else {
      toast("error", "Failed to update file");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    const res = await onDelete(label, index);
    if (
      res &&
      typeof res === "object" &&
      "ok" in res &&
      (res as { ok: boolean }).ok
    ) {
      toast("info", `Removed file "${label}"`);
    } else {
      toast("error", "Failed to delete file");
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditDescription(description || "");
    setEditFolder(folder || "");
  };

  const formattedDate = new Date(uploadedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group transition-all duration-150" ref={setNodeRef} style={style}>
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="px-5 py-4 bg-zinc-800/10 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-white/[0.06] bg-indigo-500/10">
                  <File className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-zinc-100 tracking-tight">
                    {label}
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Editing file
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelEdit}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                maxLength={1000}
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150 resize-none"
              />
              <div className="relative">
                <FolderOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                <select
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150 cursor-pointer"
                >
                  <option value="" className="bg-zinc-900 text-zinc-100">No folder</option>
                  {folders.map((f) => (
                    <option key={f} value={f} className="bg-zinc-900 text-zinc-100">
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handleCancelEdit}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-medium px-3.5 py-2 rounded-lg hover:bg-zinc-800/60 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-4 py-2 rounded-lg border border-zinc-700 transition-colors duration-150"
              >
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Save changes
                </span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition-all duration-150 hover:shadow-[0_0_15px_rgba(0,0,0,0.2)]">
              <div
                {...listeners}
                {...attributes}
                className="cursor-grab active:cursor-grabbing p-1.5 -m-1 text-zinc-700 hover:text-zinc-500 shrink-0"
                style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none", WebkitUserSelect: "none" }}
                onContextMenu={(e) => e.preventDefault()}
                title="Drag to move to folder"
              >
                <GripVertical className="w-4 h-4" />
              </div>

              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-white/[0.06] bg-indigo-500/10 group-hover:scale-110 transition-transform duration-200">
                <File className="w-4 h-4 text-indigo-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-100 truncate tracking-tight">
                  {label}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs text-zinc-500 truncate">
                    {originalName}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {formatFileSize(size)}
                  </span>
                  {description && (
                    <span className="text-xs text-zinc-500 truncate">
                      — {description.length > 40 ? description.slice(0, 40) + "..." : description}
                    </span>
                  )}
                  {folder && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-400 shrink-0">
                      <FolderOpen className="w-2.5 h-2.5" />
                      {folder}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-zinc-600">
                    {formattedDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors duration-150",
                    downloading
                      ? "text-indigo-400 bg-indigo-500/10"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                  )}
                  title="Download file"
                  aria-label="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditDescription(description || "");
                    setEditFolder(folder || "");
                    setEditing(true);
                  }}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors duration-150"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <motion.button
                  onClick={handleDelete}
                  animate={confirmDelete ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={confirmDelete ? { duration: 0.6, repeat: Infinity } : { duration: 0.15 }}
                  className={cn(
                    "p-1.5 rounded-lg transition-all duration-150",
                    confirmDelete
                      ? "text-red-400 bg-red-500/10 ring-1 ring-red-500/20"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                  )}
                  title={confirmDelete ? "Click again to confirm" : "Delete"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
