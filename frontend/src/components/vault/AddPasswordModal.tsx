import { useState, type FormEvent } from "react";
import { Wand2 } from "lucide-react";
import { apiFetch } from "../../api";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";
import { useClipboard } from "../../hooks/useClipboard";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddPasswordModal({ open, onClose, onSaved }: Props) {
  const [website, setWebsite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { copy } = useClipboard();

  const handleGenerate = async () => {
    const res = await apiFetch<{ password: string }>("/generate?length=16");
    if (res?.ok) {
      setPassword(res.data.password);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!website || !username) {
      setError("Website and username are required");
      return;
    }

    setLoading(true);
    const body: Record<string, string> = { website, username };
    if (password) body.password = password;

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
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <Input
              type="password"
              placeholder="Password (blank = auto-generate)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleGenerate}
            icon={<Wand2 className="w-4 h-4" />}
            className="shrink-0"
          />
        </div>

        {password && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
            <code className="text-xs font-mono text-zinc-300 break-all">
              {password}
            </code>
          </div>
        )}

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