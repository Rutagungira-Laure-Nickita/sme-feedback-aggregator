import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, KeyRound, XCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { normalizeApiError } from "../../../api/axios.js";
import { Alert } from "../components/Alert.js";
import { Button } from "../components/Button.js";
import { PasswordField } from "../components/PasswordField.js";
import { PremiumAuthShell } from "../components/PremiumAuthShell.js";
import { useResetPasswordAction } from "../hooks/useAuthActions.js";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues
} from "../schemas/authSchemas.js";

export function ResetPasswordPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const resetPasswordAction = useResetPasswordAction();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      token,
      newPassword: "",
      confirmPassword: ""
    }
  });
  const apiError = resetPasswordAction.error
    ? normalizeApiError(resetPasswordAction.error)
    : null;
  const newPassword = watch("newPassword");
  const confirmPassword = watch("confirmPassword");

  useEffect(() => {
    if (token) {
      window.history.replaceState(null, "", "/reset-password");
    }
  }, [token]);

  return (
    <PremiumAuthShell
      title="Create a new password"
      subtitle="Please enter and confirm your new password."
      visualKind="resetPassword"
      visualTitle="Secure. Simple. Trusted."
      visualSubtitle="Create a strong new password to keep your account and data protected."
      compact
      footer={
        <p>
          Remembered your password?{" "}
          <Link
            to="/login"
            className="font-bold text-app-primary transition hover:text-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/30"
          >
            Sign in
          </Link>
        </p>
      }
    >
      {!token ? (
        <div className="space-y-5">
          <Alert variant="error">
            This reset link is missing a token. Request a new password reset email.
          </Alert>
          <Link
            to="/forgot-password"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-app-primary px-5 text-[15px] font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/30"
          >
            Request a new link
          </Link>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={handleSubmit((values) => resetPasswordAction.mutate(values))}
        >
          <input type="hidden" {...register("token")} />
          <PasswordField
            id="newPassword"
            label="New password"
            autoComplete="new-password"
            placeholder="Enter a new password"
            error={errors.newPassword?.message}
            size="comfortable"
            {...register("newPassword")}
          />
          <PasswordStrengthBar password={newPassword} />
          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Confirm your new password"
            error={errors.confirmPassword?.message}
            size="comfortable"
            {...register("confirmPassword")}
          />

          <PasswordChecklist password={newPassword} confirmPassword={confirmPassword} />

          {apiError ? (
            <Alert variant="error">
              {getResetErrorMessage(apiError.code, apiError.message)}
            </Alert>
          ) : null}

          <Button
            type="submit"
            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
            isLoading={resetPasswordAction.isPending}
            loadingText="Resetting"
            size="comfortable"
          >
            Reset password
          </Button>
        </form>
      )}
    </PremiumAuthShell>
  );
}

function PasswordStrengthBar({ password }: { password: string }): JSX.Element {
  const score = getPasswordScore(password);
  const label = score >= 3 ? "Strong" : score >= 2 ? "Fair" : "Too short";
  const color =
    score >= 3 ? "bg-app-success" : score >= 2 ? "bg-app-warning" : "bg-app-error";

  return (
    <div aria-live="polite">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className={`h-1.5 rounded-full ${index < score ? color : "bg-app-border"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-right text-xs font-black text-app-text-muted">{label}</p>
    </div>
  );
}

function PasswordChecklist({
  password,
  confirmPassword
}: {
  password: string;
  confirmPassword: string;
}): JSX.Element {
  const checks = [
    { label: "At least 10 characters", valid: password.length >= 10 },
    {
      label: "Uppercase and lowercase letters",
      valid: /[a-z]/.test(password) && /[A-Z]/.test(password)
    },
    {
      label: "Confirmation matches",
      valid: Boolean(confirmPassword) && password === confirmPassword
    }
  ];

  return (
    <div className="rounded-lg border border-app-border bg-app-surface-muted p-4">
      <p className="text-sm font-black text-app-text">Password must contain:</p>
      <div className="mt-3 space-y-2">
        {checks.map((check) => (
          <p
            key={check.label}
            className="flex items-center gap-2 text-sm font-semibold text-app-text-muted"
          >
            {check.valid ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-app-success" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-app-text-muted/60" />
            )}
            {check.label}
          </p>
        ))}
      </div>
    </div>
  );
}

function getPasswordScore(password: string): number {
  if (!password) {
    return 0;
  }

  let score = password.length >= 10 ? 2 : 1;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  }

  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  return Math.min(score, 4);
}

function getResetErrorMessage(code: string, fallback: string): string {
  if (code === "PASSWORD_RESET_TOKEN_EXPIRED") {
    return "This reset link has expired. Request a new password reset email.";
  }

  if (
    code === "PASSWORD_RESET_TOKEN_REQUIRED" ||
    code === "PASSWORD_RESET_TOKEN_INVALID"
  ) {
    return "This reset link is invalid. Request a new password reset email.";
  }

  return fallback;
}
