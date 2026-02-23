import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye,
  EyeOff,
  Copy,
  Pencil,
  Trash2,
  Check,
  X,
  User,
  GripVertical,
  FolderOpen,
  StickyNote,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { cn, getLetterColor } from "../../lib/utils";
import { useToast } from "../ui/Toast";
import { useClipboard } from "../../hooks/useClipboard";
import ColoredPassword from "../ui/ColoredPassword";
import PasswordStrengthIndicator from "../ui/PasswordStrengthIndicator";
import RecoveryQuestionsSection from "./RecoveryQuestionsSection";
import type { RecoveryQuestion } from "../../types";

interface Props {
  website: string;
  index: number;
  username: string;
  password: string;
  folder?: string | null;
  notes?: string | null;
  recovery_questions?: RecoveryQuestion[] | null;
  folders: string[];
  onEdit: (
    website: string,
    index: number,
    username: string,
    password: string,
    folder?: string | null,
    notes?: string | null,
    recovery_questions?: RecoveryQuestion[] | null
  ) => Promise<unknown>;
  onDelete: (website: string, index: number) => Promise<unknown>;
  breachCount?: number | null;
}

export default function PasswordCard({
  website,
  index,
  username,
  password,
  folder,
  notes,
  recovery_questions,
  folders,
  onEdit,
  onDelete,
  breachCount,
}: Props) {
  const [showPwd, setShowPwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editUser, setEditUser] = useState(username);
  const [editPwd, setEditPwd] = useState(password);
  const [editFolder, setEditFolder] = useState<string>(folder || "");
  const [editNotes, setEditNotes] = useState(notes || "");
  const [editRecoveryQuestions, setEditRecoveryQuestions] = useState<RecoveryQuestion[]>(
    recovery_questions || []
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();
  const { copy, copied } = useClipboard();

  const dragId = `password-${website}-${index}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dragId,
      data: { website, index, username, password, folder, entryType: "password" },
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.5 : undefined,
      }
    : undefined;

  const letter = website[0] || "?";
  const color = getLetterColor(letter);

  const handleCopy = async () => {
    await copy(password);
    toast("success", "Copied to clipboard");
  };

  const handleSave = async () => {
    if (!editUser.trim() || !editPwd) {
      toast("error", "Username and password are required");
      return;
    }
    const newFolder = editFolder.trim() || null;
    const newNotes = editNotes.trim() || null;
    const filteredRq = editRecoveryQuestions.filter(q => q.question.trim() && q.answer.trim());
    const newRq = filteredRq.length > 0 ? filteredRq : null;
    const res = await onEdit(website, index, editUser, editPwd, newFolder, newNotes, newRq);
    if (
      res &&
      typeof res === "object" &&
      "ok" in res &&
      (res as { ok: boolean }).ok
    ) {
      setEditing(false);
      toast("success", "Credential updated");
    } else {
      toast("error", "Failed to update credential");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    const res = await onDelete(website, index);
    if (
      res &&
      typeof res === "object" &&
      "ok" in res &&
      (res as { ok: boolean }).ok
    ) {
      toast("info", `Removed credential for ${website}`);
    } else {
      toast("error", "Failed to delete credential");
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setShowEditPwd(false);
    setEditUser(username);
    setEditPwd(password);
    setEditFolder(folder || "");
    setEditNotes(notes || "");
    setEditRecoveryQuestions(recovery_questions || []);
  };

  return (
    <div className="group" ref={setNodeRef} style={style}>
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="px-5 py-4 bg-zinc-800/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-white/[0.06]"
                  style={{
                    backgroundColor: color + "14",
                    color,
                    boxShadow: `0 0 12px ${color}18`,
                  }}
                >
                  {letter.toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-semibold text-zinc-100 tracking-tight">
                    {website}
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Editing credentials
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
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                <input
                  value={editUser}
                  onChange={(e) => setEditUser(e.target.value)}
                  placeholder="Username"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150"
                />
              </div>
              <div className="relative">
                {showEditPwd && editPwd && (
                  <div className="pointer-events-none absolute inset-0 flex items-center pl-3.5 pr-10 text-sm font-mono overflow-hidden whitespace-nowrap">
                    <ColoredPassword password={editPwd} />
                  </div>
                )}
                <input
                  type={showEditPwd ? "text" : "password"}
                  value={editPwd}
                  onChange={(e) => setEditPwd(e.target.value)}
                  placeholder="Password"
                  className={cn(
                    "w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-3.5 pr-10 py-2.5 text-sm font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150",
                    showEditPwd && editPwd ? "text-transparent caret-zinc-100" : "text-zinc-100"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPwd(!showEditPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors duration-150"
                  aria-label={showEditPwd ? "Hide password" : "Show password"}
                >
                  {showEditPwd ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <PasswordStrengthIndicator password={editPwd} className="-mt-0.5" />
              <div className="relative">
                <FolderOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                <select
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150 cursor-pointer"
                >
                  <option value="">No folder</option>
                  {folders.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5 mt-2">
                  Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes"
                  rows={3}
                  maxLength={10000}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150 resize-none"
                />
              </div>
              <RecoveryQuestionsSection
                questions={editRecoveryQuestions}
                editing
                onChange={setEditRecoveryQuestions}
              />
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
            <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/30 transition-colors duration-150">
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

              <div
                className="relative w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-white/[0.06]"
                style={{
                  backgroundColor: color + "14",
                  color,
                  boxShadow: `0 0 12px ${color}18`,
                }}
              >
                {letter.toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-100 truncate tracking-tight">
                  {website}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-zinc-500 truncate">
                    {username}
                  </span>
                  {folder && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-400 shrink-0">
                      <FolderOpen className="w-2.5 h-2.5" />
                      {folder}
                    </span>
                  )}
                  {breachCount != null && breachCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 shrink-0"
                      title={`Found in ${breachCount.toLocaleString()} breach${breachCount === 1 ? "" : "es"}`}
                    >
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Breached
                    </span>
                  )}
                  {breachCount === 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-400 shrink-0">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Safe
                    </span>
                  )}
                  {breachCount === -1 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-500 shrink-0">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Unknown
                    </span>
                  )}
                </div>
                {(notes || (recovery_questions && recovery_questions.length > 0)) && (
                  <div className="flex items-center gap-1 mt-1">
                    {notes && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                        <StickyNote className="w-2.5 h-2.5" />
                        Note
                      </span>
                    )}
                    {recovery_questions && recovery_questions.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
                        <HelpCircle className="w-2.5 h-2.5" />
                        {recovery_questions.length} Q&A
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center">
                  {showPwd ? (
                    <code className="text-xs font-mono max-w-[140px] truncate bg-zinc-800/50 px-2.5 py-1 rounded-md border border-zinc-800/80">
                      <ColoredPassword password={password} />
                    </code>
                  ) : (
                    <span className="inline-flex items-center gap-px text-zinc-600 bg-zinc-800/40 px-2.5 py-1 rounded-md border border-zinc-800/60">
                      <span className="text-[10px] tracking-[0.18em]">
                        ••••••••
                      </span>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowPwd(!showPwd)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors duration-150"
                  title={showPwd ? "Hide password" : "Show password"}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors duration-150",
                    copied
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                  )}
                  title="Copy password"
                  aria-label="Copy password"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditUser(username);
                    setEditPwd(password);
                    setEditFolder(folder || "");
                    setEditNotes(notes || "");
                    setEditRecoveryQuestions(recovery_questions || []);
                    setEditing(true);
                  }}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors duration-150"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  className={cn(
                    "p-1.5 rounded-lg transition-all duration-150",
                    confirmDelete
                      ? "text-red-400 bg-red-500/10 ring-1 ring-red-500/20"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                  )}
                  title={confirmDelete ? "Click again to confirm" : "Delete"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}