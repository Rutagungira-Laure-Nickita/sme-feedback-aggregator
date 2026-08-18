import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import {
  AlertCircle,
  AlertTriangle,
  Copy,
  Download,
  Edit,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Power,
  Printer,
  QrCode,
  RefreshCw,
  ShieldCheck,
  X
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Navigate, useParams } from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import { AppSelectField } from "../../components/ui/select-field.js";
import { CollectionViewToggle } from "../../components/collection-view/CollectionViewToggle.js";
import { useCollectionView } from "../../components/collection-view/useCollectionView.js";
import { BrandMark } from "../auth/components/BrandMark.js";
import { TextField } from "../auth/components/TextField.js";
import {
  createPublicFeedbackQrCode,
  fetchBranches,
  fetchBusiness,
  fetchMyBusinesses,
  fetchPublicFeedbackQrCodes,
  regeneratePublicFeedbackQrCode,
  updatePublicFeedbackQrCode
} from "./api/businessApi.js";
import {
  EmptyState,
  SuspendedBanner,
  WorkspaceButton,
  WorkspacePanel,
  WorkspaceShell
} from "./components.js";
import {
  qrCodeCreateSchema,
  qrCodeRenameSchema,
  type QrCodeCreateValues,
  type QrCodeRenameValues
} from "./schemas.js";
import type {
  BranchSummary,
  BusinessDetail,
  MyBusiness,
  PublicFeedbackQrAvailabilityStatus,
  PublicFeedbackQrCode
} from "./types.js";

