import { useState } from "react";
import { RefreshCw, Copy, Check } from "lucide-react";
import { apiFetch } from "../../api";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";
import { useClipboard } from "../../hooks/useClipboard";
import { cn } from "../../lib/utils";
import ColoredPassword from "../ui/ColoredPassword";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GeneratePasswordModal({ open, onClose }: Props) {
  const [length, setLength] = useState(19);
  const [password, setPassword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [includeSpecial, setIncludeSpecial] = useState(true);
  const { toast } = useToast();
  const { copy, copied } = useClipboard();

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await apiFetch<{ password: string }>(
      `/generate?length=${length}&special=${includeSpecial}`
    );
    if (res?.ok) {
      setPassword(res.data.password);
    } else {
      toast("error", "Failed to generate password");
    }
    setGenerating(false);
  };

  const handleCopy = async () => {
    await copy(password);
    toast("success", "Password copied to clipboard");
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate Password">
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-zinc-400">
              Length
            </label>
            <span className="text-sm font-mono font-bold text-zinc-200">
              {length}
            </span>
          </div>
          <input
            type="range"
            min="4"
            max="64"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-zinc-600">4</span>
            <span className="text-[11px] text-zinc-600">64</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label
            htmlFor="include-special"
            className="text-sm font-medium text-zinc-400"
          >
            Special characters
          </label>
          <button
            id="include-special"
            type="button"
            role="switch"
            aria-checked={includeSpecial}
            onClick={() => setIncludeSpecial(!includeSpecial)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
              includeSpecial ? "bg-orange-500" : "bg-zinc-700"
            )}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200",
                includeSpecial ? "translate-x-[18px]" : "translate-x-[3px]"
              )}
            />
          </button>
        </div>

        <Button
          onClick={handleGenerate}
          loading={generating}
          icon={<RefreshCw className="w-4 h-4" />}
          className="w-full"
        >
          Generate
        </Button>

        {password && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <code className="block text-sm font-mono break-all leading-relaxed">
              <ColoredPassword password={password} />
            </code>
            <div className="flex justify-end mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                icon={
                  copied ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )
                }
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}