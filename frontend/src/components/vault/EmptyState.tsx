import { Plus } from "lucide-react";

interface Props {
  onAdd: () => void;
}

export default function EmptyState({ onAdd }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <button
        onClick={onAdd}
        className="w-12 h-12 rounded-lg bg-surface border border-border-subtle flex items-center justify-center mb-4 hover:bg-surface-hover hover:border-border transition-colors cursor-pointer"
        aria-label="Add entry"
      >
        <Plus className="w-5 h-5 text-text-muted" />
      </button>
      <h3 className="text-base font-medium text-text-secondary mb-1">No entries yet</h3>
      <p className="text-sm text-text-muted">Add your first password or note to get started.</p>
    </div>
  );
}