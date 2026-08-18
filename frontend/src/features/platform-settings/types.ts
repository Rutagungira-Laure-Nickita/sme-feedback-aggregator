export type PlatformAppearance = "SYSTEM" | "LIGHT" | "DARK";

export type PlatformSettings = {
  platformName: string;
  brandTagline: string;
  headline: string;
  platformDescription: string;
  heroSupportingText: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  defaultAppearance: PlatformAppearance;
  supportEmail: string;
  supportPhone: string | null;
  defaultReportRangeDays: number;
  reportFooterText: string;
  footerText: string;
  updatedAt: string | null;
};

export type PlatformSettingsUpdate = Omit<PlatformSettings, "updatedAt">;
