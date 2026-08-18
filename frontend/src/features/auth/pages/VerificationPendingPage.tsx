import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Clock, MailCheck, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "react-router-dom";
import { normalizeApiError } from "../../../api/axios.js";
import { resendEmailVerification } from "../api/authApi.js";
import { Alert } from "../components/Alert.js";
import { Button } from "../components/Button.js";
import { PremiumAuthShell } from "../components/PremiumAuthShell.js";
import { TextField } from "../components/TextField.js";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues
} from "../schemas/authSchemas.js";

type VerificationPendingState = {
  email?: string;
  emailDeliveryStatus?: "SENT" | "FAILED";
};

export function VerificationPendingPage(): JSX.Element {
  const location = useLocation();
  const state = (location.state as VerificationPendingState | null) ?? {};
  const [cooldown, setCooldown] = useState(0);
  const resendAction = useMutation({
    mutationFn: (email: string) => resendEmailVerification(email),
    onSuccess() {
      setCooldown(60);
    }
  });
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: state.email ?? ""
    }
  });
  const apiError = resendAction.error ? normalizeApiError(resendAction.error) : null;

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  return (
    <PremiumAuthShell
      title="Check your email"
      subtitle="We sent a verification link to activate your account."
      visualKind="verification"
      visualTitle="Verify your email"
      visualSubtitle="Please check your inbox and click the link to activate your account before signing in."
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
      <div className="space-y-5">
        <div className="rounded-lg border border-app-border bg-app-surface-muted px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary">
              <MailCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-app-text">Verification email sent</p>
              {state.email ? (
                <p className="mt-1 break-all text-sm font-semibold text-app-text-muted">
                  {state.email}
                </p>
              ) : (
                <p className="mt-1 text-sm font-semibold text-app-text-muted">
                  Enter your email below if you need another link.
                </p>
              )}
              {state.emailDeliveryStatus === "FAILED" ? (
                <p className="mt-2 text-sm font-semibold text-app-warning">
                  The first delivery attempt did not complete. You can request another
                  email.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <form
          className="space-y-5"
          onSubmit={handleSubmit((values) => resendAction.mutate(values.email))}
        >
          <TextField
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            size="comfortable"
            {...register("email")}
          />

          {resendAction.isSuccess ? (
            <Alert variant="success">
              If verification is available for that address, a new email will be sent.
            </Alert>
          ) : null}

          {apiError ? <Alert variant="error">{apiError.message}</Alert> : null}

          <Button
            type="submit"
            disabled={cooldown > 0}
            icon={<Send className="h-4 w-4" aria-hidden="true" />}
            isLoading={resendAction.isPending}
            loadingText="Sending"
            size="comfortable"
          >
            {cooldown > 0
              ? `Resend available in ${cooldown}s`
              : "Resend verification email"}
          </Button>
        </form>

        {cooldown > 0 ? (
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-app-text-muted">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Resend cooldown is active
          </p>
        ) : null}

        <div className="rounded-lg border border-app-border bg-app-surface-muted px-4 py-4 text-sm font-medium leading-6 text-app-text-muted">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" />
            <p>
              Do not see the email? Check your spam or promotions folder and add us to
              your contacts.
            </p>
          </div>
        </div>
      </div>
    </PremiumAuthShell>
  );
}
