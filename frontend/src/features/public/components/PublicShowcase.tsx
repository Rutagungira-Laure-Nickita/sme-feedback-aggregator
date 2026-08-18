import {
  BarChart3,
  CheckCircle2,
  Inbox,
  Mail,
  MessageCircle,
  QrCode,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow
} from "lucide-react";
import { MarketingButton } from "./MarketingButton.js";

export function ProductWorkspacePreview(): JSX.Element {
  const workflow = [
    { icon: Inbox, label: "Unified inbox", detail: "Every customer voice in one queue" },
    {
      icon: Sparkles,
      label: "AI-assisted triage",
      detail: "Sentiment, summaries and categories"
    },
    {
      icon: Workflow,
      label: "Coordinated action",
      detail: "Ownership, priority and automation"
    }
  ];

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-app-border bg-app-surface p-4 shadow-premium dark:bg-app-surface-muted/55 sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500" />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-app-primary">
            Customer experience workspace
          </p>
          <p className="mt-1 text-sm font-semibold text-app-text-muted">
            A focused operating system for feedback
          </p>
        </div>
        <span className="rounded-full bg-app-success/10 px-3 py-1 text-xs font-black text-app-success">
          Live workspace
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        {workflow.map(({ icon: Icon, label, detail }, index) => (
          <div
            key={label}
            className="group flex items-center gap-4 rounded-2xl border border-app-border bg-app-surface-muted/65 p-4 transition hover:-translate-y-0.5 hover:border-app-primary/30"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-app-primary-soft text-app-primary dark:text-indigo-100">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-app-text">{label}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-app-text-muted">
                {detail}
              </p>
            </div>
            <span className="text-xs font-black text-app-text-muted">0{index + 1}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-indigo-600 p-4 text-white">
          <BarChart3 className="h-5 w-5" aria-hidden="true" />
          <p className="mt-5 text-sm font-black">Decision-ready reports</p>
        </div>
        <div className="rounded-2xl bg-slate-950 p-4 text-white dark:bg-slate-900">
          <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
          <p className="mt-5 text-sm font-black">Tenant-aware access</p>
        </div>
      </div>
    </div>
  );
}

export function ChannelStrip(): JSX.Element {
  const channels = [
    { label: "Public forms", icon: Send },
    { label: "QR feedback", icon: QrCode },
    { label: "Gmail", icon: Mail },
    { label: "WhatsApp", icon: MessageCircle },
    { label: "Manual entry", icon: Inbox }
  ];

  return (
    <div className="grid gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
      {channels.map(({ label, icon: Icon }) => (
        <div
          key={label}
          className="flex min-h-[82px] items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm dark:bg-app-surface-muted/45"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-primary-soft text-app-primary dark:text-indigo-100">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black text-app-text">{label}</p>
            <p className="mt-1 text-xs font-bold text-app-success">Available</p>
          </div>
        </div>
      ))}
    </div>
  );
}

type CallToActionSectionProps = {
  title: string;
  description: string;
  primaryLabel?: string;
  secondaryLabel?: string;
};

export function CallToActionSection({
  title,
  description,
  primaryLabel = "Get Started",
  secondaryLabel = "Contact Us"
}: CallToActionSectionProps): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-[1320px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-premium sm:p-10 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <h2 className="text-2xl font-black leading-tight sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-indigo-100">
            {description}
          </p>
        </div>
        <div className="relative mt-6 flex flex-col gap-3 min-[420px]:flex-row lg:mt-0 lg:justify-end">
          <MarketingButton
            to="/register"
            variant="secondary"
            className="bg-white text-app-primary hover:bg-indigo-50"
          >
            {primaryLabel}
          </MarketingButton>
          <MarketingButton
            to="/contact"
            variant="secondary"
            className="border-white/40 bg-transparent text-white hover:bg-white/10"
          >
            {secondaryLabel}
          </MarketingButton>
        </div>
      </div>
    </section>
  );
}

export function TrustStrip(): JSX.Element {
  const items = [
    "Tenant-isolated workspaces",
    "Encrypted integration credentials",
    "Signed webhook validation"
  ];

  return (
    <div className="mx-auto grid w-full max-w-[1080px] gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item}
          className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black text-app-text-muted"
        >
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-app-success"
            aria-hidden="true"
          />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}
