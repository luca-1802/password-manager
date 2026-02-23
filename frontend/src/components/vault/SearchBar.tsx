import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SearchBar({ value, onChange, className }: Props) {
  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg transition-colors focus-within:border-zinc-600">
        <div className="pl-3 pr-2 flex items-center justify-center">
          <Search className="w-4 h-4 text-zinc-500" />
        </div>
        <input
          type="text"
          placeholder="Search vault..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border-none py-2.5 pl-2 pr-10 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
        />
        <div className="absolute right-3 flex items-center">
          {value ? (
            <button
              onClick={() => onChange("")}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}