import type { ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CircleCheck,
  LockKeyhole,
  Mail,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../../../app/theme/ThemeToggle.js";
import { BrandMark } from "./BrandMark.js";

export type AuthVisualKind =
  | "register"
  | "verification"
  | "verificationSuccess"
  | "forgotPassword"
  | "resetPassword"
  | "passwordResetSuccess";

type PremiumAuthShellProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
  visualKind: AuthVisualKind;
  visualTitle: string;
  visualSubtitle: string;
  footer?: ReactNode;
  formPosition?: "left" | "right";
  compact?: boolean;
};

export function PremiumAuthShell({
  children,
  title,
  subtitle,
  visualKind,
  visualTitle,
  visualSubtitle,
  footer,
  formPosition = "right",
  compact = false
}: PremiumAuthShellProps): JSX.Element {
  const formPanel = (
    <section
      className={`relative z-10 flex items-center px-5 py-7 sm:px-8 lg:px-10 ${
        compact ? "lg:py-12" : "lg:py-10"
      }`}
    >
      <div
        className={`mx-auto w-full ${
          compact ? "max-w-[490px]" : "max-w-[510px]"
        } rounded-lg border border-app-border bg-app-surface/95 p-6 shadow-panel backdrop-blur sm:p-8 lg:p-9`}
      >
        <div>
          <h1 className="text-2xl font-black leading-tight text-app-text sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-app-text-muted sm:text-[15px]">
            {subtitle}
          </p>
        </div>
        <div className="mt-7">{children}</div>
        {footer ? (
          <div className="mt-6 border-t border-app-border pt-5 text-center text-sm text-app-text-muted">
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  );

  const visualPanel = (
    <section className="relative hidden min-h-[620px] overflow-hidden border-app-border px-8 py-10 lg:block">
      <div className="relative z-10">
        <BrandMark />
        <div className="mt-14 max-w-[380px]">
          <h2 className="text-[2.45rem] font-black leading-[1.14] text-app-text">
            {visualTitle}
          </h2>
          <p className="mt-5 text-[15px] font-medium leading-7 text-app-text-muted">
            {visualSubtitle}
          </p>
        </div>
      </div>
      <AuthVisual kind={visualKind} />
    </section>
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background p-4 text-app-text transition-colors sm:p-6 lg:p-8">
      <div
        className={`relative grid w-full max-w-[1240px] overflow-hidden rounded-[1.25rem] border border-app-border bg-[linear-gradient(135deg,rgb(255,255,255),rgb(247,249,255))] shadow-premium dark:bg-[linear-gradient(135deg,rgb(3,13,34),rgb(10,24,50))] ${
          compact
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]"
            : "lg:grid-cols-[minmax(0,1.15fr)_minmax(430px,0.95fr)]"
        }`}
      >
        <div className="absolute right-5 top-5 z-20">
          <ThemeToggle compact />
        </div>

        <div className="flex items-center justify-between px-5 pt-6 lg:hidden">
          <BrandMark compact />
          <Link
            to="/login"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-app-border bg-app-surface text-app-text-muted shadow-sm transition hover:text-app-primary focus:outline-none focus:ring-2 focus:ring-app-focus/30"
            aria-label="Back to sign in"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {formPosition === "left" ? (
          <>
            {formPanel}
            {visualPanel}
          </>
        ) : (
          <>
            {visualPanel}
            {formPanel}
          </>
        )}
      </div>
    </main>
  );
}

function AuthVisual({ kind }: { kind: AuthVisualKind }): JSX.Element {
  const isSuccess = kind === "verificationSuccess" || kind === "passwordResetSuccess";
  const isReset = kind === "resetPassword" || kind === "passwordResetSuccess";
  const isMail =
    kind === "verification" ||
    kind === "verificationSuccess" ||
    kind === "forgotPassword";
  const CenterIcon = isSuccess
    ? Check
    : isReset
      ? LockKeyhole
      : isMail
        ? Mail
        : BarChart3;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute right-12 top-28 h-56 w-56 rounded-full border border-dashed border-indigo-200 dark:border-indigo-400/20" />
      <div className="absolute bottom-24 left-28 h-64 w-64 rounded-full border border-dashed border-indigo-100 dark:border-indigo-400/10" />
      <div className="absolute right-16 top-24 grid grid-cols-5 gap-2 opacity-60">
        {Array.from({ length: 25 }).map((_, index) => (
          <span
            key={index}
            className="h-1 w-1 rounded-full bg-indigo-200 dark:bg-indigo-400/30"
          />
        ))}
      </div>

      <div className="absolute bottom-14 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-indigo-100/70 blur-3xl dark:bg-indigo-500/15" />

      <div className="absolute bottom-28 left-1/2 flex -translate-x-1/2 flex-col items-center">
        <div className="relative">
          <div
            className={`flex h-44 w-44 items-center justify-center rounded-[2rem] border border-white/70 bg-gradient-to-br shadow-premium dark:border-white/10 ${
              isSuccess
                ? "from-emerald-100 via-white to-indigo-100 text-emerald-500 dark:from-emerald-950 dark:via-slate-900 dark:to-indigo-950"
                : "from-indigo-100 via-white to-red-100 text-app-primary dark:from-indigo-950 dark:via-slate-900 dark:to-red-950"
            }`}
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-app-primary text-white shadow-lg shadow-indigo-600/30">
              <CenterIcon className="h-11 w-11" aria-hidden="true" />
            </div>
          </div>
          <FloatingChip className="-left-24 top-8" icon={<Sparkles />} text="Protected" />
          <FloatingChip
            className="-right-24 top-16"
            icon={<Paperclip />}
            text="Verified"
          />
          <FloatingChip
            className="-bottom-9 left-10"
            icon={<ShieldCheck />}
            text="Secure"
          />
        </div>

        <div className="mt-12 grid w-[360px] grid-cols-3 gap-3">
          {["Encrypted", "Reliable", "Trusted"].map((label) => (
            <div
              key={label}
              className="rounded-lg border border-app-border bg-app-surface/90 px-3 py-4 text-center text-xs font-black text-app-text shadow-sm backdrop-blur dark:bg-slate-900/75"
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {kind === "register" ? <RegisterStats /> : null}
      {kind === "verification" || kind === "forgotPassword" ? <MailRoute /> : null}
      {kind === "resetPassword" ? <PasswordChecklist /> : null}
      {isSuccess ? <SuccessSummary /> : null}
    </div>
  );
}

function FloatingChip({
  className,
  icon,
  text
}: {
  className: string;
  icon: JSX.Element;
  text: string;
}): JSX.Element {
  return (
    <div
      className={`absolute inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface/95 px-3 py-2 text-xs font-black text-app-text shadow-panel dark:bg-slate-900/80 ${className}`}
    >
      <span className="text-app-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {text}
    </div>
  );
}

function RegisterStats(): JSX.Element {
  return (
    <>
      <div className="absolute right-14 top-64 w-52 rounded-lg border border-app-border bg-app-surface/95 p-4 shadow-panel dark:bg-slate-900/80">
        <p className="text-xs font-black text-app-text-muted">Feedback Overview</p>
        <p className="mt-2 text-3xl font-black text-app-text">2,389</p>
        <div className="mt-4 flex h-16 items-end gap-1.5">
          {[20, 35, 28, 46, 38, 56, 49, 66].map((height) => (
            <span
              key={height}
              className="w-full rounded-t bg-app-primary"
              style={{ height }}
            />
          ))}
        </div>
      </div>
      <div className="absolute bottom-16 right-24 rounded-lg border border-app-border bg-app-surface/95 p-4 shadow-panel dark:bg-slate-900/80">
        <p className="text-xs font-black text-app-text">Sentiment</p>
        <p className="mt-2 text-2xl font-black text-app-success">68%</p>
        <p className="text-xs font-semibold text-app-text-muted">Positive</p>
      </div>
    </>
  );
}

function MailRoute(): JSX.Element {
  return (
    <>
      <Send
        className="absolute right-24 top-52 h-10 w-10 rotate-12 text-app-primary"
        aria-hidden="true"
      />
      <div className="absolute bottom-20 right-20 rounded-lg border border-app-border bg-app-surface/95 px-4 py-3 text-sm font-semibold text-app-text shadow-panel dark:bg-slate-900/80">
        Your data is safe with us.
      </div>
    </>
  );
}

function PasswordChecklist(): JSX.Element {
  return (
    <div className="absolute bottom-20 right-14 w-72 rounded-lg border border-app-border bg-app-surface/95 p-5 shadow-panel dark:bg-slate-900/80">
      <p className="text-sm font-black text-app-text">Password must contain:</p>
      {["At least 10 characters", "Matching confirmation", "Secure account token"].map(
        (label) => (
          <div key={label} className="mt-3 flex items-center gap-2 text-sm text-app-text">
            <CircleCheck className="h-4 w-4 text-app-success" aria-hidden="true" />
            {label}
          </div>
        )
      )}
    </div>
  );
}

function SuccessSummary(): JSX.Element {
  return (
    <div className="absolute bottom-20 right-16 w-80 rounded-lg border border-app-border bg-app-surface/95 p-5 shadow-panel dark:bg-slate-900/80">
      <p className="text-sm font-black text-app-text">What happens next</p>
      {["Sign in to continue", "Sessions stay protected", "Your account is ready"].map(
        (label) => (
          <div key={label} className="mt-3 flex items-center gap-2 text-sm text-app-text">
            <CircleCheck className="h-4 w-4 text-app-success" aria-hidden="true" />
            {label}
          </div>
        )
      )}
    </div>
  );
}
