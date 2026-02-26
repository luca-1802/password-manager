import { useState, useEffect, useMemo, type FormEvent } from "react";
import { Wand2, Eye, EyeOff, FolderOpen, Plus } from "lucide-react";
import { apiFetch } from "../../api";
import { cn } from "../../lib/utils";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Select from "../ui/Select";
import { useToast } from "../ui/Toast";
import { useClipboard } from "../../hooks/useClipboard";
import PasswordStrengthIndicator from "../ui/PasswordStrengthIndicator";
import RecoveryQuestionsSection from "./RecoveryQuestionsSection";
import type { RecoveryQuestion } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  folders: string[];
  defaultFolder?: string;
}

export default function AddPasswordModal({ open, onClose, onSaved, folders, defaultFolder }: Props) {
  const [website, setWebsite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [folder, setFolder] = useState("");
  const [notes, setNotes] = useState("");
  const [recoveryQuestions, setRecoveryQuestions] = useState<RecoveryQuestion[]>([]);
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { copy } = useClipboard();

  useEffect(() => {
    if (open && defaultFolder) setFolder(defaultFolder);
  }, [open, defaultFolder]);

  const folderOptions = useMemo(() => [
    { value: "", label: "None" },
    ...folders.map((f) => ({ value: f, label: f, icon: <FolderOpen className="w-3.5 h-3.5 text-text-muted" /> })),
    { value: "__new__", label: "New folder...", icon: <Plus className="w-3.5 h-3.5 text-accent" /> },
  ], [folders]);

  const handleGenerate = async () => {
    const res = await apiFetch<{ password: string }>("/generate?length=16");
    if (res?.ok) {
      setPassword(res.data.password);
    } else {
      toast("error", "Failed to generate password");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!website) {
      setError("Website is required");
      return;
    }

    setLoading(true);
    const body: Record<string, unknown> = { website };
    if (username.trim()) body.username = username;
    if (password) body.password = password;
    const trimmedFolder = folder.trim();
    if (trimmedFolder) body.folder = trimmedFolder;
    if (notes.trim()) body.notes = notes.trim();
    const filteredRq = recoveryQuestions.filter(q => q.question.trim() && q.answer.trim());
    if (filteredRq.length > 0) body.recovery_questions = filteredRq;

    const res = await apiFetch<{ success: boolean; password?: string }>(
      "/passwords/",
      { method: "POST", body }
    );
    setLoading(false);

    if (res?.ok) {
      const generatedPwd =
        !password && res.data.password ? res.data.password : null;
      if (generatedPwd) {
        await copy(generatedPwd);
        toast("success", "Password generated and copied");
      } else {
        toast("success", "Password saved to vault");
      }
      resetForm();
      onSaved();
    } else {
      const errData = res?.data as { error?: string } | undefined;
      setError(errData?.error || "Failed to save");
    }
  };

  const resetForm = () => {
    setWebsite("");
    setUsername("");
    setPassword("");
    setFolder("");
    setNotes("");
    setRecoveryQuestions([]);
    setIsNewFolder(false);
    setShowPassword(false);
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          placeholder="Website / App"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          autoFocus
        />
        <Input
          placeholder="Username (optional)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password (blank = auto-generate)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                className={cn(
                  "w-full bg-surface-sunken border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors duration-150 pr-10",
                  password && showPassword && "font-mono"
                )}
              />
              {password && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors duration-150 z-10"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleGenerate}
            icon={<Wand2 className="w-4 h-4" />}
            className="shrink-0 h-[40px]"
          />
        </div>

        <PasswordStrengthIndicator password={password} />

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">
            Notes (optional)
          </label>
          <textarea
            placeholder="Add notes, recovery info, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={10000}
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors duration-150 resize-none"
          />
        </div>

        <RecoveryQuestionsSection
          questions={recoveryQuestions}
          editing
          onChange={setRecoveryQuestions}
        />

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
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}