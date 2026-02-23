import { useState, useCallback } from "react";
import { apiFetch } from "../api";
import type { PasswordMap } from "../types";

export function usePasswords() {
  const [passwords, setPasswords] = useState<PasswordMap>({});
  const [serverFolders, setServerFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPasswords = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ passwords: PasswordMap; folders: string[] }>("/passwords/");
    if (res?.ok) {
      setPasswords(res.data.passwords);
      setServerFolders(res.data.folders ?? []);
    }
    setLoading(false);
  }, []);

  const addPassword = useCallback(
    async (website: string, username: string, password?: string, folder?: string) => {
      const body: Record<string, unknown> = { website, username };
      if (password) body.password = password;
      if (folder) body.folder = folder;
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
      folder?: string | null
    ) => {
      const body: Record<string, unknown> = { username, password };
      if (folder !== undefined) body.folder = folder;
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
    serverFolders,
    loading,
    fetchPasswords,
    addPassword,
    editPassword,
    deletePassword,
  };
}