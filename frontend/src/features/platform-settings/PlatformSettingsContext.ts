import { createContext, useContext } from "react";
import type { PlatformSettings } from "./types.js";

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: "SME Feedback Aggregator",
  brandTagline: "Multi-channel intelligence",
  headline: "Turn customer feedback into business growth",
  platformDescription:
    "A secure multi-channel feedback workspace for growing businesses.",
  heroSupportingText:
    "Bring every customer voice into one clear workspace, understand what matters, and act with confidence.",
  primaryCtaLabel: "Get started",
  secondaryCtaLabel: "See how it works",
  logoUrl: null,
  primaryColor: "#4F46E5",
  accentColor: "#818CF8",
  defaultAppearance: "SYSTEM",
  supportEmail: "support@example.com",
  supportPhone: null,
  defaultReportRangeDays: 30,
  reportFooterText: "Confidential platform report",
  footerText: "Copyright 2026 SME Feedback Aggregator. All rights reserved.",
  updatedAt: null
};

export const PlatformSettingsContext = createContext<{
  settings: PlatformSettings;
  isLoading: boolean;
  revision: number;
  applySettings: (settings: PlatformSettings) => void;
}>({
  settings: DEFAULT_PLATFORM_SETTINGS,
  isLoading: true,
  revision: 0,
  applySettings: () => undefined
});

export function usePlatformSettings() {
  return useContext(PlatformSettingsContext);
}
