import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Bell,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Inbox,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquarePlus,
  PlugZap,
  QrCode,
  Settings,
  Shield,
  UserRound,
  UserRoundPlus,
  UserCog,
  Users,
  Zap,
  X,
  type LucideIcon
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { ThemeToggle } from "../../app/theme/ThemeToggle.js";
import { useAuthStore } from "../../store/authStore.js";
import { AppSelectField } from "../../components/ui/select-field.js";
import { BrandMark } from "../auth/components/BrandMark.js";
import { useLogoutAction } from "../auth/hooks/useAuthActions.js";
import type {
  BranchStatus,
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus,
  MyBusiness,
  StaffInvitationStatus
} from "./types.js";
import { formatRole } from "./format.js";

type WorkspaceShellProps = {
  title: string;
  subtitle: string;
  businesses: MyBusiness[];
  activeBusiness: MyBusiness;
  children: ReactNode;
  actions?: ReactNode;
};

type WorkspaceNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  children?: Array<{
    label: string;
    path: string;
    icon: LucideIcon;
    disabled?: boolean;
  }>;
  ownerAdminOnly?: boolean;
  ownerOnly?: boolean;
};

const navItems: WorkspaceNavItem[] = [
  { label: "Overview", path: "", icon: LayoutDashboard },
  {
    label: "Feedback",
    path: "feedback",
    icon: ClipboardList,
    children: [
      { label: "Add Feedback", path: "feedback/manual", icon: MessageSquarePlus },
      { label: "QR Codes", path: "feedback/qr-codes", icon: QrCode },
      { label: "All Feedback", path: "feedback", icon: Inbox, disabled: false }
    ]
  },
  { label: "Customers", path: "customers", icon: UserRound },
  { label: "Automations", path: "automations", icon: Zap },
  { label: "Integrations", path: "integrations", icon: PlugZap, ownerAdminOnly: true },
  { label: "Reports", path: "reports", icon: FileText, ownerOnly: true },
  { label: "Branches", path: "branches", icon: MapPin },
  { label: "Staff", path: "staff", icon: Users },
  { label: "Invitations", path: "invitations", icon: UserRoundPlus },
  { label: "Settings", path: "settings", icon: Settings }
];

const adminNavGroups = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/admin", icon: BarChart3, end: true }]
  },
  {
    label: "Management",
    items: [
      { label: "Businesses", to: "/admin/businesses", icon: Building2, end: false },
      { label: "Users", to: "/admin/users", icon: UserCog, end: false }
    ]
  },
  {
    label: "Intelligence",
    items: [
      { label: "Feedback", to: "/admin/feedback", icon: Inbox, end: false },
      { label: "Integrations", to: "/admin/integrations", icon: PlugZap, end: false },
      { label: "Reports", to: "/admin/reports", icon: FileText, end: false }
    ]
  },
  {
    label: "Platform",
    items: [
      {
        label: "Platform Health",
        to: "/admin/platform-health",
        icon: HeartPulse,
        end: false
      },
      { label: "Settings", to: "/admin/settings", icon: Settings, end: false }
    ]
  }
];

