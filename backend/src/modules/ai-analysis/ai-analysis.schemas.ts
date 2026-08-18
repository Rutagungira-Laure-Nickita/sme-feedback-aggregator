import { z } from "zod";

export const feedbackAIParamsSchema = z.object({
  businessId: z.string(),
  feedbackId: z.string()
});

export const businessAIParamsSchema = z.object({
  businessId: z.string()
});
