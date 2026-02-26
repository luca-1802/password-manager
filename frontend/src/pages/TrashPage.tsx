import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, KeyRound, StickyNote, File, RotateCcw, AlertTriangle } from "lucide-react";
import { useTrash } from "../hooks/useTrash";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { useAutoLockOnHidden } from "../hooks/useAutoLockOnHidden";
import { useVisibilityLock } from "../hooks/useVisibilityLock";
import { useToast } from "../components/ui/Toast";
import AppShell from "../components/layout/AppShell";
import TopNav from "../components/layout/TopNav";
import BottomNav from "../components/layout/BottomNav";
import Button from "../components/ui/Button";
import type { TrashItem, Credential, SecureNote, SecureFile } from "../types";

interface Props {
  onLogout: () => void;
}

function daysFromNow(isoDate: string): number {
  const now = Date.now();
  const target = new Date(isoDate).getTime();
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

function daysSince(isoDate: string): number {
  const now = Date.now();
  const target = new Date(isoDate).getTime();
  return Math.max(0, Math.round((now - target) / (1000 * 60 * 60 * 24)));
}

function getTypeIcon(type: string) {
  switch (type) {
    case "password":
      return <KeyRound className="w-5 h-5 text-brand-primary" aria-hidden="true" />;
    case "note":
      return <StickyNote className="w-5 h-5 text-warning" aria-hidden="true" />;
    case "file":
      return <File className="w-5 h-5 text-info" aria-hidden="true" />;
    default:
      return <Trash2 className="w-5 h-5 text-text-muted" aria-hidden="true" />;
  }
}

function getEntrySummary(item: TrashItem): string {
  if (item.entry_type === "password") {
    const cred = item.entry as Credential;
    return cred.username || "";
  }
  if (item.entry_type === "note") {
    const note = item.entry as SecureNote;
    const preview = note.content || "";
    return preview.length > 60 ? preview.slice(0, 60) + "..." : preview;
  }
  if (item.entry_type === "file") {
    const file = item.entry as SecureFile;
    return file.original_name || "";
  }
  return "";
}

function TrashItemRow({
  item,
  onRestore,
  onDelete,
}: {
  item: TrashItem;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleted = daysSince(item.deleted_at);
  const expires = daysFromNow(item.expires_at);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    onDelete(item.id);
  };

  return (
    <div className="group bg-surface/50 backdrop-blur-sm border border-border-subtle rounded-2xl p-4 sm:p-5 hover:border-border hover:shadow-sm transition-all duration-200">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-surface-sunken flex items-center justify-center flex-shrink-0">
          {getTypeIcon(item.entry_type)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {item.original_key}
          </p>
          <p className="text-xs text-text-muted truncate mt-0.5">
            {getEntrySummary(item)}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
            <span>
              Deleted {deleted === 0 ? "today" : deleted === 1 ? "1 day ago" : `${deleted} days ago`}
            </span>
            <span className="text-border-subtle">|</span>
            <span className={expires <= 3 ? "text-danger" : ""}>
              {expires <= 0
                ? "Expiring soon"
                : expires === 1
                  ? "Expires in 1 day"
                  : `Expires in ${expires} days`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRestore(item.id)}
            aria-label={`Restore ${item.original_key}`}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Restore
          </Button>
          <Button
            variant={confirmDelete ? "danger" : "secondary"}
            size="sm"
            onClick={handleDelete}
            aria-label={confirmDelete ? `Confirm delete ${item.original_key} forever` : `Delete ${item.original_key} forever`}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {confirmDelete ? "Confirm?" : "Delete Forever"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TrashPage({ onLogout }: Props) {
  const navigate = useNavigate();
  const { items, loading, loadTrash, restore, permanentDelete, emptyAll } = useTrash();
  const { toast } = useToast();
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  useInactivityTimeout(onLogout);
  const { autoLockOnHidden } = useAutoLockOnHidden();
  useVisibilityLock(onLogout, autoLockOnHidden);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const handleNavigate = (page: string) => {
    if (page === "vault") navigate("/vault");
    else if (page === "dashboard") navigate("/dashboard");
    else if (page === "generator") navigate("/generator");
    else if (page === "settings") navigate("/settings");
  };

  const handleRestore = async (id: string) => {
    const res = await restore(id);
    if (res?.ok) {
      toast("success", "Item restored to vault");
    } else {
      toast("error", "Failed to restore item");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const res = await permanentDelete(id);
    if (res?.ok) {
      toast("success", "Item permanently deleted");
    } else {
      toast("error", "Failed to delete item");
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirmEmpty) {
      setConfirmEmpty(true);
      setTimeout(() => setConfirmEmpty(false), 3000);
      return;
    }
    const res = await emptyAll();
    if (res?.ok) {
      toast("success", "Trash emptied");
      setConfirmEmpty(false);
    } else {
      toast("error", "Failed to empty trash");
    }
  };

  return (
    <AppShell
      topNav={
        <TopNav
          activePage="trash"
          onNavigate={handleNavigate}
          onLock={onLogout}
          onSearch={() => navigate("/vault")}
        />
      }
      bottomNav={
        <BottomNav
          activePage="trash"
          onNavigate={handleNavigate}
        />
      }
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Trash</h1>
            <p className="text-text-secondary mt-2 text-base">
              {items.length === 0
                ? "No items in trash"
                : `${items.length} ${items.length === 1 ? "item" : "items"} in trash`}
            </p>
          </div>
          {items.length > 0 && (
            <Button
              variant="danger"
              onClick={handleEmptyTrash}
              aria-label={confirmEmpty ? "Confirm empty trash" : "Empty trash"}
            >
              {confirmEmpty && (
                <AlertTriangle className="w-4 h-4 mr-1.5" aria-hidden="true" />
              )}
              {confirmEmpty ? "Confirm Empty?" : "Empty Trash"}
            </Button>
          )}
        </div>

        {loading && items.length === 0 && (
          <div className="flex items-center justify-center py-20" role="status" aria-label="Loading trash items">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
            <span className="sr-only">Loading...</span>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-sunken flex items-center justify-center mb-5">
              <Trash2 className="w-8 h-8 text-text-muted/40" aria-hidden="true" />
            </div>
            <p className="text-lg font-medium text-text-muted">Trash is empty</p>
            <p className="text-sm text-text-muted/70 mt-2">
              Deleted items will appear here for 30 days before being permanently removed.
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => (
              <TrashItemRow
                key={item.id}
                item={item}
                onRestore={handleRestore}
                onDelete={handlePermanentDelete}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}