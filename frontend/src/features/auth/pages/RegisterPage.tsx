import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, Check, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { normalizeApiError } from "../../../api/axios.js";
import { Alert } from "../components/Alert.js";
import { Button } from "../components/Button.js";
import { GoogleCredentialButton } from "../components/GoogleCredentialButton.js";
import { PasswordField } from "../components/PasswordField.js";
import { PremiumAuthShell } from "../components/PremiumAuthShell.js";
import { TextField } from "../components/TextField.js";
import { useGoogleRegisterAction, useRegisterAction } from "../hooks/useAuthActions.js";
import { registerFormSchema, type RegisterFormValues } from "../schemas/authSchemas.js";

const accountTypeOptions = [
  {
    value: "BUSINESS_OWNER",
    label: "Business Owner",
    description: "Manage and grow my business",
    icon: BriefcaseBusiness
  },
  {
    value: "CUSTOMER",
    label: "Customer",
    description: "Share feedback and help improve",
    icon: User
  }
] as const;

export function RegisterPage(): JSX.Element {
  const registerAction = useRegisterAction();
  const googleRegisterAction = useGoogleRegisterAction();
  const [googleClientError, setGoogleClientError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "BUSINESS_OWNER"
    }
  });
  const selectedRole = watch("role");
  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const apiError = registerAction.error ? normalizeApiError(registerAction.error) : null;
  const googleApiError = googleRegisterAction.error
    ? normalizeApiError(googleRegisterAction.error)
    : null;

  return (
    <PremiumAuthShell
      title="Create your account"
      subtitle="Join SME Feedback Aggregator today."
      visualKind="register"
      visualTitle="Collect. Analyze. Grow with Feedback."
      visualSubtitle="Unify feedback from every channel, understand what matters, and make smarter decisions that drive real growth."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-bold text-app-primary transition hover:text-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/30"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <div className="flex w-full justify-center rounded-md border border-app-border bg-app-surface-muted p-2 dark:bg-app-surface-muted/80">
          <GoogleCredentialButton
            text="signup_with"
            disabled={googleRegisterAction.isPending}
            preferredWidth={360}
            onCredential={(credential) => {
              setGoogleClientError(null);
              googleRegisterAction.mutate({
                credential,
                role: selectedRole,
                firstName: firstName.trim() || undefined,
                lastName: lastName.trim() || undefined
              });
            }}
            onClientError={setGoogleClientError}
          />
        </div>

        {googleRegisterAction.isPending ? (
          <Alert variant="info">Verifying Google registration.</Alert>
        ) : null}

        {googleClientError || googleApiError ? (
          <Alert variant="error">{googleApiError?.message ?? googleClientError}</Alert>
        ) : null}
      </div>

      <div className="my-6 flex items-center gap-3 text-xs font-bold text-app-text-muted">
        <span className="h-px flex-1 bg-app-border" />
        or register with email
        <span className="h-px flex-1 bg-app-border" />
      </div>

      <form
        className="space-y-5"
        onSubmit={handleSubmit((values) => registerAction.mutate(values))}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="firstName"
            label="First name"
            autoComplete="given-name"
            placeholder="Fabrice"
            error={errors.firstName?.message}
            size="comfortable"
            {...register("firstName")}
          />
          <TextField
            id="lastName"
            label="Last name"
            autoComplete="family-name"
            placeholder="Dushimimana"
            error={errors.lastName?.message}
            size="comfortable"
            {...register("lastName")}
          />
        </div>

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
          autoComplete="new-password"
          placeholder="Create a strong password"
          error={errors.password?.message}
          size="comfortable"
          {...register("password")}
        />
        <PasswordField
          id="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          error={errors.confirmPassword?.message}
          size="comfortable"
          {...register("confirmPassword")}
        />

        <fieldset
          aria-invalid={errors.role ? "true" : "false"}
          aria-describedby={errors.role ? "role-error" : undefined}
        >
          <legend className="block text-[13px] font-semibold text-app-text">
            I am a
          </legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {accountTypeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedRole === option.value;

              return (
                <label
                  key={option.value}
                  className={`relative flex min-h-[104px] cursor-pointer flex-col justify-center rounded-lg border px-4 py-4 transition focus-within:ring-2 focus-within:ring-app-focus/30 ${
                    isSelected
                      ? "border-app-primary bg-app-primary-soft text-app-text shadow-sm"
                      : "border-app-border bg-app-surface hover:border-app-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    value={option.value}
                    className="sr-only"
                    {...register("role")}
                  />
                  <span className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${
                        isSelected
                          ? "bg-app-primary text-white"
                          : "bg-app-surface-muted text-app-text-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {isSelected ? (
                      <span className="absolute right-3 top-3 text-app-primary">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-3 text-sm font-black text-app-text">
                    {option.label}
                  </span>
                  <span className="mt-1 text-xs font-semibold leading-5 text-app-text-muted">
                    {option.description}
                  </span>
                </label>
              );
            })}
          </div>
          {errors.role?.message ? (
            <p id="role-error" className="mt-2 text-sm font-medium text-app-error">
              {errors.role.message}
            </p>
          ) : null}
        </fieldset>

        <label className="flex items-start gap-3 text-sm font-medium leading-6 text-app-text-muted">
          <input
            required
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-app-border text-app-primary focus:ring-app-focus"
          />
          <span>
            I agree to the{" "}
            <Link to="/terms-of-service" className="font-bold text-app-primary">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy-policy" className="font-bold text-app-primary">
              Privacy Policy
            </Link>
          </span>
        </label>

        {apiError ? <Alert variant="error">{apiError.message}</Alert> : null}

        <Button
          type="submit"
          icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
          isLoading={registerAction.isPending}
          loadingText="Creating account"
          size="comfortable"
        >
          Create account
        </Button>
      </form>
    </PremiumAuthShell>
  );
}
