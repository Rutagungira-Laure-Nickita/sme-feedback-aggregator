import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type MarketingButtonProps = {
  children: ReactNode;
  to: string;
  variant?: "primary" | "secondary" | "subtle";
  className?: string;
  showArrow?: boolean;
};

export function MarketingButton({
  children,
  to,
  variant = "primary",
  className = "",
  showArrow = false
}: MarketingButtonProps): JSX.Element {
  const styles = {
    primary:
      "bg-app-primary text-app-primary-foreground shadow-lg shadow-app-primary/20 hover:bg-app-primary-hover",
    secondary:
      "border border-app-border bg-app-surface text-app-text shadow-sm hover:border-app-primary/50 hover:bg-app-surface-muted",
    subtle:
      "bg-app-primary-soft text-app-primary hover:bg-app-primary/15 dark:text-app-text dark:hover:bg-app-primary-soft/80"
  };

  return (
    <Link
      to={to}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 ${styles[variant]} ${className}`}
    >
      {children}
      {showArrow ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
    </Link>
  );
}
