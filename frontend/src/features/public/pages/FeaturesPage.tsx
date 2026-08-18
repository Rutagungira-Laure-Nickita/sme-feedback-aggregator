import {
  BarChart3,
  Bot,
  FileDown,
  Inbox,
  MessageCircle,
  QrCode,
  Search,
  Tags,
  UserRound,
  Users,
  Workflow,
  Zap
} from "lucide-react";
import { FeatureCard, IconCard, SurfacePanel } from "../components/PublicCards.js";
import { PublicLayout } from "../components/PublicLayout.js";
import { PublicSeo } from "../components/PublicSeo.js";
import {
  CallToActionSection,
  ChannelStrip,
  ProductWorkspacePreview
} from "../components/PublicShowcase.js";
import { SectionHeading } from "../components/SectionHeading.js";

const featureItems = [
  {
    icon: Inbox,
    title: "Unified feedback inbox",
    description: "One searchable, filterable queue for every customer response."
  },
  {
    icon: Bot,
    title: "AI analysis",
    description:
      "Sentiment, summaries and suggested categories with visible readiness controls."
  },
  {
    icon: Tags,
    title: "Priorities and categories",
    description: "Organize issues consistently and surface what needs attention first."
  },
  {
    icon: Workflow,
    title: "Workflow ownership",
    description: "Assign feedback, update status and retain a clear activity history."
  },
  {
    icon: Zap,
    title: "Automation rules",
    description: "Build readable When, If and Then rules and inspect execution outcomes."
  },
  {
    icon: UserRound,
    title: "Customer profiles",
    description: "Connect feedback history, contact context and relationship activity."
  },
  {
    icon: Search,
    title: "Full search and filters",
    description: "Narrow the inbox by customer, branch, source, workflow state and more."
  },
  {
    icon: BarChart3,
    title: "Business overview",
    description:
      "Use real 30-day trends, sentiment and channel information to guide action."
  },
  {
    icon: FileDown,
    title: "PDF and CSV reporting",
    description: "Preview and export a complete Business Performance report."
  },
  {
    icon: QrCode,
    title: "QR collection",
    description: "Create professional branch-aware QR codes for customer touchpoints."
  },
  {
    icon: MessageCircle,
    title: "Live customer channels",
    description: "Connect approved Gmail and WhatsApp inbound feedback sources."
  },
  {
    icon: Users,
    title: "Branch and staff management",
    description:
      "Manage roles, branch access and invitations inside the tenant workspace."
  }
];

export function FeaturesPage(): JSX.Element {
  return (
    <PublicLayout>
      <PublicSeo
        title="Features | SME Feedback Aggregator"
        description="Explore feedback collection, AI-assisted triage, workflows, customer profiles, reporting and secure business administration."
      />
      <main>
        <section className="border-b border-app-border bg-[radial-gradient(circle_at_top,rgb(var(--color-primary-soft)/0.9),transparent_55%)]">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
            <p className="inline-flex rounded-full bg-app-primary-soft px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-app-primary dark:text-indigo-100">
              Product capabilities
            </p>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight text-app-text sm:text-5xl">
              Everything your team needs to turn feedback into accountable action
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-8 text-app-text-muted">
              From the first customer response to a management-ready report, the workspace
              keeps insight, ownership and context together.
            </p>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1320px] gap-5 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {featureItems.map((feature) => (
            <FeatureCard key={feature.title} badge="Available" {...feature} />
          ))}
        </section>

        <section className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8">
          <SurfacePanel className="rounded-[1.5rem] bg-slate-950 text-white dark:bg-black">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-300">
              AI that supports the team
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight">
              Understand the signal without losing the original customer voice.
            </h2>
            <p className="mt-4 text-sm font-medium leading-7 text-slate-300">
              AI analysis stays attached to the feedback record, with clear sentiment,
              category and summary information. Human workflow controls remain visible and
              authoritative.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <IconCard
                icon={Bot}
                title="Faster triage"
                description="Give teams an immediate, structured starting point."
              />
              <IconCard
                icon={Workflow}
                title="Human follow-through"
                description="Turn insight into assignment, status and activity."
              />
            </div>
          </SurfacePanel>
          <ProductWorkspacePreview />
        </section>

        <section className="mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Channels"
            title="Collect feedback in the moments that matter"
            description="Use direct collection and approved Live integrations without crowding the Business Owner experience with internal connector modes."
          />
          <div className="mt-9">
            <ChannelStrip />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1320px] px-4 pb-10 sm:px-6 lg:px-8">
          <SurfacePanel className="rounded-[1.5rem]">
            <div className="grid gap-7 lg:grid-cols-3">
              {[
                [
                  "01",
                  "Collect",
                  "Public portals, QR codes, manual entry and approved Live channels feed one processing pipeline."
                ],
                [
                  "02",
                  "Understand",
                  "Search, customer history and AI-assisted analysis reveal patterns and urgency."
                ],
                [
                  "03",
                  "Act and learn",
                  "Workflow, automation, dashboards and reports keep improvement measurable."
                ]
              ].map(([number, title, text]) => (
                <div key={number} className="rounded-2xl bg-app-surface-muted p-5">
                  <span className="text-xs font-black text-app-primary">{number}</span>
                  <h3 className="mt-3 text-lg font-black text-app-text">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-app-text-muted">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </section>

        <CallToActionSection
          title="Build a clearer customer feedback operation"
          description="Bring collection, intelligence, teamwork and reporting into one business workspace."
        />
      </main>
    </PublicLayout>
  );
}
