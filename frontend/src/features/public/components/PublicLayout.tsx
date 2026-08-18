import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "../../../app/theme/ThemeToggle.js";
import { BrandMark } from "../../auth/components/BrandMark.js";
import { MarketingButton } from "./MarketingButton.js";
import { usePlatformSettings } from "../../platform-settings/PlatformSettingsContext.js";
import { useAuthStore } from "../../../store/authStore.js";
import { getDefaultAuthenticatedRoute } from "../../auth/authRedirects.js";

type PublicLayoutProps = {
  children: ReactNode;
};

const navItems = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "How It Works", path: "/how-it-works" },
  { label: "Features", path: "/features" },
  { label: "Contact", path: "/contact" }
];

const publicFooterGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", path: "/features" },
      { label: "How It Works", path: "/how-it-works" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About", path: "/about" },
      { label: "Contact", path: "/contact" }
    ]
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", path: "/privacy-policy" },
      { label: "Terms of Service", path: "/terms-of-service" }
    ]
  }
];

export function PublicLayout({ children }: PublicLayoutProps): JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const dashboardPath = getDefaultAuthenticatedRoute(user);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-app-background text-app-text transition-colors">
      <header className="sticky top-0 z-40 border-b border-app-border/80 bg-app-surface/90 backdrop-blur-xl">
        <div className="h-1 bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500" />
        <div className="mx-auto flex min-h-[4.5rem] w-full max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="rounded-md focus:outline-none focus:ring-2 focus:ring-app-focus/30"
            aria-label="SME Feedback Aggregator home"
          >
            <BrandMark compact />
          </Link>

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Public navigation"
          >
            {navItems.map((item) => (
              <PublicNavLink key={item.path} path={item.path} label={item.label} />
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle compact />
            {user ? (
              <MarketingButton to={dashboardPath} className="min-h-10 px-4">
                Open dashboard
              </MarketingButton>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-app-border bg-app-surface px-4 text-sm font-black text-app-text shadow-sm transition hover:border-app-primary/50 hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-app-focus/30"
                >
                  Log in
                </Link>
                <MarketingButton to="/register" className="min-h-10 px-4">
                  Get Started
                </MarketingButton>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-app-border bg-app-surface text-app-text shadow-sm transition hover:border-app-primary/50 focus:outline-none focus:ring-2 focus:ring-app-focus/30 lg:hidden"
            aria-label={
              isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-controls="mobile-public-navigation"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {isMobileMenuOpen ? (
          <div
            id="mobile-public-navigation"
            className="fixed inset-x-0 bottom-0 top-[4.75rem] z-50 overflow-y-auto overscroll-contain bg-slate-950/35 lg:hidden"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsMobileMenuOpen(false);
            }}
          >
            <div className="border-b border-app-border bg-app-surface px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-panel">
              <nav className="grid gap-2" aria-label="Mobile public navigation">
                {navItems.map((item) => (
                  <PublicNavLink
                    key={item.path}
                    path={item.path}
                    label={item.label}
                    isMobile
                  />
                ))}
              </nav>
              <div
                className={`mt-4 grid gap-2 ${user ? "grid-cols-[auto_1fr]" : "grid-cols-[auto_1fr_1fr]"}`}
              >
                <ThemeToggle compact />
                {user ? (
                  <MarketingButton to={dashboardPath} className="px-4">
                    Open dashboard
                  </MarketingButton>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-app-border bg-app-surface px-4 text-sm font-black text-app-text shadow-sm"
                    >
                      Log in
                    </Link>
                    <MarketingButton to="/register" className="px-4">
                      Get Started
                    </MarketingButton>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {children}

      <PublicFooter />
    </div>
  );
}

function PublicNavLink({
  path,
  label,
  isMobile = false
}: {
  path: string;
  label: string;
  isMobile?: boolean;
}): JSX.Element {
  const location = useLocation();
  const isActive =
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <Link
      to={path}
      className={`rounded-md font-black transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 ${
        isMobile ? "min-h-11 px-3 py-3 text-sm" : "px-3 py-2 text-xs"
      } ${
        isActive
          ? "bg-app-primary-soft text-app-primary dark:text-indigo-100"
          : "text-app-text-muted hover:bg-app-surface-muted hover:text-app-text"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function PublicFooter(): JSX.Element {
  const { settings } = usePlatformSettings();
  const user = useAuthStore((state) => state.user);
  const footerGroups = [
    ...publicFooterGroups,
    {
      title: "Account",
      links: user
        ? [
            { label: "Open dashboard", path: getDefaultAuthenticatedRoute(user) },
            { label: "Account settings", path: "/account" }
          ]
        : [
            { label: "Login", path: "/login" },
            { label: "Register", path: "/register" }
          ]
    }
  ];

  return (
    <footer className="border-t border-app-border bg-[rgb(5,15,34)] text-white">
      <div className="mx-auto grid w-full max-w-[1320px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.25fr_2fr] lg:px-8 lg:py-16">
        <div>
          <BrandMark className="[&_span]:text-white [&_span_span:last-child]:text-slate-300" />
          <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-slate-300">
            {settings.platformDescription}
          </p>
          <Link
            to="/system-status"
            className="mt-5 inline-flex rounded-md text-sm font-black text-indigo-200 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300/40"
          >
            System status
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-black text-white">{group.title}</h2>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-sm font-medium text-slate-300 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300/40"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1320px] border-t border-white/10 px-4 py-5 text-center text-xs font-semibold text-slate-400 sm:px-6 lg:px-8">
        {settings.footerText}
      </div>
    </footer>
  );
}
