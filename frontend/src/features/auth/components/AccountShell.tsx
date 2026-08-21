import type { ReactNode } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  CircleHelp,
  FileText,
  Grid2X2,
  Link2,
  LogOut,
  Menu,
  MessageSquareText,
  User,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "../../../app/theme/ThemeToggle.js";
import type { SafeUser } from "../types/authTypes.js";
import { BrandMark } from "./BrandMark.js";
import { useLogoutAction } from "../hooks/useAuthActions.js";

type AccountShellProps = {
  children: ReactNode;
  user: SafeUser;
  title: string;
  subtitle: string;
  actions?: ReactNode;
};

const navItems = [
  { label: "Overview", icon: Grid2X2, path: "/account" },
  { label: "Feedback", icon: MessageSquareText, path: "/account" },
  { label: "Analytics", icon: BarChart3, path: "/account" },
  { label: "Reports", icon: FileText, path: "/account" },
  { label: "Integrations", icon: Link2, path: "/account" },
  { label: "Alerts", icon: Bell, path: "/account" },
  { label: "Account", icon: User, path: "/account" }
];

export function AccountShell({
  children,
  user,
  title,
  subtitle,
  actions
}: AccountShellProps): JSX.Element {
  const location = useLocation();
  const logoutAction = useLogoutAction();
  const [isMobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isMobileOpen) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <BrandMark />
      <nav
        className="mt-10 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1"
        aria-label="Account navigation"
      >
        {navItems.map(({ label, icon: Icon, path }) => {
          const isActive =
            label === "Account" &&
            (location.pathname === "/account" ||
              location.pathname === "/account/sessions");

          return (
            <Link
              key={label}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 ${
                isActive
                  ? "bg-app-primary-soft text-app-primary"
                  : "text-app-text-muted hover:bg-app-surface hover:text-app-text"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 space-y-3 pt-4">
        <div className="rounded-lg border border-app-border bg-app-surface p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-app-primary-soft text-app-primary">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-app-text">
                {user.lastName || user.firstName} & Co.
              </p>
              <p className="text-xs font-medium text-app-text-muted">
                {formatRole(user.role)}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => logoutAction.mutate()}
          disabled={logoutAction.isPending}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-black text-app-text transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-app-focus/30 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:border-red-900/70 dark:hover:bg-red-950/40 dark:hover:text-red-100"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {logoutAction.isPending ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-app-background p-2 text-app-text transition-colors sm:p-6 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1320px] overflow-hidden rounded-[1.25rem] border border-app-border bg-app-surface shadow-premium dark:bg-[rgb(7,19,41)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-8 hidden h-[calc(100dvh-4rem)] self-start overflow-hidden border-r border-app-border bg-app-surface-muted/70 p-5 lg:flex lg:flex-col">
          {sidebar}
        </aside>

        {isMobileOpen ? (
          <div
            className="fixed inset-0 z-50 bg-slate-950/50 lg:hidden"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setMobileOpen(false);
            }}
          >
            <aside
              className="flex h-[100dvh] w-[min(84vw,320px)] flex-col overflow-hidden border-r border-app-border bg-app-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl dark:bg-[rgb(10,25,51)]"
              role="dialog"
              aria-modal="true"
              aria-label="Account navigation"
            >
              <div className="flex shrink-0 justify-end">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-app-border"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close account navigation"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1">{sidebar}</div>
            </aside>
          </div>
        ) : null}

        <div className="min-w-0">
          <header className="flex flex-col gap-5 border-b border-app-border px-3 py-4 sm:px-8 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="flex items-center justify-between gap-4 lg:hidden">
              <BrandMark compact />
              <div className="flex items-center gap-2">
                <ThemeToggle compact />
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-app-border bg-app-surface text-app-text-muted"
                  aria-label="Open account menu"
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-black leading-tight text-app-text sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-app-text-muted">
                {subtitle}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div className="hidden items-center gap-2 lg:flex">
                <ThemeToggle compact />
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text focus:outline-none focus:ring-2 focus:ring-app-focus/30"
                  aria-label="Help"
                >
                  <CircleHelp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text focus:outline-none focus:ring-2 focus:ring-app-focus/30"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-3 rounded-md border border-app-border bg-app-surface-muted px-3 py-2">
                <Avatar user={user} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-app-text">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="truncate text-xs font-medium text-app-text-muted">
                    {user.email}
                  </p>
                </div>
              </div>
              {actions}
            </div>
          </header>
          <div className="px-3 py-5 sm:px-8 sm:py-6 lg:px-10">{children}</div>
        </div>
      </section>
    </main>
  );
}

export function AccountPanel({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <section
      className={`rounded-lg border border-app-border bg-app-surface p-5 shadow-sm dark:bg-app-surface-muted/55 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function StatusBadge({
  children,
  tone = "info"
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "info";
}): JSX.Element {
  const styles = {
    success:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/70",
    warning:
      "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900/70",
    info: "bg-app-primary-soft text-app-primary ring-app-primary/25 dark:text-app-text"
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-black ring-1 ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

export function Avatar({ user }: { user: SafeUser }): JSX.Element {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="h-10 w-10 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white dark:bg-slate-200 dark:text-slate-950">
      {user.firstName.charAt(0)}
    </span>
  );
}

function formatRole(role: SafeUser["role"]): string {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
