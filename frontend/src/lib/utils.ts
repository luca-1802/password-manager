import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const LETTER_COLORS = [
  "#5e8a8a",
  "#b07d8a",
  "#7083a8",
  "#c49a5c",
  "#7a9a6e",
  "#9484a8",
  "#8a7a6e",
];

export { LETTER_COLORS };

export function getLetterColor(letter: string): string {
  const code = letter.toLowerCase().charCodeAt(0) - 97;
  const index = ((code % LETTER_COLORS.length) + LETTER_COLORS.length) % LETTER_COLORS.length;
  return LETTER_COLORS[index] ?? LETTER_COLORS[0]!;
}

const FOLDER_COLORS_KEY = "vault_folder_colors";

function loadFolderColors(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(FOLDER_COLORS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setFolderColor(folderName: string, color: string): void {
  const map = loadFolderColors();
  map[folderName] = color;
  localStorage.setItem(FOLDER_COLORS_KEY, JSON.stringify(map));
}

export function renameFolderColor(oldName: string, newName: string): void {
  const map = loadFolderColors();
  if (map[oldName]) {
    map[newName] = map[oldName];
    delete map[oldName];
    localStorage.setItem(FOLDER_COLORS_KEY, JSON.stringify(map));
  }
}

export function deleteFolderColor(folderName: string): void {
  const map = loadFolderColors();
  delete map[folderName];
  localStorage.setItem(FOLDER_COLORS_KEY, JSON.stringify(map));
}

export function getFolderColor(folderName: string): string {
  const map = loadFolderColors();
  return map[folderName] || getLetterColor(folderName[0] || "a");
}