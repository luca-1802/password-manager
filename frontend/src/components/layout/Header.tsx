import { Lock, Settings } from "lucide-react";
import Button from "../ui/Button";

interface Props {
  entryCount: number;
  onSettings: () => void;
  onLock: () => void;
}

export default function Header({
  entryCount,
  onSettings,
  onLock,
}: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-bg/95 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium text-zinc-300 tracking-wider">vault</span>
          {entryCount > 0 && (
            <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
              {entryCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettings}
            icon={<Settings className="w-3.5 h-3.5" />}
            className="text-zinc-500"
          >
            Settings
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