import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Globe2,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  Star
} from "lucide-react";
import { forwardRef, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { ThemeToggle } from "../../app/theme/ThemeToggle.js";
import { AppDatePickerField } from "../../components/ui/date-picker.js";
import { AppSelectField } from "../../components/ui/select-field.js";
import {
  fetchPublicFeedbackPortal,
  normalizePublicFeedbackError,
  submitPublicFeedback
} from "./api.js";
import { BusinessBrandAvatar } from "./BusinessBrandAvatar.js";
import { publicFeedbackSchema, type PublicFeedbackValues } from "./schemas.js";
import type { PublicFeedbackPortal, PublicFeedbackResult } from "./types.js";

const ratingLabels: Record<number, string> = {
  1: "Very poor",
  2: "Poor",
  3: "Okay",
  4: "Good",
  5: "Excellent"
};

export function PublicFeedbackPage(): JSX.Element {
  const { portalToken = "", qrToken = "" } = useParams();
  const isQrFeedback = Boolean(qrToken);
  const feedbackToken = isQrFeedback ? qrToken : portalToken;
  const feedbackSource = isQrFeedback ? "qr" : "portal";
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [completedSubmission, setCompletedSubmission] =
    useState<PublicFeedbackResult | null>(null);
  const lastSubmittedPayload = useRef<string | null>(null);
  const portalQuery = useQuery({
    queryKey: ["public-feedback", feedbackSource, feedbackToken],
    queryFn: () => fetchPublicFeedbackPortal(feedbackToken, feedbackSource),
    retry: false,
    enabled: Boolean(feedbackToken)
  });
  const form = useForm<PublicFeedbackValues>({
    resolver: zodResolver(publicFeedbackSchema),
    shouldFocusError: true,
    defaultValues: createDefaultValues()
  });
  const message = form.watch("message");
  const selectedRating = form.watch("rating");
  const branches = useMemo(
    () => portalQuery.data?.branches ?? [],
    [portalQuery.data?.branches]
  );
  const portal = portalQuery.data;
  const fixedBranchId = normalizeFixedBranchId(portal?.fixedBranchId);
  const fixedBranch = useMemo(
    () =>
      fixedBranchId ? branches.find((branch) => branch.id === fixedBranchId) : undefined,
    [branches, fixedBranchId]
  );

  useEffect(() => {
    if (!portal) {
      return;
    }

    if (fixedBranchId) {
      form.setValue("branchId", fixedBranchId, {
        shouldValidate: true
      });
      return;
    }

    const onlyBranch = branches.length === 1 ? branches[0] : undefined;

    if (onlyBranch) {
      form.setValue("branchId", onlyBranch.id, { shouldValidate: true });
      return;
    }

    const selectedBranchId = form.getValues("branchId");

    if (selectedBranchId && !branches.some((branch) => branch.id === selectedBranchId)) {
      form.setValue("branchId", "", { shouldValidate: false });
    }
  }, [branches, fixedBranchId, form, portal]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!lastSubmittedPayload.current || completedSubmission) {
        return;
      }

      const currentPayload = fingerprintValues(values as PublicFeedbackValues);

      if (currentPayload !== lastSubmittedPayload.current) {
        setIdempotencyKey(createIdempotencyKey());
        lastSubmittedPayload.current = null;
      }
    });

    return () => subscription.unsubscribe();
  }, [completedSubmission, form]);

  const mutation = useMutation({
    mutationFn: (values: PublicFeedbackValues) => {
      lastSubmittedPayload.current = fingerprintValues(values);
      return submitPublicFeedback(feedbackToken, values, idempotencyKey, feedbackSource);
    },
    retry: false,
    onSuccess(result) {
      setCompletedSubmission(result);
    }
  });

  const safeError = mutation.error
    ? normalizePublicFeedbackError(mutation.error)
    : portalQuery.error
      ? normalizePublicFeedbackError(portalQuery.error)
      : null;

  if (portalQuery.isLoading) {
    return (
      <PublicShell>
        <LoadingState />
      </PublicShell>
    );
  }

  if (safeError && !portal) {
    return (
      <PublicShell>
        <UnavailableState
          title={safeError.title}
          message={safeError.message}
          tone={safeError.status === 429 ? "warning" : "error"}
        />
      </PublicShell>
    );
  }

  if (!portal) {
    return (
      <PublicShell>
        <UnavailableState
          title="Feedback link unavailable"
          message="This feedback link is unavailable."
          tone="error"
        />
      </PublicShell>
    );
  }

  if (portal.branches.length === 0) {
    return (
      <PublicShell>
        <UnavailableState
          title="No locations available"
          message="This business is not accepting feedback at a location right now."
          tone="warning"
        />
      </PublicShell>
    );
  }

  if (completedSubmission) {
    return (
      <PublicShell>
        <SubmissionState
          portal={portal}
          submission={completedSubmission}
          onSubmitAnother={() => {
            setCompletedSubmission(null);
            setIdempotencyKey(createIdempotencyKey());
            lastSubmittedPayload.current = null;
            form.reset(
              createDefaultValues(
                fixedBranchId ??
                  (portal.branches.length === 1 ? (portal.branches[0]?.id ?? "") : "")
              )
            );
            mutation.reset();
          }}
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className="mx-auto grid w-full max-w-[1180px] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form
          className="rounded-lg border border-app-border bg-white p-5 shadow-premium dark:bg-[rgb(8,21,42)] sm:p-7"
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate(
              fixedBranchId
                ? {
                    ...values,
                    branchId: fixedBranchId
                  }
                : values
            )
          )}
        >
          <PortalHeader portal={portal} />
          <div className="mt-7 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black text-app-text">Share your feedback</h1>
              <p className="mt-2 text-sm font-semibold text-app-text-muted">
                Let us know about your experience.
              </p>
            </div>
            <div className="hidden rounded-lg border border-app-border bg-app-primary-soft p-4 text-app-primary sm:block">
              <Star className="h-8 w-8 fill-current" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {fixedBranchId ? (
              <>
                <input
                  type="hidden"
                  value={fixedBranchId}
                  readOnly
                  {...form.register("branchId")}
                />
                <ReadOnlyBranchField
                  branch={fixedBranch}
                  error={form.formState.errors.branchId?.message}
                />
              </>
            ) : (
              <Controller
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <AppSelectField
                    label="Branch"
                    id="public-branch"
                    required
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    error={form.formState.errors.branchId?.message}
                    placeholder={
                      portal.branches.length === 1 ? "Select branch" : "Choose a branch"
                    }
                    options={portal.branches.map((branch) => ({
                      value: branch.id,
                      label: `${branch.name}${branch.location ? ` - ${branch.location}` : ""}`
                    }))}
                    triggerClassName="h-11"
                  />
                )}
              />
            )}
            <Controller
              control={form.control}
              name="occurredAt"
              render={({ field }) => (
                <AppDatePickerField
                  label="Date of experience"
                  id="public-occurred-at"
                  mode="datetime"
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  error={form.formState.errors.occurredAt?.message}
                  placeholder="Pick date and time"
                  triggerClassName="h-11"
                />
              )}
            />
          </div>

          <div className="mt-6">
            <Controller
              control={form.control}
              name="rating"
              render={({ field }) => (
                <RatingField
                  value={field.value}
                  onChange={field.onChange}
                  error={form.formState.errors.rating?.message}
                />
              )}
            />
          </div>

          <div className="mt-6">
            <Controller
              control={form.control}
              name="message"
              render={({ field }) => (
                <TextAreaField
                  label="Message"
                  id="public-message"
                  required
                  maxLength={5_000}
                  placeholder="Tell us what happened..."
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  error={form.formState.errors.message?.message}
                  counter={`${message?.length ?? 0} / 5000`}
                />
              )}
            />
          </div>

          <section className="mt-6">
            <h2 className="text-sm font-black text-app-text">Your contact (optional)</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <DateField
                label="Your name"
                id="public-customer-name"
                placeholder="Enter your name"
                {...form.register("customerName")}
                error={form.formState.errors.customerName?.message}
              />
              <DateField
                label="Email address"
                id="public-customer-email"
                type="email"
                placeholder="Enter your email"
                {...form.register("customerEmail")}
                error={form.formState.errors.customerEmail?.message}
              />
              <DateField
                label="Phone number"
                id="public-customer-phone"
                placeholder="Enter your phone"
                {...form.register("customerPhone")}
                error={form.formState.errors.customerPhone?.message}
              />
            </div>
          </section>

          <label className="mt-5 flex items-start gap-3 rounded-md bg-app-surface-muted/60 p-3 text-sm font-semibold text-app-text-muted">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-app-border text-app-primary focus:ring-app-focus"
              {...form.register("allowFollowUp")}
            />
            <span>
              The business may contact me about this feedback.
              {form.formState.errors.allowFollowUp ? (
                <span className="mt-1 block text-app-error">
                  {form.formState.errors.allowFollowUp.message}
                </span>
              ) : null}
            </span>
          </label>

          <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
            <label htmlFor="public-website">Website</label>
            <input
              id="public-website"
              tabIndex={-1}
              autoComplete="off"
              {...form.register("website")}
            />
          </div>

          {safeError ? (
            <StateAlert title={safeError.title} message={safeError.message} />
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold text-app-text-muted">
              <Lock className="h-4 w-4" aria-hidden="true" />
              We respect your privacy. Your information is safe with us.
            </p>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-app-primary px-5 text-sm font-black text-app-primary-foreground transition hover:bg-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/30 disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-52"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {mutation.isPending ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <InfoPanel
            icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            title="Your feedback is valuable"
          >
            Thank you for helping improve this service. Your feedback is private and used
            only to make things better.
          </InfoPanel>
          <InfoPanel
            icon={<Globe2 className="h-5 w-5" aria-hidden="true" />}
            title="Selected rating"
          >
            {selectedRating
              ? `${ratingLabels[selectedRating]} (${selectedRating}/5)`
              : "Choose a rating to continue."}
          </InfoPanel>
        </aside>
      </section>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <main className="min-h-screen bg-app-background p-4 text-app-text transition-colors dark:bg-[rgb(5,15,32)] sm:p-6 lg:p-8">
      <div className="mx-auto mb-4 flex max-w-[1180px] justify-end">
        <ThemeToggle compact />
      </div>
      {children}
      <footer className="mx-auto mt-6 max-w-[1180px] text-center text-xs font-semibold text-app-text-muted">
        Powered by SME Feedback Aggregator
      </footer>
    </main>
  );
}

