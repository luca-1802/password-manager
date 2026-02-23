import { useCallback } from "react";
import { apiFetch } from "../api";

export function useFolders(serverFolders: string[]) {
  const createFolder = useCallback(async (name: string) => {
    return apiFetch("/folders/", {
      method: "POST",
      body: { name },
    });
  }, []);

  const renameFolder = useCallback(async (oldName: string, newName: string) => {
    return apiFetch(`/folders/${encodeURIComponent(oldName)}`, {
      method: "PUT",
      body: { new_name: newName },
    });
  }, []);

  const deleteFolder = useCallback(async (name: string) => {
    return apiFetch(`/folders/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  }, []);

  return { folders: serverFolders, createFolder, renameFolder, deleteFolder };
}