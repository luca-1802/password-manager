import { Plus } from "lucide-react";

interface Props {
  onAdd: () => void;
}

export default function EmptyState({ onAdd }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <button
        onClick={onAdd}
        className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4 hover:bg-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer"
        aria-label="Add password"
      >
        <Plus className="w-5 h-5 text-zinc-500" />
      </button>
      <h3 className="text-base font-medium text-zinc-300 mb-1">No passwords yet</h3>
      <p className="text-sm text-zinc-600">Add your first password to get started.</p>
    </div>
  );
}