import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { normalizeApiError } from "../../api/axios.js";
import { WorkspaceButton } from "./components.js";
import type { CustomerFormValues } from "./customerApi.js";

const customerFormSchema = z
  .object({
    displayName: z.string().max(160).optional(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    email: z.string().max(255).optional(),
    phone: z.string().max(40).optional()
  })
  .refine(
    (value) =>
      Boolean(
        value.displayName?.trim() ||
        value.firstName?.trim() ||
        value.lastName?.trim() ||
        value.email?.trim() ||
        value.phone?.trim()
      ),
    { message: "Add a name, email, or phone number.", path: ["displayName"] }
  );

type CustomerFormInput = z.infer<typeof customerFormSchema>;

export function CustomerFormModal({
  title,
  initialValues,
  onClose,
  onSubmit
}: {
  title: string;
  initialValues?: CustomerFormValues;
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
}): JSX.Element {
  const form = useForm<CustomerFormInput>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: initialValues ?? {}
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <form
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          try {
            await onSubmit(values);
          } catch (submitError) {
            setError(normalizeApiError(submitError).message);
          }
        })}
        className="w-full max-w-xl rounded-lg border border-app-border bg-app-surface p-5 shadow-2xl dark:bg-[rgb(10,25,51)]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-app-text">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close customer form">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="First name" placeholder="Aline" {...form.register("firstName")} />
          <Field label="Last name" placeholder="Uwase" {...form.register("lastName")} />
          <Field
            label="Display name"
            className="sm:col-span-2"
            placeholder="Aline Uwase"
            {...form.register("displayName")}
          />
          <Field
            label="Email"
            type="email"
            className="sm:col-span-2"
            placeholder="aline@example.com"
            {...form.register("email")}
          />
          <Field
            label="Phone"
            className="sm:col-span-2"
            placeholder="+250 788 123 456"
            {...form.register("phone")}
          />
        </div>
        {form.formState.errors.displayName ? (
          <p className="mt-3 text-sm font-semibold text-red-600">
            {form.formState.errors.displayName.message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <WorkspaceButton tone="secondary" onClick={onClose}>
            Cancel
          </WorkspaceButton>
          <WorkspaceButton type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save customer"}
          </WorkspaceButton>
        </div>
      </form>
    </div>
  );
}

const Field = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    className?: string;
  }
>(function Field({ label, className = "", ...props }, ref): JSX.Element {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-bold text-app-text-muted">{label}</span>
      <input
        ref={ref}
        {...props}
        className="mt-1 h-11 w-full rounded-md border border-app-border bg-app-surface-muted px-3 text-sm font-semibold text-app-text outline-none transition placeholder:text-app-text-muted/70 focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
      />
    </label>
  );
});

Field.displayName = "Field";
