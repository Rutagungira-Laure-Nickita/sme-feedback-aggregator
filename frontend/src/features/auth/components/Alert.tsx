import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type AlertVariant = "error" | "success" | "warning" | "info";

type AlertProps = {
  children: ReactNode;
  variant: AlertVariant;
};

const variantStyles: Record<AlertVariant, string> = {
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100",
  info: "border-app-primary/25 bg-app-primary-soft text-app-text"
};

const icons: Record<AlertVariant, JSX.Element> = {
  error: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
  success: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
  warning: <TriangleAlert className="h-4 w-4" aria-hidden="true" />,
  info: <Info className="h-4 w-4" aria-hidden="true" />
};

export function Alert({ children, variant }: AlertProps): JSX.Element {
  const role = variant === "error" ? "alert" : "status";

  return (
    <div
      role={role}
      className={`flex items-start gap-2 rounded-md border px-3 py-3 text-sm font-medium leading-5 ${variantStyles[variant]}`}
    >
      <span className="mt-0.5 shrink-0">{icons[variant]}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
