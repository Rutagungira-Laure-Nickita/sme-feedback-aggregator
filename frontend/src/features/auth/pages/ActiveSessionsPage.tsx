import {
  AlertCircle,
  ArrowLeft,
  Chrome,
  Laptop,
  LogOut,
  MoreVertical,
  ShieldCheck,
  Smartphone,
  Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import { normalizeApiError } from "../../../api/axios.js";
import { useAuthStore } from "../../../store/authStore.js";
import { AccountPanel, AccountShell, StatusBadge } from "../components/AccountShell.js";
import { Alert } from "../components/Alert.js";
import { useLogoutAllAction } from "../hooks/useAuthActions.js";
import { useRevokeSessionAction, useSessionsQuery } from "../hooks/useSessions.js";
import type { AuthSession } from "../types/authTypes.js";

export function ActiveSessionsPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const sessionsQuery = useSessionsQuery();
  const revokeSessionAction = useRevokeSessionAction();
  const logoutAllAction = useLogoutAllAction();

  if (!user) {
    return (
      <main className="min-h-screen bg-app-background px-5 py-8 text-app-text">
        <p className="text-sm text-app-text-muted">Loading sessions</p>
      </main>
    );
  }

  const sessions = sessionsQuery.data ?? [];
  const currentSession = sessions.find((session) => session.isCurrent);
  const otherSessions = sessions.filter((session) => !session.isCurrent);
  const sessionsError = sessionsQuery.error
    ? normalizeApiError(sessionsQuery.error)
    : null;
  const revokeError = revokeSessionAction.error
    ? normalizeApiError(revokeSessionAction.error)
    : null;

  return (
    <AccountShell
      user={user}
      title="Active sessions"
      subtitle="Manage where you are signed in and protect your account."
      actions={
        <Link
          to="/account"
          className="hidden min-h-10 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm font-bold text-app-text transition hover:border-app-primary/50 sm:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Account
        </Link>
      }
    >
      <div className="space-y-5">
        <AccountPanel>
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:items-center">
            <div>
              <p className="text-sm font-black text-app-text-muted">
                Total active sessions
              </p>
              <p className="mt-2 text-5xl font-black text-app-text">
                {sessionsQuery.isLoading ? "-" : sessions.length}
              </p>
              <p className="mt-2 text-sm font-semibold text-app-text-muted">
                Including this device
              </p>
            </div>
            <div className="flex items-start gap-3 border-app-border lg:border-l lg:pl-8">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-black text-app-text">
                  Keep your account secure
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-app-text-muted">
                  Review your active sessions regularly and sign out of devices you do not
                  recognize.
                </p>
              </div>
            </div>
            <div className="hidden justify-end lg:flex">
              <div className="relative h-28 w-40">
                <Laptop className="absolute bottom-2 left-2 h-20 w-20 text-app-primary" />
                <Smartphone className="absolute bottom-1 right-3 h-16 w-16 text-app-primary/60" />
                <ShieldCheck className="absolute right-12 top-1 h-12 w-12 text-app-success" />
              </div>
            </div>
          </div>
        </AccountPanel>

        {sessionsError ? <Alert variant="error">{sessionsError.message}</Alert> : null}
        {revokeError ? <Alert variant="error">{revokeError.message}</Alert> : null}

        <section>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-lg font-black text-app-text">This device</h2>
            <StatusBadge tone="success">Current session</StatusBadge>
          </div>
          {sessionsQuery.isLoading ? (
            <SessionSkeleton />
          ) : currentSession ? (
            <SessionCard
              session={currentSession}
              isCurrentSection
              isRevoking={revokeSessionAction.isPending}
              onRevoke={() => revokeSessionAction.mutate(currentSession.id)}
            />
          ) : (
            <EmptySessions message="The current session could not be identified." />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-black text-app-text">Other active sessions</h2>
          {sessionsQuery.isLoading ? (
            <div className="space-y-3">
              <SessionSkeleton />
              <SessionSkeleton />
            </div>
          ) : otherSessions.length ? (
            <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm dark:bg-app-surface-muted/55">
              {otherSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  isRevoking={revokeSessionAction.isPending}
                  onRevoke={() => revokeSessionAction.mutate(session.id)}
                />
              ))}
            </div>
          ) : (
            <EmptySessions message="No other active sessions." />
          )}
        </section>

        <AccountPanel>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-200">
                <LogOut className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-black text-app-text">
                  Sign out of all other devices
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-app-text-muted">
                  This will sign you out of all devices, including this one, using the
                  existing logout-all flow.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logoutAllAction.mutate()}
              disabled={logoutAllAction.isPending}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {logoutAllAction.isPending ? "Signing out" : "Sign out all devices"}
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-3 rounded-lg border border-app-border bg-app-surface-muted px-4 py-3 text-sm font-semibold text-app-text-muted sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" />
              If you notice unfamiliar activity, reset your password.
            </p>
            <Link
              to="/forgot-password"
              className="font-bold text-app-primary transition hover:text-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/30"
            >
              Request password reset
            </Link>
          </div>
        </AccountPanel>
      </div>
    </AccountShell>
  );
}

