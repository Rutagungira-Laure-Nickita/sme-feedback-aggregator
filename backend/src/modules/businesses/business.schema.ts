import {
  BranchStatus,
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus,
  StaffInvitationStatus
} from "@prisma/client";
import { z } from "zod";

const idSchema = z.string().trim().min(1).max(191);
const textSchema = (max: number) => z.string().trim().min(1).max(max);
const optionalTextSchema = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional()
  );
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(255)
  .transform((value) => value.toLowerCase());
const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .email()
    .max(255)
    .transform((value) => value.toLowerCase())
    .optional()
);
const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().url().max(1024).optional()
);
const phoneSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[+\d][\d\s().-]{2,39}$/, "Enter a valid phone number.");
const optionalPhoneSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  phoneSchema.optional()
);
const branchCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens only.")
  .transform((value) => value.toUpperCase());

const paginationQuerySchema = z.object({
  search: optionalTextSchema(120),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const businessIdParamsSchema = z.object({
  businessId: idSchema
});

export const branchIdParamsSchema = businessIdParamsSchema.extend({
  branchId: idSchema
});

export const membershipIdParamsSchema = businessIdParamsSchema.extend({
  membershipId: idSchema
});

export const invitationIdParamsSchema = businessIdParamsSchema.extend({
  invitationId: idSchema
});

export const businessMineQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(BusinessStatus).optional()
});

const branchInputSchema = z.object({
  name: textSchema(140),
  code: branchCodeSchema,
  addressLine: textSchema(255),
  city: textSchema(100),
  district: optionalTextSchema(100),
  country: textSchema(100),
  phone: optionalPhoneSchema,
  email: optionalEmailSchema
});

export const createBusinessSchema = z.object({
  name: textSchema(160),
  industry: textSchema(120),
  description: optionalTextSchema(2000),
  email: emailSchema,
  phone: phoneSchema,
  website: optionalUrlSchema,
  logoUrl: optionalUrlSchema,
  country: textSchema(100),
  city: textSchema(100),
  district: optionalTextSchema(100),
  addressLine: textSchema(255),
  timezone: textSchema(80),
  primaryBranch: branchInputSchema
});

export const updateBusinessSchema = createBusinessSchema
  .omit({ primaryBranch: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  });

export const branchListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(BranchStatus).optional()
});

export const createBranchSchema = branchInputSchema.extend({
  isPrimary: z.boolean().optional()
});

export const updateBranchSchema = branchInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  });

export const membershipListQuerySchema = paginationQuerySchema.extend({
  role: z.nativeEnum(BusinessMemberRole).optional(),
  status: z.nativeEnum(BusinessMembershipStatus).optional(),
  branchId: idSchema.optional()
});

export const updateMembershipRoleSchema = z.object({
  role: z.nativeEnum(BusinessMemberRole)
});

export const updateMembershipBranchAccessSchema = z
  .object({
    allBranchesAccess: z.boolean(),
    branchIds: z.array(idSchema).max(100).default([])
  })
  .refine((value) => value.allBranchesAccess || value.branchIds.length > 0, {
    message: "Choose all branches or at least one branch."
  });

export const invitationListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(StaffInvitationStatus).optional()
});

export const createStaffInvitationSchema = z
  .object({
    invitedEmail: emailSchema,
    role: z.nativeEnum(BusinessMemberRole),
    allBranchesAccess: z.boolean(),
    branchIds: z.array(idSchema).max(100).default([])
  })
  .refine((value) => value.role !== BusinessMemberRole.OWNER, {
    message: "Owner invitations are not supported.",
    path: ["role"]
  })
  .refine((value) => value.allBranchesAccess || value.branchIds.length > 0, {
    message: "Choose all branches or at least one branch.",
    path: ["branchIds"]
  });

export const invitationTokenQuerySchema = z.object({
  token: z.string().trim().min(20).max(512)
});

export const acceptInvitationSessionSchema = z.object({
  token: z.string().trim().min(20).max(512)
});

export const acceptInvitationPasswordSchema = z.object({
  token: z.string().trim().min(20).max(512),
  firstName: textSchema(100),
  lastName: textSchema(100),
  password: z.string().min(10).max(128)
});

export const acceptInvitationGoogleSchema = z.object({
  token: z.string().trim().min(20).max(512),
  credential: z.string().trim().min(1).max(4096)
});

export const adminBusinessListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(BusinessStatus).optional(),
  sort: z.enum(["NEWEST", "NAME", "MOST_FEEDBACK"]).default("NEWEST")
});

export const adminCreateBusinessSchema = createBusinessSchema.extend({
  ownerUserId: idSchema
});

export const adminUpdateBusinessSchema = updateBusinessSchema;

export const adminBusinessStatusSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED", "ARCHIVED"]),
  reason: optionalTextSchema(240)
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type AdminCreateBusinessInput = z.infer<typeof adminCreateBusinessSchema>;
export type AdminBusinessStatusInput = z.infer<typeof adminBusinessStatusSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type UpdateMembershipBranchAccessInput = z.infer<
  typeof updateMembershipBranchAccessSchema
>;
export type CreateStaffInvitationInput = z.infer<typeof createStaffInvitationSchema>;
export type AcceptInvitationPasswordInput = z.infer<
  typeof acceptInvitationPasswordSchema
>;
export type AcceptInvitationGoogleInput = z.infer<typeof acceptInvitationGoogleSchema>;
