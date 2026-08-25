export const OPERATIONAL_FEEDBACK_CHANNEL_OPTIONS = [
  { value: "MANUAL", label: "Manual Entry" },
  { value: "PUBLIC_FORM", label: "Public Form" },
  { value: "QR_CODE", label: "QR Code" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Gmail" }
] as const;

export const SUPPORTED_LIVE_INTEGRATION_OPTIONS = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Gmail" }
] as const;

export function operationalFeedbackChannelLabel(value: string): string {
  return (
    OPERATIONAL_FEEDBACK_CHANNEL_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}
