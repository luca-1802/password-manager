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
import type { VaultItem, RecoveryQuestion, PasswordHistoryEntry } from "../../types";
import { useClipboard } from "../../hooks/useClipboard";
import ColoredPassword from "../ui/ColoredPassword";
import PasswordStrengthIndicator from "../ui/PasswordStrengthIndicator";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

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

function CopyButton({ onCopy, isCopied }: { onCopy: () => void; isCopied?: boolean }) {
  return (
    <button
      onClick={onCopy}
      className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors"
    >
      {isCopied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function FieldRow({
  label,
  value,
  onCopy,
  isCopied,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  isCopied?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-text-primary break-all">{value}</span>
        {onCopy && <CopyButton onCopy={onCopy} isCopied={isCopied} />}
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
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle flex-shrink-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold"
          style={{ backgroundColor: letterColor }}
        >
          {item.key[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-text-primary truncate">
            {item.key}
          </h2>
          <p className="text-xs text-text-muted capitalize">{item.type}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {!editing && item.type === "password" && breachCount !== undefined && breachCount !== null && (
          <div>
            {breachCount > 0 ? (
              <Badge variant="danger">Found in {breachCount.toLocaleString()} breaches</Badge>
            ) : (
              <Badge variant="success">No breaches found</Badge>
            )}
          </div>
        )}

        {item.type === "password" && item.credential && !editing && (
          <>
            <FieldRow
              label="Username"
              value={item.credential.username}
              onCopy={() => copy(item.credential!.username)}
              isCopied={copied}
            />
            <div>
              <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
                Password
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-sm bg-surface-sunken rounded-lg px-3 py-2 border border-border-subtle">
                  {showPassword ? (
                    <ColoredPassword password={item.credential.password} />
                  ) : (
                    <span className="text-text-muted">{"*".repeat(12)}</span>
                  )}
                </div>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <CopyButton onCopy={() => copy(item.credential!.password)} isCopied={copied} />
              </div>
              <PasswordStrengthIndicator password={item.credential.password} className="mt-1" />
            </div>
            {item.credential.folder && (
              <FieldRow label="Folder" value={item.credential.folder} />
            )}
          </>
        )}

        {item.type === "note" && item.note && !editing && (
          <>
            <div>
              <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
                Content
              </p>
              <div className="bg-surface-sunken rounded-lg px-3 py-2 border border-border-subtle">
                <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">
                  {item.note.content}
                </p>
              </div>
            </div>
            {item.note.folder && (
              <FieldRow label="Folder" value={item.note.folder} />
            )}
          </>
        )}

        {item.type === "file" && item.file && !editing && (
          <>
            <FieldRow label="File Name" value={item.file.original_name} />
            <FieldRow label="Size" value={formatFileSize(item.file.size)} />
            <FieldRow label="Uploaded" value={new Date(item.file.uploaded_at).toLocaleDateString()} />
            {item.file.description && (
              <FieldRow label="Description" value={item.file.description} />
            )}
            {item.file.folder && (
              <FieldRow label="Folder" value={item.file.folder} />
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDownloadFile(item.key, item.index)}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Download
            </Button>
          </>
        )}

        {editing && (
          <div className="space-y-3">
            {item.type === "password" && (
              <>
                {breachCount !== undefined && breachCount !== null && breachCount > 0 && (
                  <div className="flex items-start gap-2.5 bg-red-600/10 border border-red-600/20 rounded-lg px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-danger">
                        Found in {breachCount.toLocaleString()} {breachCount === 1 ? "breach" : "breaches"}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Change this password to something strong and unique.
                      </p>
                    </div>
                  </div>
                )}
                <Input label="Username" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                <Input label="Password" type="password" value={editPassword} onChange={(e) => setEditPasswordVal(e.target.value)} />
                <Input label="Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </>
            )}
            {item.type === "note" && (
              <div>
                <label className={cn("block text-sm font-medium text-text-secondary mb-1.5")}>Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full bg-surface-sunken border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors resize-none"
                />
              </div>
            )}
            {item.type === "file" && (
              <Input label="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            )}
            <div>
              <label className={cn("block text-sm font-medium text-text-secondary mb-1.5")}>Folder</label>
              <Select
                value={editFolder}
                onChange={(val) => setEditFolder(val)}
                options={folderOptions}
                placeholder="No folder"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {!editing && (item.type === "password" || item.type === "note") && (
          <>
            {((item.type === "password" && item.credential?.recovery_questions?.length) ||
              (item.type === "note" && item.note?.recovery_questions?.length)) && (
              <button
                onClick={() => setRecoveryExpanded(!recoveryExpanded)}
                className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
              >
                {recoveryExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Recovery Questions
              </button>
            )}
            {recoveryExpanded && (
              <div className="space-y-2 pl-4">
                {(item.type === "password"
                  ? item.credential?.recovery_questions
                  : item.note?.recovery_questions
                )?.map((rq, i) => (
                  <div key={i} className="text-xs">
                    <p className="text-text-muted">{rq.question}</p>
                    <p className="text-text-secondary">{rq.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!editing && item.type === "password" && item.credential?.notes && (
          <>
            <button
              onClick={() => setNotesExpanded(!notesExpanded)}
              className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
            >
              {notesExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Notes
            </button>
            {notesExpanded && (
              <div className="bg-surface-sunken rounded-lg px-3 py-2 border border-border-subtle">
                <p className="text-xs text-text-secondary whitespace-pre-wrap">{item.credential.notes}</p>
              </div>
            )}
          </>
        )}
        {!editing && item.type === "password" && item.credential?.history && item.credential.history.length > 0 && (
          <>
            <button
              onClick={() => setHistoryExpanded(!historyExpanded)}
              className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
            >
              {historyExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <History className="w-3 h-3" />
              Password History ({item.credential.history.length})
            </button>
            {historyExpanded && (
              <div className="space-y-2 pl-4">
                {[...item.credential.history].reverse().map((entry, i) => (
                  <div
                    key={i}
                    className="bg-surface-sunken rounded-lg px-3 py-2 border border-border-subtle"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-mono text-xs">
                        {historyPasswordVisible.has(i) ? (
                          <span className="text-text-secondary break-all">{entry.password}</span>
                        ) : (
                          <span className="text-text-muted">{"*".repeat(12)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleHistoryPassword(i)}
                        className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors"
                      >
                        {historyPasswordVisible.has(i) ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </button>
                      <CopyButton
                        onCopy={() => copy(entry.password)}
                        isCopied={copied}
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span className="text-[10px] text-text-muted">
                        {new Date(entry.changed_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-2 px-5 py-3 border-t border-border-subtle flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={startEditing}
            icon={<Pencil className="w-3.5 h-3.5" />}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            {confirmDelete ? "Confirm" : "Delete"}
          </Button>
        </div>
      )}
    </div>
  );
}