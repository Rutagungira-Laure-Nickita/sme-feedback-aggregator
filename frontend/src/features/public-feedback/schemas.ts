import { z } from "zod";

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value.toLowerCase() : undefined))
  .refine((value) => !value || z.string().email().safeParse(value).success, {
    message: "Enter a valid email address."
  });

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => !value || /^[+\d][\d\s().-]{2,39}$/.test(value), {
    message: "Enter a valid phone number."
  });

export const publicFeedbackSchema = z
  .object({
    branchId: z.string().trim().min(1, "Choose a branch."),
    rating: z
      .union([z.number().int().min(1).max(5), z.undefined()])
      .superRefine((value, context) => {
        if (value === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Choose a rating."
          });
        }
      }),
    message: z
      .string()
      .trim()
      .min(1, "Tell us what happened.")
      .max(5_000, "Feedback is too long."),
    occurredAt: optionalString(80).refine(
      (value) => !value || !Number.isNaN(new Date(value).getTime()),
      "Enter a valid date."
    ),
    customerName: optionalString(160),
    customerEmail: optionalEmail,
    customerPhone: optionalPhone,
    allowFollowUp: z.boolean().default(false),
    website: z.string().optional().default("")
  })
  .refine(
    (value) =>
      !value.allowFollowUp || Boolean(value.customerEmail || value.customerPhone),
    {
      path: ["allowFollowUp"],
      message: "Add an email or phone number if the business may follow up."
    }
  );

export type PublicFeedbackValues = z.infer<typeof publicFeedbackSchema>;
