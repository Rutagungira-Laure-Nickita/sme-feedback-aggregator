import {
  Heart,
  Layers3,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import { FeatureCard, IconCard, SurfacePanel } from "../components/PublicCards.js";
import { MarketingButton } from "../components/MarketingButton.js";
import { PublicLayout } from "../components/PublicLayout.js";
import { PublicSeo } from "../components/PublicSeo.js";
import { CallToActionSection } from "../components/PublicShowcase.js";
import { SectionHeading } from "../components/SectionHeading.js";

export function AboutPage(): JSX.Element {
  return (
    <PublicLayout>
      <PublicSeo
        title="About | SME Feedback Aggregator"
        description="Learn why SME Feedback Aggregator brings customer feedback, teamwork and business insight into one practical workspace."
      />
      <main>
        <section className="relative overflow-hidden border-b border-app-border">
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="mx-auto grid w-full max-w-[1320px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-20">
            <div className="relative">
              <p className="inline-flex rounded-full bg-app-primary-soft px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-app-primary dark:text-indigo-100">
                Why we build
              </p>
              <h1 className="mt-6 text-4xl font-black leading-tight text-app-text sm:text-5xl">
                Growing businesses deserve a clear view of every customer voice.
              </h1>
              <p className="mt-5 text-base font-medium leading-8 text-app-text-muted">
                Feedback often arrives in fragments: a form response, a message, a
                conversation at a branch. SME Feedback Aggregator is designed to reconnect
                those fragments with the customer, team and decision they belong to.
              </p>
              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                <MarketingButton to="/register">Get Started</MarketingButton>
                <MarketingButton to="/how-it-works" variant="secondary">
                  See how it works
                </MarketingButton>
              </div>
            </div>
            <div className="relative grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: MessageSquareText,
                  title: "Listen",
                  text: "Capture feedback at the moments customers choose to share it.",
                  color: "bg-indigo-600"
                },
                {
                  icon: Sparkles,
                  title: "Understand",
                  text: "Surface sentiment, themes and urgency without losing context.",
                  color: "bg-violet-600"
                },
                {
                  icon: Users,
                  title: "Act",
                  text: "Give the right team clear ownership and visible history.",
                  color: "bg-sky-600"
                },
                {
                  icon: Target,
                  title: "Improve",
                  text: "Turn operational signals into better customer decisions.",
                  color: "bg-emerald-600"
                }
              ].map(({ icon: Icon, title, text, color }) => (
                <div
                  key={title}
                  className="rounded-[1.5rem] border border-app-border bg-app-surface p-5 shadow-sm"
                >
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${color} text-white`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-lg font-black text-app-text">{title}</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-app-text-muted">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-app-primary">
              Our point of view
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-app-text">
              Customer intelligence works best when it is part of the operation.
            </h2>
            <p className="mt-4 text-sm font-medium leading-7 text-app-text-muted">
              A dashboard alone does not improve an experience. Teams need reliable
              collection, understandable context, ownership and a way to measure what
              changed. The product brings those pieces together while keeping business and
              branch boundaries explicit.
            </p>
          </div>
          <SurfacePanel className="rounded-[1.5rem]">
            <div className="space-y-4">
              {[
                "Preserve the original customer voice",
                "Make the next action unmistakable",
                "Show business leaders the evidence behind a trend",
                "Protect tenant data and provider credentials"
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-4 rounded-xl bg-app-surface-muted p-4"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app-primary text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-bold text-app-text">{item}</p>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </section>

        <section className="bg-app-surface-muted/45 py-16">
          <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Principles"
              title="Practical, accountable and trustworthy by design"
            />
            <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={Heart}
                title="Customer-centered"
                description="Keep the experience behind the metric visible."
              />
              <FeatureCard
                icon={Layers3}
                title="Operationally complete"
                description="Connect insight to workflow and reporting."
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Secure boundaries"
                description="Respect roles, branches and tenant ownership."
              />
              <FeatureCard
                icon={Sparkles}
                title="Calmly intelligent"
                description="Use AI to clarify rather than overwhelm."
              />
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1320px] gap-5 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          <IconCard
            icon={Users}
            title="For business leaders"
            description="See performance and customer experience without platform-level noise."
          />
          <IconCard
            icon={Target}
            title="For customer-facing teams"
            description="Know which feedback needs action and who owns the next step."
          />
          <IconCard
            icon={ShieldCheck}
            title="For responsible operations"
            description="Use scoped access, auditability and safe integration handling."
          />
        </section>

        <CallToActionSection
          title="Build a business that listens with purpose"
          description="Create a workspace where customer feedback becomes shared understanding and accountable improvement."
        />
      </main>
    </PublicLayout>
  );
}
