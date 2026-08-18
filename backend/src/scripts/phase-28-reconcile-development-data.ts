import {
  BranchStatus,
  BusinessStatus,
  IntegrationMode,
  IntegrationProvider,
  type PrismaClient
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { DEFAULT_FEEDBACK_CATEGORIES } from "../modules/feedback-categories/default-feedback-categories.js";
import {
  DEMO_BUSINESS_ID,
  DEVELOPMENT_SEED_DEFAULT_CATEGORY_ID_BY_KEY,
  DEVELOPMENT_SEED_FEEDBACK_FIXTURES,
  DOWNTOWN_BRANCH_ID,
  INACTIVE_BRANCH_ID,
  PRIMARY_BRANCH_ID
} from "./development-seed.js";

const TABLES = [
  "business",
  "branch",
  "category",
  "customer",
  "feedback",
  "feedbackActivity",
  "aiAnalysis",
  "qrCode",
  "automationRule"
] as const;
type TableName = (typeof TABLES)[number];
type ChangeCounts = { created: number; updated: number; unchanged: number };

export type Phase28ReconciliationReport = {
  businessId: string;
  dryRun: boolean;
  mutations: Record<TableName, ChangeCounts>;
  protectedRows: {
    nonSeedFeedback: number;
    liveConnections: number;
    liveEmailConnections: number;
    liveWhatsAppConnections: number;
  };
  finalCounts: {
    branches: number;
    activeCategories: number;
    customers: number;
    feedback: number;
    qrCodes: number;
    automationRules: number;
    integrationConnections: number;
  };
};

const BUSINESS_DATA = {
  name: "Kigali Waffle Cuisine",
  industry: "Hospitality and Food Service",
  description:
    "A Kigali-based waffle and casual dining business serving handcrafted waffles, breakfast, brunch, and customer-focused dining experiences.",
  email: "hello@kigaliwaffle.test",
  phone: "+250 788 100 100",
  website: "https://kigaliwaffle.example",
  country: "Rwanda",
  city: "Kigali",
  district: "Gasabo",
  addressLine: "KG 11 Avenue, Remera",
  timezone: "Africa/Kigali",
  status: BusinessStatus.ACTIVE,
  publicFeedbackEnabled: true,
  publicFeedbackWelcomeMessage:
    "Thank you for visiting Kigali Waffle Cuisine. Share your experience so our team can serve you better."
} as const;

const BRANCH_FIXTURES = [
  {
    id: PRIMARY_BRANCH_ID,
    name: "Remera Primary Branch",
    code: "REMERA",
    addressLine: "KG 11 Avenue",
    city: "Kigali",
    district: "Gasabo",
    country: "Rwanda",
    phone: "+250 788 100 101",
    email: "remera@kigaliwaffle.test",
    isPrimary: true,
    status: BranchStatus.ACTIVE
  },
  {
    id: DOWNTOWN_BRANCH_ID,
    name: "Kiyovu Branch",
    code: "KIYOVU",
    addressLine: "KN 3 Road",
    city: "Kigali",
    district: "Nyarugenge",
    country: "Rwanda",
    phone: "+250 788 100 102",
    email: "kiyovu@kigaliwaffle.test",
    isPrimary: false,
    status: BranchStatus.ACTIVE
  },
  {
    id: INACTIVE_BRANCH_ID,
    name: "Kicukiro Catering Branch",
    code: "KICUKIRO",
    addressLine: "KK 15 Road",
    city: "Kigali",
    district: "Kicukiro",
    country: "Rwanda",
    phone: null,
    email: null,
    isPrimary: false,
    status: BranchStatus.INACTIVE
  }
] as const;

const CUSTOMER_FIXTURES = [
  {
    id: "dev_seed_customer_alice",
    displayName: "Alice Mutesi",
    firstName: "Alice",
    lastName: "Mutesi",
    email: "alice@customers.sme.test",
    normalizedEmail: "alice@customers.sme.test"
  },
  {
    id: "dev_seed_customer_archived",
    displayName: "Former Catering Customer",
    firstName: "Former",
    lastName: "Customer",
    email: "archived@customers.sme.test",
    normalizedEmail: "archived@customers.sme.test"
  }
] as const;

const QR_FIXTURES = [
  ["dev_seed_qr_business_wide", "All Locations Feedback QR"],
  ["dev_seed_qr_downtown", "Kiyovu Counter QR"],
  ["dev_seed_qr_inactive", "Remera Table Cards (Inactive)"]
] as const;

const AUTOMATION_FIXTURES = [
  [
    "dev_seed_automation_low_rating",
    "Urgent triage for low ratings",
    "Mark ratings of two or lower as urgent and assign them to the support team."
  ],
  [
    "dev_seed_automation_ai_followup",
    "Draft AI negative sentiment review",
    "Review negative customer sentiment from the Kiyovu branch."
  ]
] as const;

function emptyMutationCounts(): Record<TableName, ChangeCounts> {
  return Object.fromEntries(
    TABLES.map((table) => [table, { created: 0, updated: 0, unchanged: 0 }])
  ) as Record<TableName, ChangeCounts>;
}

function differs(record: object, desired: object): boolean {
  const current = record as Record<string, unknown>;
  return Object.entries(desired).some(([key, value]) => current[key] !== value);
}

function assertSeedId(id: string): void {
  if (!id.startsWith("dev_seed_")) {
    throw new Error(`Refusing to mutate non-seed ID: ${id}`);
  }
}

export async function reconcilePhase28DevelopmentData(
  client: PrismaClient,
  options: { dryRun?: boolean } = {}
): Promise<Phase28ReconciliationReport> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Phase 28 development reconciliation cannot run in production.");
  }

  const dryRun = options.dryRun ?? true;
  const mutations = emptyMutationCounts();
  assertSeedId(DEMO_BUSINESS_ID);

  const protectedCountValues = await Promise.all([
    client.feedback.count({
      where: { businessId: DEMO_BUSINESS_ID, NOT: { id: { startsWith: "dev_seed_" } } }
    }),
    client.integrationConnection.count({
      where: { businessId: DEMO_BUSINESS_ID, mode: IntegrationMode.LIVE }
    }),
    client.integrationConnection.count({
      where: {
        businessId: DEMO_BUSINESS_ID,
        mode: IntegrationMode.LIVE,
        provider: IntegrationProvider.EMAIL
      }
    }),
    client.integrationConnection.count({
      where: {
        businessId: DEMO_BUSINESS_ID,
        mode: IntegrationMode.LIVE,
        provider: IntegrationProvider.WHATSAPP
      }
    })
  ]);

  await client.$transaction(async (tx) => {
    const business = await tx.business.findUnique({ where: { id: DEMO_BUSINESS_ID } });
    if (!business)
      throw new Error(`Canonical seed business ${DEMO_BUSINESS_ID} was not found.`);
    if (differs(business, BUSINESS_DATA)) {
      mutations.business.updated += 1;
      if (!dryRun)
        await tx.business.update({
          where: { id: DEMO_BUSINESS_ID },
          data: BUSINESS_DATA
        });
    } else mutations.business.unchanged += 1;

    for (const fixture of BRANCH_FIXTURES) {
      assertSeedId(fixture.id);
      const branch = await tx.branch.findUnique({ where: { id: fixture.id } });
      if (!branch || branch.businessId !== DEMO_BUSINESS_ID) {
        throw new Error(`Seed branch ownership mismatch: ${fixture.id}`);
      }
      const { id, ...data } = fixture;
      if (differs(branch, data)) {
        mutations.branch.updated += 1;
        if (!dryRun) await tx.branch.update({ where: { id }, data });
      } else mutations.branch.unchanged += 1;
    }

    for (const category of DEFAULT_FEEDBACK_CATEGORIES) {
      const id = DEVELOPMENT_SEED_DEFAULT_CATEGORY_ID_BY_KEY[category.key];
      assertSeedId(id);
      const existing = await tx.feedbackCategory.findUnique({ where: { id } });
      const data = {
        businessId: DEMO_BUSINESS_ID,
        name: category.name,
        description: category.description,
        colorKey: category.colorKey,
        isActive: true
      };
      if (!existing) {
        const nameOwner = await tx.feedbackCategory.findUnique({
          where: {
            businessId_name: { businessId: DEMO_BUSINESS_ID, name: category.name }
          }
        });
        if (nameOwner) {
          throw new Error(
            `Category name ${category.name} is already owned by ${nameOwner.id}.`
          );
        }
        mutations.category.created += 1;
        if (!dryRun) await tx.feedbackCategory.create({ data: { id, ...data } });
      } else {
        if (existing.businessId !== DEMO_BUSINESS_ID) {
          throw new Error(`Seed category ownership mismatch: ${id}`);
        }
        if (differs(existing, data)) {
          mutations.category.updated += 1;
          if (!dryRun) await tx.feedbackCategory.update({ where: { id }, data });
        } else mutations.category.unchanged += 1;
      }
    }

    for (const fixture of CUSTOMER_FIXTURES) {
      assertSeedId(fixture.id);
      const customer = await tx.customer.findUnique({ where: { id: fixture.id } });
      if (!customer || customer.businessId !== DEMO_BUSINESS_ID) {
        throw new Error(`Seed customer ownership mismatch: ${fixture.id}`);
      }
      const { id, ...data } = fixture;
      if (differs(customer, data)) {
        mutations.customer.updated += 1;
        if (!dryRun) await tx.customer.update({ where: { id }, data });
      } else mutations.customer.unchanged += 1;
    }

    for (const fixture of DEVELOPMENT_SEED_FEEDBACK_FIXTURES.filter(
      (item) => item.businessId === DEMO_BUSINESS_ID
    )) {
      assertSeedId(fixture.id);
      const feedback = await tx.feedback.findUnique({ where: { id: fixture.id } });
      if (!feedback || feedback.businessId !== DEMO_BUSINESS_ID) {
        throw new Error(`Seed feedback ownership mismatch: ${fixture.id}`);
      }
      const data = {
        categoryId: fixture.categoryId,
        title: fixture.title,
        message: fixture.message,
        customerName: fixture.customerName,
        customerEmail: fixture.customerEmail,
        sourceUrl: fixture.sourceUrl
      };
      if (differs(feedback, data)) {
        mutations.feedback.updated += 1;
        if (!dryRun) await tx.feedback.update({ where: { id: fixture.id }, data });
      } else mutations.feedback.unchanged += 1;

      if (fixture.categoryId && fixture.id !== "dev_seed_feedback_instagram") {
        const activityId = `${fixture.id}_category`;
        assertSeedId(activityId);
        const activity = await tx.feedbackActivity.findUnique({
          where: { id: activityId }
        });
        if (!activity || activity.businessId !== DEMO_BUSINESS_ID) {
          throw new Error(`Seed category activity ownership mismatch: ${activityId}`);
        }
        if (activity.toValue !== fixture.categoryLabel) {
          mutations.feedbackActivity.updated += 1;
          if (!dryRun) {
            await tx.feedbackActivity.update({
              where: { id: activityId },
              data: { toValue: fixture.categoryLabel }
            });
          }
        } else mutations.feedbackActivity.unchanged += 1;
      }
    }

    for (const feedbackId of [
      "dev_seed_feedback_public_complaint",
      "dev_seed_feedback_whatsapp",
      "dev_seed_feedback_email"
    ]) {
      const id = `${feedbackId}_note`;
      const note = "Follow-up is in progress; no external message has been sent yet.";
      const activity = await tx.feedbackActivity.findUnique({ where: { id } });
      if (!activity || activity.businessId !== DEMO_BUSINESS_ID) {
        throw new Error(`Seed note activity ownership mismatch: ${id}`);
      }
      if (activity.note !== note) {
        mutations.feedbackActivity.updated += 1;
        if (!dryRun) await tx.feedbackActivity.update({ where: { id }, data: { note } });
      } else mutations.feedbackActivity.unchanged += 1;
    }

    for (const [id, errorMessage] of [
      ["dev_seed_ai_email_failed", "The analysis provider was temporarily unavailable."],
      ["dev_seed_ai_other_skipped", "AI analysis is disabled for this Business."]
    ] as const) {
      const analysis = await tx.feedbackAIAnalysis.findUnique({ where: { id } });
      if (!analysis || analysis.businessId !== DEMO_BUSINESS_ID) {
        throw new Error(`Seed AI analysis ownership mismatch: ${id}`);
      }
      if (analysis.errorMessage !== errorMessage) {
        mutations.aiAnalysis.updated += 1;
        if (!dryRun) {
          await tx.feedbackAIAnalysis.update({ where: { id }, data: { errorMessage } });
        }
      } else mutations.aiAnalysis.unchanged += 1;
    }

    for (const [id, name] of QR_FIXTURES) {
      assertSeedId(id);
      const qrCode = await tx.publicFeedbackQrCode.findUnique({ where: { id } });
      if (!qrCode || qrCode.businessId !== DEMO_BUSINESS_ID) {
        throw new Error(`Seed QR ownership mismatch: ${id}`);
      }
      if (qrCode.name !== name) {
        mutations.qrCode.updated += 1;
        if (!dryRun)
          await tx.publicFeedbackQrCode.update({ where: { id }, data: { name } });
      } else mutations.qrCode.unchanged += 1;
    }

    for (const [id, name, description] of AUTOMATION_FIXTURES) {
      assertSeedId(id);
      const rule = await tx.automationRule.findUnique({ where: { id } });
      if (!rule || rule.businessId !== DEMO_BUSINESS_ID) {
        throw new Error(`Seed automation ownership mismatch: ${id}`);
      }
      const data = { name, description };
      if (differs(rule, data)) {
        mutations.automationRule.updated += 1;
        if (!dryRun) await tx.automationRule.update({ where: { id }, data });
      } else mutations.automationRule.unchanged += 1;
    }
  });

  const finalCountValues = await Promise.all([
    client.branch.count({ where: { businessId: DEMO_BUSINESS_ID } }),
    client.feedbackCategory.count({
      where: { businessId: DEMO_BUSINESS_ID, isActive: true }
    }),
    client.customer.count({ where: { businessId: DEMO_BUSINESS_ID } }),
    client.feedback.count({ where: { businessId: DEMO_BUSINESS_ID } }),
    client.publicFeedbackQrCode.count({ where: { businessId: DEMO_BUSINESS_ID } }),
    client.automationRule.count({ where: { businessId: DEMO_BUSINESS_ID } }),
    client.integrationConnection.count({ where: { businessId: DEMO_BUSINESS_ID } })
  ]);

  return {
    businessId: DEMO_BUSINESS_ID,
    dryRun,
    mutations,
    protectedRows: {
      nonSeedFeedback: protectedCountValues[0],
      liveConnections: protectedCountValues[1],
      liveEmailConnections: protectedCountValues[2],
      liveWhatsAppConnections: protectedCountValues[3]
    },
    finalCounts: {
      branches: finalCountValues[0],
      activeCategories: finalCountValues[1],
      customers: finalCountValues[2],
      feedback: finalCountValues[3],
      qrCodes: finalCountValues[4],
      automationRules: finalCountValues[5],
      integrationConnections: finalCountValues[6]
    }
  };
}

async function main(): Promise<void> {
  const report = await reconcilePhase28DevelopmentData(prisma, {
    dryRun: !process.argv.includes("--commit")
  });
  console.log(JSON.stringify(report, null, 2));
}

if (
  process.argv[1]
    ?.replaceAll("\\", "/")
    .endsWith("/phase-28-reconcile-development-data.ts")
) {
  main()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
