import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Paperclip,
  Plus,
  Send,
  ShieldCheck,
  Star,
  Trash2
} from "lucide-react";
import { forwardRef, useEffect, useState, type ReactNode } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import { AppDatePickerField } from "../../components/ui/date-picker.js";
import { AppSelectField } from "../../components/ui/select-field.js";
import { BrandMark } from "../auth/components/BrandMark.js";
import { TextField } from "../auth/components/TextField.js";
import {
  fetchBranches,
  fetchBusiness,
  fetchMyBusinesses,
  submitManualFeedbackForBusiness
} from "./api/businessApi.js";
import {
  EmptyState,
  SuspendedBanner,
  WorkspaceButton,
  WorkspacePanel,
  WorkspaceShell
} from "./components.js";
import { manualFeedbackSchema, type ManualFeedbackValues } from "./schemas.js";
import { fetchCategories } from "./feedbackInboxApi.js";
import type {
  BranchSummary,
  BusinessDetail,
  ManualFeedbackResult,
  ManualSourceType,
  MyBusiness
} from "./types.js";

const sourceOptions: { value: ManualSourceType; label: string }[] = [
  { value: "PHONE_CALL", label: "Phone call" },
  { value: "IN_PERSON", label: "In person" },
  { value: "SUGGESTION_BOX", label: "Suggestion box" },
  { value: "SMS", label: "SMS" },
  { value: "EMAIL_COPY", label: "Email copy" },
  { value: "SOCIAL_MEDIA_COPY", label: "Social media copy" },
  { value: "OTHER", label: "Other" }
];

