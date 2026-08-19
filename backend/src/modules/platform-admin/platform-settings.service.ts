import { PlatformAppearance } from "../../lib/prisma-runtime.js";
import { prisma } from "../../lib/prisma.js";
import type { PlatformSettingsUpdate } from "./platform-admin.schemas.js";
import { recordPlatformAdminActivity } from "./platform-admin-audit.service.js";

export const PLATFORM_SETTINGS_ID = "platform";
export const FIXED_PRIMARY_COLOR = "#4F46E5";
export const FIXED_ACCENT_COLOR = "#818CF8";

export const DEFAULT_PLATFORM_SETTINGS = {
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
  primaryColor: FIXED_PRIMARY_COLOR,
  accentColor: FIXED_ACCENT_COLOR,
  defaultAppearance: PlatformAppearance.SYSTEM,
  supportEmail: "support@example.com",
  supportPhone: null,
  defaultReportRangeDays: 30,
  reportFooterText: "Confidential platform report",
  footerText: "Copyright 2026 SME Feedback Aggregator. All rights reserved."
} as const;

const publicSelect = {
  platformName: true,
  brandTagline: true,
  headline: true,
  platformDescription: true,
  heroSupportingText: true,
  primaryCtaLabel: true,
  secondaryCtaLabel: true,
  logoUrl: true,
  primaryColor: true,
  accentColor: true,
  defaultAppearance: true,
  supportEmail: true,
  supportPhone: true,
  defaultReportRangeDays: true,
  reportFooterText: true,
  footerText: true,
  updatedAt: true
} as const;

export async function getPlatformSettings() {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: PLATFORM_SETTINGS_ID },
    select: publicSelect
  });

  return withFixedDesignColors(
    settings ?? { ...DEFAULT_PLATFORM_SETTINGS, updatedAt: null }
  );
}

export async function updatePlatformSettings(
  input: PlatformSettingsUpdate,
  updatedByUserId: string
) {
  const settings = await prisma.platformSettings.upsert({
    where: { id: PLATFORM_SETTINGS_ID },
    create: {
      id: PLATFORM_SETTINGS_ID,
      ...DEFAULT_PLATFORM_SETTINGS,
      ...input,
      primaryColor: FIXED_PRIMARY_COLOR,
      accentColor: FIXED_ACCENT_COLOR,
      updatedByUserId
    },
    update: {
      ...input,
      primaryColor: FIXED_PRIMARY_COLOR,
      accentColor: FIXED_ACCENT_COLOR,
      updatedByUserId
    },
    select: publicSelect
  });

  await recordPlatformAdminActivity({
    actorUserId: updatedByUserId,
    action: "PLATFORM_SETTINGS_UPDATED",
    targetType: "PLATFORM_SETTINGS",
    targetId: PLATFORM_SETTINGS_ID,
    summary: "Updated global platform settings.",
    metadata: { fields: Object.keys(input).sort() }
  });

  return withFixedDesignColors(settings);
}

function withFixedDesignColors<T extends { primaryColor: string; accentColor: string }>(
  settings: T
): T {
  return {
    ...settings,
    primaryColor: FIXED_PRIMARY_COLOR,
    accentColor: FIXED_ACCENT_COLOR
  };
}
