import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type StatusBadgeProps = {
  status: "loading" | "success" | "failure";
};

const statusConfig = {
  loading: {
    label: "Checking",
    className: "border-sky-200 bg-sky-50 text-sky-800",
    icon: Loader2
  },
  success: {
    label: "Healthy",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2
  },
  failure: {
    label: "Needs attention",
    className: "border-red-200 bg-red-50 text-red-800",
    icon: AlertTriangle
  }
};

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium ${config.className}`}
    >
      <Icon
        className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
