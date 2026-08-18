import type { LucideIcon } from "lucide-react";
import { normalizeApiError } from "../../../api/axios.js";
import { StatusBadge } from "./StatusBadge.js";

type HealthCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  isLoading: boolean;
  isSuccess: boolean;
  error: unknown;
  details: Array<{
    label: string;
    value: string;
  }>;
};

export function HealthCard({
  title,
  description,
  icon: Icon,
  isLoading,
  isSuccess,
  error,
  details
}: HealthCardProps): JSX.Element {
  const status = isLoading ? "loading" : isSuccess ? "success" : "failure";
  const normalizedError = error ? normalizeApiError(error) : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Waiting for the health endpoint...</p>
      ) : null}

      {isSuccess ? (
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="rounded-md bg-slate-50 px-3 py-3">
              <dt className="text-xs font-medium uppercase tracking-normal text-slate-500">
                {detail.label}
              </dt>
              <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {normalizedError ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
          <p className="font-semibold">{normalizedError.message}</p>
          <p className="mt-1 text-red-800">Code: {normalizedError.code}</p>
        </div>
      ) : null}
    </section>
  );
}
