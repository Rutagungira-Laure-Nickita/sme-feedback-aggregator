import type { LucideIcon } from "lucide-react";
import { ChevronRight, HelpCircle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketingButton } from "./MarketingButton.js";
import { PublicLayout } from "./PublicLayout.js";

export type LegalSectionItem = {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  content: string[];
};

type LegalPageLayoutProps = {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSectionItem[];
  contactTitle: string;
  contactDescription: string;
};

export function LegalPageLayout({
  title,
  updatedAt,
  intro,
  sections,
  contactTitle,
  contactDescription
}: LegalPageLayoutProps): JSX.Element {
  return (
    <PublicLayout>
      <main className="bg-[radial-gradient(circle_at_top_left,rgb(var(--color-primary-soft)/0.65),transparent_30%)]">
        <section className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8 lg:py-16">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm dark:bg-app-surface-muted/45">
              <h2 className="text-sm font-black text-app-text">On this page</h2>
              <nav className="mt-3 space-y-1" aria-label={`${title} sections`}>
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-md px-3 py-2 text-xs font-black text-app-text-muted transition hover:bg-app-primary-soft hover:text-app-primary focus:outline-none focus:ring-2 focus:ring-app-focus/30 dark:hover:text-indigo-100"
                  >
                    {index + 1}. {section.title}
                  </a>
                ))}
              </nav>
              <div className="mt-8 border-t border-app-border pt-5">
                <ShieldCheck className="h-6 w-6 text-app-primary" aria-hidden="true" />
                <p className="mt-3 text-sm font-black text-app-text">Careful by design</p>
                <p className="mt-2 text-xs font-medium leading-5 text-app-text-muted">
                  These pages reflect the current product architecture and need legal
                  review before production launch.
                </p>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <p className="inline-flex rounded-full bg-app-primary-soft px-3 py-1 text-xs font-black text-app-primary dark:text-indigo-100">
              Legal
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-app-text sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 text-sm font-black text-app-text-muted">
              Last updated: {updatedAt}
            </p>

            <details className="mt-8 rounded-lg border border-app-border bg-app-surface p-4 shadow-sm dark:bg-app-surface-muted/45 lg:hidden">
              <summary className="cursor-pointer text-sm font-black text-app-text">
                On this page
              </summary>
              <nav className="mt-4 grid gap-2" aria-label={`${title} mobile sections`}>
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="rounded-md bg-app-surface-muted px-3 py-2 text-sm font-black text-app-text-muted"
                  >
                    {index + 1}. {section.title}
                  </a>
                ))}
              </nav>
            </details>

            <div className="mt-8 rounded-2xl border border-app-primary/15 bg-app-surface p-5 shadow-sm dark:bg-app-surface-muted/45 sm:p-6">
              <div className="flex gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary dark:text-indigo-100">
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-app-primary dark:text-indigo-100">
                    Clear, responsible, transparent
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-app-text-muted">
                    {intro}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {sections.map((section, index) => (
                <LegalSection key={section.id} section={section} index={index} />
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm dark:bg-app-surface-muted/45 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div className="flex gap-4">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary dark:text-indigo-100">
                  <HelpCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-black text-app-text">{contactTitle}</h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-app-text-muted">
                    {contactDescription}
                  </p>
                </div>
              </div>
              <MarketingButton to="/contact" className="mt-5 w-full sm:mt-0 sm:w-auto">
                Contact Us
              </MarketingButton>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}

function LegalSection({
  section,
  index
}: {
  section: LegalSectionItem;
  index: number;
}): JSX.Element {
  const Icon = section.icon;

  return (
    <section
      id={section.id}
      className="scroll-mt-24 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm dark:bg-app-surface-muted/45 sm:p-7"
    >
      <div className="flex gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary dark:text-indigo-100">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-app-text">
            {index + 1}. {section.title}
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-app-text-muted">
            {section.summary}
          </p>
        </div>
        <ChevronRight
          className="mt-2 hidden h-5 w-5 shrink-0 text-app-text-muted sm:block"
          aria-hidden="true"
        />
      </div>
      <div className="mt-4 space-y-3 border-t border-app-border pt-4">
        {section.content.map((paragraph) => (
          <p
            key={paragraph}
            className="text-sm font-medium leading-7 text-app-text-muted"
          >
            {paragraph}
          </p>
        ))}
      </div>
      <Link
        to="/contact"
        className="sr-only focus:not-sr-only focus:mt-4 focus:inline-flex focus:rounded-md focus:bg-app-primary focus:px-4 focus:py-2 focus:text-sm focus:font-black focus:text-white"
      >
        Contact us about {section.title}
      </Link>
    </section>
  );
}