export function ManualFeedbackPage(): JSX.Element {
  const navigate = useNavigate();
  const { businessId } = useParams();
  const [submission, setSubmission] = useState<ManualFeedbackResult | null>(null);
  const contextQuery = useManualFeedbackContext(businessId);
  const categoriesQuery = useQuery({
    queryKey: ["businesses", businessId, "feedback-categories", "manual-entry"],
    queryFn: () => fetchCategories(businessId ?? ""),
    enabled: Boolean(businessId)
  });

  const form = useForm<ManualFeedbackValues>({
    resolver: zodResolver(manualFeedbackSchema),
    defaultValues: createDefaultValues()
  });
  const attachments = useFieldArray({
    control: form.control,
    name: "attachments"
  });

  const mutation = useMutation({
    mutationFn: (values: ManualFeedbackValues) =>
      submitManualFeedbackForBusiness(businessId ?? "", values, createIdempotencyKey()),
    onSuccess(result) {
      setSubmission(result);
      form.reset(createDefaultValues(form.getValues("branchId")));
    }
  });

  const selectedBranchId = form.watch("branchId");
  const sourceType = form.watch("sourceType");
  const occurredAt = form.watch("occurredAt");
  const message = form.watch("message");
  const selectedBranch = selectedBranchId
    ? contextQuery.branches.find((branch) => branch.id === selectedBranchId)
    : undefined;

  useEffect(() => {
    const currentBranchId = form.getValues("branchId");
    const currentBranchIsAccessible = contextQuery.branches.some(
      (branch) => branch.id === currentBranchId
    );

    if (currentBranchId && !currentBranchIsAccessible) {
      form.setValue("branchId", "", { shouldValidate: true });
      return;
    }

    const onlyAccessibleBranch =
      contextQuery.branches.length === 1 ? contextQuery.branches[0] : undefined;

    if (!currentBranchId && onlyAccessibleBranch) {
      form.setValue("branchId", onlyAccessibleBranch.id, {
        shouldValidate: true
      });
    }
  }, [contextQuery.branches, form]);

  if (contextQuery.state) {
    return contextQuery.state;
  }

  const { activeBusiness, businesses, business } = contextQuery;
  const apiError = mutation.error ? normalizeApiError(mutation.error).message : null;

  return (
    <WorkspaceShell
      title="Add customer feedback"
      subtitle="Record feedback received by phone, in person, through a suggestion box, or from another offline source."
      businesses={businesses}
      activeBusiness={activeBusiness}
    >
      {business.status === "SUSPENDED" ? <SuspendedBanner type="business" /> : null}

      {contextQuery.branchesLoading ? (
        <ManualFeedbackSkeleton />
      ) : contextQuery.branches.length === 0 ? (
        <EmptyState
          title="No active branches available"
          description="Manual feedback needs an active branch that your membership can access."
        />
      ) : (
        <form
          className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <WorkspacePanel className="p-0 sm:p-0">
            <FormSection
              number="1"
              title="Location and source"
              description="Choose where the feedback belongs and how it was received."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <AppSelectField
                      label="Branch"
                      id="manual-branch"
                      required
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      error={form.formState.errors.branchId?.message}
                      placeholder="Select a branch"
                      options={contextQuery.branches.map((branch) => ({
                        value: branch.id,
                        label: branch.name
                      }))}
                      triggerClassName="h-11"
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="sourceType"
                  render={({ field }) => (
                    <AppSelectField
                      label="Source type"
                      id="manual-source-type"
                      required
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      error={form.formState.errors.sourceType?.message}
                      options={sourceOptions}
                      triggerClassName="h-11"
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <AppSelectField
                      label="Category (optional)"
                      id="manual-category"
                      value={field.value ?? ""}
                      onValueChange={(value) => field.onChange(value || undefined)}
                      onBlur={field.onBlur}
                      name={field.name}
                      error={form.formState.errors.categoryId?.message}
                      placeholder="Assign automatically"
                      options={(categoriesQuery.data ?? []).map((category) => ({
                        value: category.id,
                        label: category.name
                      }))}
                      triggerClassName="h-11"
                    />
                  )}
                />
              </div>
            </FormSection>

            <FormSection
              number="2"
              title="Feedback"
              description="Capture the customer's words as clearly as possible."
            >
              <div className="space-y-4">
                <TextField
                  label="Feedback title (optional)"
                  id="manual-title"
                  placeholder="Short summary of the feedback"
                  {...form.register("title")}
                  error={form.formState.errors.title?.message}
                  size="comfortable"
                />
                <Controller
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <TextAreaField
                      label="Message"
                      id="manual-message"
                      required
                      maxLength={10_000}
                      placeholder="Enter the customer's feedback in detail..."
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      error={form.formState.errors.message?.message}
                      counter={`${message?.length ?? 0} / 10000`}
                    />
                  )}
                />
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
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
                  <Controller
                    control={form.control}
                    name="occurredAt"
                    render={({ field }) => (
                      <AppDatePickerField
                        label="Date received (optional)"
                        id="manual-occurred-at"
                        mode="datetime"
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        error={form.formState.errors.occurredAt?.message}
                        placeholder="Pick date and time"
                        triggerClassName="h-12"
                      />
                    )}
                  />
                  <TextField
                    label="Language (optional)"
                    id="manual-language"
                    placeholder="e.g. en, rw, fr"
                    {...form.register("languageCode")}
                    error={form.formState.errors.languageCode?.message}
                    size="comfortable"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              number="3"
              title="Customer information (optional)"
              description="Customer details help you follow up if needed. All fields are optional."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <TextField
                  label="Customer name"
                  id="manual-customer-name"
                  placeholder="Enter customer name"
                  {...form.register("customerName")}
                  error={form.formState.errors.customerName?.message}
                  size="comfortable"
                />
                <TextField
                  label="Customer email"
                  id="manual-customer-email"
                  type="email"
                  placeholder="Enter email address"
                  {...form.register("customerEmail")}
                  error={form.formState.errors.customerEmail?.message}
                  size="comfortable"
                />
                <TextField
                  label="Customer phone"
                  id="manual-customer-phone"
                  placeholder="Enter phone number"
                  {...form.register("customerPhone")}
                  error={form.formState.errors.customerPhone?.message}
                  size="comfortable"
                />
              </div>
            </FormSection>

            <FormSection
              number="4"
              title="Source details (optional)"
              description="Add a reference, note, or link that helps identify the original source."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <TextAreaField
                  label="Source note"
                  id="manual-source-note"
                  placeholder="Where or how was this feedback received?"
                  {...form.register("sourceNote")}
                  error={form.formState.errors.sourceNote?.message}
                  compact
                />
                <TextField
                  label="Reference"
                  id="manual-source-reference"
                  placeholder="e.g. call reference, slip number"
                  {...form.register("sourceReference")}
                  error={form.formState.errors.sourceReference?.message}
                  size="comfortable"
                />
                <TextField
                  label="Source URL"
                  id="manual-source-url"
                  placeholder="e.g. https://example.com/message"
                  {...form.register("sourceUrl")}
                  error={form.formState.errors.sourceUrl?.message}
                  size="comfortable"
                />
              </div>
            </FormSection>

            <FormSection
              number="5"
              title="Attachment references (optional)"
              description="Add information about a file stored elsewhere. Files are not uploaded during this step."
            >
              <div className="space-y-4">
                {attachments.fields.length === 0 ? (
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-app-primary/40 bg-app-primary-soft px-3 text-sm font-black text-app-primary transition hover:border-app-primary"
                    onClick={() =>
                      attachments.append({
                        filename: "",
                        mimeType: "",
                        sizeBytes: undefined,
                        externalUrl: undefined,
                        checksum: undefined
                      })
                    }
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add attachment reference
                  </button>
                ) : (
                  attachments.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-lg border border-app-border bg-app-surface-muted/50 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-black text-app-text">
                          <Paperclip className="h-4 w-4" aria-hidden="true" />
                          Attachment {index + 1}
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-text-muted transition hover:bg-app-surface hover:text-app-error"
                          aria-label={`Remove attachment ${index + 1}`}
                          onClick={() => attachments.remove(index)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextField
                          label="Filename"
                          id={`manual-attachment-${index}-filename`}
                          placeholder="receipt.jpg"
                          {...form.register(`attachments.${index}.filename`)}
                          error={
                            form.formState.errors.attachments?.[index]?.filename?.message
                          }
                          size="comfortable"
                        />
                        <TextField
                          label="MIME type"
                          id={`manual-attachment-${index}-mime`}
                          placeholder="image/jpeg"
                          {...form.register(`attachments.${index}.mimeType`)}
                          error={
                            form.formState.errors.attachments?.[index]?.mimeType?.message
                          }
                          size="comfortable"
                        />
                        <TextField
                          label="External URL"
                          id={`manual-attachment-${index}-url`}
                          placeholder="https://example.com/receipt.jpg"
                          {...form.register(`attachments.${index}.externalUrl`)}
                          error={
                            form.formState.errors.attachments?.[index]?.externalUrl
                              ?.message
                          }
                          size="comfortable"
                        />
                        <TextField
                          label="Size in bytes"
                          id={`manual-attachment-${index}-size`}
                          inputMode="numeric"
                          placeholder="245000"
                          {...form.register(`attachments.${index}.sizeBytes`)}
                          error={
                            form.formState.errors.attachments?.[index]?.sizeBytes?.message
                          }
                          size="comfortable"
                        />
                        <div className="md:col-span-2">
                          <TextField
                            label="Checksum"
                            id={`manual-attachment-${index}-checksum`}
                            placeholder="Optional checksum"
                            {...form.register(`attachments.${index}.checksum`)}
                            error={
                              form.formState.errors.attachments?.[index]?.checksum
                                ?.message
                            }
                            size="comfortable"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {attachments.fields.length > 0 && attachments.fields.length < 10 ? (
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-black text-app-text transition hover:bg-app-surface-muted"
                    onClick={() =>
                      attachments.append({
                        filename: "",
                        mimeType: "",
                        sizeBytes: undefined,
                        externalUrl: undefined,
                        checksum: undefined
                      })
                    }
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add another reference
                  </button>
                ) : null}
              </div>
            </FormSection>

            <FormSection
              number="6"
              title="Review and submit"
              description="Please review the information above before submitting."
              isLast
            >
              <div className="flex flex-col gap-3 border-t border-app-border pt-5 sm:flex-row sm:justify-end">
                <WorkspaceButton
                  tone="secondary"
                  onClick={() => navigate(`/business/${business.id}`)}
                  disabled={mutation.isPending}
                >
                  Cancel
                </WorkspaceButton>
                <WorkspaceButton type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                  {mutation.isPending ? "Recording..." : "Record feedback"}
                </WorkspaceButton>
              </div>
            </FormSection>
          </WorkspacePanel>

          <aside className="space-y-5">
            {submission ? (
              <StateAlert
                tone={submission.duplicate ? "info" : "success"}
                title={submission.duplicate ? "Duplicate detected" : "Feedback recorded"}
                message={
                  submission.duplicate
                    ? "This matching manual feedback was already processed."
                    : "The manual feedback was processed and stored securely."
                }
              />
            ) : null}
            {apiError ? (
              <StateAlert tone="error" title="Submission failed" message={apiError} />
            ) : null}
            <WorkspacePanel>
              <h2 className="text-sm font-black text-app-text">Submission summary</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <SummaryItem label="Business" value={business.name} />
                <SummaryItem label="Branch" value={selectedBranch?.name ?? "—"} />
                <SummaryItem
                  label="Source"
                  value={
                    sourceOptions.find((option) => option.value === sourceType)?.label ??
                    "-"
                  }
                />
                <SummaryItem
                  label="Date received"
                  value={formatSummaryDate(occurredAt)}
                />
              </dl>
            </WorkspacePanel>
            <WorkspacePanel>
              <div className="flex items-start gap-3 rounded-lg bg-app-primary-soft p-4 text-app-primary">
                <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-black">Privacy & security</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-app-text-muted">
                    Feedback is processed securely and used only to improve business
                    operations.
                  </p>
                </div>
              </div>
              <ul className="mt-5 space-y-3 text-sm font-semibold text-app-text-muted">
                {["Secure & encrypted", "Access controlled", "No data is shared"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2
                        className="h-4 w-4 text-app-success"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  )
                )}
              </ul>
            </WorkspacePanel>
          </aside>
        </form>
      )}
    </WorkspaceShell>
  );
}

