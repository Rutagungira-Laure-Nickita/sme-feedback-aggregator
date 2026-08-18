import {
  EmailProviderType,
  IntegrationDemoScenario,
  IntegrationMode,
  IntegrationProvider
} from "@prisma/client";
import { z } from "zod";
import { normalizeOptionalSearch } from "../../utils/search-normalization.js";

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((value): T[number] | undefined =>
      value && values.includes(value as T[number]) ? value : undefined
    );

const pageSize = (defaultValue: number, max: number) =>
  z
    .string()
    .optional()
    .default(String(defaultValue))
    .transform((value) => {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isInteger(parsed) || parsed < 1) return defaultValue;
      return Math.min(parsed, max);
    });

const page = z
  .string()
  .optional()
  .default("1")
  .transform((value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  });

export const integrationConnectionIdParamsSchema = z.object({
  businessId: z.string().trim().min(1),
  connectionId: z.string().trim().min(1)
});

export const integrationRunIdParamsSchema = z.object({
  businessId: z.string().trim().min(1),
  runId: z.string().trim().min(1)
});

export const integrationRunItemParamsSchema = integrationRunIdParamsSchema.extend({
  itemId: z.string().trim().min(1)
});

export const listIntegrationConnectionsQuerySchema = z.object({
  page,
  pageSize: pageSize(20, 100),
  search: z
    .string()
    .optional()
    .transform((value) => normalizeOptionalSearch(value, 120)),
  provider: optionalEnum([
    "GOOGLE_REVIEWS",
    "WHATSAPP",
    "EMAIL",
    "X",
    "FACEBOOK",
    "INSTAGRAM"
  ]),
  status: optionalEnum(["CONNECTED", "PAUSED", "DISCONNECTED", "ERROR"]),
  mode: optionalEnum(["DEMO", "LIVE"]),
  branchId: z.string().trim().min(1).optional()
});

export const listSynchronizationRunsQuerySchema = z.object({
  page,
  pageSize: pageSize(10, 100),
  status: optionalEnum([
    "PENDING",
    "RUNNING",
    "COMPLETED",
    "COMPLETED_WITH_ERRORS",
    "FAILED",
    "CANCELLED"
  ])
});

export const createIntegrationConnectionSchema = z
  .object({
    provider: z.nativeEnum(IntegrationProvider),
    mode: z.nativeEnum(IntegrationMode).default(IntegrationMode.DEMO),
    liveProviderType: z.nativeEnum(EmailProviderType).optional(),
    displayName: z.string().trim().min(1).max(120),
    defaultBranchId: z.string().trim().min(1),
    phoneNumberId: z.string().trim().min(3).max(80).optional(),
    wabaId: z.string().trim().min(3).max(80).optional(),
    displayPhoneNumber: z.string().trim().min(3).max(40).optional(),
    providerAccountId: z.string().trim().min(3).max(255).optional(),
    providerAccountLabel: z.string().trim().min(1).max(255).optional(),
    providerAccountType: z.string().trim().min(1).max(80).optional(),
    temporaryAccessToken: z.string().trim().min(20).max(4096).optional(),
    demoScenario: z
      .nativeEnum(IntegrationDemoScenario)
      .default(IntegrationDemoScenario.STANDARD_MIXED)
  })
  .strict();

export const updateIntegrationConnectionSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
    defaultBranchId: z.string().trim().min(1).optional(),
    phoneNumberId: z.string().trim().min(3).max(80).optional(),
    wabaId: z.string().trim().min(3).max(80).optional(),
    displayPhoneNumber: z.string().trim().min(3).max(40).optional(),
    providerAccountId: z.string().trim().min(3).max(255).optional(),
    providerAccountLabel: z.string().trim().min(1).max(255).optional(),
    providerAccountType: z.string().trim().min(1).max(80).optional(),
    temporaryAccessToken: z.string().trim().min(20).max(4096).optional(),
    demoScenario: z.nativeEnum(IntegrationDemoScenario).optional()
  })
  .strict();

export type ListIntegrationConnectionsQuery = z.infer<
  typeof listIntegrationConnectionsQuerySchema
>;
export type ListSynchronizationRunsQuery = z.infer<
  typeof listSynchronizationRunsQuerySchema
>;
export type CreateIntegrationConnectionInput = z.infer<
  typeof createIntegrationConnectionSchema
>;
export type UpdateIntegrationConnectionInput = z.infer<
  typeof updateIntegrationConnectionSchema
>;

export type IntegrationConnectionStatusInput = z.infer<
  typeof listIntegrationConnectionsQuerySchema
>["status"];
export type SynchronizationRunStatusInput = z.infer<
  typeof listSynchronizationRunsQuerySchema
>["status"];
