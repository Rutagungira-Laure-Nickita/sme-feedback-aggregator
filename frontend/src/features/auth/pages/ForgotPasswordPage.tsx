import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { normalizeApiError } from "../../../api/axios.js";
import { Alert } from "../components/Alert.js";
import { Button } from "../components/Button.js";
import { PremiumAuthShell } from "../components/PremiumAuthShell.js";
import { TextField } from "../components/TextField.js";
import { useForgotPasswordAction } from "../hooks/useAuthActions.js";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues
} from "../schemas/authSchemas.js";

export function ForgotPasswordPage(): JSX.Element {
  const forgotPasswordAction = useForgotPasswordAction();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: ""
    }
  });
  const apiError = forgotPasswordAction.error
    ? normalizeApiError(forgotPasswordAction.error)
    : null;

  return (
    <PremiumAuthShell
      title="Forgot your password?"
      subtitle="Enter your email address and we will send a secure reset link if password reset is available."
      visualKind="forgotPassword"
      visualTitle="Secure account recovery"
      visualSubtitle="Reset links are single-use, time-limited, and designed to keep your account protected."
      formPosition="left"
      compact
      footer={
        <Link
          to="/login"
          className="inline-flex items-center justify-center gap-2 font-bold text-app-primary transition hover:text-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/30"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
      }
    >
      {forgotPasswordAction.isSuccess ? (
        <div className="space-y-5">
          <div className="flex items-start gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-app-success" />
            <div>
              <h2 className="text-lg font-black">
                If an eligible account exists, a reset link has been sent.
              </h2>
              <p className="mt-2 text-sm font-medium leading-6">
                Please check your inbox and follow the instructions to reset your
                password. The link will expire soon.
              </p>
            </div>
          </div>
          <SecurityReminder />
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={handleSubmit((values) => forgotPasswordAction.mutate(values))}
        >
          <TextField
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            error={errors.email?.message}
            size="comfortable"
            {...register("email")}
          />

          {apiError ? <Alert variant="error">{apiError.message}</Alert> : null}

          <Button
            type="submit"
            icon={<Mail className="h-4 w-4" aria-hidden="true" />}
            isLoading={forgotPasswordAction.isPending}
            loadingText="Sending"
            size="comfortable"
          >
            Send reset link
          </Button>

          <SecurityReminder />
        </form>
      )}
    </PremiumAuthShell>
  );
}

function SecurityReminder(): JSX.Element {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface-muted px-4 py-4 text-sm font-medium leading-6 text-app-text-muted">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" />
        <p>Security first: reset links expire and can only be used once.</p>
      </div>
    </div>
  );
}
