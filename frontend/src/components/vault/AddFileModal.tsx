import { useState, useMemo, useRef, type FormEvent, type DragEvent } from "react";
import { Upload, FolderOpen, Plus } from "lucide-react";
import { apiUploadFileWithFields } from "../../api";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Select from "../ui/Select";
import { useToast } from "../ui/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  folders: string[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AddFileModal({ open, onClose, onSaved, folders }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [folder, setFolder] = useState("");
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const folderOptions = useMemo(() => [
    { value: "", label: "None" },
    ...folders.map((f) => ({ value: f, label: f, icon: <FolderOpen className="w-3.5 h-3.5 text-text-muted" /> })),
    { value: "__new__", label: "+ New folder...", icon: <Plus className="w-3.5 h-3.5 text-accent" /> },
  ], [folders]);

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
      return;
    }
    setError("");
    setFile(selectedFile);
    if (!label.trim()) {
      setLabel(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please select a file");
      return;
    }
    if (!label.trim()) {
      setError("Label is required");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
      return;
    }

    setLoading(true);
    const fields: Record<string, string> = { label: label.trim() };
    const trimmedDescription = description.trim();
    if (trimmedDescription) fields.description = trimmedDescription;
    const trimmedFolder = folder.trim();
    if (trimmedFolder) fields.folder = trimmedFolder;

    const res = await apiUploadFileWithFields("/files/", file, fields);
    setLoading(false);

    if (res?.ok) {
      toast("success", "File uploaded to vault");
      resetForm();
      onSaved();
    } else {
      const errData = res?.data as { error?: string } | undefined;
      setError(errData?.error || "Failed to upload file");
    }
  };

  const resetForm = () => {
    setFile(null);
    setLabel("");
    setDescription("");
    setFolder("");
    setIsNewFolder(false);
    setError("");
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Upload Secure File">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-150 ${
            dragOver
              ? "border-accent bg-accent/10"
              : file
                ? "border-accent/50 bg-accent/5"
                : "border-border hover:border-border bg-surface-raised/50"
          }`}
        >
          <Upload className={`w-8 h-8 ${file ? "text-accent-text" : "text-text-muted"}`} />
          {file ? (
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary truncate max-w-[280px]">
                {file.name}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {formatFileSize(file.size)}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-text-secondary">
                Drop a file here or click to browse
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Max size: {formatFileSize(MAX_FILE_SIZE)}
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          />
        </div>

        <Input
          placeholder="File label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <div>
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors duration-150 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">
            Folder (optional)
          </label>
          <Select
            value={isNewFolder ? "__new__" : folder}
            onChange={(val) => {
              if (val === "__new__") {
                setIsNewFolder(true);
                setFolder("");
              } else {
                setIsNewFolder(false);
                setFolder(val);
              }
            }}
            options={folderOptions}
            placeholder="None"
          />
          {isNewFolder && (
            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="Folder name"
              maxLength={50}
              className="mt-2 w-full bg-surface-raised border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors duration-150"
            />
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-600/10 border border-red-600/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Upload
          </Button>
        </div>
      </form>
    </Modal>
  );
}