function useManualFeedbackContext(businessId: string | undefined):
  | {
      state: JSX.Element;
      businesses: MyBusiness[];
      activeBusiness?: never;
      business?: never;
      branches: BranchSummary[];
      branchesLoading: boolean;
    }
  | {
      state: null;
      businesses: MyBusiness[];
      activeBusiness: MyBusiness;
      business: BusinessDetail;
      branches: BranchSummary[];
      branchesLoading: boolean;
    } {
  const mineQuery = useQuery({
    queryKey: ["businesses", "mine"],
    queryFn: () => fetchMyBusinesses({ pageSize: 100 })
  });
  const businesses = mineQuery.data?.businesses ?? [];
  const activeBusiness = businesses.find((business) => business.id === businessId);
  const businessQuery = useQuery({
    queryKey: ["businesses", businessId],
    queryFn: () => fetchBusiness(businessId ?? ""),
    enabled: Boolean(businessId && activeBusiness)
  });
  const branchesQuery = useQuery({
    queryKey: ["businesses", businessId, "branches", "manual-feedback"],
    queryFn: () => fetchBranches(businessId ?? "", { status: "ACTIVE" }),
    enabled: Boolean(businessId && activeBusiness && businessQuery.data)
  });

  if (mineQuery.isLoading || businessQuery.isLoading) {
    return {
      state: (
        <StandaloneState
          title="Loading workspace"
          description="Loading business context and permissions."
        />
      ),
      businesses,
      branches: [],
      branchesLoading: true
    };
  }

  if (mineQuery.error) {
    return {
      state: (
        <StandaloneState
          title="Workspace unavailable"
          description={normalizeApiError(mineQuery.error).message}
        />
      ),
      businesses,
      branches: [],
      branchesLoading: false
    };
  }

  if (!businessId || !activeBusiness) {
    return {
      state: <Navigate to="/business" replace />,
      businesses,
      branches: [],
      branchesLoading: false
    };
  }

  if (businessQuery.error || !businessQuery.data) {
    return {
      state: (
        <StandaloneState
          title="Business unavailable"
          description={
            businessQuery.error
              ? normalizeApiError(businessQuery.error).message
              : "This business could not be loaded."
          }
        />
      ),
      businesses,
      branches: [],
      branchesLoading: false
    };
  }

  if (branchesQuery.error) {
    return {
      state: (
        <WorkspaceShell
          title="Add customer feedback"
          subtitle="Record feedback received by phone, in person, through a suggestion box, or from another offline source."
          businesses={businesses}
          activeBusiness={activeBusiness}
        >
          <EmptyState
            title="Branches unavailable"
            description={normalizeApiError(branchesQuery.error).message}
          />
        </WorkspaceShell>
      ),
      businesses,
      branches: [],
      branchesLoading: false
    };
  }

  return {
    state: null,
    businesses,
    activeBusiness,
    business: businessQuery.data.business,
    branches: branchesQuery.data?.branches ?? [],
    branchesLoading: branchesQuery.isLoading
  };
}

