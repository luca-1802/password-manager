import { useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Credential, SecureNote, RecoveryQuestion } from "../../types";
import PasswordCard from "./PasswordCard";
import NoteCard from "./NoteCard";
import EmptyState from "./EmptyState";

const PAGE_SIZE = 10;

type FlatEntry = {
  key: string;
  index: number;
  entryType: "password" | "note";
  credential?: Credential;
  note?: SecureNote;
};

interface Props {
  entries: [string, Credential[]][];
  notes?: [string, SecureNote[]][];
  page: number;
  setPage: (page: number) => void;
  folders: string[];
  onEdit: (
    website: string,
    index: number,
    username: string,
    password: string,
    folder?: string | null,
    notes?: string | null,
    recovery_questions?: RecoveryQuestion[] | null
  ) => Promise<unknown>;
  onDelete: (website: string, index: number) => Promise<unknown>;
  onEditNote: (
    title: string,
    index: number,
    content?: string,
    folder?: string | null,
    recovery_questions?: RecoveryQuestion[] | null
  ) => Promise<unknown>;
  onDeleteNote: (title: string, index: number) => Promise<unknown>;
  onAdd: () => void;
  getBreachCount?: (website: string, index: number) => number | null;
}

export default function PasswordGrid({
  entries,
  notes,
  page,
  setPage,
  folders,
  onEdit,
  onDelete,
  onEditNote,
  onDeleteNote,
  onAdd,
  getBreachCount,
}: Props) {
  const flatEntries = useMemo<FlatEntry[]>(() => {
    const passwordEntries = entries.flatMap(([website, creds]) =>
      creds.map((credential, index) => ({
        key: website,
        index,
        entryType: "password" as const,
        credential,
      }))
    );
    const noteEntries = (notes || []).flatMap(([title, noteList]) =>
      noteList.map((note, index) => ({
        key: title,
        index,
        entryType: "note" as const,
        note,
      }))
    );
    return [...passwordEntries, ...noteEntries];
  }, [entries, notes]);

  const totalCredentials = flatEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalCredentials / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (currentPage !== page) {
      setPage(currentPage);
    }
  }, [currentPage, page, setPage]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = flatEntries.slice(startIndex, startIndex + PAGE_SIZE);

  if (entries.length === 0 && (!notes || notes.length === 0)) {
    return <EmptyState onAdd={onAdd} />;
  }

  return (
    <div>
      <div className="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800/50">
        {pageItems.map((item) =>
          item.entryType === "note" && item.note ? (
            <NoteCard
              key={`note-${item.key}-${item.index}`}
              title={item.key}
              index={item.index}
              content={item.note.content}
              folder={item.note.folder}
              recovery_questions={item.note.recovery_questions}
              folders={folders}
              onEdit={onEditNote}
              onDelete={onDeleteNote}
            />
          ) : (
            <PasswordCard
              key={`${item.key}-${item.index}`}
              website={item.key}
              index={item.index}
              username={item.credential!.username}
              password={item.credential!.password}
              folder={item.credential!.folder}
              notes={item.credential!.notes}
              recovery_questions={item.credential!.recovery_questions}
              folders={folders}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )
        )}
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
            breachCount={getBreachCount?.(item.website, item.index) ?? null}
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
