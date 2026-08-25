import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCcw,
  Send,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { normalizeApiError } from "../../api/axios.js";
import {
  fetchPublicFeedbackSettings,
  regeneratePublicFeedbackLink,
  updatePublicFeedbackSettings
} from "./api/businessApi.js";
import { WorkspaceButton, WorkspacePanel } from "./components.js";
import {
  publicFeedbackSettingsSchema,
  type PublicFeedbackSettingsValues
} from "./schemas.js";
import type { BusinessDetail, BusinessPermissions } from "./types.js";

export function PublicFeedbackSettingsPanel({
  business,
  permissions
}: {
  business: BusinessDetail;
  permissions: BusinessPermissions;
}): JSX.Element {
  const canManage = permissions.canManageBusiness;
  const queryClient = useQueryClient();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [isConfirmingRegeneration, setConfirmingRegeneration] = useState(false);
  const settingsQuery = useQuery({
    queryKey: ["businesses", business.id, "public-feedback"],
    queryFn: () => fetchPublicFeedbackSettings(business.id),
    enabled: canManage
  });
  const form = useForm<PublicFeedbackSettingsValues>({
    resolver: zodResolver(publicFeedbackSettingsSchema),
    values: {
      enabled: settingsQuery.data?.enabled ?? false,
      welcomeMessage: settingsQuery.data?.welcomeMessage ?? undefined
    }
  });
  const updateMutation = useMutation({
    mutationFn: (values: PublicFeedbackSettingsValues) =>
      updatePublicFeedbackSettings(business.id, values),
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: ["businesses", business.id, "public-feedback"]
      });
      void queryClient.invalidateQueries({ queryKey: ["businesses"] });
    }
  });
  const regenerateMutation = useMutation({
    mutationFn: () => regeneratePublicFeedbackLink(business.id),
    onSuccess() {
      setConfirmingRegeneration(false);
      void queryClient.invalidateQueries({
        queryKey: ["businesses", business.id, "public-feedback"]
      });
    }
  });
  const settings = settingsQuery.data;
  const apiError =
    updateMutation.error || regenerateMutation.error || settingsQuery.error
      ? normalizeApiError(
          updateMutation.error ?? regenerateMutation.error ?? settingsQuery.error
        ).message
      : null;

  useEffect(() => {
    if (copyState === "idle") return undefined;

    const timer = window.setTimeout(() => setCopyState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  if (!canManage) {
    return (
      <WorkspacePanel className="mt-5">
        <PanelHeader />
        <div className="mt-5 rounded-lg border border-app-border bg-app-surface-muted/60 p-4 text-sm font-semibold leading-6 text-app-text-muted">
          Public portal management requires owner or admin access.
        </div>
      </WorkspacePanel>
    );
  }

  const publicUrl = settings?.publicUrl ?? null;

  return (
    <WorkspacePanel className="mt-5">
      <PanelHeader />

      {settingsQuery.isLoading ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="h-44 animate-pulse rounded-lg bg-app-surface-muted" />
          <div className="h-44 animate-pulse rounded-lg bg-app-surface-muted" />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
          >
            <label className="flex items-start justify-between gap-4 rounded-lg border border-app-border bg-app-surface-muted/50 p-4">
              <span>
                <span className="block text-sm font-black text-app-text">
                  Accept public feedback
                </span>
                <span className="mt-1 block text-sm font-semibold leading-6 text-app-text-muted">
                  Customers with the public link can submit feedback without signing in.
                </span>
              </span>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-app-border text-app-primary focus:ring-app-focus"
                {...form.register("enabled")}
              />
            </label>

            <div>
              <label
                htmlFor="public-feedback-welcome"
                className="block text-[13px] font-semibold text-app-text"
              >
                Welcome message
              </label>
              <textarea
                id="public-feedback-welcome"
                className={`mt-2 min-h-28 w-full rounded-md border bg-app-surface px-4 py-3 text-sm font-medium outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 ${
                  form.formState.errors.welcomeMessage
                    ? "border-app-error"
                    : "border-app-border"
                }`}
                placeholder="We value your feedback."
                maxLength={500}
                {...form.register("welcomeMessage")}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                {form.formState.errors.welcomeMessage ? (
                  <p className="text-sm font-semibold text-app-error">
                    {form.formState.errors.welcomeMessage.message}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-app-text-muted">
                    Optional message shown on the public page.
                  </p>
                )}
                <p className="shrink-0 text-xs font-semibold text-app-text-muted">
                  {form.watch("welcomeMessage")?.length ?? 0} / 500
                </p>
              </div>
            </div>

            {apiError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
                {apiError}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <WorkspaceButton type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                {updateMutation.isPending ? "Saving..." : "Save portal settings"}
              </WorkspaceButton>
              <WorkspaceButton
                tone="secondary"
                disabled={regenerateMutation.isPending || !settings?.hasToken}
                onClick={() => setConfirmingRegeneration(true)}
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Regenerate link
              </WorkspaceButton>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-lg border border-app-border bg-app-surface-muted/50 p-4">
              <p className="text-xs font-black uppercase text-app-text-muted">
                Portal status
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    settings?.enabled ? "bg-app-success" : "bg-app-text-muted"
                  }`}
                  aria-hidden="true"
                />
                <span className="text-sm font-black text-app-text">
                  {settings?.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-app-border bg-app-surface-muted/50 p-4">
              <p className="text-xs font-black uppercase text-app-text-muted">
                Public link
              </p>
              <p className="mt-3 break-all rounded-md border border-app-border bg-app-surface px-3 py-2 text-xs font-semibold text-app-text-muted">
                {publicUrl ?? "Enable the portal to create a link."}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  disabled={!publicUrl}
                  onClick={() => void copyPublicLink(publicUrl, setCopyState)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-black text-app-text transition hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {copyState === "copied"
                    ? "Copied"
                    : copyState === "failed"
                      ? "Copy failed"
                      : "Copy link"}
                </button>
                <a
                  href={publicUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!publicUrl}
                  className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-black text-app-text transition hover:bg-app-surface-muted ${
                    publicUrl ? "" : "pointer-events-none opacity-60"
                  }`}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Open portal
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}

      {isConfirmingRegeneration ? (
        <RegenerateConfirmModal
          isPending={regenerateMutation.isPending}
          onCancel={() => setConfirmingRegeneration(false)}
          onConfirm={() => regenerateMutation.mutate()}
        />
      ) : null}
    </WorkspacePanel>
  );
}

function PanelHeader(): JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-sm font-black text-app-primary">
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Public Feedback Portal
        </div>
        <h2 className="mt-2 text-lg font-black text-app-text">
          Share a secure public feedback link
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-app-text-muted">
          This link remains stable for customer sharing until you regenerate it. Disabling
          the portal makes the public page unavailable immediately.
        </p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-md bg-app-primary-soft px-3 py-2 text-xs font-black text-app-primary">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Standard feedback processing
      </div>
    </div>
  );
}

function RegenerateConfirmModal({
  isPending,
  onCancel,
  onConfirm
}: {
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="regenerate-public-link-title"
        className="w-full max-w-md rounded-lg border border-app-border bg-app-surface p-6 text-app-text shadow-2xl dark:bg-[rgb(10,25,51)]"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 id="regenerate-public-link-title" className="mt-5 text-xl font-black">
          Regenerate public feedback link?
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-app-text-muted">
          The current link will stop working immediately. Any shared links using it will
          also stop working.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <WorkspaceButton tone="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </WorkspaceButton>
          <WorkspaceButton tone="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            )}
            Regenerate link
          </WorkspaceButton>
        </div>
      </section>
    </div>
  );
}

async function copyPublicLink(
  publicUrl: string | null,
  setCopyState: (state: "idle" | "copied" | "failed") => void
): Promise<void> {
  if (!publicUrl) return;

  try {
    await navigator.clipboard.writeText(publicUrl);
    setCopyState("copied");
  } catch {
    setCopyState("failed");
  }
}
