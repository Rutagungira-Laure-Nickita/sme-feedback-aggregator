import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  legacyThemeStorageKey,
  platformAppearanceStorageKey,
  ThemeContext,
  type Theme
} from "./ThemeContext.js";
import { usePlatformSettings } from "../../features/platform-settings/PlatformSettingsContext.js";
import { resolveEffectiveTheme } from "./theme-resolver.js";
import type { PlatformAppearance } from "../../features/platform-settings/types.js";

function getSystemTheme(): Theme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function getCachedPlatformAppearance(): PlatformAppearance {
  if (typeof window === "undefined") {
    return "SYSTEM";
  }
  const stored = window.localStorage.getItem(platformAppearanceStorageKey);
  return stored === "LIGHT" || stored === "DARK" || stored === "SYSTEM"
    ? stored
    : "SYSTEM";
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const { settings, isLoading, revision } = usePlatformSettings();
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);
  const [sessionOverride, setSessionOverride] = useState<{
    theme: Theme;
    platformAppearance: PlatformAppearance;
  } | null>(null);
  const platformAppearance = isLoading
    ? getCachedPlatformAppearance()
    : settings.defaultAppearance;
  const theme = resolveEffectiveTheme(
    sessionOverride?.platformAppearance === platformAppearance
      ? sessionOverride.theme
      : null,
    platformAppearance,
    systemTheme
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => setSystemTheme(getSystemTheme());

    media.addEventListener("change", handleSystemThemeChange);

    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  useEffect(() => {
    window.localStorage.removeItem(legacyThemeStorageKey);
    if (isLoading) return;
    window.localStorage.setItem(platformAppearanceStorageKey, settings.defaultAppearance);
    setSessionOverride(null);
  }, [isLoading, revision, settings.defaultAppearance]);

  const toggleTheme = useCallback(() => {
    setSessionOverride({
      theme: theme === "dark" ? "light" : "dark",
      platformAppearance
    });
  }, [platformAppearance, theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme
    }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
