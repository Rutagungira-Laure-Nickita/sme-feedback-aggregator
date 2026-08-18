import type { PlatformAppearance } from "../../features/platform-settings/types.js";
import type { Theme } from "./ThemeContext.js";

export function resolveEffectiveTheme(
  personalTheme: Theme | null,
  platformAppearance: PlatformAppearance,
  systemTheme: Theme
): Theme {
  if (personalTheme) return personalTheme;
  if (platformAppearance === "LIGHT") return "light";
  if (platformAppearance === "DARK") return "dark";
  return systemTheme;
}
