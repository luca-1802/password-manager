import { useDraggable } from "@dnd-kit/core";
import {
  KeyRound,
  FileText,
  File,
  GripVertical,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { getLetterColor } from "../../lib/utils";
import type { VaultItem } from "../../types";

interface VaultItemRowProps {
  item: VaultItem;
  selected: boolean;
  onClick: () => void;
  breachCount?: number | null;
}

export default function VaultItemRow({
  item,
  selected,
  onClick,
  breachCount,
}: VaultItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
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
  const TypeIcon =
    item.type === "password" ? KeyRound : item.type === "note" ? FileText : File;

  const subtitle =
    item.type === "password"
      ? item.credential?.username || ""
      : item.type === "note"
        ? item.note?.content?.slice(0, 50) || "Secure Note"
        : item.file?.original_name || "File";

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      role="listitem"
      aria-selected={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group flex items-center gap-3.5 px-3.5 py-3 cursor-pointer transition-all duration-200 rounded-xl border border-transparent",
        selected
          ? "bg-brand-primary/6 border-brand-primary/20 shadow-sm"
          : "hover:bg-surface-hover/60 hover:border-border-subtle",
        isDragging && "opacity-40 scale-[0.97] shadow-xl bg-surface z-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${item.key}`}
        className="opacity-0 group-hover:opacity-60 focus:opacity-60 p-0.5 rounded-md text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing transition-opacity duration-150 -ml-1"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      <div
        className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-sm transition-transform duration-200 group-hover:scale-105"
        style={{ backgroundColor: letterColor }}
        aria-hidden="true"
      >
        {item.key[0]?.toUpperCase() || "?"}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[15px] font-semibold truncate transition-colors duration-150",
            selected ? "text-brand-primary" : "text-text-primary"
          )}
        >
          {item.key}
        </p>
        <p className="text-[13px] text-text-muted truncate mt-0.5">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        {breachCount !== undefined &&
          breachCount !== null &&
          breachCount > 0 && (
            <div
              className="p-1.5 rounded-lg bg-danger/10 text-danger"
              role="img"
              aria-label={`${breachCount} breaches found for ${item.key}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          )}

        <div
          className="p-1.5 rounded-lg bg-surface-sunken/70 text-text-muted group-hover:text-text-secondary transition-colors duration-150"
          aria-hidden="true"
        >
          <TypeIcon className="w-3.5 h-3.5" />
        </div>

        <ChevronRight
          className="w-4 h-4 text-text-muted/30 group-hover:text-text-muted transition-colors duration-150 hidden sm:block"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}