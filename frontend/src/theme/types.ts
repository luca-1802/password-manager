export type AccentColorName = "gold" | "blue" | "green" | "purple" | "red" | "teal";

export interface AccentColorPreset {
  name: AccentColorName;
  label: string;
  accent: string;
  accentHover: string;
  accentMuted: string;
  accentText: string;
  goldGlow: string;
  selectionBg: string;
}

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceHover: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  sidebar: string;
  scrollbarThumbHover: string;
}

export type UIDensity = "compact" | "default" | "comfortable";

export type FontFamily = "inter" | "system" | "mono";

export interface ThemeContextValue {
  accentColor: AccentColorName;
  themeMode: ThemeMode;
  resolvedMode: "light" | "dark";
  density: UIDensity;
  fontFamily: FontFamily;
  setAccentColor: (color: AccentColorName) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setDensity: (density: UIDensity) => void;
  setFontFamily: (font: FontFamily) => void;
}
