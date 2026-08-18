import { Check, Copy, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog.js";

export function AdminDetailModal({
  open,
  onOpenChange,
  title,
  description,
  badges,
  children,
  footer
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  badges?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!block max-h-[calc(100dvh-0.5rem)] w-[calc(100vw-0.5rem)] !max-w-5xl !gap-0 !overflow-hidden !p-0 sm:max-h-[88dvh] sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b border-app-border bg-app-surface-muted/55 px-4 py-4 pr-14 sm:px-6 sm:py-5 sm:pr-16">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <DialogTitle className="break-words text-xl font-bold sm:text-2xl">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-3xl font-medium">
                {description}
              </DialogDescription>
            </div>
            {badges ? (
              <div className="flex shrink-0 flex-wrap gap-2">{badges}</div>
            ) : null}
          </div>
        </DialogHeader>
        <div className="max-h-[calc(100dvh-9.5rem)] min-w-0 overflow-y-auto overscroll-contain px-4 py-5 sm:max-h-[calc(88dvh-9.5rem)] sm:px-6">
          <div className="space-y-5">{children}</div>
        </div>
        {footer ? (
          <DialogFooter className="border-t border-app-border bg-app-surface px-4 py-3 sm:px-6">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function DetailSection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="min-w-0 border-b border-app-border pb-5 last:border-0 last:pb-0">
      <h3 className="text-sm font-bold text-app-text">{title}</h3>
      {description ? (
        <p className="mt-1 text-xs font-medium leading-5 text-app-text-muted">
          {description}
        </p>
      ) : null}
      <div className="mt-3 grid min-w-0 gap-x-6 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function DetailField({
  label,
  value,
  mono = false,
  copyValue
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  copyValue?: string | null;
}): JSX.Element {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-app-text-muted">
        {label}
      </p>
      <div className="mt-1 flex min-w-0 items-start gap-2">
        <div
          className={`min-w-0 flex-1 break-words text-sm font-medium leading-6 ${mono ? "font-mono text-xs [overflow-wrap:anywhere]" : ""}`}
        >
          {value}
        </div>
        {copyValue ? <CopyButton value={copyValue} label={label} /> : null}
      </div>
    </div>
  );
}

export function DetailStat({
  label,
  value,
  detail
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}): JSX.Element {
  return (
    <div className="min-w-0 rounded-lg border border-app-border bg-app-surface-muted/55 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-app-text-muted">
        {label}
      </p>
      <p className="mt-1 break-words text-xl font-bold">{value}</p>
      {detail ? <p className="mt-1 text-xs text-app-text-muted">{detail}</p> : null}
    </div>
  );
}

export function DetailTechnicalSection({
  title = "Technical details",
  children
}: {
  title?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <details className="group min-w-0 rounded-lg border border-app-border bg-app-surface-muted/35">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-app-focus/30">
        <span className="inline-flex items-center gap-2">
          <span className="text-app-primary transition group-open:rotate-90">›</span>
          {title}
        </span>
      </summary>
      <div className="grid min-w-0 gap-4 border-t border-app-border px-4 py-4 sm:grid-cols-2">
        {children}
      </div>
    </details>
  );
}

export function DangerZone({ children }: { children: ReactNode }): JSX.Element {
  return (
    <section className="rounded-lg border border-red-200 bg-red-50/70 p-4 dark:border-red-900/70 dark:bg-red-950/25">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-red-800 dark:text-red-100">
            High-impact actions
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function ConfirmActionModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending = false,
  danger = true
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isPending?: boolean;
  danger?: boolean;
}): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={isPending ? () => undefined : onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-0.75rem)] sm:max-w-lg"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="min-h-11 rounded-md border border-app-border px-4 text-sm font-bold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`min-h-11 rounded-md px-4 text-sm font-bold text-white disabled:opacity-50 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-app-primary hover:bg-app-primary-hover"
            }`}
          >
            {isPending ? "Working…" : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CopyButton({ value, label }: { value: string; label: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-app-border text-app-text-muted hover:border-app-primary/40 hover:text-app-primary focus:outline-none focus:ring-2 focus:ring-app-focus/30"
      aria-label={`Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
