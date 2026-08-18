import type { ReactNode } from "react";

type AuthCardProps = {
  children: ReactNode;
  className?: string;
};

export function AuthCard({ children, className = "" }: AuthCardProps): JSX.Element {
  return (
    <div
      className={`rounded-lg border border-app-border bg-app-surface p-5 shadow-panel sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
