import { z } from "zod";
import { apiClient } from "../../../api/axios.js";

const apiResponseSchema = <TData extends z.ZodTypeAny>(dataSchema: TData) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema
  });

const apiHealthSchema = z.object({
  service: z.literal("sme-feedback-aggregator-api"),
  status: z.literal("ok"),
  environment: z.string(),
  timestamp: z.string()
});

const databaseHealthSchema = z.object({
  database: z.literal("mysql"),
  status: z.literal("connected"),
  timestamp: z.string()
});

export type ApiHealth = z.infer<typeof apiHealthSchema>;
export type DatabaseHealth = z.infer<typeof databaseHealthSchema>;

export async function fetchApiHealth(): Promise<ApiHealth> {
  const response = await apiClient.get<unknown>("/health");
  return apiResponseSchema(apiHealthSchema).parse(response.data).data;
}

export async function fetchDatabaseHealth(): Promise<DatabaseHealth> {
  const response = await apiClient.get<unknown>("/health/database");
  return apiResponseSchema(databaseHealthSchema).parse(response.data).data;
}
