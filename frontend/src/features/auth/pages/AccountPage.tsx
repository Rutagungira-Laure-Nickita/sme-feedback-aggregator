import {
  ArrowRight,
  CalendarDays,
  Clock,
  KeyRound,
  Link2,
  LogOut,
  Mail,
  Monitor,
  Shield,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { normalizeApiError } from "../../../api/axios.js";
import { useAuthStore } from "../../../store/authStore.js";
import {
  AccountPanel,
  AccountShell,
  Avatar,
  StatusBadge
} from "../components/AccountShell.js";
import { Alert } from "../components/Alert.js";
import { GoogleCredentialButton } from "../components/GoogleCredentialButton.js";
import {
  useGoogleLinkAction,
  useLogoutAction,
  useLogoutAllAction
} from "../hooks/useAuthActions.js";
import { useSessionsQuery } from "../hooks/useSessions.js";
import type { SafeUser, UserRole } from "../types/authTypes.js";

const roleLabels: Record<UserRole, string> = {
  PLATFORM_ADMIN: "Platform Administrator",
  BUSINESS_OWNER: "Business Owner",
  STAFF: "Staff",
  CUSTOMER: "Customer"
};

export function AccountPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const logoutAction = useLogoutAction();
  const logoutAllAction = useLogoutAllAction();
  const sessionsQuery = useSessionsQuery();
  const googleLinkAction = useGoogleLinkAction();
  const [googleClientError, setGoogleClientError] = useState<string | null>(null);

  if (!user) {
    return (
      <main className="min-h-screen bg-app-background px-5 py-8 text-app-text">
        <p className="text-sm text-app-text-muted">Loading account</p>
      </main>
    );
  }

  const sessionsError = sessionsQuery.error
    ? normalizeApiError(sessionsQuery.error)
    : null;
  const googleLinkError = googleLinkAction.error
    ? normalizeApiError(googleLinkAction.error)
    : null;
  const sessions = sessionsQuery.data ?? [];
  const currentSession = sessions.find((session) => session.isCurrent);

  return (
    <AccountShell
      user={user}
      title="Account settings"
      subtitle="Manage your profile, security preferences, and account activity."
      actions={
        <button
          type="button"
          onClick={() => logoutAction.mutate()}
          disabled={logoutAction.isPending}
          className="hidden min-h-10 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-bold text-app-text transition hover:border-app-primary/50 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <AccountPanel>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar user={user} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-app-text">
                {user.firstName} {user.lastName}
              </h2>
              <p className="mt-1 break-all text-sm font-semibold text-app-text-muted">
                {user.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge tone="info">{roleLabels[user.role]}</StatusBadge>
                <StatusBadge tone={user.status === "ACTIVE" ? "success" : "warning"}>
                  {titleCase(user.status)}
                </StatusBadge>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm font-medium text-app-text-muted">
                <CalendarDays className="h-4 w-4 text-app-primary" />
                Member since {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
        </AccountPanel>

        <AccountPanel>
          <SectionHeader
            icon={<Link2 className="h-5 w-5" />}
            title="Sign-in methods"
            description="Review how you access your account."
          />
          <div className="mt-5 divide-y divide-app-border">
            <MethodRow
              icon={<Mail className="h-5 w-5" />}
              title="Email and password"
              description="Use your email to sign in."
              status={user.hasPassword ? "Active" : "Not set"}
              tone={user.hasPassword ? "success" : "warning"}
            />
            <MethodRow
              icon={
                <span
                  className="text-base font-black text-app-primary"
                  aria-hidden="true"
                >
                  G
                </span>
              }
              title="Google"
              description={user.googleEmail ?? "Use your Google account to sign in."}
              status={user.hasGoogleAccount ? "Linked" : "Not linked"}
              tone={user.hasGoogleAccount ? "success" : "warning"}
            />
          </div>

          {!user.hasGoogleAccount ? (
            <div className="mt-5 space-y-3 rounded-lg border border-app-border bg-app-surface-muted p-4">
              <GoogleCredentialButton
                text="continue_with"
                disabled={googleLinkAction.isPending}
                preferredWidth={360}
                onCredential={(credential) => {
                  setGoogleClientError(null);
                  googleLinkAction.mutate(credential);
                }}
                onClientError={setGoogleClientError}
              />
              {googleLinkAction.isPending ? (
                <Alert variant="info">Verifying Google account.</Alert>
              ) : null}
              {googleClientError || googleLinkError ? (
                <Alert variant="error">
                  {googleLinkError?.message ?? googleClientError}
                </Alert>
              ) : null}
            </div>
          ) : null}
        </AccountPanel>

        <AccountPanel>
          <SectionHeader
            icon={<Shield className="h-5 w-5" />}
            title="Security"
            description="Your current authentication and device posture."
          />
          <div className="mt-5 divide-y divide-app-border">
            <SecurityRow
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Email verified"
              description={
                user.emailVerifiedAt
                  ? `Verified ${formatDate(user.emailVerifiedAt)}`
                  : "Email verification is pending."
              }
              badge={user.emailVerifiedAt ? "Verified" : "Pending"}
              tone={user.emailVerifiedAt ? "success" : "warning"}
            />
            <SecurityRow
              icon={<KeyRound className="h-5 w-5" />}
              title="Password"
              description={
                user.hasPassword
                  ? "Password sign-in is available."
                  : "Google-only account."
              }
              badge={user.hasPassword ? "Up to date" : "Not set"}
              tone={user.hasPassword ? "success" : "warning"}
            />
            <SecurityRow
              icon={<Monitor className="h-5 w-5" />}
              title="Devices"
              description={`${sessions.length || 0} active ${sessions.length === 1 ? "device" : "devices"}.`}
              badge={sessionsQuery.isLoading ? "Loading" : "Secure"}
              tone="info"
            />
          </div>
        </AccountPanel>

        <AccountPanel>
          <SectionHeader
            icon={<Clock className="h-5 w-5" />}
            title="Recent activity"
            description="Derived from your secure account and active session data."
          />
          <div className="mt-5 divide-y divide-app-border">
            {getRecentActivity(user).map((item) => (
              <div key={item.title} className="flex items-start gap-3 py-3 first:pt-0">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary">
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-app-text">{item.title}</p>
                  <p className="mt-1 text-sm font-medium text-app-text-muted">
                    {item.description}
                  </p>
                </div>
                <p className="text-right text-xs font-semibold text-app-text-muted">
                  {item.when}
                </p>
              </div>
            ))}
          </div>
        </AccountPanel>
      </div>

      {user.role === "BUSINESS_OWNER" ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
          Your account is ready to access the business workspaces assigned to it.
        </div>
      ) : null}

      <AccountPanel className="mt-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader
            icon={<Monitor className="h-5 w-5" />}
            title="Active sessions"
            description={
              sessionsQuery.isLoading
                ? "Loading signed-in devices."
                : `You are currently signed in on ${sessions.length} ${sessions.length === 1 ? "device" : "devices"}.`
            }
          />
          <Link
            to="/account/sessions"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-4 text-sm font-bold text-app-primary transition hover:border-app-primary/60 focus:outline-none focus:ring-2 focus:ring-app-focus/30"
          >
            Manage sessions
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {sessionsError ? (
          <div className="mt-5">
            <Alert variant="error">{sessionsError.message}</Alert>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {(sessions.length ? sessions.slice(0, 3) : [currentSession]).map(
            (session, index) =>
              session ? (
                <div
                  key={session.id}
                  className="rounded-lg border border-app-border bg-app-surface-muted p-4"
                >
                  <p className="line-clamp-1 text-sm font-black text-app-text">
                    {formatDeviceName(session.userAgent)}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-app-text-muted">
                    {session.ipAddress ?? "IP not recorded"}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-app-text-muted">
                      {formatRelative(session.lastUsedAt)}
                    </p>
                    {session.isCurrent ? (
                      <StatusBadge tone="info">This device</StatusBadge>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div
                  key={index}
                  className="rounded-lg border border-dashed border-app-border bg-app-surface-muted p-4 text-sm font-semibold text-app-text-muted"
                >
                  No sessions loaded yet.
                </div>
              )
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-app-border pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => logoutAction.mutate()}
            disabled={logoutAction.isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-4 text-sm font-bold text-app-text transition hover:border-app-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
          <button
            type="button"
            onClick={() => logoutAllAction.mutate()}
            disabled={logoutAllAction.isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out all devices
          </button>
        </div>
      </AccountPanel>
    </AccountShell>
  );
}

function SectionHeader({
  icon,
  title,
  description
}: {
  icon: JSX.Element;
  title: string;
  description: string;
}): JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary">
        {icon}
      </span>
      <div>
        <h2 className="text-base font-black text-app-text">{title}</h2>
        <p className="mt-1 text-sm font-medium leading-5 text-app-text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

function MethodRow({
  icon,
  title,
  description,
  status,
  tone
}: {
  icon: JSX.Element;
  title: string;
  description: string;
  status: string;
  tone: "success" | "warning" | "info";
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-app-text">{title}</p>
        <p className="mt-1 break-all text-sm font-medium text-app-text-muted">
          {description}
        </p>
      </div>
      <StatusBadge tone={tone}>{status}</StatusBadge>
    </div>
  );
}

function SecurityRow({
  icon,
  title,
  description,
  badge,
  tone
}: {
  icon: JSX.Element;
  title: string;
  description: string;
  badge: string;
  tone: "success" | "warning" | "info";
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-app-text">{title}</p>
        <p className="mt-1 text-sm font-medium text-app-text-muted">{description}</p>
      </div>
      <StatusBadge tone={tone}>{badge}</StatusBadge>
    </div>
  );
}

function getRecentActivity(user: SafeUser) {
  return [
    {
      icon: <UserRound className="h-4 w-4" aria-hidden="true" />,
      title: "Account created",
      description: "Profile and role were created.",
      when: formatDate(user.createdAt)
    },
    {
      icon: <Clock className="h-4 w-4" aria-hidden="true" />,
      title: "Last signed in",
      description: user.lastLoginAt
        ? "Authenticated session created."
        : "Not recorded yet.",
      when: user.lastLoginAt ? formatDate(user.lastLoginAt) : "Pending"
    },
    {
      icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
      title: "Account updated",
      description: "Safe account details were refreshed.",
      when: formatDate(user.updatedAt)
    },
    {
      icon: <Link2 className="h-4 w-4" aria-hidden="true" />,
      title: "Google account",
      description: user.hasGoogleAccount
        ? "Google sign-in is linked."
        : "Google sign-in is not linked.",
      when: user.hasGoogleAccount ? "Linked" : "Available"
    }
  ];
}

function formatDeviceName(userAgent: string | null): string {
  if (!userAgent) {
    return "Unknown device";
  }

  if (userAgent.includes("Edg/")) {
    return "Microsoft Edge";
  }

  if (userAgent.includes("Chrome/")) {
    return "Chrome";
  }

  if (userAgent.includes("Safari/")) {
    return "Safari";
  }

  return userAgent.slice(0, 48);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatRelative(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

  if (diffMinutes < 2) {
    return "Active now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.round(diffHours / 24)}d ago`;
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
