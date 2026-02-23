import { useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Credential } from "../../types";
import PasswordCard from "./PasswordCard";
import EmptyState from "./EmptyState";

const PAGE_SIZE = 10;

interface FlatCredential {
  website: string;
  index: number;
  credential: Credential;
}

interface Props {
  entries: [string, Credential[]][];
  page: number;
  setPage: (page: number) => void;
  folders: string[];
  onEdit: (
    website: string,
    index: number,
    username: string,
    password: string,
    folder?: string | null
  ) => Promise<unknown>;
  onDelete: (website: string, index: number) => Promise<unknown>;
  onAdd: () => void;
}

export default function PasswordGrid({
  entries,
  page,
  setPage,
  folders,
  onEdit,
  onDelete,
  onAdd,
}: Props) {
  const flatCredentials = useMemo<FlatCredential[]>(
    () =>
      entries.flatMap(([website, creds]) =>
        creds.map((credential, index) => ({ website, index, credential }))
      ),
    [entries]
  );

  const totalCredentials = flatCredentials.length;
  const totalPages = Math.max(1, Math.ceil(totalCredentials / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (currentPage !== page) {
      setPage(currentPage);
    }
  }, [currentPage, page, setPage]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = flatCredentials.slice(startIndex, startIndex + PAGE_SIZE);

  if (entries.length === 0) {
    return <EmptyState onAdd={onAdd} />;
  }

  return (
    <div>
      <div className="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800/50">
        {pageItems.map((item) => (
          <PasswordCard
            key={`${item.website}-${item.index}`}
            website={item.website}
            index={item.index}
            username={item.credential.username}
            password={item.credential.password}
            folder={item.credential.folder}
            folders={folders}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {totalCredentials > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 px-1">
          <button
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
              disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-sm text-zinc-500">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
              disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}