function FormSection({
  number,
  title,
  description,
  children,
  isLast = false
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
  isLast?: boolean;
}): JSX.Element {
  return (
    <section className={`${isLast ? "" : "border-b border-app-border"} p-5 sm:p-6`}>
      <div className="mb-5">
        <h2 className="text-base font-black text-app-text">
          {number}. {title}
        </h2>
        <p className="mt-1 text-sm font-medium leading-6 text-app-text-muted">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  counter?: string;
  required?: boolean;
  compact?: boolean;
};

const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  (
    { label, error, counter, id, required, compact, className = "", ...props },
    ref
  ): JSX.Element => (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-semibold text-app-text">
        {label}
        {required ? <span className="text-app-error"> *</span> : null}
      </label>
      <textarea
        ref={ref}
        id={id}
        className={`mt-2 w-full rounded-md border bg-app-surface px-4 py-3 text-sm font-medium outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 ${compact ? "min-h-20" : "min-h-32"} ${error ? "border-app-error" : "border-app-border"}`}
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
  onChange: (value: number | undefined) => void;
  error?: string;
}): JSX.Element {
  return (
    <div>
      <p className="block text-[13px] font-semibold text-app-text">Rating (optional)</p>
      <div className="mt-2 flex min-h-11 items-center gap-1 rounded-md border border-app-border bg-app-surface px-3">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-app-text-muted transition hover:bg-app-surface-muted hover:text-amber-500 focus:outline-none focus:ring-2 focus:ring-app-focus/30"
            onClick={() => onChange(value === rating ? undefined : rating)}
            aria-label={`${rating} star rating`}
          >
            <Star
              className={`h-4 w-4 ${value && rating <= value ? "fill-amber-400 text-amber-400" : ""}`}
              aria-hidden="true"
            />
          </button>
        ))}
        <span className="ml-2 text-xs font-semibold text-app-text-muted">
          {value ? `${value} / 5` : "No rating"}
        </span>
      </div>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-app-error">{error}</p>
      ) : null}
    </div>
  );
}

