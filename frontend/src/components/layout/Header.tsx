import { Plus, Wand2, Lock, Shield } from "lucide-react";
import Button from "../ui/Button";

interface Props {
  passwordCount: number;
  onAdd: () => void;
  onGenerate: () => void;
  onLock: () => void;
  onTwoFactor: () => void;
  twoFactorEnabled: boolean;
}

export default function Header({
  passwordCount,
  onAdd,
  onGenerate,
  onLock,
  onTwoFactor,
  twoFactorEnabled,
}: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-bg/95 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium text-zinc-300 tracking-wider">vault</span>
          {passwordCount > 0 && (
            <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
              {passwordCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerate}
            icon={<Wand2 className="w-3.5 h-3.5" />}
          >
            Generate
          </Button>
          <Button
            size="sm"
            onClick={onAdd}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add
          </Button>
          <div className="w-px h-5 bg-zinc-800 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onTwoFactor}
            icon={<Shield className="w-3.5 h-3.5" />}
            className={twoFactorEnabled ? "text-green-500 hover:text-green-400" : "text-zinc-500"}
          >
            2FA
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLock}
            icon={<Lock className="w-3.5 h-3.5" />}
            className="text-zinc-500 hover:text-red-500"
          >
            Lock
          </Button>
        </div>
      </div>
    </header>
  );
}