function PortalHeader({ portal }: { portal: PublicFeedbackPortal }): JSX.Element {
  return (
    <header className="flex items-center gap-3">
      <BusinessBrandAvatar
        businessName={portal.business.name}
        logoUrl={portal.business.logoUrl}
      />
      <div>
        <p className="text-sm font-black text-app-text">{portal.business.name}</p>
        <p className="mt-1 text-sm font-semibold text-app-text-muted">
          {portal.portal.welcomeMessage ?? "We value your feedback."}
        </p>
        {portal.qrCode ? (
          <p className="mt-1 text-xs font-black uppercase text-app-primary">
            QR Code - {portal.qrCode.name}
          </p>
        ) : null}
      </div>
    </header>
  );
}

function LoadingState(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-xl rounded-lg border border-app-border bg-app-surface p-8 text-center shadow-premium">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-app-primary" />
      <h1 className="mt-5 text-2xl font-black">Loading feedback portal</h1>
      <p className="mt-3 text-sm font-semibold text-app-text-muted">
        Preparing the public feedback form.
      </p>
    </section>
  );
}

function UnavailableState({
  title,
  message,
  tone
}: {
  title: string;
  message: string;
  tone: "error" | "warning";
}): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-xl rounded-lg border border-app-border bg-app-surface p-8 text-center shadow-premium">
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
          tone === "error"
            ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-200"
            : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
        }`}
      >
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-black">{title}</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-app-text-muted">
        {message}
      </p>
    </section>
  );
}

function SubmissionState({
  portal,
  submission,
  onSubmitAnother
}: {
  portal: PublicFeedbackPortal;
  submission: PublicFeedbackResult;
  onSubmitAnother: () => void;
}): JSX.Element {
  const duplicate = submission.duplicate;

  return (
    <section className="mx-auto w-full max-w-2xl rounded-lg border border-app-border bg-app-surface p-8 text-center shadow-premium dark:bg-[rgb(8,21,42)]">
      <PortalHeader portal={portal} />
      <div
        className={`mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full ${
          duplicate
            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-200"
            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200"
        }`}
      >
        {duplicate ? (
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        ) : (
          <Check className="h-8 w-8" aria-hidden="true" />
        )}
      </div>
      <h1 className="mt-6 text-3xl font-black">
        {duplicate ? "This feedback was already received." : "Thank you!"}
      </h1>
      <p
        className={`mt-3 text-sm font-black ${
          duplicate ? "text-blue-600 dark:text-blue-200" : "text-app-success"
        }`}
      >
        {duplicate ? "No duplicate was created." : "Your feedback has been received."}
      </p>
      <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-6 text-app-text-muted">
        We appreciate you taking the time to share your experience. Your feedback helps
        improve the service.
      </p>
      <div className="mx-auto mt-6 max-w-sm rounded-md border border-app-border bg-app-surface-muted/70 px-4 py-3">
        <p className="text-xs font-black uppercase text-app-text-muted">Reference ID</p>
        <p className="mt-1 break-all text-sm font-black text-app-text">
          {submission.feedbackId}
        </p>
      </div>
      <button
        type="button"
        onClick={onSubmitAnother}
        className="mt-6 inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-md bg-app-primary px-5 text-sm font-black text-app-primary-foreground transition hover:bg-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/30"
      >
        Submit Another Feedback
      </button>
    </section>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  required?: boolean;
};

const DateField = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, required, ...props }, ref): JSX.Element => (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold text-app-text">
        {label}
        {required ? <span className="text-app-error"> *</span> : null}
      </label>
      <input
        ref={ref}
        id={id}
        className={`mt-2 h-11 w-full rounded-md border bg-app-surface px-3 text-sm font-semibold text-app-text outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 ${error ? "border-app-error" : "border-app-border"}`}
        aria-invalid={error ? "true" : "false"}
        {...props}
      />
      {error ? (
        <p className="mt-2 text-sm font-semibold text-app-error">{error}</p>
      ) : null}
    </div>
  )
);

DateField.displayName = "DateField";

function ReadOnlyBranchField({
  branch,
  error
}: {
  branch: PublicFeedbackPortal["branches"][number] | undefined;
  error?: string;
}): JSX.Element {
  return (
    <div>
      <p className="block text-[13px] font-semibold text-app-text">
        Branch <span className="text-app-error">*</span>
      </p>
      <div
        className={`mt-2 flex min-h-11 items-start justify-between gap-3 rounded-md border bg-app-surface-muted px-3 py-2 text-sm font-semibold text-app-text ${
          error ? "border-app-error" : "border-app-border"
        }`}
      >
        <span>
          <span className="block">{branch?.name ?? "Assigned branch"}</span>
          {branch?.location ? (
            <span className="mt-0.5 block text-xs text-app-text-muted">
              {branch.location}
            </span>
          ) : null}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-app-primary-soft px-2 py-1 text-xs font-black text-app-primary">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Locked
        </span>
      </div>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-app-error">{error}</p>
      ) : null}
    </div>
  );
}

function normalizeFixedBranchId(fixedBranchId: string | null | undefined): string | null {
  const value = fixedBranchId?.trim();

  return value ? value : null;
}

type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  counter?: string;
  required?: boolean;
};

const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, counter, id, required, ...props }, ref): JSX.Element => (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold text-app-text">
        {label}
        {required ? <span className="text-app-error"> *</span> : null}
      </label>
      <textarea
        ref={ref}
        id={id}
        className={`mt-2 min-h-36 w-full resize-y rounded-md border bg-app-surface px-4 py-3 text-sm font-medium text-app-text outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 ${error ? "border-app-error" : "border-app-border"}`}
        aria-invalid={error ? "true" : "false"}
        {...props}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        {error ? (
          <p className="text-sm font-semibold text-app-error">{error}</p>
        ) : (
          <span />
        )}
        {counter ? (
          <p className="shrink-0 text-xs font-semibold text-app-text-muted">{counter}</p>
        ) : null}
      </div>
    </div>
  )
);

TextAreaField.displayName = "TextAreaField";

function RatingField({
  value,
  onChange,
  error
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  error?: string;
}): JSX.Element {
  return (
    <fieldset>
      <legend className="block text-[13px] font-semibold text-app-text">
        How was your experience? <span className="text-app-error">*</span>
      </legend>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup">
        {[1, 2, 3, 4, 5].map((rating) => (
          <label
            key={rating}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-app-primary transition hover:bg-app-primary-soft focus-within:ring-2 focus-within:ring-app-focus/30"
          >
            <input
              type="radio"
              name="public-rating"
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              className="sr-only"
              aria-label={`${rating} - ${ratingLabels[rating]}`}
            />
            <Star
              className={`h-8 w-8 ${
                value && rating <= value ? "fill-current" : "fill-transparent"
              }`}
              aria-hidden="true"
            />
          </label>
        ))}
        <span className="ml-1 min-w-28 text-sm font-black text-app-primary">
          {value ? ratingLabels[value] : "No rating selected"}
        </span>
      </div>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-app-error">{error}</p>
      ) : null}
    </fieldset>
  );
}

function InfoPanel({
  icon,
  title,
  children
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-lg border border-app-border bg-app-surface p-5 shadow-sm dark:bg-[rgb(8,21,42)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-app-primary-soft text-app-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-black text-app-text">{title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-app-text-muted">
            {children}
          </p>
        </div>
      </div>
    </section>
  );
}

function StateAlert({ title, message }: { title: string; message: string }): JSX.Element {
  return (
    <div
      className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6">{message}</p>
      </div>
    </div>
  );
}

function createDefaultValues(branchId = ""): PublicFeedbackValues {
  return {
    branchId,
    rating: undefined,
    message: "",
    occurredAt: undefined,
    customerName: undefined,
    customerEmail: undefined,
    customerPhone: undefined,
    allowFollowUp: false,
    website: ""
  };
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  const fallback = new Uint32Array(4);
  globalThis.crypto.getRandomValues(fallback);
  return Array.from(fallback, (value) => value.toString(16)).join("-");
}

function fingerprintValues(values: PublicFeedbackValues): string {
  return JSON.stringify({
    branchId: values.branchId,
    rating: values.rating,
    message: values.message,
    occurredAt: values.occurredAt,
    customerName: values.customerName,
    customerEmail: values.customerEmail,
    customerPhone: values.customerPhone,
    allowFollowUp: values.allowFollowUp
  });
}
