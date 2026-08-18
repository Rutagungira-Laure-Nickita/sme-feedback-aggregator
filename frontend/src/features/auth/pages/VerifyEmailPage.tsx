import { ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { normalizeApiError, type ApiError } from "../../../api/axios.js";
import { confirmEmailVerification } from "../api/authApi.js";
import { Alert } from "../components/Alert.js";
import { PremiumAuthShell } from "../components/PremiumAuthShell.js";

type VerifyEmailState =
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string; code: string };

export function VerifyEmailPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const tokenRef = useRef(searchParams.get("token")?.trim() ?? "");
  const submittedTokenRef = useRef<string | null>(null);
  const [state, setState] = useState<VerifyEmailState>(() =>
    tokenRef.current
      ? { status: "loading", message: "Verifying your email address." }
      : {
          status: "error",
          message: "This verification link is missing a token.",
          code: "VERIFICATION_TOKEN_REQUIRED"
        }
  );

  useEffect(() => {
    const token = tokenRef.current;

    if (!token || submittedTokenRef.current === token) {
      return;
    }

    submittedTokenRef.current = token;
    window.history.replaceState(null, "", "/verify-email");

    confirmEmailVerification(token)
      .then(() => {
        setState({
          status: "success",
          message: "Your email has been verified and your account is now active."
        });
      })
      .catch((error: unknown) => {
        const apiError = normalizeApiError(error);
        setState({
          status: "error",
          message: getVerificationMessage(apiError),
          code: apiError.code
        });
      });
  }, []);

  const isSuccess = state.status === "success";
  const isLoading = state.status === "loading";

  return (
    <PremiumAuthShell
      title={
        isSuccess
          ? "Email verified successfully"
          : isLoading
            ? "Checking your link"
            : "Verification unavailable"
      }
      subtitle={state.message}
      visualKind="verificationSuccess"
      visualTitle="Unlock customer intelligence"
      visualSubtitle="Your verified account gives you access to powerful tools that help you collect, analyze, and act on feedback that drives growth."
      compact
      footer={
        <Link
          to={isSuccess ? "/login?verified=success" : "/login"}
          className="inline-flex items-center justify-center gap-2 font-bold text-app-primary transition hover:text-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/30"
        >
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-6 text-center">
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
            isSuccess
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
              : isLoading
                ? "bg-indigo-100 text-app-primary dark:bg-indigo-950/60"
                : "bg-red-100 text-app-error dark:bg-red-950/60"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
          ) : isLoading ? (
            <Loader2 className="h-12 w-12 animate-spin" aria-hidden="true" />
          ) : (
            <XCircle className="h-12 w-12" aria-hidden="true" />
          )}
        </div>

        {isSuccess ? (
          <div className="grid gap-3 text-left sm:grid-cols-2">
            {[
              "Sign in to explore your dashboard",
              "Set up your profile and preferences",
              "Invite your team in a later phase",
              "Continue into your assigned business workspace"
            ].map((item) => (
              <p
                key={item}
                className="flex items-start gap-2 rounded-lg border border-app-border bg-app-surface-muted px-3 py-3 text-sm font-semibold text-app-text-muted"
              >
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-app-success"
                  aria-hidden="true"
                />
                {item}
              </p>
            ))}
          </div>
        ) : (
          <Alert variant={isLoading ? "info" : "error"}>
            {isLoading
              ? "Please wait while we confirm your account."
              : state.code === "VERIFICATION_TOKEN_EXPIRED"
                ? "Request a new verification email and try again."
                : "Use the latest verification email or request another link."}
          </Alert>
        )}

        <Link
          to={isSuccess ? "/login?verified=success" : "/login"}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-app-primary px-5 text-[15px] font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/30"
        >
          {isSuccess ? "Continue to sign in" : "Return to sign in"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </PremiumAuthShell>
  );
}

function getVerificationMessage(error: ApiError): string {
  if (error.code === "VERIFICATION_TOKEN_EXPIRED") {
    return "This verification link has expired.";
  }

  if (
    error.code === "VERIFICATION_TOKEN_REQUIRED" ||
    error.code === "VERIFICATION_TOKEN_INVALID"
  ) {
    return "This verification link is invalid.";
  }

  return error.message;
}
