import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { getDefaultAuthenticatedRoute } from "../../features/auth/authRedirects.js";
import { useAuthStore } from "../../store/authStore.js";

export function RouteErrorPage(): JSX.Element {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5 py-10">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-red-50 text-red-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-normal text-slate-950">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The application could not render this route.
        </p>
        <RouteLink />
      </section>
    </main>
  );
}

export function NotFoundPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5 py-10">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-normal text-slate-950">
          Page not found
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This route is not available in the current application.
        </p>
        <RouteLink />
      </section>
    </main>
  );
}

function RouteLink(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const target = user ? getDefaultAuthenticatedRoute(user) : "/login";
  const label = user
    ? user.role === "PLATFORM_ADMIN"
      ? "Go to admin"
      : user.role === "BUSINESS_OWNER" || user.role === "STAFF"
        ? "Go to workspace"
        : "Go to account"
    : "Go to login";

  return (
    <Link
      to={target}
      className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
