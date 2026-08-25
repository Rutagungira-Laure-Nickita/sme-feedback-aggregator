import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  type Location,
  useLocation,
  useNavigate,
  useSearchParams
} from "react-router-dom";
import { normalizeApiError } from "../../../api/axios.js";
import { ThemeToggle } from "../../../app/theme/ThemeToggle.js";
import { Alert } from "../components/Alert.js";
import { AuthCard } from "../components/AuthCard.js";
import { BrandMark } from "../components/BrandMark.js";
import { Button } from "../components/Button.js";
import { GoogleCredentialButton } from "../components/GoogleCredentialButton.js";
import { LoginIllustration } from "../components/LoginIllustration.js";
import { PasswordField } from "../components/PasswordField.js";
import { SecurityNote } from "../components/SecurityNote.js";
import { TextField } from "../components/TextField.js";
import { useGoogleLoginAction, useLoginAction } from "../hooks/useAuthActions.js";
import { loginFormSchema, type LoginFormValues } from "../schemas/authSchemas.js";

type LoginLocationState = {
  from?: Pick<Location, "pathname" | "search" | "hash">;
};

export function LoginPage(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = (location.state as LoginLocationState | null)?.from;
  const redirectTo = from ? `${from.pathname}${from.search}${from.hash}` : undefined;
  const loginAction = useLoginAction(redirectTo);
  const googleLoginAction = useGoogleLoginAction(redirectTo);
  const [googleClientError, setGoogleClientError] = useState<string | null>(null);
  const {
    register,
    getValues,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const apiError = loginAction.error ? normalizeApiError(loginAction.error) : null;
  const googleApiError = googleLoginAction.error
    ? normalizeApiError(googleLoginAction.error)
    : null;
  const verifiedSuccess = searchParams.get("verified") === "success";
  const resetSuccess = searchParams.get("reset") === "success";

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background p-5 text-app-text transition-colors sm:p-6 lg:p-8">
      <section className="relative grid w-full max-w-[1260px] overflow-hidden rounded-[1.25rem] border border-app-border bg-[linear-gradient(135deg,rgb(255,255,255),rgb(247,249,255))] shadow-premium dark:bg-[linear-gradient(135deg,rgb(3,13,34),rgb(10,24,50))] lg:min-h-[700px] lg:grid-cols-[minmax(0,1.45fr)_minmax(400px,1fr)] xl:grid-cols-[minmax(0,1.5fr)_minmax(430px,1fr)]">
        <div className="absolute right-5 top-5 z-20">
          <ThemeToggle compact />
        </div>

        <div className="relative px-6 pb-3 pt-7 sm:px-8 lg:px-11 lg:py-10 xl:px-12">
          <BrandMark />

          <div className="mt-9 max-w-[390px] lg:mt-16">
            <h1 className="hidden text-[2.35rem] font-black leading-[1.14] text-app-text lg:block xl:text-[2.55rem]">
              Understand every
              <span className="block">customer.</span>
              <span className="mt-1 block text-app-primary">
                Improve every
                <span className="block">experience.</span>
              </span>
            </h1>

            <h1 className="pr-10 text-2xl font-black leading-tight text-app-text sm:text-3xl lg:hidden">
              Welcome back
            </h1>

            <p className="mt-5 text-sm font-medium leading-6 text-app-text-muted lg:max-w-[340px] xl:text-[15px]">
              <span className="lg:hidden">Sign in to your account to continue.</span>
              <span className="hidden lg:inline">
                Collect feedback from all your channels, understand what matters, and take
                action that grows your business.
              </span>
            </p>
          </div>

          <div className="mt-8 hidden max-w-[320px] space-y-5 lg:block">
            {[
              {
                title: "All channels in one place",
                description: "Gmail, WhatsApp, manual entry and public forms."
              },
              {
                title: "AI-powered insights",
                description: "Detect sentiment, trends and actionable insights."
              },
              {
                title: "Built for your business",
                description: "Secure, reliable and designed for growth."
              }
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary dark:text-indigo-100">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-black text-app-text">{item.title}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-app-text-muted">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <LoginIllustration />

          <Link
            to="/system-status"
            className="mt-8 hidden max-w-[320px] items-start gap-3 rounded-md text-xs font-semibold text-app-text-muted transition hover:text-app-primary focus:outline-none focus:ring-2 focus:ring-app-focus/25 lg:absolute lg:bottom-9 lg:left-10 lg:flex"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-app-border bg-app-surface">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-black text-app-text">
                Enterprise-grade security
              </span>
              Your data is encrypted and never shared.
            </span>
          </Link>
        </div>

        <div className="relative z-10 px-5 pb-8 sm:px-8 lg:flex lg:items-center lg:px-8 lg:py-10 xl:px-10">
          <div className="mx-auto w-full max-w-[460px] lg:max-w-[440px] xl:max-w-[460px]">
            <AuthCard className="!border-0 !bg-transparent !p-0 !shadow-none lg:!border lg:!border-app-border lg:!bg-app-surface/92 lg:!px-8 lg:!py-9 lg:!shadow-panel lg:backdrop-blur xl:!px-9">
              <div>
                <h2 className="text-2xl font-black leading-tight text-app-text lg:text-[1.875rem]">
                  Welcome back
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-app-text-muted sm:text-[15px]">
                  Sign in to your account to continue.
                </p>
              </div>

              <div className="mt-7 space-y-4">
                <div className="flex w-full justify-center rounded-md border border-app-border bg-app-surface-muted p-2 dark:bg-app-surface-muted/80">
                  <GoogleCredentialButton
                    text="signin_with"
                    disabled={googleLoginAction.isPending}
                    preferredWidth={360}
                    onCredential={(credential) => {
                      setGoogleClientError(null);
                      googleLoginAction.mutate(credential);
                    }}
                    onClientError={setGoogleClientError}
                  />
                </div>

                {googleLoginAction.isPending ? (
                  <Alert variant="info">Verifying Google sign-in.</Alert>
                ) : null}

                {googleClientError || googleApiError ? (
                  <Alert variant="error">
                    {googleApiError?.message ?? googleClientError}
                  </Alert>
                ) : null}
              </div>

              <div className="my-6 flex items-center gap-3 text-xs font-bold text-app-text-muted">
                <span className="h-px flex-1 bg-app-border" />
                or continue with email
                <span className="h-px flex-1 bg-app-border" />
              </div>

              <form
                className="space-y-5"
                onSubmit={handleSubmit((values) => loginAction.mutate(values))}
              >
                {verifiedSuccess || resetSuccess ? (
                  <Alert variant="success">
                    {verifiedSuccess
                      ? "Email verified. You can sign in now."
                      : "Password reset successful. Sign in with your new password."}
                  </Alert>
                ) : null}

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
                <PasswordField
                  id="password"
                  label="Password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  size="comfortable"
                  {...register("password")}
                />

                <div className="flex justify-end pt-0.5">
                  <Link
                    to="/forgot-password"
                    className="rounded-md text-sm font-bold text-app-primary transition hover:text-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/25"
                  >
                    Forgot password?
                  </Link>
                </div>

                {apiError ? (
                  <Alert variant="error">
                    <p>{apiError.message}</p>
                    {apiError.code === "EMAIL_NOT_VERIFIED" ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/verify-email-pending", {
                            state: { email: getValues("email") }
                          })
                        }
                        className="mt-2 font-bold underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-app-focus/25"
                      >
                        Resend verification email
                      </button>
                    ) : null}
                  </Alert>
                ) : null}

                <Button
                  type="submit"
                  icon={<LogIn className="h-4 w-4" aria-hidden="true" />}
                  isLoading={loginAction.isPending}
                  loadingText="Signing in"
                  size="comfortable"
                >
                  Sign in
                </Button>
              </form>

              <div className="mt-6 border-t border-app-border pt-6">
                <p className="text-center text-sm text-app-text-muted">
                  Need an account?{" "}
                  <Link
                    to="/register"
                    className="font-bold text-app-primary transition hover:text-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/25"
                  >
                    Create account
                  </Link>
                </p>
                <div className="mt-6 border-t border-app-border pt-5">
                  <SecurityNote text="We use industry-standard security to protect your account." />
                </div>
              </div>
            </AuthCard>
          </div>
        </div>
      </section>
    </main>
  );
}
