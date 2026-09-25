import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalUrl = optionalString.refine(
  (value) => !value || /^https?:\/\/.+/i.test(value),
  "Enter a valid URL."
);
const optionalEmail = optionalString.refine(
  (value) => !value || z.string().email().max(255).safeParse(value).success,
  "Enter a valid email."
);

const phoneSchema = z
  .string()
  .trim()
  .min(3, "Phone is required.")
  .max(40, "Phone is too long.")
  .regex(/^[+\d][\d\s().-]{2,39}$/, "Enter a valid phone number.");
const optionalPhone = optionalString.refine(
  (value) => !value || /^[+\d][\d\s().-]{2,39}$/.test(value),
  "Enter a valid phone number."
);
const branchCodeSchema = z
  .string()
  .trim()
  .min(2, "Code is required.")
  .max(32)
  .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens only.")
  .transform((value) => value.toUpperCase());

export const businessSetupSchema = z.object({
  name: z.string().trim().min(2, "Business name is required.").max(160),
  industry: z.string().trim().min(2, "Industry is required.").max(120),
  description: optionalString,
  email: z.string().trim().email("Enter a valid email.").max(255),
  phone: phoneSchema,
  website: optionalUrl,
  logoUrl: optionalUrl,
  country: z.string().trim().min(2, "Country is required.").max(100),
  city: z.string().trim().min(2, "City is required.").max(100),
  district: optionalString,
  addressLine: z.string().trim().min(2, "Address is required.").max(255),
  timezone: z.string().trim().min(2, "Timezone is required.").max(80),
  primaryBranchName: z
    .string()
    .trim()
    .min(2, "Primary branch name is required.")
    .max(140),
  primaryBranchCode: branchCodeSchema,
  primaryBranchAddressLine: z
    .string()
    .trim()
    .min(2, "Branch address is required.")
    .max(255),
  primaryBranchCity: z.string().trim().min(2, "Branch city is required.").max(100),
  primaryBranchDistrict: optionalString,
  primaryBranchCountry: z.string().trim().min(2, "Branch country is required.").max(100),
  primaryBranchPhone: optionalPhone,
  primaryBranchEmail: optionalEmail
});

export const businessSettingsSchema = businessSetupSchema.omit({
  primaryBranchName: true,
  primaryBranchCode: true,
  primaryBranchAddressLine: true,
  primaryBranchCity: true,
  primaryBranchDistrict: true,
  primaryBranchCountry: true,
  primaryBranchPhone: true,
  primaryBranchEmail: true
});

export const branchFormSchema = z.object({
  name: z.string().trim().min(2, "Branch name is required.").max(140),
  code: z.string().trim().min(2, "Branch code is required.").max(32),
  addressLine: z.string().trim().min(2, "Address is required.").max(255),
  city: z.string().trim().min(2, "City is required.").max(100),
  district: optionalString,
  country: z.string().trim().min(2, "Country is required.").max(100),
  phone: optionalString,
  email: optionalString,
  isPrimary: z.boolean().optional()
});

export const inviteStaffSchema = z
  .object({
    invitedEmail: z.string().trim().email("Enter a valid email.").max(255),
    role: z.enum(["MANAGER", "STAFF"]),
    allBranchesAccess: z.boolean(),
    branchIds: z.array(z.string()).default([])
  })
  .refine((value) => value.allBranchesAccess || value.branchIds.length > 0, {
    path: ["branchIds"],
    message: "Choose all branches or at least one branch."
  });

export const membershipBranchAccessSchema = z
  .object({
    allBranchesAccess: z.boolean(),
    branchIds: z.array(z.string()).default([])
  })
  .refine((value) => value.allBranchesAccess || value.branchIds.length > 0, {
    path: ["branchIds"],
    message: "Choose all branches or at least one branch."
  });

export const invitationPasswordSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  password: z.string().min(10, "Password must be at least 10 characters.").max(128)
});

const manualOptionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const manualOptionalUrl = manualOptionalString(1024).refine(
  (value) => !value || /^https?:\/\/.+/i.test(value),
  "Enter a valid HTTP or HTTPS URL."
);

const manualOptionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value.toLowerCase() : undefined))
  .refine((value) => !value || z.string().email().safeParse(value).success, {
    message: "Enter a valid email address."
  });

const manualOptionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => !value || /^[+\d][\d\s().-]{2,39}$/.test(value), {
    message: "Enter a valid phone number."
  });

const manualOptionalNumber = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? Number(value) : undefined))
  .refine((value) => value === undefined || Number.isInteger(value), {
    message: "Enter a whole number."
  })
  .refine((value) => value === undefined || value >= 0, {
    message: "Size cannot be negative."
  });

export const manualSourceTypeSchema = z.enum([
  "PHONE_CALL",
  "IN_PERSON",
  "SUGGESTION_BOX",
  "SMS",
  "EMAIL_COPY",
  "SOCIAL_MEDIA_COPY",
  "OTHER"
]);

export const manualAttachmentReferenceSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required.").max(255),
  mimeType: z.string().trim().min(1, "MIME type is required.").max(120),
  sizeBytes: manualOptionalNumber,
  externalUrl: manualOptionalUrl,
  checksum: manualOptionalString(255)
});

export const manualFeedbackSchema = z.object({
  branchId: z.string().trim().min(1, "Select a branch."),
  categoryId: manualOptionalString(191),
  sourceType: manualSourceTypeSchema,
  title: manualOptionalString(250),
  message: z
    .string()
    .trim()
    .min(1, "Feedback message is required.")
    .max(10_000, "Feedback message is too long."),
  rating: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .nullable()
    .transform((value) => value ?? undefined),
  occurredAt: manualOptionalString(80).refine(
    (value) => !value || !Number.isNaN(new Date(value).getTime()),
    "Enter a valid date and time."
  ),
  languageCode: manualOptionalString(20).refine(
    (value) => !value || /^[a-z]{2,3}(-[a-z0-9]{2,8}){0,2}$/i.test(value),
    "Enter a valid language code."
  ),
  customerName: manualOptionalString(160),
  customerEmail: manualOptionalEmail,
  customerPhone: manualOptionalPhone,
  sourceNote: manualOptionalString(1000),
  sourceReference: manualOptionalString(255),
  sourceUrl: manualOptionalUrl,
  attachments: z.array(manualAttachmentReferenceSchema).max(10).default([])
});

export const publicFeedbackSettingsSchema = z.object({
  enabled: z.boolean(),
  welcomeMessage: z.string().trim().max(500, "Welcome message is too long.").optional()
});

export const qrCodeCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    scope: z.enum(["BUSINESS_WIDE", "BRANCH"]),
    branchId: z.string().trim().optional()
  })
  .refine((value) => value.scope !== "BRANCH" || Boolean(value.branchId), {
    path: ["branchId"],
    message: "Choose a branch for a branch-specific QR code."
  });

export const qrCodeRenameSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120)
});

export type BusinessSetupValues = z.infer<typeof businessSetupSchema>;
export type BusinessSettingsValues = z.infer<typeof businessSettingsSchema>;
export type BranchFormValues = z.infer<typeof branchFormSchema>;
export type InviteStaffValues = z.infer<typeof inviteStaffSchema>;
export type MembershipBranchAccessValues = z.infer<typeof membershipBranchAccessSchema>;
export type InvitationPasswordValues = z.infer<typeof invitationPasswordSchema>;
export type ManualFeedbackValues = z.infer<typeof manualFeedbackSchema>;
export type PublicFeedbackSettingsValues = z.infer<typeof publicFeedbackSettingsSchema>;
export type QrCodeCreateValues = z.infer<typeof qrCodeCreateSchema>;
export type QrCodeRenameValues = z.infer<typeof qrCodeRenameSchema>;
