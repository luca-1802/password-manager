import { useDraggable } from "@dnd-kit/core";
import { KeyRound, FileText, File, GripVertical, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";
import { getLetterColor } from "../../lib/utils";
import type { VaultItem } from "../../types";

interface VaultItemRowProps {
  item: VaultItem;
  selected: boolean;
  onClick: () => void;
  breachCount?: number | null;
}

export default function VaultItemRow({ item, selected, onClick, breachCount }: VaultItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: {
      website: item.key,
      index: item.index,
      username: item.type === "password" ? item.credential?.username : "",
      password: item.type === "password" ? item.credential?.password : "",
      folder: item.folder,
      entryType: item.type,
    },
  });

  const letterColor = getLetterColor(item.key[0] || "a");
  const TypeIcon = item.type === "password" ? KeyRound : item.type === "note" ? FileText : File;

  const subtitle = item.type === "password"
    ? item.credential?.username || ""
    : item.type === "note"
    ? (item.note?.content?.slice(0, 50) || "Secure Note")
    : (item.file?.original_name || "File");

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-border-subtle",
        selected
          ? "bg-gold-glow border-l-2 border-l-accent"
          : "hover:bg-surface-hover border-l-2 border-l-transparent",
        isDragging && "opacity-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
        style={{ backgroundColor: letterColor }}
      >
        {item.key[0]?.toUpperCase() || "?"}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", selected ? "text-accent-text" : "text-text-primary")}>
          {item.key}
        </p>
        <p className="text-xs text-text-muted truncate">{subtitle}</p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {item.folder && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-muted border border-border-subtle">
            {item.folder}
          </span>
        )}
        {breachCount !== undefined && breachCount !== null && breachCount > 0 && (
          <AlertTriangle className="w-3.5 h-3.5 text-danger" />
        )}
        <TypeIcon className="w-3.5 h-3.5 text-text-muted" />
      </div>
    </div>
  );
}