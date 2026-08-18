import { z } from "zod";
import { apiClient } from "../../api/axios.js";
import type { PlatformSettings, PlatformSettingsUpdate } from "./types.js";

const envelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown()
});

function unwrap(response: unknown): PlatformSettings {
  return envelopeSchema.parse(response).data as PlatformSettings;
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const response = await apiClient.get<unknown>("/platform-settings");
  return unwrap(response.data);
}

export async function updatePlatformSettings(
  input: PlatformSettingsUpdate
): Promise<PlatformSettings> {
  const response = await apiClient.patch<unknown>("/admin/settings", input);
  return unwrap(response.data);
}
