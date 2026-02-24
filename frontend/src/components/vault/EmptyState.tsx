import { Plus } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onAdd: () => void;
}

export default function EmptyState({ onAdd }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <motion.button
        onClick={onAdd}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4 hover:bg-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer"
        aria-label="Add entry"
      >
        <Plus className="w-5 h-5 text-zinc-500" />
      </motion.button>
      <motion.h3
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-base font-medium text-zinc-300 mb-1"
      >
        No entries yet
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="text-sm text-zinc-600"
      >
        Add your first password or note to get started.
      </motion.p>
    </motion.div>
  );
}