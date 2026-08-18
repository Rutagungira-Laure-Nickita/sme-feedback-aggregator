import type {
  EmailProviderType,
  IntegrationConnection,
  IntegrationProvider,
  IntegrationProviderCapability
} from "./integrationApi.js";

export type BusinessOwnerVisibleProvider = {
  provider: IntegrationProvider;
  liveProviderType?: EmailProviderType;
  label: string;
};

export const BUSINESS_OWNER_VISIBLE_LIVE_PROVIDERS = [
  { provider: "WHATSAPP", label: "WhatsApp" },
  { provider: "EMAIL", liveProviderType: "GMAIL", label: "Gmail" }
] as const satisfies readonly BusinessOwnerVisibleProvider[];

export function isBusinessOwnerVisibleConnection(
  connection: IntegrationConnection
): boolean {
  if (connection.mode !== "LIVE") return false;
  return BUSINESS_OWNER_VISIBLE_LIVE_PROVIDERS.some(
    (visible) =>
      visible.provider === connection.provider &&
      (visible.provider !== "EMAIL" ||
        connection.liveProviderType === visible.liveProviderType)
  );
}

export function isBusinessOwnerVisibleCapability(
  capability: IntegrationProviderCapability
): boolean {
  return (
    capability.mode === "LIVE" &&
    BUSINESS_OWNER_VISIBLE_LIVE_PROVIDERS.some(
      (visible) => visible.provider === capability.provider
    )
  );
}
