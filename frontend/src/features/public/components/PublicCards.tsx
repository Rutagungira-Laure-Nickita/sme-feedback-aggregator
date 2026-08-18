import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
};

export function FeatureCard({
  icon: Icon,
  title,
  description,
  badge
}: FeatureCardProps): JSX.Element {
  return (
    <article className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-app-primary/40 hover:shadow-panel dark:bg-app-surface-muted/45">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-app-primary-soft text-app-primary dark:text-indigo-100">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {badge ? (
          <span className="rounded-md border border-app-border bg-app-surface-muted px-2 py-1 text-[11px] font-black uppercase text-app-text-muted">
            {badge}
          </span>
        ) : null}
      </div>
      <h3 className="mt-5 text-base font-black text-app-text">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-app-text-muted">
        {description}
      </p>
    </article>
  );
}

type IconCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function IconCard({ icon: Icon, title, description }: IconCardProps): JSX.Element {
  return (
    <article className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm dark:bg-app-surface-muted/45">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-app-primary-soft text-app-primary dark:text-indigo-100">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-black text-app-text">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-app-text-muted">
        {description}
      </p>
    </article>
  );
}

type InfoListProps = {
  items: string[];
};

export function InfoList({ items }: InfoListProps): JSX.Element {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm font-semibold text-app-text-muted">
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-app-success"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

type SurfacePanelProps = {
  children: ReactNode;
  className?: string;
};

export function SurfacePanel({
  children,
  className = ""
}: SurfacePanelProps): JSX.Element {
  return (
    <section
      className={`rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm dark:bg-app-surface-muted/45 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
