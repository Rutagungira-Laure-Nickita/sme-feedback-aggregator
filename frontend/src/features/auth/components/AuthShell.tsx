import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

type AuthShellProps = {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  footer,
  children
}: AuthShellProps): JSX.Element {
  return (
    <main className="min-h-screen bg-[#f7f8fb]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between gap-4">
          <Link
            to="/system-status"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            System status
          </Link>
        </nav>

        <section className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
            <div>
              <h1 className="text-2xl font-bold tracking-normal text-slate-950">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
            </div>

            <div className="mt-7">{children}</div>

            <div className="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-600">
              {footer}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
