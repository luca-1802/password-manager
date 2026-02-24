import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, type ReactNode } from "react";
import type { ThemeContextValue, AccentColorName, ThemeMode, UIDensity, FontFamily } from "./types";
import { ACCENT_PRESETS, DARK_THEME, LIGHT_THEME, DENSITY_CONFIG, FONT_FAMILY_MAP } from "./presets";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

const ACCENT_NAMES: readonly AccentColorName[] = ["gold", "blue", "green", "purple", "red", "teal"];
const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];
const DENSITIES: readonly UIDensity[] = ["compact", "default", "comfortable"];
const FONTS: readonly FontFamily[] = ["inter", "system", "mono"];

function readStorage<T extends string>(key: string, fallback: T, valid: readonly T[]): T {
  const stored = localStorage.getItem(key);
  return stored && (valid as readonly string[]).includes(stored) ? (stored as T) : fallback;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accentColor, setAccentColorState] = useState<AccentColorName>(
    () => readStorage("theme-accent", "gold", ACCENT_NAMES)
  );
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    () => readStorage("theme-mode", "dark", THEME_MODES)
  );
  const [density, setDensityState] = useState<UIDensity>(
    () => readStorage("theme-density", "default", DENSITIES)
  );
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(
    () => readStorage("theme-font", "inter", FONTS)
  );

  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const resolvedMode: "light" | "dark" =
    themeMode === "system" ? (systemPrefersDark ? "dark" : "light") : themeMode;

  // Apply all CSS variables — useLayoutEffect to prevent flash
  useLayoutEffect(() => {
    const root = document.documentElement;
    const preset = ACCENT_PRESETS[accentColor];
    const colors = resolvedMode === "dark" ? DARK_THEME : LIGHT_THEME;
    const densityCfg = DENSITY_CONFIG[density];

    // Accent variables
    root.style.setProperty("--color-accent", preset.accent);
    root.style.setProperty("--color-accent-hover", preset.accentHover);
    root.style.setProperty("--color-accent-muted", preset.accentMuted);
    root.style.setProperty("--color-accent-text", preset.accentText);
    root.style.setProperty("--color-gold-glow", preset.goldGlow);

    // Theme mode variables
    root.style.setProperty("--color-bg", colors.bg);
    root.style.setProperty("--color-surface", colors.surface);
    root.style.setProperty("--color-surface-hover", colors.surfaceHover);
    root.style.setProperty("--color-surface-raised", colors.surfaceRaised);
    root.style.setProperty("--color-surface-sunken", colors.surfaceSunken);
    root.style.setProperty("--color-border", colors.border);
    root.style.setProperty("--color-border-subtle", colors.borderSubtle);
    root.style.setProperty("--color-text-primary", colors.textPrimary);
    root.style.setProperty("--color-text-secondary", colors.textSecondary);
    root.style.setProperty("--color-text-muted", colors.textMuted);
    root.style.setProperty("--color-sidebar", colors.sidebar);

    // Font family
    root.style.setProperty("--font-sans", FONT_FAMILY_MAP[fontFamily]);

    // Density
    root.style.fontSize = densityCfg.fontSize;
    DENSITIES.forEach((d) => root.classList.remove(DENSITY_CONFIG[d].className));
    root.classList.add(densityCfg.className);

    // Dynamic styles for ::selection and scrollbar
    const STYLE_ID = "theme-dynamic-styles";
    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      ::selection {
        background: ${preset.selectionBg};
        color: ${resolvedMode === "dark" ? "#fff" : "#000"};
      }
      ::-webkit-scrollbar-thumb:hover {
        background: ${colors.scrollbarThumbHover};
      }
    `;
  }, [accentColor, resolvedMode, density, fontFamily]);

  const setAccentColor = useCallback((c: AccentColorName) => {
    localStorage.setItem("theme-accent", c);
    setAccentColorState(c);
  }, []);

  const setThemeMode = useCallback((m: ThemeMode) => {
    localStorage.setItem("theme-mode", m);
    setThemeModeState(m);
  }, []);

  const setDensity = useCallback((d: UIDensity) => {
    localStorage.setItem("theme-density", d);
    setDensityState(d);
  }, []);

  const setFontFamily = useCallback((f: FontFamily) => {
    localStorage.setItem("theme-font", f);
    setFontFamilyState(f);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        accentColor,
        themeMode,
        resolvedMode,
        density,
        fontFamily,
        setAccentColor,
        setThemeMode,
        setDensity,
        setFontFamily,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
