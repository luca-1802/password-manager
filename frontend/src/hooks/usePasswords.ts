import { useState, useCallback } from "react";
import { apiFetch } from "../api";
import type { PasswordMap, NotesMap, FilesMap, RecoveryQuestion } from "../types";

export function usePasswords() {
  const [passwords, setPasswords] = useState<PasswordMap>({});
  const [notes, setNotes] = useState<NotesMap>({});
  const [files, setFiles] = useState<FilesMap>({});
  const [serverFolders, setServerFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPasswords = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ passwords: PasswordMap; notes: NotesMap; files: FilesMap; folders: string[] }>("/passwords/");
    if (res?.ok) {
      setPasswords(res.data.passwords);
      setNotes(res.data.notes ?? {});
      setFiles(res.data.files ?? {});
      setServerFolders(res.data.folders ?? []);
    }
    setLoading(false);
  }, []);

  const addPassword = useCallback(
    async (
      website: string,
      username: string,
      password?: string,
      folder?: string,
      notes?: string,
      recovery_questions?: RecoveryQuestion[]
    ) => {
      const body: Record<string, unknown> = { website, username };
      if (password) body.password = password;
      if (folder) body.folder = folder;
      if (notes) body.notes = notes;
      if (recovery_questions?.length) body.recovery_questions = recovery_questions;
      const res = await apiFetch<{ success: boolean; password?: string }>(
        "/passwords/",
        { method: "POST", body }
      );
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [fetchPasswords]
  );

  const editPassword = useCallback(
    async (
      website: string,
      index: number,
      username: string,
      password: string,
      folder?: string | null,
      notes?: string | null,
      recovery_questions?: RecoveryQuestion[] | null
    ) => {
      const body: Record<string, unknown> = { username, password };
      if (folder !== undefined) body.folder = folder;
      if (notes !== undefined) body.notes = notes;
      if (recovery_questions !== undefined) body.recovery_questions = recovery_questions;
      const res = await apiFetch(
        `/passwords/${encodeURIComponent(website)}/${index}`,
        { method: "PUT", body }
      );
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [fetchPasswords]
  );

  const deletePassword = useCallback(
    async (website: string, index: number) => {
      const res = await apiFetch(
        `/passwords/${encodeURIComponent(website)}/${index}`,
        { method: "DELETE" }
      );
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [fetchPasswords]
  );

  return {
    passwords,
    notes,
    files,
    serverFolders,
    loading,
    fetchPasswords,
    addPassword,
    editPassword,
    deletePassword,
  };
}