import {
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "../../app/theme/ThemeToggle.js";
import { BrandMark } from "../auth/components/BrandMark.js";
import { useLogoutAction } from "../auth/hooks/useAuthActions.js";

const nav = [
  { label: "Dashboard", to: "/customer", icon: LayoutDashboard, end: true },
  { label: "My Feedback", to: "/customer/feedback", icon: MessageSquareText },
  { label: "Submit Feedback", to: "/customer/submit", icon: FilePlus2 },
  { label: "Profile", to: "/customer/profile", icon: UserRound }
];

export function CustomerShell({
  title,
  subtitle,
  children,
  actions
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const logout = useLogoutAction();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <BrandMark compact />
      <nav
        className="mt-7 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1"
        aria-label="Customer navigation"
      >
        {nav.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${isActive ? "bg-app-primary-soft text-app-primary" : "text-app-text-muted hover:bg-app-surface hover:text-app-text"}`
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="mt-4 flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 text-sm font-black hover:border-red-300 hover:text-red-700 disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
        {logout.isPending ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-app-background p-1.5 text-app-text min-[360px]:p-2 sm:p-5 lg:p-7">
      <section className="mx-auto grid min-h-[calc(100vh-1rem)] w-full max-w-[1480px] overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-premium sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-7 hidden h-[calc(100dvh-3.5rem)] self-start overflow-hidden border-r border-app-border bg-app-surface-muted/70 p-5 lg:flex lg:flex-col">
          {sidebar}
        </aside>
        {open ? (
          <div
            className="fixed inset-0 z-50 bg-slate-950/55 lg:hidden"
            onMouseDown={(event) =>
              event.target === event.currentTarget && setOpen(false)
            }
          >
            <aside
              className="flex h-[100dvh] w-[min(86vw,320px)] flex-col overflow-hidden border-r border-app-border bg-app-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="mb-3 flex shrink-0 justify-end">
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-app-border"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1">{sidebar}</div>
            </aside>
          </div>
        ) : null}
        <div className="min-w-0">
          <header className="border-b border-app-border px-3 py-4 sm:px-8 sm:py-5 lg:px-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-app-border lg:hidden"
                  onClick={() => setOpen(true)}
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-black sm:text-3xl">{title}</h1>
                  <p className="mt-1 text-sm font-medium text-app-text-muted">
                    {subtitle}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ThemeToggle compact />
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
