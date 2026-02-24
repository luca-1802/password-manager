import { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Credential, SecureNote, SecureFile, RecoveryQuestion } from "../../types";
import PasswordCard from "./PasswordCard";
import NoteCard from "./NoteCard";
import FileCard from "./FileCard";
import EmptyState from "./EmptyState";

const PAGE_SIZE = 10;

type FlatEntry = {
  key: string;
  index: number;
  entryType: "password" | "note" | "file";
  credential?: Credential;
  note?: SecureNote;
  file?: SecureFile;
};

interface Props {
  entries: [string, Credential[]][];
  notes?: [string, SecureNote[]][];
  files?: [string, SecureFile[]][];
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
  onEditFile?: (
    label: string,
    index: number,
    description?: string | null,
    folder?: string | null
  ) => Promise<unknown>;
  onDeleteFile?: (label: string, index: number) => Promise<unknown>;
  onDownloadFile?: (label: string, index: number, originalName: string) => Promise<unknown>;
  onAdd: () => void;
  getBreachCount?: (website: string, index: number) => number | null;
}

export default function PasswordGrid({
  entries,
  notes,
  files,
  page,
  setPage,
  folders,
  onEdit,
  onDelete,
  onEditNote,
  onDeleteNote,
  onEditFile,
  onDeleteFile,
  onDownloadFile,
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
    const fileEntries = (files || []).flatMap(([label, fileList]) =>
      fileList.map((file, index) => ({
        key: label,
        index,
        entryType: "file" as const,
        file,
      }))
    );
    return [...passwordEntries, ...noteEntries, ...fileEntries];
  }, [entries, notes, files]);

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

  if (entries.length === 0 && (!notes || notes.length === 0) && (!files || files.length === 0)) {
    return <EmptyState onAdd={onAdd} />;
  }

  return (
    <div>
      <div key={`page-${currentPage}`} className="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800/50">
        {pageItems.map((item, i) => (
          <motion.div
            key={`${item.entryType}-${item.key}-${item.index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03 }}
          >
            {item.entryType === "file" && item.file ? (
              <FileCard
                label={item.key}
                index={item.index}
                originalName={item.file.original_name}
                size={item.file.size}
                description={item.file.description}
                folder={item.file.folder}
                uploadedAt={item.file.uploaded_at}
                folders={folders}
                onEdit={onEditFile!}
                onDelete={onDeleteFile!}
                onDownload={onDownloadFile!}
              />
            ) : item.entryType === "note" && item.note ? (
              <NoteCard
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
                breachCount={getBreachCount?.(item.key, item.index) ?? null}
              />
            )}
          </motion.div>
        ))}
      </div>

      {totalCredentials > PAGE_SIZE && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between mt-4 px-1"
        >
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
        </motion.div>
      )}
    </div>
  );
}
