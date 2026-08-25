import {
  BarChart3,
  Bot,
  CheckCircle2,
  Inbox,
  Link2,
  MessageSquareText,
  ShieldCheck,
  Users,
  Workflow
} from "lucide-react";
import { FeatureCard, SurfacePanel } from "../components/PublicCards.js";
import { PublicLayout } from "../components/PublicLayout.js";
import { PublicSeo } from "../components/PublicSeo.js";
import { CallToActionSection, ChannelStrip } from "../components/PublicShowcase.js";
import { SectionHeading } from "../components/SectionHeading.js";

const steps = [
  {
    number: "01",
    icon: Link2,
    title: "Open your collection points",
    description:
      "Use Gmail, WhatsApp, manual entry or a public form to capture feedback in context."
  },
  {
    number: "02",
    icon: Inbox,
    title: "Centralize every response",
    description:
      "The shared processing pipeline normalizes feedback into a branch-aware unified inbox."
  },
  {
    number: "03",
    icon: Bot,
    title: "Understand what matters",
    description:
      "Search and AI-assisted sentiment, summaries and categories help the team see signal quickly."
  },
  {
    number: "04",
    icon: Workflow,
    title: "Coordinate the response",
    description:
      "Set priority, assign ownership and update status with a clear activity history."
  },
  {
    number: "05",
    icon: BarChart3,
    title: "Measure and improve",
    description:
      "Track trends on the overview and export a scoped business performance report."
  }
];

export function HowItWorksPage(): JSX.Element {
  return (
    <PublicLayout>
      <PublicSeo
        title="How It Works | SME Feedback Aggregator"
        description="See how customer feedback moves from collection to understanding, accountable action and business reporting."
      />
      <main>
        <section className="bg-slate-950 text-white dark:bg-black">
          <div className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.75fr] lg:items-end lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
                How it works
              </p>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">
                A direct path from customer voice to business improvement
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-300">
                The platform connects collection, intelligence, workflow and reporting so
                teams spend less time reconstructing context.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              {[
                "One normalized feedback record",
                "One visible workflow history",
                "One business-scoped source of truth"
              ].map((item) => (
                <p
                  key={item}
                  className="flex gap-3 border-b border-white/10 py-3 text-sm font-bold last:border-0"
                >
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-emerald-300"
                    aria-hidden="true"
                  />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1160px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="space-y-5">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.number}
                  className={`grid gap-5 rounded-[1.5rem] border border-app-border p-5 shadow-sm sm:grid-cols-[auto_1fr] sm:items-center sm:p-7 ${index % 2 === 0 ? "bg-app-surface" : "bg-app-surface-muted/55"}`}
                >
                  <div className="flex items-center gap-4 sm:block sm:text-center">
                    <span className="text-xs font-black tracking-[0.18em] text-app-primary">
                      {step.number}
                    </span>
                    <span className="mt-0 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-app-primary-soft text-app-primary dark:text-indigo-100 sm:mt-3">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-app-text">{step.title}</h2>
                    <p className="mt-2 text-sm font-medium leading-7 text-app-text-muted">
                      {step.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-app-border bg-app-surface-muted/45">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Connected inputs"
              title="The same workflow, whichever channel starts it"
              description="Every approved source reaches the standard feedback-processing service before appearing in the inbox."
            />
            <div className="mt-9">
              <ChannelStrip />
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1320px] gap-6 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          <FeatureCard
            icon={MessageSquareText}
            title="Keep the customer context"
            description="Source, branch and customer details remain connected to the feedback."
            badge="Traceable"
          />
          <FeatureCard
            icon={Users}
            title="Keep ownership visible"
            description="Roles and branch access shape who can manage each part of the workspace."
            badge="Accountable"
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Keep boundaries enforced"
            description="Authenticated membership and business state checks protect tenant operations."
            badge="Secure"
          />
        </section>

        <section className="mx-auto w-full max-w-[1000px] px-4 pb-8 sm:px-6 lg:px-8">
          <SurfacePanel className="rounded-[1.5rem]">
            <h2 className="text-2xl font-black text-app-text">Common questions</h2>
            <div className="mt-5 space-y-3">
              {[
                [
                  "Can teams work across multiple branches?",
                  "Yes. Business Owners manage branch access and reporting can be scoped to a selected branch."
                ],
                [
                  "Does AI replace manual decisions?",
                  "No. AI assists interpretation; staff retain visible workflow controls and history."
                ],
                [
                  "Which Live integrations can Business Owners manage?",
                  "The streamlined Business Owner surface exposes inbound Gmail and WhatsApp connections."
                ]
              ].map(([question, answer]) => (
                <details
                  key={question}
                  className="rounded-xl border border-app-border bg-app-surface-muted/50 p-4"
                >
                  <summary className="cursor-pointer text-sm font-black text-app-text">
                    {question}
                  </summary>
                  <p className="mt-3 text-sm font-medium leading-6 text-app-text-muted">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </SurfacePanel>
        </section>

        <CallToActionSection
          title="Give every response a clear next step"
          description="Start a secure business workspace and bring customer insight into the daily operating rhythm."
        />
      </main>
    </PublicLayout>
  );
}
