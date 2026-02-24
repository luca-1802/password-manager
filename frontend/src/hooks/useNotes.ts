import { useCallback } from "react";
import { apiFetch } from "../api";
import type { RecoveryQuestion } from "../types";

export function useNotes(fetchPasswords: () => Promise<void>) {
  const addNote = useCallback(
    async (
      title: string,
      content: string,
      folder?: string,
      recovery_questions?: RecoveryQuestion[]
    ) => {
      const body: Record<string, unknown> = { title, content };
      if (folder) body.folder = folder;
      if (recovery_questions?.length) body.recovery_questions = recovery_questions;
      const res = await apiFetch<{ success: boolean }>(
        "/notes/",
        { method: "POST", body }
      );
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [fetchPasswords]
  );

  const editNote = useCallback(
    async (
      title: string,
      index: number,
      content?: string,
      folder?: string | null,
      recovery_questions?: RecoveryQuestion[] | null
    ) => {
      const body: Record<string, unknown> = {};
      if (content !== undefined) body.content = content;
      if (folder !== undefined) body.folder = folder;
      if (recovery_questions !== undefined) body.recovery_questions = recovery_questions;
      const res = await apiFetch(
        `/notes/${encodeURIComponent(title)}/${index}`,
        { method: "PUT", body }
      );
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [fetchPasswords]
  );

  const deleteNote = useCallback(
    async (title: string, index: number) => {
      const res = await apiFetch(
        `/notes/${encodeURIComponent(title)}/${index}`,
        { method: "DELETE" }
      );
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [fetchPasswords]
  );

  return { addNote, editNote, deleteNote };
}