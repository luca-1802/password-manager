import { useState, type FormEvent } from "react";
import { apiFetch } from "../../api";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";
import RecoveryQuestionsSection from "./RecoveryQuestionsSection";
import type { RecoveryQuestion } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  folders: string[];
}

export default function AddNoteModal({ open, onClose, onSaved, folders }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folder, setFolder] = useState("");
  const [recoveryQuestions, setRecoveryQuestions] = useState<RecoveryQuestion[]>([]);
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    setLoading(true);
    const body: Record<string, unknown> = { title: title.trim(), content: content.trim() };
    const trimmedFolder = folder.trim();
    if (trimmedFolder) body.folder = trimmedFolder;
    const filteredRq = recoveryQuestions.filter(q => q.question.trim() && q.answer.trim());
    if (filteredRq.length > 0) body.recovery_questions = filteredRq;

    const res = await apiFetch<{ success: boolean }>(
      "/notes/",
      { method: "POST", body }
    );
    setLoading(false);

    if (res?.ok) {
      toast("success", "Note saved to vault");
      resetForm();
      onSaved();
    } else {
      const errData = res?.data as { error?: string } | undefined;
      setError(errData?.error || "Failed to save");
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setFolder("");
    setRecoveryQuestions([]);
    setIsNewFolder(false);
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Secure Note">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          placeholder="Note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <div>
          <textarea
            placeholder="Write your secure note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            maxLength={10000}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-colors duration-150 resize-none"
          />
        </div>

        <RecoveryQuestionsSection
          questions={recoveryQuestions}
          editing
          onChange={setRecoveryQuestions}
        />

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
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
