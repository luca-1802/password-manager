import { useState, useRef, type DragEvent } from "react";
import { Upload, FileText, X } from "lucide-react";
import { apiUploadFile, apiUploadFileWithFields } from "../../api";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportModal({ open, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [encPassword, setEncPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isEncFile = file?.name.toLowerCase().endsWith(".enc") ?? false;

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "json" && ext !== "csv" && ext !== "enc") {
      toast("error", "Only .json, .csv, and .enc files are supported");
      return;
    }
    setFile(f);
    setEncPassword("");
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleImport = async () => {
    if (!file) return;
    if (isEncFile && !encPassword) {
      toast("error", "Password is required for encrypted files");
      return;
    }
    setLoading(true);

    const res = isEncFile
      ? await apiUploadFileWithFields("/passwords/import/", file, {
          password: encPassword,
        })
      : await apiUploadFile("/passwords/import/", file);

    if (res?.ok) {
      const data = res.data as { imported?: number; skipped?: number };
      const parts: string[] = [];
      if (data.imported) parts.push(`${data.imported} imported`);
      if (data.skipped) parts.push(`${data.skipped} skipped`);
      toast("success", parts.length > 0 ? parts.join(", ") : "Import complete");
      onImported();
      handleClose();
    } else {
      const errData = res?.data as {
        error?: string;
        details?: string[];
      } | null;
      if (errData?.details?.length) {
        toast("error", errData.details[0] ?? "Import failed");
      } else {
        toast("error", errData?.error || "Import failed");
      }
    }

    setLoading(false);
  };

  const handleClose = () => {
    setFile(null);
    setEncPassword("");
    setDragOver(false);
    onClose();
  };

  const ext = file?.name.split(".").pop()?.toUpperCase();

  return (
    <Modal open={open} onClose={handleClose} title="Import Passwords">
      <div className="space-y-5">
        <p className="text-xs text-zinc-500">
          Import passwords from a JSON, CSV, or encrypted (.enc) file. Exact
          duplicates will be skipped.
        </p>

        {!file ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              dragOver
                ? "border-orange-500/50 bg-orange-500/5"
                : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30"
            }`}
          >
            <Upload
              className={`w-8 h-8 ${
                dragOver ? "text-orange-400" : "text-zinc-600"
              }`}
            />
            <div className="text-center">
              <p className="text-sm text-zinc-400">
                Drop a file here or{" "}
                <span className="text-orange-400">browse</span>
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                .json, .csv, or .enc
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".json,.csv,.enc"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-800 rounded-lg">
              <FileText className="w-5 h-5 text-orange-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{file.name}</p>
                <p className="text-xs text-zinc-500">
                  {ext} file &middot;{" "}
                  {file.size < 1024
                    ? `${file.size} B`
                    : `${(file.size / 1024).toFixed(1)} KB`}
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isEncFile && (
              <Input
                type="password"
                label="Decryption password"
                value={encPassword}
                onChange={(e) => setEncPassword(e.target.value)}
                placeholder="Enter the export password"
              />
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            loading={loading}
            disabled={!file || (isEncFile && !encPassword)}
            icon={<Upload className="w-4 h-4" />}
          >
            Import
          </Button>
        </div>
      </div>
    </Modal>
  );
}