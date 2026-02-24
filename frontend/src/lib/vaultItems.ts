import type { PasswordMap, NotesMap, FilesMap, VaultItem } from "../types";

export function flattenVaultItems(
  passwords: PasswordMap,
  notes: NotesMap,
  files: FilesMap
): VaultItem[] {
  const items: VaultItem[] = [];

  for (const [website, creds] of Object.entries(passwords)) {
    creds.forEach((cred, index) => {
      items.push({
        id: `password-${website}-${index}`,
        type: "password",
        key: website,
        index,
        folder: cred.folder,
        credential: cred,
      });
    });
  }

  for (const [title, noteEntries] of Object.entries(notes)) {
    noteEntries.forEach((note, index) => {
      items.push({
        id: `note-${title}-${index}`,
        type: "note",
        key: title,
        index,
        folder: note.folder,
        note,
      });
    });
  }

  for (const [label, fileEntries] of Object.entries(files)) {
    fileEntries.forEach((file, index) => {
      items.push({
        id: `file-${label}-${index}`,
        type: "file",
        key: label,
        index,
        folder: file.folder,
        file,
      });
    });
  }

  return items;
}

export function filterVaultItems(
  items: VaultItem[],
  search: string,
  folderFilter: string
): VaultItem[] {
  return items.filter((item) => {
    if (folderFilter === "unfiled") {
      if (item.folder) return false;
    } else if (folderFilter !== "all") {
      if (item.folder !== folderFilter) return false;
    }

    if (search) {
      const q = search.toLowerCase();
      const keyMatch = item.key.toLowerCase().includes(q);

      if (item.type === "password") {
        return keyMatch || (item.credential?.username?.toLowerCase().includes(q) ?? false);
      }
      if (item.type === "note") {
        return keyMatch || (item.note?.content?.toLowerCase().includes(q) ?? false);
      }
      if (item.type === "file") {
        return (
          keyMatch ||
          (item.file?.original_name?.toLowerCase().includes(q) ?? false) ||
          (item.file?.description?.toLowerCase().includes(q) ?? false)
        );
      }
    }

    return true;
  });
}