import { useCallback } from "react";
import { apiFetch, apiUploadFileWithFields, apiFetchRaw } from "../api";

export function useFiles(fetchPasswords: () => Promise<void>) {
  const uploadFile = useCallback(
    async (
      label: string,
      file: File,
      description?: string,
      folder?: string
    ) => {
      const fields: Record<string, string> = { label };
      if (description) fields.description = description;
      if (folder) fields.folder = folder;
      const res = await apiUploadFileWithFields("/files/", file, fields);
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [fetchPasswords]
  );

  const editFile = useCallback(
    async (
      label: string,
      index: number,
      description?: string | null,
      folder?: string | null
    ) => {
      const body: Record<string, unknown> = {};
      if (description !== undefined) body.description = description;
      if (folder !== undefined) body.folder = folder;
      const res = await apiFetch(
        `/files/${index}/${encodeURIComponent(label)}`,
        { method: "PUT", body }
      );
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [fetchPasswords]
  );

  const deleteFile = useCallback(
    async (label: string, index: number) => {
      const res = await apiFetch(
        `/files/${index}/${encodeURIComponent(label)}`,
        { method: "DELETE" }
      );
      if (res?.ok) await fetchPasswords();
      return res;
    },
    [fetchPasswords]
  );

  const downloadFile = useCallback(
    async (label: string, index: number, originalName: string) => {
      const res = await apiFetchRaw(
        `/files/${index}/${encodeURIComponent(label)}/download`
      );
      if (!res || !res.ok) return false;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    },
    []
  );

  return { uploadFile, editFile, deleteFile, downloadFile };
}