export function QrCodesPage(): JSX.Element {
  const { businessId } = useParams();
  const queryClient = useQueryClient();
  const context = useQrCodesContext(businessId);
  const [copyState, setCopyState] = useState<string | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<PublicFeedbackQrCode | null>(null);
  const [regenerateTarget, setRegenerateTarget] = useState<PublicFeedbackQrCode | null>(
    null
  );
  const [disableTarget, setDisableTarget] = useState<PublicFeedbackQrCode | null>(null);
  const [printTarget, setPrintTarget] = useState<PublicFeedbackQrCode | null>(null);

  const qrQuery = useQuery({
    queryKey: ["businesses", businessId, "public-feedback", "qr-codes"],
    queryFn: () => fetchPublicFeedbackQrCodes(businessId ?? ""),
    enabled: Boolean(businessId && !context.state)
  });

  const createMutation = useMutation({
    mutationFn: (values: QrCodeCreateValues) =>
      createPublicFeedbackQrCode(businessId ?? "", values),
    onSuccess() {
      setCreateOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "public-feedback", "qr-codes"]
      });
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({
      qrCode,
      values
    }: {
      qrCode: PublicFeedbackQrCode;
      values: Partial<QrCodeRenameValues & { isActive: boolean }>;
    }) => updatePublicFeedbackQrCode(businessId ?? "", qrCode.id, values),
    onSuccess() {
      setRenameTarget(null);
      setDisableTarget(null);
      void queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "public-feedback", "qr-codes"]
      });
    }
  });
  const regenerateMutation = useMutation({
    mutationFn: (qrCode: PublicFeedbackQrCode) =>
      regeneratePublicFeedbackQrCode(businessId ?? "", qrCode.id),
    onSuccess() {
      setRegenerateTarget(null);
      void queryClient.invalidateQueries({
        queryKey: ["businesses", businessId, "public-feedback", "qr-codes"]
      });
    }
  });

  useEffect(() => {
    if (!copyState) return undefined;

    const timer = window.setTimeout(() => setCopyState(null), 2500);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  if (context.state) return context.state;

  const { activeBusiness, businesses, business, permissions, branches } = context;
  const canManage = permissions.canManageBusiness;
  const qrList = qrQuery.data;
  const qrCodes = qrList?.qrCodes ?? [];
  const portal = qrList?.portal;
  const apiError =
    qrQuery.error ||
    createMutation.error ||
    updateMutation.error ||
    regenerateMutation.error
      ? normalizeApiError(
          qrQuery.error ??
            createMutation.error ??
            updateMutation.error ??
            regenerateMutation.error
        ).message
      : null;

  return (
    <WorkspaceShell
      title="QR Codes"
      subtitle="Create QR codes that open your public feedback form."
      businesses={businesses}
      activeBusiness={activeBusiness}
      actions={
        canManage ? (
          <WorkspaceButton
            onClick={() => setCreateOpen(true)}
            disabled={!portal?.enabled || !portal.hasToken}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New QR Code
          </WorkspaceButton>
        ) : null
      }
    >
      {business.status === "SUSPENDED" ? <SuspendedBanner type="business" /> : null}

      <section className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-cyan-600 p-6 text-white shadow-xl shadow-indigo-900/15 sm:p-8">
        <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-indigo-100">
              <QrCode className="h-4 w-4" aria-hidden="true" />
              Collect feedback anywhere
            </div>
            <h2 className="mt-3 max-w-2xl text-2xl font-black sm:text-3xl">
              Turn counters, receipts, tables, and storefronts into customer listening
              points.
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-100">
              Business-wide codes let customers choose a branch. Branch codes route every
              submission to one location.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill enabled={Boolean(portal?.enabled)} />
            {portal?.publicUrl ? (
              <button
                type="button"
                onClick={() => void copyLink("portal", portal.publicUrl, setCopyState)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 text-sm font-black text-white hover:bg-white/20"
              >
                <Copy className="h-4 w-4" />
                {copyState === "portal" ? "Copied" : "Copy portal link"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="space-y-5">
          {apiError ? <StateAlert tone="error" message={apiError} /> : null}

          <WorkspacePanel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-app-text">Your QR Codes</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-app-text-muted">
                  Generate and manage QR codes for the main portal or specific branches.
                </p>
              </div>
            </div>

            {qrQuery.isLoading ? (
              <QrSkeleton />
            ) : qrCodes.length === 0 ? (
              <EmptyState
                icon={<QrCode className="h-6 w-6" aria-hidden="true" />}
                title="No QR codes yet"
                description="Create your first QR code for the public portal or a specific active branch."
                action={
                  canManage ? (
                    <WorkspaceButton
                      onClick={() => setCreateOpen(true)}
                      disabled={!portal?.enabled || !portal.hasToken}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create first QR code
                    </WorkspaceButton>
                  ) : null
                }
              />
            ) : (
              <QrCodeList
                businessId={business.id}
                businessName={business.name}
                qrCodes={qrCodes}
                canManage={canManage}
                copyState={copyState}
                onCopy={(qrCode) =>
                  void copyLink(qrCode.id, qrCode.publicUrl, setCopyState)
                }
                onOpen={(qrCode) => openQrLink(qrCode.publicUrl)}
                onDownload={(qrCode) => void downloadQrPng(business.name, qrCode)}
                onPrint={(qrCode) => setPrintTarget(qrCode)}
                onRename={(qrCode) => setRenameTarget(qrCode)}
                onRegenerate={(qrCode) => setRegenerateTarget(qrCode)}
                onDisable={(qrCode) => setDisableTarget(qrCode)}
              />
            )}
          </WorkspacePanel>
        </section>

        <aside className="space-y-5">
          <WorkspacePanel>
            <div className="flex items-start gap-3 rounded-xl bg-app-primary-soft p-4 text-app-primary">
              <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-black">Secure and anonymous</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-app-text-muted">
                  QR codes open the public feedback portal. No login is required for
                  customers.
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-xs font-semibold leading-5 text-app-text-muted">
              <li>Business-wide QR codes let customers choose a branch.</li>
              <li>Branch QR codes lock the form to one active branch.</li>
              <li>Portal link regeneration invalidates old QR codes.</li>
            </ul>
          </WorkspacePanel>
          {!portal?.enabled ? (
            <StateAlert
              tone="warning"
              message="Enable the Public Feedback Portal in settings before generating QR codes."
            />
          ) : null}
        </aside>
      </div>

      {isCreateOpen ? (
        <CreateQrModal
          branches={branches}
          isPending={createMutation.isPending}
          error={
            createMutation.error ? normalizeApiError(createMutation.error).message : null
          }
          onCancel={() => setCreateOpen(false)}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      ) : null}

      {renameTarget ? (
        <RenameQrModal
          qrCode={renameTarget}
          isPending={updateMutation.isPending}
          error={
            updateMutation.error ? normalizeApiError(updateMutation.error).message : null
          }
          onCancel={() => setRenameTarget(null)}
          onSubmit={(values) => updateMutation.mutate({ qrCode: renameTarget, values })}
        />
      ) : null}

      {regenerateTarget ? (
        <ConfirmModal
          title="Regenerate QR code?"
          description="The old QR URL stops working immediately. The name and branch scope stay the same."
          confirmLabel="Regenerate"
          tone="warning"
          isPending={regenerateMutation.isPending}
          onCancel={() => setRegenerateTarget(null)}
          onConfirm={() => regenerateMutation.mutate(regenerateTarget)}
        />
      ) : null}

      {disableTarget ? (
        <ConfirmModal
          title={disableTarget.isActive ? "Disable QR code?" : "Enable QR code?"}
          description={
            disableTarget.isActive
              ? "Customers can no longer use this QR code. This does not disable the entire public portal."
              : "Customers will be able to use this QR code again if its portal link remains valid."
          }
          confirmLabel={disableTarget.isActive ? "Disable QR" : "Enable QR"}
          tone={disableTarget.isActive ? "danger" : "warning"}
          isPending={updateMutation.isPending}
          onCancel={() => setDisableTarget(null)}
          onConfirm={() =>
            updateMutation.mutate({
              qrCode: disableTarget,
              values: { isActive: !disableTarget.isActive }
            })
          }
        />
      ) : null}

      {printTarget ? (
        <PrintQrModal
          businessName={business.name}
          qrCode={printTarget}
          onClose={() => setPrintTarget(null)}
        />
      ) : null}
    </WorkspaceShell>
  );
}

function QrCodeList({
  businessId,
  businessName,
  qrCodes,
  canManage,
  copyState,
  onCopy,
  onOpen,
  onDownload,
  onPrint,
  onRename,
  onRegenerate,
  onDisable
}: {
  businessId: string;
  businessName: string;
  qrCodes: PublicFeedbackQrCode[];
  canManage: boolean;
  copyState: string | null;
  onCopy: (qrCode: PublicFeedbackQrCode) => void;
  onOpen: (qrCode: PublicFeedbackQrCode) => void;
  onDownload: (qrCode: PublicFeedbackQrCode) => void;
  onPrint: (qrCode: PublicFeedbackQrCode) => void;
  onRename: (qrCode: PublicFeedbackQrCode) => void;
  onRegenerate: (qrCode: PublicFeedbackQrCode) => void;
  onDisable: (qrCode: PublicFeedbackQrCode) => void;
}): JSX.Element {
  const collectionView = useCollectionView(
    `business-${businessId}-qr-codes`,
    qrCodes.length
  );

  return (
    <div className="mt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-app-text-muted">{qrCodes.length} QR codes</p>
        <CollectionViewToggle
          view={collectionView.view}
          onChange={collectionView.setView}
          label="QR code view"
        />
      </div>
      <div
        className={`${collectionView.view === "list" ? "hidden lg:block" : "hidden"} overflow-x-auto rounded-lg border border-app-border [scrollbar-gutter:stable]`}
        tabIndex={0}
        aria-label="QR code records"
      >
        <div className="min-w-[1080px]">
          <div className="grid grid-cols-[minmax(230px,1.2fr)_minmax(150px,0.8fr)_110px_130px_150px_260px] border-b border-app-border bg-app-surface-muted text-xs font-black uppercase text-app-text-muted">
            <span className="px-4 py-3">Name / Purpose</span>
            <span className="px-4 py-3">Branch</span>
            <span className="px-4 py-3">QR Code</span>
            <span className="px-4 py-3">Type</span>
            <span className="px-4 py-3">Created</span>
            <span className="sticky right-0 z-10 bg-app-surface-muted px-4 py-3 shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.75)]">
              Actions
            </span>
          </div>
          <div className="divide-y divide-app-border">
            {qrCodes.map((qrCode) => (
              <QrCodeTableRow
                key={qrCode.id}
                businessName={businessName}
                qrCode={qrCode}
                canManage={canManage}
                copied={copyState === qrCode.id}
                onCopy={() => onCopy(qrCode)}
                onOpen={() => onOpen(qrCode)}
                onDownload={() => onDownload(qrCode)}
                onPrint={() => onPrint(qrCode)}
                onRename={() => onRename(qrCode)}
                onRegenerate={() => onRegenerate(qrCode)}
                onDisable={() => onDisable(qrCode)}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className={`${collectionView.view === "grid" ? "grid md:grid-cols-2" : "grid lg:hidden"} min-w-0 gap-4`}
      >
        {qrCodes.map((qrCode) => (
          <QrCodeCard
            key={qrCode.id}
            businessName={businessName}
            qrCode={qrCode}
            canManage={canManage}
            copied={copyState === qrCode.id}
            onCopy={() => onCopy(qrCode)}
            onOpen={() => onOpen(qrCode)}
            onDownload={() => onDownload(qrCode)}
            onPrint={() => onPrint(qrCode)}
            onRename={() => onRename(qrCode)}
            onRegenerate={() => onRegenerate(qrCode)}
            onDisable={() => onDisable(qrCode)}
          />
        ))}
      </div>
    </div>
  );
}

function QrCodeTableRow({
  businessName,
  qrCode,
  canManage,
  copied,
  onCopy,
  onOpen,
  onDownload,
  onPrint,
  onRename,
  onRegenerate,
  onDisable
}: {
  businessName: string;
  qrCode: PublicFeedbackQrCode;
  canManage: boolean;
  copied: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onRename: () => void;
  onRegenerate: () => void;
  onDisable: () => void;
}): JSX.Element {
  const status = availabilityText(qrCode.availabilityStatus);

  return (
    <article className="grid grid-cols-[minmax(230px,1.2fr)_minmax(150px,0.8fr)_110px_130px_150px_260px] items-center bg-app-surface">
      <div className="min-w-0 px-4 py-4">
        <p className="font-black text-app-text">{qrCode.name}</p>
        <p className="mt-1 text-xs font-semibold text-app-text-muted">
          {qrCode.scope === "BRANCH"
            ? `Direct to ${qrCode.branch?.name ?? "assigned branch"} feedback`
            : "Opens branch selection page"}
        </p>
        {qrCode.availabilityStatus !== "AVAILABLE" ? (
          <p className={`mt-2 text-xs font-black ${status.className}`}>{status.label}</p>
        ) : null}
      </div>
      <div className="min-w-0 px-4 py-4 text-sm font-semibold text-app-text-muted">
        {qrCode.branch?.name ?? "All branches"}
      </div>
      <div className="px-4 py-4">
        <QrPreview
          value={qrCode.publicUrl}
          label={`${businessName} ${qrCode.name}`}
          size={72}
        />
      </div>
      <div className="px-4 py-4">
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-black ring-1 ${
            qrCode.scope === "BRANCH"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/70"
              : "bg-app-primary-soft text-app-primary ring-app-primary/25 dark:text-app-text"
          }`}
        >
          {qrCode.scope === "BRANCH" ? "Branch" : "All Branches"}
        </span>
      </div>
      <p className="px-4 py-4 text-sm font-semibold text-app-text-muted">
        {formatDate(qrCode.createdAt)}
      </p>
      <div className="sticky right-0 flex flex-wrap gap-2 bg-app-surface px-4 py-4 shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.75)] dark:bg-app-surface">
        <QrActions
          canManage={canManage}
          copied={copied}
          onCopy={onCopy}
          onOpen={onOpen}
          onDownload={onDownload}
          onPrint={onPrint}
          onRename={onRename}
          onRegenerate={onRegenerate}
          onDisable={onDisable}
          variant="icon"
        />
      </div>
    </article>
  );
}

function QrCodeCard({
  businessName,
  qrCode,
  canManage,
  copied,
  onCopy,
  onOpen,
  onDownload,
  onPrint,
  onRename,
  onRegenerate,
  onDisable
}: {
  businessName: string;
  qrCode: PublicFeedbackQrCode;
  canManage: boolean;
  copied: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onRename: () => void;
  onRegenerate: () => void;
  onDisable: () => void;
}): JSX.Element {
  const status = availabilityText(qrCode.availabilityStatus);

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-app-surface shadow-[0_12px_32px_rgba(15,23,42,0.05)] ${qrCode.isActive ? "border-app-border/80" : "border-slate-300 opacity-75 grayscale dark:border-slate-700"}`}
    >
      <div
        className={`h-1.5 ${qrCode.isActive ? "bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500" : "bg-slate-400"}`}
      />
      <div className="flex flex-col items-center gap-5 p-5 min-[440px]:flex-row min-[440px]:items-start">
        <div className="shrink-0 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          <QrPreview
            value={qrCode.publicUrl}
            label={`${businessName} ${qrCode.name}`}
            size={136}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-app-text">{qrCode.name}</p>
          <p className="mt-1 text-xs font-semibold text-app-text-muted">
            {qrCode.scope === "BRANCH"
              ? `Direct to ${qrCode.branch?.name ?? "assigned branch"} feedback`
              : "Opens branch selection page"}
          </p>
          {qrCode.availabilityStatus !== "AVAILABLE" ? (
            <p className={`mt-2 text-xs font-black ${status.className}`}>
              {status.label}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-3 border-t border-app-border/70 px-5 py-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-bold uppercase text-app-text-muted">Branch</dt>
          <dd className="mt-1 font-semibold text-app-text">
            {qrCode.branch?.name ?? "All branches"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-app-text-muted">Type</dt>
          <dd className="mt-1 font-semibold text-app-text">
            {qrCode.scope === "BRANCH" ? "Branch" : "All Branches"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase text-app-text-muted">Created</dt>
          <dd className="mt-1 font-semibold text-app-text">
            {formatDate(qrCode.createdAt)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2 border-t border-app-border/70 px-5 py-4">
        <QrActions
          canManage={canManage}
          copied={copied}
          onCopy={onCopy}
          onOpen={onOpen}
          onDownload={onDownload}
          onPrint={onPrint}
          onRename={onRename}
          onRegenerate={onRegenerate}
          onDisable={onDisable}
          variant="text"
        />
      </div>
    </article>
  );
}

function QrActions({
  canManage,
  copied,
  onCopy,
  onOpen,
  onDownload,
  onPrint,
  onRename,
  onRegenerate,
  onDisable,
  variant
}: {
  canManage: boolean;
  copied: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onRename: () => void;
  onRegenerate: () => void;
  onDisable: () => void;
  variant: "icon" | "text";
}): JSX.Element {
  const [moreOpen, setMoreOpen] = useState(false);
  const Button = variant === "icon" ? IconButton : TextActionButton;

  return (
    <>
      <Button label="Open QR link" onClick={onOpen}>
        <Eye className="h-4 w-4" aria-hidden="true" />
      </Button>
      {canManage ? (
        <Button label={copied ? "QR link copied" : "Copy link"} onClick={onCopy}>
          <Copy className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : null}
      <Button label="Download PNG" onClick={onDownload}>
        <Download className="h-4 w-4" aria-hidden="true" />
      </Button>
      <div className="relative">
        <Button label="More QR actions" onClick={() => setMoreOpen((open) => !open)}>
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
        {moreOpen ? (
          <div className="absolute right-0 top-12 z-20 grid min-w-44 gap-1 rounded-xl border border-app-border bg-app-surface p-2 shadow-panel dark:bg-[rgb(10,25,51)]">
            <OverflowAction label="Print" icon={<Printer />} onClick={onPrint} />
            {canManage ? (
              <>
                <OverflowAction label="Rename" icon={<Edit />} onClick={onRename} />
                <OverflowAction
                  label="Regenerate"
                  icon={<RefreshCw />}
                  onClick={onRegenerate}
                />
                <OverflowAction
                  label="Enable or disable"
                  icon={<Power />}
                  onClick={onDisable}
                  danger
                />
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function OverflowAction({
  label,
  icon,
  onClick,
  danger = false
}: {
  label: string;
  icon: JSX.Element;
  onClick: () => void;
  danger?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm font-bold transition hover:bg-app-surface-muted ${danger ? "text-app-error" : "text-app-text"}`}
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {label}
    </button>
  );
}

function CreateQrModal({
  branches,
  isPending,
  error,
  onCancel,
  onSubmit
}: {
  branches: BranchSummary[];
  isPending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (values: QrCodeCreateValues) => void;
}): JSX.Element {
  const form = useForm<QrCodeCreateValues>({
    resolver: zodResolver(qrCodeCreateSchema),
    defaultValues: { name: "", scope: "BUSINESS_WIDE", branchId: "" }
  });
  const scope = form.watch("scope");

  return (
    <Modal title="Generate QR code" onCancel={onCancel}>
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <TextField
          label="Name or purpose"
          id="qr-name"
          placeholder="Front counter"
          {...form.register("name")}
          error={form.formState.errors.name?.message}
          size="comfortable"
        />
        <fieldset>
          <legend className="block text-[13px] font-semibold text-app-text">Scope</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {[
              {
                value: "BUSINESS_WIDE",
                label: "Business-wide",
                description: "Customers can choose an active branch after scanning."
              },
              {
                value: "BRANCH",
                label: "Specific branch",
                description:
                  "The feedback form will open for this branch and customers cannot change it."
              }
            ].map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border p-4 ${
                  scope === option.value
                    ? "border-app-primary bg-app-primary-soft"
                    : "border-app-border bg-app-surface"
                }`}
              >
                <input
                  type="radio"
                  value={option.value}
                  className="sr-only"
                  {...form.register("scope")}
                />
                <span className="block text-sm font-black text-app-text">
                  {option.label}
                </span>
                <span className="mt-2 block text-sm font-semibold leading-6 text-app-text-muted">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {scope === "BRANCH" ? (
          <Controller
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <AppSelectField
                label="Branch"
                id="qr-branch"
                value={field.value ?? ""}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={form.formState.errors.branchId?.message}
                placeholder="Choose an active branch"
                options={branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name
                }))}
                triggerClassName="h-11"
              />
            )}
          />
        ) : null}
        {error ? <StateAlert tone="error" message={error} /> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <WorkspaceButton tone="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </WorkspaceButton>
          <WorkspaceButton type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <QrCode className="h-4 w-4" aria-hidden="true" />
            )}
            {isPending ? "Generating..." : "Generate QR code"}
          </WorkspaceButton>
        </div>
      </form>
    </Modal>
  );
}

function RenameQrModal({
  qrCode,
  isPending,
  error,
  onCancel,
  onSubmit
}: {
  qrCode: PublicFeedbackQrCode;
  isPending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (values: QrCodeRenameValues) => void;
}): JSX.Element {
  const form = useForm<QrCodeRenameValues>({
    resolver: zodResolver(qrCodeRenameSchema),
    defaultValues: { name: qrCode.name }
  });

  return (
    <Modal title="Rename QR code" onCancel={onCancel}>
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <TextField
          label="Name or purpose"
          id="qr-rename"
          {...form.register("name")}
          error={form.formState.errors.name?.message}
          size="comfortable"
        />
        {error ? <StateAlert tone="error" message={error} /> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <WorkspaceButton tone="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </WorkspaceButton>
          <WorkspaceButton type="submit" disabled={isPending}>
            Save name
          </WorkspaceButton>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  tone,
  isPending,
  onCancel,
  onConfirm
}: {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "warning" | "danger";
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): JSX.Element {
  return (
    <Modal title={title} onCancel={onCancel}>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-md ${
          tone === "danger"
            ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200"
            : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
        }`}
      >
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-app-text-muted">
        {description}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <WorkspaceButton tone="secondary" onClick={onCancel} disabled={isPending}>
          Cancel
        </WorkspaceButton>
        <WorkspaceButton
          tone={tone === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {confirmLabel}
        </WorkspaceButton>
      </div>
    </Modal>
  );
}

function PrintQrModal({
  businessName,
  qrCode,
  onClose
}: {
  businessName: string;
  qrCode: PublicFeedbackQrCode;
  onClose: () => void;
}): JSX.Element {
  return (
    <Modal title="Print QR code" onCancel={onClose} maxWidth="max-w-lg">
      <style>
        {`@media print { body * { visibility: hidden; } #qr-print-area, #qr-print-area * { visibility: visible; } #qr-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; } }`}
      </style>
      <div
        id="qr-print-area"
        className="rounded-lg border border-app-border bg-white p-6 text-center text-slate-950"
      >
        <h2 className="text-2xl font-black">{businessName}</h2>
        <p className="mt-2 text-sm font-bold">{qrCode.name}</p>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {qrCode.branch?.name ?? "All branches"}
        </p>
        <div className="mt-6 flex justify-center">
          <QrPreview value={qrCode.publicUrl} label={qrCode.name} size={260} />
        </div>
        <p className="mt-6 text-lg font-black">Scan to share your feedback</p>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <WorkspaceButton tone="secondary" onClick={onClose}>
          Close
        </WorkspaceButton>
        <WorkspaceButton onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print
        </WorkspaceButton>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onCancel,
  maxWidth = "max-w-md"
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  maxWidth?: string;
}): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        className={`w-full ${maxWidth} rounded-lg border border-app-border bg-app-surface p-6 text-app-text shadow-2xl dark:bg-[rgb(10,25,51)]`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="qr-modal-title" className="text-xl font-black">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-app-border text-app-text-muted hover:bg-app-surface-muted"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}

function QrPreview({
  value,
  label,
  size = 78
}: {
  value: string;
  label: string;
  size?: number;
}): JSX.Element {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void QRCode.toDataURL(value, qrOptions(size)).then((result) => {
      if (!cancelled) {
        setDataUrl(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [size, value]);

  return dataUrl ? (
    <img
      src={dataUrl}
      alt={`QR code for ${label}`}
      className="rounded bg-white p-1"
      width={size}
      height={size}
    />
  ) : (
    <div
      className="flex items-center justify-center rounded bg-app-surface-muted"
      style={{ height: size, width: size }}
      aria-label="Generating QR code"
    >
      <Loader2 className="h-4 w-4 animate-spin text-app-primary" aria-hidden="true" />
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  tone = "default"
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md border border-app-border bg-app-surface text-app-text-muted transition hover:bg-app-surface-muted ${
        tone === "danger" ? "hover:text-app-error" : "hover:text-app-primary"
      }`}
    >
      {children}
    </button>
  );
}

function TextActionButton({
  label,
  children,
  onClick,
  tone = "default"
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-black transition hover:bg-app-surface-muted ${
        tone === "danger"
          ? "text-app-error hover:border-app-error"
          : "text-app-text hover:text-app-primary"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

function StatusPill({ enabled }: { enabled: boolean }): JSX.Element {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-md px-3 py-2 text-xs font-black ring-1 ${
        enabled
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/70"
          : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/15"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${enabled ? "bg-app-success" : "bg-app-text-muted"}`}
        aria-hidden="true"
      />
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

function StateAlert({
  tone,
  message
}: {
  tone: "error" | "warning";
  message: string;
}): JSX.Element {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100"
      : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100";

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border p-4 text-sm font-semibold ${styles}`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </div>
  );
}

function QrSkeleton(): JSX.Element {
  return (
    <div className="mt-5 space-y-3" aria-label="Loading QR codes">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-lg bg-app-surface-muted" />
      ))}
    </div>
  );
}

function useQrCodesContext(businessId: string | undefined):
  | {
      state: JSX.Element;
      businesses: MyBusiness[];
      activeBusiness?: never;
      business?: never;
      permissions?: never;
      branches: BranchSummary[];
    }
  | {
      state: null;
      businesses: MyBusiness[];
      activeBusiness: MyBusiness;
      business: BusinessDetail;
      permissions: { canManageBusiness: boolean };
      branches: BranchSummary[];
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
    queryKey: ["businesses", businessId, "branches", "qr-codes"],
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
      branches: []
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
      branches: []
    };
  }

  if (!businessId || !activeBusiness) {
    return { state: <Navigate to="/business" replace />, businesses, branches: [] };
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
      branches: []
    };
  }

  return {
    state: null,
    businesses,
    activeBusiness,
    business: businessQuery.data.business,
    permissions: {
      canManageBusiness: businessQuery.data.permissions.canManageBusiness
    },
    branches: branchesQuery.data?.branches ?? []
  };
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

function availabilityText(status: PublicFeedbackQrAvailabilityStatus): {
  label: string;
  className: string;
} {
  if (status === "PORTAL_LINK_CHANGED") {
    return {
      label: "Portal link changed. Regenerate this QR code to make it active again.",
      className: "text-amber-700 dark:text-amber-200"
    };
  }

  if (status === "PORTAL_DISABLED") {
    return {
      label: "Portal is disabled.",
      className: "text-slate-600 dark:text-slate-300"
    };
  }

  if (status === "BRANCH_INACTIVE") {
    return {
      label: "Assigned branch is inactive.",
      className: "text-amber-700 dark:text-amber-200"
    };
  }

  if (status === "QR_DISABLED") {
    return {
      label: "QR code is disabled.",
      className: "text-red-700 dark:text-red-200"
    };
  }

  return { label: "Active", className: "text-app-success" };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function qrOptions(width: number): QRCode.QRCodeToDataURLOptions {
  return {
    errorCorrectionLevel: "H",
    margin: 4,
    width,
    color: {
      dark: "#0f172a",
      light: "#ffffff"
    }
  };
}

async function copyLink(
  key: string,
  publicUrl: string | null | undefined,
  setCopyState: (value: string | null) => void
): Promise<void> {
  if (!publicUrl) return;

  try {
    await navigator.clipboard.writeText(publicUrl);
    setCopyState(key);
  } catch {
    setCopyState(null);
  }
}

function openQrLink(publicUrl: string): void {
  const opened = window.open(publicUrl, "_blank", "noopener,noreferrer");
  if (opened) {
    opened.opener = null;
  }
}

async function downloadQrPng(
  businessName: string,
  qrCode: PublicFeedbackQrCode
): Promise<void> {
  const dataUrl = await QRCode.toDataURL(qrCode.publicUrl, qrOptions(1024));
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${safeFilePart(businessName)}-${safeFilePart(qrCode.name)}-qr.png`;
  link.click();
}

function safeFilePart(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "feedback"
  );
}