function StateAlert({
  tone,
  title,
  message
}: {
  tone: "success" | "info" | "error";
  title: string;
  message: string;
}): JSX.Element {
  const styles = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100",
    info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-100",
    error:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100"
  };
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${styles[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6">{message}</p>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt className="text-xs font-black uppercase text-app-text-muted">{label}</dt>
      <dd className="mt-1 break-words font-bold text-app-text">{value}</dd>
    </div>
  );
}

function ManualFeedbackSkeleton(): JSX.Element {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]" aria-label="Loading">
      <WorkspacePanel className="space-y-5">
        {[1, 2, 3].map((item) => (
          <div key={item} className="animate-pulse rounded-lg bg-app-surface-muted p-6">
            <div className="h-4 w-44 rounded bg-app-border" />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="h-11 rounded bg-app-border/70" />
              <div className="h-11 rounded bg-app-border/70" />
            </div>
          </div>
        ))}
      </WorkspacePanel>
      <WorkspacePanel>
        <div className="h-4 w-36 animate-pulse rounded bg-app-border" />
        <div className="mt-5 space-y-4">
          <div className="h-10 animate-pulse rounded bg-app-surface-muted" />
          <div className="h-10 animate-pulse rounded bg-app-surface-muted" />
          <div className="h-24 animate-pulse rounded bg-app-surface-muted" />
        </div>
      </WorkspacePanel>
    </div>
  );
}

function StandaloneState({
  title,
  description
}: {
  title: string;
  description: string;
}): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background p-4 text-app-text">
      <section className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-6 text-center shadow-panel">
        <BrandMark compact />
        <h1 className="mt-8 text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-app-text-muted">
          {description}
        </p>
      </section>
    </main>
  );
}

function createDefaultValues(branchId = ""): ManualFeedbackValues {
  return {
    branchId,
    categoryId: undefined,
    sourceType: "PHONE_CALL",
    title: undefined,
    message: "",
    rating: undefined,
    occurredAt: undefined,
    languageCode: undefined,
    customerName: undefined,
    customerEmail: undefined,
    customerPhone: undefined,
    sourceNote: undefined,
    sourceReference: undefined,
    sourceUrl: undefined,
    attachments: []
  };
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatSummaryDate(value: string | undefined): string {
  if (!value) return "-";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
