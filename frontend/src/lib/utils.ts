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

export function getLetterColor(letter: string): string {
  const code = letter.toLowerCase().charCodeAt(0) - 97;
  const index = ((code % LETTER_COLORS.length) + LETTER_COLORS.length) % LETTER_COLORS.length;
  return LETTER_COLORS[index] ?? LETTER_COLORS[0]!;
}