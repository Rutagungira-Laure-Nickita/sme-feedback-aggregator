import {
  BarChart3,
  Bot,
  CheckCircle2,
  Inbox,
  MessageSquareText,
  ShieldCheck,
  Users,
  Workflow
} from "lucide-react";
import { FeatureCard, IconCard, SurfacePanel } from "../components/PublicCards.js";
import { PublicLayout } from "../components/PublicLayout.js";
import { PublicSeo } from "../components/PublicSeo.js";
import {
  CallToActionSection,
  ChannelStrip,
  ProductWorkspacePreview,
  TrustStrip
} from "../components/PublicShowcase.js";
import { MarketingButton } from "../components/MarketingButton.js";
import { SectionHeading } from "../components/SectionHeading.js";
import { usePlatformSettings } from "../../platform-settings/PlatformSettingsContext.js";

const capabilities = [
  {
    icon: Inbox,
    title: "One unified inbox",
    description:
      "Search, filter, prioritize and manage feedback from one branch-aware workspace."
  },
  {
    icon: Bot,
    title: "AI-assisted understanding",
    description:
      "Turn raw feedback into sentiment, categories and concise summaries teams can use."
  },
  {
    icon: Workflow,
    title: "Actionable workflows",
    description:
      "Assign owners, set priorities and automate repeatable responses to customer signals."
  }
];

export function HomePage(): JSX.Element {
  const { settings } = usePlatformSettings();

  return (
    <PublicLayout>
      <PublicSeo
        title="SME Feedback Aggregator | Turn customer feedback into action"
        description="Collect, understand, and act on customer feedback through one secure business workspace."
      />
      <main className="overflow-hidden">
        <section className="relative border-b border-app-border bg-[radial-gradient(circle_at_10%_10%,rgb(var(--color-primary-soft)/0.8),transparent_34%),radial-gradient(circle_at_90%_20%,rgba(14,165,233,0.12),transparent_30%)]">
          <div className="mx-auto grid w-full max-w-[1320px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(430px,1.1fr)] lg:items-center lg:px-8 lg:py-20">
            <div>
              <p className="inline-flex rounded-full border border-app-primary/20 bg-app-primary-soft px-3 py-1.5 text-xs font-black text-app-primary dark:text-indigo-100">
                Customer intelligence for growing businesses
              </p>
              <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-app-text sm:text-5xl lg:text-6xl">
                {settings.headline}
              </h1>
              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-app-text-muted sm:text-lg">
                {settings.heroSupportingText}
              </p>
              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                <MarketingButton to="/register">
                  {settings.primaryCtaLabel}
                </MarketingButton>
                <MarketingButton to="/how-it-works" variant="secondary">
                  {settings.secondaryCtaLabel}
                </MarketingButton>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-app-text-muted">
                {[
                  "No payment details required",
                  "Light and dark themes",
                  "Built for multi-location teams"
                ].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <CheckCircle2
                      className="h-4 w-4 text-app-success"
                      aria-hidden="true"
                    />
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <ProductWorkspacePreview />
          </div>
        </section>

        <section className="border-b border-app-border bg-app-surface-muted/45 px-4 py-7 sm:px-6 lg:px-8">
          <TrustStrip />
        </section>

        <section className="mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeading
            eyebrow="From signal to action"
            title="A complete feedback workflow, without the clutter"
            description="Bring customer voices together, understand what matters, and give every issue a clear next step."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {capabilities.map((item) => (
              <FeatureCard key={item.title} badge="Available" {...item} />
            ))}
          </div>
        </section>

        <section className="bg-slate-950 py-16 text-white dark:bg-black lg:py-20">
          <div className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
                Built around real operations
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                Every customer voice reaches the team that can act.
              </h2>
              <p className="mt-5 text-sm font-medium leading-7 text-slate-300">
                Business owners get a clear cross-channel picture while branches and staff
                retain the context they need. Customer profiles, workflow history,
                automation and reports stay connected to the original feedback.
              </p>
              <div className="mt-7">
                <MarketingButton
                  to="/features"
                  variant="secondary"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/15"
                >
                  Explore the product
                </MarketingButton>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Users,
                  title: "Business and branch context",
                  text: "Keep access and reporting scoped to the right organization."
                },
                {
                  icon: MessageSquareText,
                  title: "Customer history",
                  text: "See the relationship behind each individual response."
                },
                {
                  icon: BarChart3,
                  title: "Management reporting",
                  text: "Preview and export business performance insights."
                },
                {
                  icon: ShieldCheck,
                  title: "Secure by design",
                  text: "Role checks and tenant boundaries protect workspace data."
                }
              ].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"
                >
                  <Icon className="h-5 w-5 text-indigo-300" aria-hidden="true" />
                  <h3 className="mt-5 text-base font-black">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeading
            eyebrow="Collection"
            title="Meet customers where they already are"
            description="Capture feedback directly or connect the customer channels approved for the Business Owner workspace."
          />
          <div className="mt-9">
            <ChannelStrip />
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1320px] gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <SurfacePanel className="rounded-[1.5rem] bg-gradient-to-br from-app-primary-soft to-app-surface dark:from-indigo-950/50">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-app-primary">
              Clarity for decision makers
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight text-app-text">
              Real business performance, customer experience and workflow health in one
              report.
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-app-text-muted">
              Filter by period or branch, compare performance with the previous period,
              and export a management-ready PDF or CSV.
            </p>
          </SurfacePanel>
          <div className="grid gap-4">
            <IconCard
              icon={BarChart3}
              title="Business-wide trends"
              description="Understand feedback volume, sentiment and channels over time."
            />
            <IconCard
              icon={Workflow}
              title="Operational follow-through"
              description="Review workflow, response and integration health without exposing platform-only data."
            />
          </div>
        </section>

        <CallToActionSection
          title="Make customer feedback easier to act on"
          description="Create your workspace and give every customer voice a clear path from collection to resolution."
        />
      </main>
    </PublicLayout>
  );
}
