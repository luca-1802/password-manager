import type { AccentColorName, AccentColorPreset, ThemeColors, UIDensity, FontFamily } from "./types";

export const ACCENT_PRESETS: Record<AccentColorName, AccentColorPreset> = {
  gold: {
    name: "gold",
    label: "Gold",
    accent: "#d4a843",
    accentHover: "#c2952e",
    accentMuted: "rgba(212, 168, 67, 0.08)",
    accentText: "#e8c35a",
    goldGlow: "rgba(212, 168, 67, 0.06)",
    selectionBg: "rgba(212, 168, 67, 0.3)",
  },
  blue: {
    name: "blue",
    label: "Blue",
    accent: "#4a90d9",
    accentHover: "#3a7bc8",
    accentMuted: "rgba(74, 144, 217, 0.08)",
    accentText: "#6aabef",
    goldGlow: "rgba(74, 144, 217, 0.06)",
    selectionBg: "rgba(74, 144, 217, 0.3)",
  },
  green: {
    name: "green",
    label: "Green",
    accent: "#3da36e",
    accentHover: "#2d8f5c",
    accentMuted: "rgba(61, 163, 110, 0.08)",
    accentText: "#5bc48a",
    goldGlow: "rgba(61, 163, 110, 0.06)",
    selectionBg: "rgba(61, 163, 110, 0.3)",
  },
  purple: {
    name: "purple",
    label: "Purple",
    accent: "#9b6dd7",
    accentHover: "#8a57cc",
    accentMuted: "rgba(155, 109, 215, 0.08)",
    accentText: "#b48ae8",
    goldGlow: "rgba(155, 109, 215, 0.06)",
    selectionBg: "rgba(155, 109, 215, 0.3)",
  },
  red: {
    name: "red",
    label: "Red",
    accent: "#d45a5a",
    accentHover: "#c44545",
    accentMuted: "rgba(212, 90, 90, 0.08)",
    accentText: "#e87575",
    goldGlow: "rgba(212, 90, 90, 0.06)",
    selectionBg: "rgba(212, 90, 90, 0.3)",
  },
  teal: {
    name: "teal",
    label: "Teal",
    accent: "#3db5a6",
    accentHover: "#2da396",
    accentMuted: "rgba(61, 181, 166, 0.08)",
    accentText: "#5ed4c5",
    goldGlow: "rgba(61, 181, 166, 0.06)",
    selectionBg: "rgba(61, 181, 166, 0.3)",
  },
};

export const DARK_THEME: ThemeColors = {
  bg: "#0a0a0b",
  surface: "#131316",
  surfaceHover: "#1c1c20",
  surfaceRaised: "#19191e",
  surfaceSunken: "#0c0c0e",
  border: "#23232a",
  borderSubtle: "#1e1e24",
  textPrimary: "#f0ece4",
  textSecondary: "#9a9489",
  textMuted: "#5c5549",
  sidebar: "#0e0e11",
  scrollbarThumbHover: "#2e2e35",
};

export const LIGHT_THEME: ThemeColors = {
  bg: "#f5f5f0",
  surface: "#ffffff",
  surfaceHover: "#eeeee8",
  surfaceRaised: "#f9f9f5",
  surfaceSunken: "#eaeae4",
  border: "#d8d8d0",
  borderSubtle: "#e2e2da",
  textPrimary: "#1a1a1a",
  textSecondary: "#5c5c54",
  textMuted: "#9a9a8e",
  sidebar: "#ebebdf",
  scrollbarThumbHover: "#c0c0b8",
};

export const DENSITY_CONFIG: Record<UIDensity, { fontSize: string; className: string }> = {
  compact: { fontSize: "14px", className: "density-compact" },
  default: { fontSize: "16px", className: "density-default" },
  comfortable: { fontSize: "18px", className: "density-comfortable" },
};

export const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  inter: '"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif',
  system: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};
