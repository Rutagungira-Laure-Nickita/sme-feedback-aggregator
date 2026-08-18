import { z } from "zod";
import { ALLOWED_COLOR_KEYS } from "./feedback-categories.types.js";

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be at most 100 characters")
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, "Category name cannot be only whitespace"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .nullable()
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : null)),
  colorKey: z
    .enum(ALLOWED_COLOR_KEYS as unknown as [string, ...string[]])
    .optional()
    .default("indigo")
});

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .min(1, "Category name is required")
      .max(100, "Category name must be at most 100 characters")
      .transform((val) => val.trim())
      .refine((val) => val.length > 0, "Category name cannot be only whitespace")
      .optional(),
    description: z
      .string()
      .max(500, "Description must be at most 500 characters")
      .nullable()
      .optional()
      .transform((val) => (val?.trim() ? val.trim() : null)),
    colorKey: z.enum(ALLOWED_COLOR_KEYS as unknown as [string, ...string[]]).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const activationSchema = z.object({
  isActive: z.boolean()
});

export const categoryParamsSchema = z.object({
  businessId: z.string(),
  categoryId: z.string()
});

export const listCategoriesQuerySchema = z.object({
  includeInactive: z
    .string()
    .optional()
    .transform((val) => val === "true")
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ActivationInput = z.infer<typeof activationSchema>;
