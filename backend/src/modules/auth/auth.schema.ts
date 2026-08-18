import { z } from "zod";
import { PUBLIC_REGISTRATION_ROLES } from "./auth.constants.js";

const printablePasswordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128, "Password must be 128 characters or fewer.");

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name must be 100 characters or fewer.");

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(255, "Email must be 255 characters or fewer.")
  .transform((email) => email.toLowerCase());

export const registerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: printablePasswordSchema,
  role: z.enum(PUBLIC_REGISTRATION_ROLES)
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(128)
});

const accountTokenSchema = z.string().trim();

const googleCredentialSchema = z
  .string()
  .trim()
  .min(1, "Google credential is required.")
  .max(4096, "Google credential is too large.");

export const googleRegisterSchema = z.object({
  credential: googleCredentialSchema,
  role: z.enum(PUBLIC_REGISTRATION_ROLES),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional()
});

export const googleLoginSchema = z.object({
  credential: googleCredentialSchema
});

export const googleLinkSchema = z.object({
  credential: googleCredentialSchema
});

export const sessionIdSchema = z.object({
  sessionId: z.string().min(1).max(191)
});

export const resendEmailVerificationSchema = z.object({
  email: emailSchema
});

export const confirmEmailVerificationSchema = z.object({
  token: accountTokenSchema.optional()
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z
  .object({
    token: accountTokenSchema.optional(),
    newPassword: printablePasswordSchema,
    confirmPassword: printablePasswordSchema.optional()
  })
  .refine(
    (data) =>
      data.confirmPassword === undefined || data.newPassword === data.confirmPassword,
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"]
    }
  );

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleRegisterInput = z.infer<typeof googleRegisterSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type GoogleLinkInput = z.infer<typeof googleLinkSchema>;
export type ResendEmailVerificationInput = z.infer<typeof resendEmailVerificationSchema>;
export type ConfirmEmailVerificationInput = z.infer<
  typeof confirmEmailVerificationSchema
>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
