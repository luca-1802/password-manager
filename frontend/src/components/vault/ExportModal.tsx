import { useState } from "react";
import { Download } from "lucide-react";
import { apiFetchRaw } from "../../api";
import { cn } from "../../lib/utils";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";
import type { ExportFormat } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  folders: string[];
}

export default function ExportModal({ open, onClose, folders }: Props) {
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(
    new Set()
  );
  const [includeUnfiled, setIncludeUnfiled] = useState(true);
  const [exportAll, setExportAll] = useState(true);
  const [format, setFormat] = useState<ExportFormat>("json");
  const [exportPassword, setExportPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const toggleFolder = (folder: string) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const canExport =
    format !== "encrypted" ||
    (exportPassword.length >= 8 && exportPassword === confirmPassword);

  const handleExport = async () => {
    if (!canExport) return;
    setLoading(true);
    const body: Record<string, unknown> = { format };
    if (!exportAll) {
      body.folders = Array.from(selectedFolders);
      body.include_unfiled = includeUnfiled;
    }
    if (format === "encrypted") {
      body.export_password = exportPassword;
    }

    try {
      const res = await apiFetchRaw("/passwords/export/", {
        method: "POST",
        body,
      });

      if (!res || !res.ok) {
        const errData = res ? await res.json().catch(() => null) : null;
        toast("error", errData?.error || "Export failed");
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const ext =
        format === "csv" ? "csv" : format === "encrypted" ? "enc" : "json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vault_export.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("success", "Export downloaded");
      onClose();
    } catch {
      toast("error", "Export failed");
    }
    setLoading(false);
  };

  const handleClose = () => {
    setSelectedFolders(new Set());
    setIncludeUnfiled(true);
    setExportAll(true);
    setFormat("json");
    setExportPassword("");
    setConfirmPassword("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Export Passwords">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Format
          </label>
          <div className="flex gap-2">
            {(["json", "csv", "encrypted"] as ExportFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={cn(
                  "px-4 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer",
                  format === f
                    ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
                    : "text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:bg-zinc-800/50"
                )}
              >
                {f === "encrypted" ? "ENCRYPTED" : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {format !== "encrypted" && (
          <p className="text-xs text-amber-500/80">
            Unencrypted exports contain plaintext passwords
          </p>
        )}

        {format === "encrypted" && (
          <div className="space-y-3">
            <Input
              type="password"
              label="Export password (min 8 characters)"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              placeholder="Enter export password"
            />
            <Input
              type="password"
              label="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm export password"
              error={
                confirmPassword && exportPassword !== confirmPassword
                  ? "Passwords do not match"
                  : undefined
              }
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Scope
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="radio"
                checked={exportAll}
                onChange={() => setExportAll(true)}
                className="accent-orange-500"
              />
              Export all passwords
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="radio"
                checked={!exportAll}
                onChange={() => setExportAll(false)}
                className="accent-orange-500"
              />
              Select folders
            </label>
          </div>
        </div>

        {!exportAll && (
          <div className="space-y-2 pl-3 border-l-2 border-zinc-800">
            {folders.length === 0 && (
              <p className="text-xs text-zinc-600">No folders created yet</p>
            )}
            {folders.map((folder) => (
              <label
                key={folder}
                className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer hover:text-zinc-300"
              >
                <input
                  type="checkbox"
                  checked={selectedFolders.has(folder)}
                  onChange={() => toggleFolder(folder)}
                  className="accent-orange-500"
                />
                {folder}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer hover:text-zinc-300">
              <input
                type="checkbox"
                checked={includeUnfiled}
                onChange={() => setIncludeUnfiled(!includeUnfiled)}
                className="accent-orange-500"
              />
              Unfiled passwords
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            loading={loading}
            disabled={!canExport}
            icon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
        </div>
      </div>
    </Modal>
  );
}