export function WorkspaceShell({
  title,
  subtitle,
  businesses,
  activeBusiness,
  children,
  actions
}: WorkspaceShellProps): JSX.Element {
  const { businessId = activeBusiness.id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setMobileOpen] = useState(false);
  const logoutAction = useLogoutAction();
  const user = useAuthStore((state) => state.user);

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
      <BrandMark compact />
      <nav
        className="mt-7 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1"
        aria-label="Business navigation"
      >
        {navItems.map(
          ({
            label,
            path,
            icon: Icon,
            children: childItems,
            ownerAdminOnly,
            ownerOnly
          }) => {
            if (
              ownerAdminOnly &&
              activeBusiness.membership.role !== "OWNER" &&
              activeBusiness.membership.role !== "ADMIN"
            ) {
              return null;
            }
            if (ownerOnly && user?.role !== "BUSINESS_OWNER") {
              return null;
            }

            const to = `/business/${businessId}${path ? `/${path}` : ""}`;
            const isGroupActive =
              Boolean(childItems) &&
              location.pathname.startsWith(`/business/${businessId}/${path}`);

            if (childItems) {
              return (
                <div key={label}>
                  <div
                    className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold ${
                      isGroupActive
                        ? "text-app-text"
                        : "text-app-text-muted hover:bg-app-surface hover:text-app-text dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="min-w-0 flex-1">{label}</span>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="mt-1 space-y-1 pl-7">
                    {childItems.map(
                      ({
                        label: childLabel,
                        path: childPath,
                        icon: ChildIcon,
                        disabled
                      }) =>
                        disabled || !childPath ? (
                          <span
                            key={childLabel}
                            className="flex min-h-10 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm font-semibold text-app-text-muted/60"
                            aria-disabled="true"
                          >
                            <ChildIcon className="h-4 w-4" aria-hidden="true" />
                            {childLabel}
                          </span>
                        ) : (
                          <NavLink
                            key={childLabel}
                            to={`/business/${businessId}/${childPath}`}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                              `flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 ${
                                isActive
                                  ? "bg-app-primary-soft text-app-primary"
                                  : "text-app-text-muted hover:bg-app-surface hover:text-app-text dark:hover:bg-white/5"
                              }`
                            }
                          >
                            <ChildIcon className="h-4 w-4" aria-hidden="true" />
                            {childLabel}
                          </NavLink>
                        )
                    )}
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={label}
                to={to}
                end={!path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 ${
                    isActive
                      ? "bg-app-primary-soft text-app-primary"
                      : "text-app-text-muted hover:bg-app-surface hover:text-app-text dark:hover:bg-white/5"
                  }`
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </NavLink>
            );
          }
        )}
      </nav>
      <div className="mt-6 shrink-0 space-y-3 border-t border-app-border pt-5">
        <div className="rounded-xl bg-app-surface px-4 py-3 shadow-sm ring-1 ring-app-border dark:bg-white/5">
          <p className="text-xs font-bold uppercase tracking-wide text-app-text-muted">
            Business workspace
          </p>
          <p className="mt-2 truncate text-sm font-black text-app-text">
            {activeBusiness.name}
          </p>
          <p className="mt-1 text-xs font-semibold text-app-text-muted">
            {formatRole(activeBusiness.membership.role)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => logoutAction.mutate()}
          disabled={logoutAction.isPending}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 text-sm font-black text-app-text transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-app-focus/30 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/5 dark:hover:border-red-900/70 dark:hover:bg-red-950/40 dark:hover:text-red-100"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {logoutAction.isPending ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-app-background p-1.5 text-app-text transition-colors min-[360px]:p-2 sm:p-5 lg:p-7">
      <section className="mx-auto grid min-h-[calc(100vh-1rem)] w-full max-w-[1480px] overflow-hidden rounded-[1.25rem] border border-app-border/90 bg-app-surface shadow-premium dark:bg-[rgb(4,13,31)] sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r border-app-border bg-app-surface-muted/70 p-5 dark:bg-[rgb(10,25,51)] lg:flex lg:flex-col">
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
              aria-label="Business navigation"
            >
              <div className="flex shrink-0 justify-end">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-app-border"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1">{sidebar}</div>
            </aside>
          </div>
        ) : null}

        <div className="min-w-0">
          <header className="border-b border-app-border bg-app-surface/90 px-3 py-4 backdrop-blur sm:px-7 sm:py-5 lg:px-9">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center justify-between gap-4 md:flex-1">
                <div className="flex items-center gap-3 lg:hidden">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-app-border"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open navigation"
                  >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <BrandMark compact />
                </div>
                <div className="hidden min-w-0 md:block">
                  <h1 className="text-2xl font-black leading-tight sm:text-3xl">
                    {title}
                  </h1>
                  <p className="mt-2 text-sm font-medium text-app-text-muted">
                    {subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 lg:hidden">
                  <ThemeToggle compact />
                </div>
              </div>

              <div className="md:hidden">
                <h1 className="text-2xl font-black leading-tight">{title}</h1>
                <p className="mt-2 text-sm font-medium text-app-text-muted">{subtitle}</p>
              </div>

              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:shrink-0 md:justify-end xl:flex-nowrap">
                <AppSelectField
                  value={activeBusiness.id}
                  onValueChange={(value) => {
                    localStorage.setItem("sme-active-business-id", value);
                    navigate(`/business/${value}`);
                  }}
                  options={businesses.map((business) => ({
                    value: business.id,
                    label: business.name
                  }))}
                  ariaLabel="Select business"
                  className="min-w-0 sm:w-52 xl:w-60"
                  triggerClassName="h-11"
                />
                <div className="hidden shrink-0 items-center gap-2 lg:flex">
                  <ThemeToggle compact />
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md text-app-text-muted hover:bg-app-surface-muted"
                    aria-label="Notifications are not configured yet"
                  >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {actions ? (
                  <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
                    {actions}
                  </div>
                ) : null}
              </div>
            </div>
          </header>
          <div className="px-3 py-5 min-[360px]:px-4 sm:px-7 sm:py-7 lg:px-9 lg:py-8">
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}

export function WorkspacePanel({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-app-border/80 bg-app-surface p-4 shadow-[0_12px_35px_rgba(15,23,42,0.055)] dark:bg-app-surface-muted/55 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "indigo"
}: {
  label: string;
  value: string | number;
  detail: string;
  icon?: ReactNode;
  tone?: "indigo" | "emerald" | "amber" | "sky" | "slate";
}): JSX.Element {
  const toneClass = {
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/55 dark:text-indigo-200",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/55 dark:text-emerald-200",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/55 dark:text-amber-200",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/55 dark:text-sky-200",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
  }[tone];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-app-border/80 bg-app-surface p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)] dark:bg-app-surface-muted/50 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-app-text-muted">
          {label}
        </p>
        {icon ? (
          <span
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-3xl font-black leading-none tracking-tight text-app-text">
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-app-text-muted">{detail}</p>
    </div>
  );
}

export function EmptyState({
  icon = <ClipboardList className="h-6 w-6" aria-hidden="true" />,
  title,
  description,
  action
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-dashed border-app-primary/30 bg-gradient-to-br from-app-primary-soft/70 to-app-surface p-8 text-center sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-app-primary text-white shadow-lg shadow-indigo-500/20">
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-black text-app-text">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-app-text-muted">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function WorkspaceButton({
  children,
  to,
  onClick,
  tone = "primary",
  type = "button",
  disabled = false
}: {
  children: ReactNode;
  to?: string;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}): JSX.Element {
  const className = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-center text-sm font-black leading-tight transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 disabled:cursor-not-allowed disabled:opacity-60 ${
    tone === "primary"
      ? "bg-app-primary text-app-primary-foreground hover:bg-app-primary-hover"
      : tone === "danger"
        ? "bg-red-600 text-white hover:bg-red-700"
        : "border border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted"
  }`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={className} disabled={disabled}>
      {children}
    </button>
  );
}

export function StatusBadge({
  status
}: {
  status:
    | BusinessStatus
    | BranchStatus
    | BusinessMembershipStatus
    | StaffInvitationStatus
    | BusinessMemberRole;
}): JSX.Element {
  const tone =
    status === "ACTIVE"
      ? "success"
      : status === "PENDING"
        ? "warning"
        : status === "SUSPENDED" ||
            status === "REJECTED" ||
            status === "ARCHIVED" ||
            status === "REMOVED" ||
            status === "CANCELLED"
          ? "danger"
          : "info";
  const styles = {
    success:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/70",
    warning:
      "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900/70",
    danger:
      "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900/70",
    info: "bg-app-primary-soft text-app-primary ring-app-primary/25 dark:text-app-text"
  };

  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-black ring-1 ${styles[tone]}`}
    >
      {formatRole(status)}
    </span>
  );
}

export function InitialsBadge({ name }: { name: string }): JSX.Element {
  return (
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 text-sm font-black text-white shadow-md shadow-indigo-500/20">
      {name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || <Building2 className="h-4 w-4" aria-hidden="true" />}
    </span>
  );
}

export function RowLink({
  to,
  children
}: {
  to: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-4 rounded-lg border border-app-border bg-app-surface p-4 transition hover:border-app-primary/50 hover:shadow-sm dark:bg-app-surface-muted/40"
    >
      <div className="min-w-0">{children}</div>
      <ChevronRight className="h-5 w-5 shrink-0 text-app-text-muted" aria-hidden="true" />
    </Link>
  );
}

export function SuspendedBanner({
  type
}: {
  type: "business" | "membership";
}): JSX.Element {
  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
      {type === "business"
        ? "This business is suspended. Workspace operations are blocked until a platform administrator reactivates it."
        : "Your membership is suspended or removed. Business access is blocked on protected backend requests."}
    </div>
  );
}

export function AdminShell({
  title,
  subtitle,
  children,
  actions
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
}): JSX.Element {
  const logoutAction = useLogoutAction();
  const [isMobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
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

  const navigation = (
    <div className="flex h-full min-h-0 flex-col">
      <BrandMark compact />
      <div className="mt-5 rounded-lg border border-app-primary/25 bg-app-primary-soft p-3">
        <div className="flex items-center gap-2 text-app-primary">
          <Shield className="h-4 w-4" aria-hidden="true" />
          <p className="text-xs font-black uppercase tracking-wide">Platform console</p>
        </div>
        <p className="mt-1 text-xs font-semibold text-app-text-muted">
          Authorized administrator oversight
        </p>
      </div>
      <nav
        className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-1"
        aria-label="Platform administrator navigation"
      >
        {adminNavGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.16em] text-app-text-muted">
              {group.label}
            </p>
            <div className="mt-2 space-y-1">
              {group.items.map(({ label, to, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 ${
                      isActive
                        ? "bg-app-primary-soft text-app-primary"
                        : "text-app-text-muted hover:bg-app-surface hover:text-app-text dark:hover:bg-white/5"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => logoutAction.mutate()}
        disabled={logoutAction.isPending}
        className="mt-6 flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 text-sm font-black text-app-text transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-app-focus/30 disabled:opacity-60 dark:bg-white/5 dark:hover:bg-red-950/40"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {logoutAction.isPending ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-app-background p-2 text-app-text transition-colors sm:p-5 lg:p-7">
      <section className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1500px] overflow-hidden rounded-[1.25rem] border border-app-border bg-app-surface shadow-premium dark:bg-[rgb(4,13,31)] sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="hidden border-r border-app-border bg-app-surface-muted/70 p-5 dark:bg-[rgb(10,25,51)] lg:flex lg:flex-col">
          {navigation}
        </aside>
        {isMobileOpen ? (
          <div
            className="fixed inset-0 z-50 bg-slate-950/55 lg:hidden"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setMobileOpen(false);
            }}
          >
            <aside
              className="flex h-[100dvh] w-[min(86vw,324px)] flex-col overflow-hidden border-r border-app-border bg-app-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl dark:bg-[rgb(10,25,51)]"
              role="dialog"
              aria-modal="true"
              aria-label="Platform administrator navigation"
            >
              <div className="mb-3 flex shrink-0 justify-end">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-app-border"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close administrator navigation"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1">{navigation}</div>
            </aside>
          </div>
        ) : null}
        <div className="min-w-0">
          <header className="border-b border-app-border px-3 py-4 sm:px-8 sm:py-5 lg:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-app-border lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open administrator navigation"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-2xl font-black leading-tight sm:text-3xl">
                    {title}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-app-text-muted">
                    {subtitle}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ThemeToggle compact />
                <span className="inline-flex h-10 items-center gap-2 rounded-md bg-app-primary-soft px-3 text-xs font-black text-app-primary">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  Platform Admin
                </span>
                {actions}
              </div>
            </div>
          </header>
          <div className="px-3 py-5 sm:px-8 sm:py-6 lg:px-10">{children}</div>
        </div>
      </section>
    </main>
  );
}
