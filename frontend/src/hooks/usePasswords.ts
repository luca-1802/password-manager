import { useState, useCallback } from "react";
import { apiFetch } from "../api";
import type { PasswordMap } from "../types";

export function usePasswords() {
  const [passwords, setPasswords] = useState<PasswordMap>({});
  const [loading, setLoading] = useState(true);

  const fetchPasswords = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ passwords: PasswordMap }>("/passwords/");
    if (res?.ok) setPasswords(res.data.passwords);
    setLoading(false);
  }, []);

  const addPassword = useCallback(
    async (website: string, username: string, password?: string) => {
      const body: Record<string, string> = { website, username };
      if (password) body.password = password;
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
      password: string
    ) => {
      const res = await apiFetch(
        `/passwords/${encodeURIComponent(website)}/${index}`,
        { method: "PUT", body: { username, password } }
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
    loading,
    fetchPasswords,
    addPassword,
    editPassword,
    deletePassword,
  };
}