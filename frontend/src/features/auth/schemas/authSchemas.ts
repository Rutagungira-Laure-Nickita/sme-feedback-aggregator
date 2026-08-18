import { z } from "zod";

const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use 128 characters or fewer.");

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(255)
  .transform((email) => email.toLowerCase());

const nameSchema = z.string().trim().min(1, "Required.").max(100);

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128)
});

export const registerFormSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
    role: z.enum(["BUSINESS_OWNER", "CUSTOMER"])
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export const forgotPasswordFormSchema = z.object({
  email: emailSchema
});

export const resetPasswordFormSchema = z
  .object({
    token: z.string().min(1, "Reset token is required."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password.")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
