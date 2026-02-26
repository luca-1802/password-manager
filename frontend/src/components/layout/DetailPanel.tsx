import { useState, useCallback, useEffect, useMemo } from "react";
import {
  X,
  Copy,
  Check,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Download,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FolderOpen,
  History,
  Clock,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { getLetterColor } from "../../lib/utils";
import type { VaultItem, RecoveryQuestion } from "../../types";
import { useClipboard } from "../../hooks/useClipboard";
import ColoredPassword from "../ui/ColoredPassword";
import PasswordStrengthIndicator from "../ui/PasswordStrengthIndicator";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import styles from "../../styles/effects.module.scss";

interface DetailPanelProps {
  item: VaultItem;
  onClose: () => void;
  onEditPassword: (website: string, index: number, username: string, password: string, folder?: string | null, notes?: string | null, recovery_questions?: RecoveryQuestion[] | null) => Promise<unknown>;
  onDeletePassword: (website: string, index: number) => Promise<unknown>;
  onEditNote: (title: string, index: number, content?: string, folder?: string | null, recovery_questions?: RecoveryQuestion[] | null) => Promise<unknown>;
  onDeleteNote: (title: string, index: number) => Promise<unknown>;
  onEditFile: (label: string, index: number, description?: string, folder?: string | null) => Promise<unknown>;
  onDeleteFile: (label: string, index: number) => Promise<unknown>;
  onDownloadFile: (label: string, index: number) => Promise<unknown>;
  folders: string[];
  breachCount?: number | null;
}

function CopyButton({ onCopy, isCopied, label }: { onCopy: () => void; isCopied?: boolean; label?: string }) {
  return (
    <button
      onClick={onCopy}
      aria-label={label || "Copy to clipboard"}
      className="p-2 rounded-xl text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-all duration-200"
    >
      {isCopied ? <Check className="w-4 h-4 text-success" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
    </button>
  );
}

function FieldRow({
  label,
  value,
  onCopy,
  isCopied,
  copyLabel,
  className: extraClassName,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  isCopied?: boolean;
  copyLabel?: string;
  className?: string;
}) {
  const [flashCopy, setFlashCopy] = useState(false);

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
      setFlashCopy(true);
      setTimeout(() => setFlashCopy(false), 400);
    }
  };

  return (
    <div className={cn(
      "group relative bg-surface-sunken rounded-xl p-4 border border-border-subtle hover:border-border transition-all duration-200 shadow-sm",
      flashCopy && styles.copyFlash,
      extraClassName
    )}>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="flex items-center gap-4">
        <span className="flex-1 text-sm text-text-primary break-all font-mono">{value}</span>
        {onCopy && (
          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <CopyButton onCopy={handleCopy} isCopied={isCopied} label={copyLabel || `Copy ${label.toLowerCase()}`} />
          </div>
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DetailPanel({
  item,
  onClose,
  onEditPassword,
  onDeletePassword,
  onEditNote,
  onDeleteNote,
  onEditFile,
  onDeleteFile,
  onDownloadFile,
  folders,
  breachCount,
}: DetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [recoveryExpanded, setRecoveryExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyPasswordVisible, setHistoryPasswordVisible] = useState<Set<number>>(new Set());
  const { copied, copy } = useClipboard();
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPasswordVal] = useState("");
  const [editFolder, setEditFolder] = useState<string>("");
  const [editNotes, setEditNotes] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    setEditing(false);
    setShowPassword(false);
    setConfirmDelete(false);
    setNotesExpanded(false);
    setRecoveryExpanded(false);
    setHistoryExpanded(false);
    setHistoryPasswordVisible(new Set());
  }, [item.id]);

  const startEditing = useCallback(() => {
    if (item.type === "password" && item.credential) {
      setEditUsername(item.credential.username);
      setEditPasswordVal(item.credential.password);
      setEditFolder(item.credential.folder || "");
      setEditNotes(item.credential.notes || "");
    } else if (item.type === "note" && item.note) {
      setEditContent(item.note.content);
      setEditFolder(item.note.folder || "");
    } else if (item.type === "file" && item.file) {
      setEditDescription(item.file.description || "");
      setEditFolder(item.file.folder || "");
    }
    setEditing(true);
  }, [item]);

  const handleSave = async () => {
    if (item.type === "password") {
      await onEditPassword(
        item.key,
        item.index,
        editUsername,
        editPassword,
        editFolder || null,
        editNotes || null,
        item.credential?.recovery_questions
      );
    } else if (item.type === "note") {
      await onEditNote(
        item.key,
        item.index,
        editContent,
        editFolder || null,
        item.note?.recovery_questions
      );
    } else if (item.type === "file") {
      await onEditFile(item.key, item.index, editDescription, editFolder || null);
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    if (item.type === "password") {
      await onDeletePassword(item.key, item.index);
    } else if (item.type === "note") {
      await onDeleteNote(item.key, item.index);
    } else if (item.type === "file") {
      await onDeleteFile(item.key, item.index);
    }
    onClose();
  };

  const toggleHistoryPassword = useCallback((idx: number) => {
    setHistoryPasswordVisible((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const folderOptions = useMemo(() => [
    { value: "", label: "No folder" },
    ...folders.map((f) => ({ value: f, label: f, icon: <FolderOpen className="w-3.5 h-3.5 text-text-muted" /> })),
  ], [folders]);

  const letterColor = getLetterColor(item.key[0] || "a");

  return (
    <div className="h-full flex flex-col bg-surface/95 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-border-subtle flex-shrink-0 bg-surface/50">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-lg font-bold shadow-sm"
          style={{ backgroundColor: letterColor }}
          aria-hidden="true"
        >
          {item.key[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-text-primary truncate tracking-tight">
            {item.key}
          </h2>
          <p className="text-sm text-text-muted capitalize font-medium mt-0.5">{item.type}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          className="p-2 rounded-full text-text-secondary hover:bg-surface-hover transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className={cn("flex-1 overflow-y-auto px-6 py-6 space-y-6", styles.staggerContainer)}>
        {!editing && item.type === "password" && breachCount !== undefined && breachCount !== null && (
          <div
            className={cn(
              "p-4 rounded-xl border flex items-start gap-3 shadow-sm",
              breachCount > 0
                ? "bg-danger/5 border-danger/20 text-danger"
                : "bg-success/5 border-success/20 text-success"
            )}
            role={breachCount > 0 ? "alert" : "status"}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">
                {breachCount > 0 ? "Security Alert" : "Secure"}
              </p>
              <p className="text-xs mt-1 opacity-90">
                {breachCount > 0
                  ? `This password has appeared in ${breachCount.toLocaleString()} known data breaches. You should change it immediately.`
                  : "This password has not appeared in any known data breaches."}
              </p>
            </div>
          </div>
        )}

        {item.type === "password" && item.credential && !editing && (
          <>
            <FieldRow
              label="Username"
              value={item.credential.username}
              onCopy={() => copy(item.credential!.username)}
              isCopied={copied}
              copyLabel="Copy username"
            />
            <div className="group relative bg-surface-sunken rounded-xl p-4 border border-border-subtle hover:border-border transition-all duration-200 shadow-sm">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Password
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1 font-mono text-sm bg-surface rounded-lg px-4 py-3 border border-border-subtle shadow-inner">
                  {showPassword ? (
                    <ColoredPassword password={item.credential.password} />
                  ) : (
                    <span className="text-text-muted tracking-widest" aria-label="Password hidden">{"•".repeat(12)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="p-2 rounded-xl text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-all duration-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <CopyButton onCopy={() => copy(item.credential!.password)} isCopied={copied} label="Copy password" />
                  </div>
                </div>
              </div>
              <div className="mt-3 px-1">
                <PasswordStrengthIndicator password={item.credential.password} />
              </div>
            </div>
            {item.credential.folder && (
              <FieldRow label="Folder" value={item.credential.folder} />
            )}
          </>
        )}

        {item.type === "note" && item.note && !editing && (
          <>
            <div className="group relative bg-surface-sunken rounded-xl p-4 border border-border-subtle hover:border-border transition-all duration-200 shadow-sm">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Content
              </p>
              <div className="relative">
                <pre className="text-sm text-text-primary whitespace-pre-wrap font-sans bg-surface p-4 rounded-lg border border-border-subtle shadow-inner">
                  {item.note.content}
                </pre>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton onCopy={() => copy(item.note!.content)} isCopied={copied} label="Copy note content" />
                </div>
              </div>
            </div>
            {item.note.folder && (
              <FieldRow label="Folder" value={item.note.folder} />
            )}
          </>
        )}

        {item.type === "file" && item.file && !editing && (
          <div className="space-y-6">
            <FieldRow label="File Name" value={item.file.original_name} />
            {item.file.description && (
              <FieldRow label="Description" value={item.file.description} />
            )}
            <div className="bg-surface-sunken rounded-xl p-4 border border-border-subtle shadow-sm">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                File Details
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border-subtle/50">
                  <span className="text-text-muted">Size</span>
                  <span className="font-medium text-text-primary">{formatFileSize(item.file.size)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border-subtle/50">
                  <span className="text-text-muted">Type</span>
                  <span className="font-medium text-text-primary">{item.file.mime_type}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-text-muted">Uploaded</span>
                  <span className="font-medium text-text-primary">{new Date(item.file.uploaded_at).toLocaleString()}</span>
                </div>
              </div>
              <Button
                variant="primary"
                className="w-full mt-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                onClick={() => onDownloadFile(item.key, item.index)}
                aria-label={`Download ${item.file.original_name}`}
              >
                <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                Download File
              </Button>
            </div>
            {item.file.folder && (
              <FieldRow label="Folder" value={item.file.folder} />
            )}
          </div>
        )}

        {editing && (
          <div className="space-y-5 bg-surface-sunken p-5 rounded-xl border border-border-subtle shadow-inner">
            {item.type === "password" && (
              <>
                {breachCount !== undefined && breachCount !== null && breachCount > 0 && (
                  <div className="flex items-start gap-3 bg-danger/5 border border-danger/20 rounded-xl p-4 shadow-sm" role="alert">
                    <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-danger">
                        Found in {breachCount.toLocaleString()} {breachCount === 1 ? "breach" : "breaches"}
                      </p>
                      <p className="text-xs text-text-muted mt-1 opacity-90">
                        Change this password to something strong and unique.
                      </p>
                    </div>
                  </div>
                )}
                <Input label="Username" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                <Input label="Password" type="password" value={editPassword} onChange={(e) => setEditPasswordVal(e.target.value)} />
                <PasswordStrengthIndicator password={editPassword} />
                <div className="space-y-1.5">
                  <label htmlFor="edit-notes" className="block text-sm font-medium text-text-secondary">
                    Notes
                  </label>
                  <textarea
                    id="edit-notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 transition-all min-h-[100px] resize-y"
                    placeholder="Add secure notes..."
                  />
                </div>
              </>
            )}
            {item.type === "note" && (
              <div className="space-y-1.5">
                <label htmlFor="edit-content" className="block text-sm font-medium text-text-secondary">
                  Content
                </label>
                <textarea
                  id="edit-content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 transition-all min-h-[200px] resize-y"
                />
              </div>
            )}
            {item.type === "file" && (
              <Input label="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            )}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-secondary">Folder</label>
              <Select
                value={editFolder}
                onChange={setEditFolder}
                options={folderOptions}
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-border-subtle">
              <Button variant="primary" className="flex-1 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" onClick={handleSave}>Save Changes</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {!editing && (item.type === "password" || item.type === "note") && (
          <>
            {((item.type === "password" && item.credential?.recovery_questions?.length) ||
              (item.type === "note" && item.note?.recovery_questions?.length)) && (
              <div className="group relative bg-surface-sunken rounded-xl p-4 border border-border-subtle hover:border-border transition-all duration-200 shadow-sm">
                <button
                  onClick={() => setRecoveryExpanded(!recoveryExpanded)}
                  className="flex items-center justify-between w-full text-left"
                  aria-expanded={recoveryExpanded}
                >
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Recovery Questions ({(item.type === "password" ? item.credential?.recovery_questions?.length : item.note?.recovery_questions?.length)})
                  </p>
                  {recoveryExpanded ? (
                    <ChevronDown className="w-4 h-4 text-text-muted" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-muted" aria-hidden="true" />
                  )}
                </button>
                {recoveryExpanded && (
                  <div className="mt-4 space-y-4">
                    {(item.type === "password"
                      ? item.credential?.recovery_questions
                      : item.note?.recovery_questions
                    )?.map((rq, i) => (
                      <div key={i} className="bg-surface p-4 rounded-lg border border-border-subtle shadow-inner">
                        <p className="text-sm font-medium text-text-primary mb-2">{rq.question}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 font-mono text-sm bg-surface-sunken rounded-md px-3 py-2 border border-border-subtle">
                            {showPassword ? rq.answer : "•".repeat(8)}
                          </div>
                          <CopyButton onCopy={() => copy(rq.answer)} isCopied={copied} label="Copy recovery answer" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!editing && item.type === "password" && item.credential?.notes && (
          <div className="group relative bg-surface-sunken rounded-xl p-4 border border-border-subtle hover:border-border transition-all duration-200 shadow-sm">
            <button
              onClick={() => setNotesExpanded(!notesExpanded)}
              className="flex items-center justify-between w-full text-left"
              aria-expanded={notesExpanded}
            >
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Notes
              </p>
              {notesExpanded ? (
                <ChevronDown className="w-4 h-4 text-text-muted" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" aria-hidden="true" />
              )}
            </button>
            {notesExpanded && (
              <div className="mt-3 relative">
                <pre className="text-sm text-text-primary whitespace-pre-wrap font-sans bg-surface p-4 rounded-lg border border-border-subtle shadow-inner">
                  {item.credential.notes}
                </pre>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton onCopy={() => copy(item.credential!.notes!)} isCopied={copied} label="Copy notes" />
                </div>
              </div>
            )}
          </div>
        )}
        {!editing && item.type === "password" && item.credential?.history && item.credential.history.length > 0 && (
          <div className="group relative bg-surface-sunken rounded-xl p-4 border border-border-subtle hover:border-border transition-all duration-200 shadow-sm">
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="flex items-center justify-between w-full text-left"
              aria-expanded={historyExpanded}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-text-muted" aria-hidden="true" />
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Password History ({item.credential.history.length})
                </p>
              </div>
              {historyExpanded ? (
                <ChevronDown className="w-4 h-4 text-text-muted" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" aria-hidden="true" />
              )}
            </button>
            {historyExpanded && (
              <div className="mt-4 space-y-3">
                {[...item.credential.history].reverse().map((entry, i) => (
                  <div key={i} className="bg-surface p-4 rounded-lg border border-border-subtle shadow-inner">
                    <div className="flex items-center gap-2 mb-3 text-xs text-text-muted">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <time dateTime={entry.changed_at}>{new Date(entry.changed_at).toLocaleString()}</time>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-mono text-sm bg-surface-sunken rounded-md px-3 py-2 border border-border-subtle">
                        {historyPasswordVisible.has(i) ? (
                          <ColoredPassword password={entry.password} />
                        ) : (
                          <span className="text-text-muted tracking-widest">{"•".repeat(12)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleHistoryPassword(i)}
                        aria-label={historyPasswordVisible.has(i) ? "Hide historical password" : "Show historical password"}
                        className="p-2 rounded-lg text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-all duration-200"
                      >
                        {historyPasswordVisible.has(i) ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                      </button>
                      <CopyButton onCopy={() => copy(entry.password)} isCopied={copied} label="Copy historical password" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!editing && (
        <div className="p-5 border-t border-border-subtle bg-surface/50 flex gap-3 flex-shrink-0">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={startEditing}
            aria-label={`Edit ${item.key}`}
          >
            <Pencil className="w-4 h-4 mr-2" aria-hidden="true" />
            Edit
          </Button>
          <Button
            variant={confirmDelete ? "danger" : "secondary"}
            className="flex-1"
            onClick={handleDelete}
            aria-label={confirmDelete ? `Confirm move ${item.key} to trash` : `Move ${item.key} to trash`}
          >
            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
            {confirmDelete ? "Confirm?" : "Move to Trash"}
          </Button>
        </div>
      )}
    </div>
  );
}