function SessionCard({
  session,
  isCurrentSection = false,
  isRevoking,
  onRevoke
}: {
  session: AuthSession;
  isCurrentSection?: boolean;
  isRevoking: boolean;
  onRevoke: () => void;
}): JSX.Element {
  return (
    <AccountPanel className="!p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <DeviceIcon userAgent={session.userAgent} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-app-text">
                {formatDeviceName(session.userAgent)}
              </h3>
              {session.isCurrent ? (
                <StatusBadge tone="info">This device</StatusBadge>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-semibold text-app-text-muted">
              IP address: {session.ipAddress ?? "not recorded"}
            </p>
            <p className="mt-1 text-sm font-semibold text-app-text-muted">
              Last used {formatDate(session.lastUsedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isCurrentSection ? (
            <p className="flex items-center gap-2 text-sm font-black text-app-success">
              <span className="h-2 w-2 rounded-full bg-app-success" />
              Active now
            </p>
          ) : null}
          <button
            type="button"
            onClick={onRevoke}
            disabled={isRevoking}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-app-border bg-app-surface px-4 text-sm font-bold text-app-text transition hover:border-app-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {session.isCurrent ? "Revoke current" : "Revoke"}
          </button>
        </div>
      </div>
    </AccountPanel>
  );
}

function SessionRow({
  session,
  isRevoking,
  onRevoke
}: {
  session: AuthSession;
  isRevoking: boolean;
  onRevoke: () => void;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-4 border-b border-app-border p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <DeviceIcon userAgent={session.userAgent} />
        <div>
          <h3 className="text-sm font-black text-app-text">
            {formatDeviceName(session.userAgent)}
          </h3>
          <p className="mt-1 text-sm font-semibold text-app-text-muted">
            IP address: {session.ipAddress ?? "not recorded"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <p className="text-sm font-semibold text-app-text-muted">
          {formatRelative(session.lastUsedAt)}
        </p>
        <button
          type="button"
          onClick={onRevoke}
          disabled={isRevoking}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-app-border bg-app-surface px-4 text-sm font-bold text-app-primary transition hover:border-app-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Revoke
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-app-text-muted"
          aria-label="More session actions"
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function DeviceIcon({ userAgent }: { userAgent: string | null }): JSX.Element {
  const isMobile = Boolean(userAgent?.match(/Android|iPhone|Mobile/i));
  const Icon = isMobile ? Smartphone : userAgent?.includes("Chrome/") ? Chrome : Laptop;

  return (
    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-app-primary-soft text-app-primary">
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
  );
}

function SessionSkeleton(): JSX.Element {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-5 shadow-sm dark:bg-app-surface-muted/55">
      <div className="h-4 w-40 rounded bg-app-surface-muted" />
      <div className="mt-3 h-3 w-64 max-w-full rounded bg-app-surface-muted" />
    </div>
  );
}

function EmptySessions({ message }: { message: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-app-border bg-app-surface-muted p-6 text-sm font-semibold text-app-text-muted">
      {message}
    </div>
  );
}

function formatDeviceName(userAgent: string | null): string {
  if (!userAgent) {
    return "Unknown device";
  }

  const platform = userAgent.match(/Windows|Android|Mac OS X|iPhone|iPad/i)?.[0];
  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("Chrome/")
      ? "Chrome"
      : userAgent.includes("Safari/")
        ? "Safari"
        : "Browser";

  return `${platform ? platform.replace("Mac OS X", "macOS") : "Device"} - ${browser}`;
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
