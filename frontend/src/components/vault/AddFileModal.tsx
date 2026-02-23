import { useState, useRef, type FormEvent, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { apiUploadFileWithFields } from "../../api";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  folders: string[];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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
              ? "border-indigo-500 bg-indigo-500/10"
              : file
                ? "border-indigo-500/50 bg-indigo-500/5"
                : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/50"
          }`}
        >
          <Upload className={`w-8 h-8 ${file ? "text-indigo-400" : "text-zinc-500"}`} />
          {file ? (
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-200 truncate max-w-[280px]">
                {file.name}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {formatFileSize(file.size)}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-zinc-400">
                Drop a file here or click to browse
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
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
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Folder (optional)
          </label>
          <select
            value={isNewFolder ? "__new__" : folder}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setIsNewFolder(true);
                setFolder("");
              } else {
                setIsNewFolder(false);
                setFolder(e.target.value);
              }
            }}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150 cursor-pointer"
          >
            <option value="" className="bg-zinc-900 text-zinc-100">None</option>
            {folders.map((f) => (
              <option key={f} value={f} className="bg-zinc-900 text-zinc-100">
                {f}
              </option>
            ))}
            <option value="__new__" className="bg-zinc-900 text-zinc-100">+ New folder...</option>
          </select>
          {isNewFolder && (
            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="Folder name"
              maxLength={50}
              className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150"
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
