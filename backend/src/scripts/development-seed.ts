import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  AccountStatus,
  AutomationActionExecutionStatus,
  AutomationActionType,
  AutomationConditionOperator,
  AutomationConditionType,
  AutomationEventStatus,
  AutomationExecutionStatus,
  AutomationRuleBranchScope,
  AutomationRuleMatchMode,
  AutomationRuleStatus,
  AutomationRuleTrigger,
  BranchStatus,
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus,
  CustomerActivityType,
  CustomerStatus,
  FeedbackActivityActorType,
  FeedbackActivityType,
  FeedbackAIAnalysisStatus,
  FeedbackAISentiment,
  FeedbackChannel,
  FeedbackFieldStateField,
  FeedbackFieldStateSource,
  FeedbackIngestionStatus,
  FeedbackPriority,
  FeedbackStatus,
  IntegrationConnectionStatus,
  IntegrationDemoScenario,
  IntegrationMode,
  IntegrationProvider,
  Prisma as PrismaRuntime,
  SynchronizationItemStatus,
  SynchronizationRunStatus,
  SynchronizationTriggerType,
  UserRole
} from "../lib/prisma-runtime.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { DEFAULT_FEEDBACK_CATEGORIES } from "../modules/feedback-categories/default-feedback-categories.js";

export const DEFAULT_DEVELOPMENT_SEED_PASSWORD = "DevOnlyPass123!";

const SEED_AT = new Date("2026-08-01T08:00:00.000Z");
const VERIFIED_AT = new Date("2026-08-01T07:00:00.000Z");
export const DEMO_BUSINESS_ID = "dev_seed_business_kigali_harvest";
const ISOLATION_BUSINESS_ID = "dev_seed_business_isolation";
const OWNER_MEMBERSHIP_ID = "dev_seed_membership_owner";
const ADMIN_MEMBERSHIP_ID = "dev_seed_membership_admin";
const MANAGER_MEMBERSHIP_ID = "dev_seed_membership_manager";
const SUPPORT_MEMBERSHIP_ID = "dev_seed_membership_support";
const OPERATIONS_MEMBERSHIP_ID = "dev_seed_membership_operations";
const ISOLATION_OWNER_MEMBERSHIP_ID = "dev_seed_membership_isolation_owner";
export const PRIMARY_BRANCH_ID = "dev_seed_branch_remera";
export const DOWNTOWN_BRANCH_ID = "dev_seed_branch_kiyovu";
export const INACTIVE_BRANCH_ID = "dev_seed_branch_legacy";
const ISOLATION_BRANCH_ID = "dev_seed_branch_isolation";
const AUTOMATION_RULE_ID = "dev_seed_automation_low_rating";
const AUTOMATION_PRIORITY_ACTION_ID = "dev_seed_action_low_rating_priority";
const AUTOMATION_ASSIGN_ACTION_ID = "dev_seed_action_low_rating_assignment";
const PUBLIC_PORTAL_TOKEN = "dev-seed-public-portal-token-v1";

type SeedAccount = {
  id: string;
  label: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

export const DEVELOPMENT_SEED_LOGIN_ACCOUNTS: readonly SeedAccount[] = [
  {
    id: "dev_seed_user_owner",
    label: "Demo business owner",
    email: "owner@demo.sme.test",
    firstName: "Amina",
    lastName: "Uwase",
    role: UserRole.BUSINESS_OWNER
  },
  {
    id: "dev_seed_user_admin",
    label: "Demo business administrator",
    email: "admin@demo.sme.test",
    firstName: "Patrick",
    lastName: "Nshimiyimana",
    role: UserRole.STAFF
  },
  {
    id: "dev_seed_user_manager",
    label: "Demo branch manager",
    email: "manager@demo.sme.test",
    firstName: "Claudine",
    lastName: "Mukamana",
    role: UserRole.STAFF
  },
  {
    id: "dev_seed_user_support",
    label: "Demo support staff",
    email: "support@demo.sme.test",
    firstName: "Eric",
    lastName: "Habimana",
    role: UserRole.STAFF
  },
  {
    id: "dev_seed_user_operations",
    label: "Demo operations staff",
    email: "operations@demo.sme.test",
    firstName: "Diane",
    lastName: "Iradukunda",
    role: UserRole.STAFF
  },
  {
    id: "dev_seed_user_customer",
    label: "Representative customer account",
    email: "customer@demo.sme.test",
    firstName: "Alice",
    lastName: "Mutesi",
    role: UserRole.CUSTOMER
  },
  {
    id: "dev_seed_user_isolation_owner",
    label: "Tenant-isolation business owner",
    email: "owner@isolation.sme.test",
    firstName: "Samuel",
    lastName: "Testtenant",
    role: UserRole.BUSINESS_OWNER
  }
];

export const DEVELOPMENT_SEED_CATEGORY_IDS = {
  service: "dev_seed_category_service",
  productFood: "dev_seed_category_product_food_quality",
  staffConduct: "dev_seed_category_staff_conduct",
  waitingTime: "dev_seed_category_waiting_time",
  orderAccuracy: "dev_seed_category_order_accuracy",
  product: "dev_seed_category_product",
  billing: "dev_seed_category_billing",
  facilities: "dev_seed_category_facilities_cleanliness",
  digital: "dev_seed_category_digital_experience",
  complaint: "dev_seed_category_complaint",
  praise: "dev_seed_category_praise",
  suggestion: "dev_seed_category_suggestion_improvement",
  legacy: "dev_seed_category_legacy",
  isolation: "dev_seed_category_isolation"
} as const;

const categoryIds = DEVELOPMENT_SEED_CATEGORY_IDS;

export const DEVELOPMENT_SEED_DEFAULT_CATEGORY_ID_BY_KEY: Record<
  (typeof DEFAULT_FEEDBACK_CATEGORIES)[number]["key"],
  string
> = {
  "service-quality": categoryIds.service,
  "product-food-quality": categoryIds.productFood,
  "staff-conduct": categoryIds.staffConduct,
  "waiting-time": categoryIds.waitingTime,
  "order-accuracy": categoryIds.orderAccuracy,
  "billing-payments": categoryIds.billing,
  "facilities-cleanliness": categoryIds.facilities,
  "digital-experience": categoryIds.digital,
  complaint: categoryIds.complaint,
  "praise-compliment": categoryIds.praise,
  "suggestion-improvement": categoryIds.suggestion,
  "product-feature-request": categoryIds.product,
  other: categoryIds.legacy
};

const defaultCategoryIdByKey = DEVELOPMENT_SEED_DEFAULT_CATEGORY_ID_BY_KEY;

const customerIds = {
  alice: "dev_seed_customer_alice",
  bob: "dev_seed_customer_bob",
  carol: "dev_seed_customer_carol",
  david: "dev_seed_customer_david",
  emma: "dev_seed_customer_emma",
  archived: "dev_seed_customer_archived"
} as const;

type FeedbackSeedFixture = {
  id: string;
  ingestionId: string;
  businessId: string;
  branchId: string;
  channel: FeedbackChannel;
  externalId: string;
  title: string | null;
  message: string;
  rating: number | null;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  assignedToMembershipId: string | null;
  assignedToLabel: string | null;
  categoryId: string | null;
  categoryLabel: string | null;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  sourceUrl: string | null;
  languageCode: string | null;
  occurredAt: Date;
  receivedAt: Date;
  sourceMetadata: Prisma.InputJsonValue;
  attachments?: readonly {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number | null;
    externalUrl: string | null;
    checksum: string | null;
    metadata: Prisma.InputJsonValue;
  }[];
};

const ALL_LEGACY_DEVELOPMENT_FEEDBACK_FIXTURES: readonly FeedbackSeedFixture[] = [
  {
    id: "dev_seed_feedback_manual_praise",
    ingestionId: "dev_seed_ingestion_manual_praise",
    businessId: DEMO_BUSINESS_ID,
    branchId: PRIMARY_BRANCH_ID,
    channel: FeedbackChannel.MANUAL,
    externalId: "dev-seed-manual-001",
    title: "Excellent lunch service",
    message:
      "The team handled our group lunch quickly and kindly. The manager checked on us twice.",
    rating: 5,
    status: FeedbackStatus.RESOLVED,
    priority: FeedbackPriority.NORMAL,
    assignedToMembershipId: MANAGER_MEMBERSHIP_ID,
    assignedToLabel: "Claudine Mukamana",
    categoryId: categoryIds.praise,
    categoryLabel: "Praise / Compliment",
    customerId: customerIds.alice,
    customerName: "Alice Mutesi",
    customerEmail: "alice@customers.sme.test",
    customerPhone: "+250 788 111 001",
    sourceUrl: null,
    languageCode: "en",
    occurredAt: new Date("2026-08-01T10:15:00.000Z"),
    receivedAt: new Date("2026-08-01T10:20:00.000Z"),
    sourceMetadata: {
      sourceType: "manual-entry",
      manualSourceType: "IN_PERSON",
      reference: "DEV-MANUAL-001",
      developmentSeed: true
    }
  },
  {
    id: "dev_seed_feedback_public_complaint",
    ingestionId: "dev_seed_ingestion_public_complaint",
    businessId: DEMO_BUSINESS_ID,
    branchId: PRIMARY_BRANCH_ID,
    channel: FeedbackChannel.PUBLIC_FORM,
    externalId: "dev-seed-public-001",
    title: null,
    message:
      "My takeaway order was missing two items and I waited a long time for help at the counter.",
    rating: 2,
    status: FeedbackStatus.IN_REVIEW,
    priority: FeedbackPriority.URGENT,
    assignedToMembershipId: SUPPORT_MEMBERSHIP_ID,
    assignedToLabel: "Eric Habimana",
    categoryId: categoryIds.orderAccuracy,
    categoryLabel: "Order Accuracy",
    customerId: customerIds.bob,
    customerName: "Bob Niyonzima",
    customerEmail: "bob@customers.sme.test",
    customerPhone: "+250 788 111 002",
    sourceUrl: null,
    languageCode: "en",
    occurredAt: new Date("2026-08-02T12:10:00.000Z"),
    receivedAt: new Date("2026-08-02T12:12:00.000Z"),
    sourceMetadata: {
      sourceType: "public-feedback-portal",
      allowFollowUp: true,
      portalFingerprint: "development-seed",
      developmentSeed: true
    }
  },
  {
    id: "dev_seed_feedback_qr_suggestion",
    ingestionId: "dev_seed_ingestion_qr_suggestion",
    businessId: DEMO_BUSINESS_ID,
    branchId: DOWNTOWN_BRANCH_ID,
    channel: FeedbackChannel.QR_CODE,
    externalId: "dev-seed-qr-001",
    title: null,
    message:
      "Please add a clearly marked pickup shelf for online orders near the entrance.",
    rating: 4,
    status: FeedbackStatus.NEW,
    priority: FeedbackPriority.LOW,
    assignedToMembershipId: null,
    assignedToLabel: null,
    categoryId: categoryIds.suggestion,
    categoryLabel: "Suggestion / Improvement",
    customerId: customerIds.carol,
    customerName: "Carol Uwera",
    customerEmail: null,
    customerPhone: "+250 788 111 003",
    sourceUrl: null,
    languageCode: "en",
    occurredAt: new Date("2026-08-03T08:45:00.000Z"),
    receivedAt: new Date("2026-08-03T08:46:00.000Z"),
    sourceMetadata: {
      sourceType: "qr-code",
      qrCodeId: "dev_seed_qr_downtown",
      qrScope: "BRANCH",
      allowFollowUp: false,
      developmentSeed: true
    }
  },
  {
    id: "dev_seed_feedback_whatsapp",
    ingestionId: "dev_seed_ingestion_whatsapp",
    businessId: DEMO_BUSINESS_ID,
    branchId: PRIMARY_BRANCH_ID,
    channel: FeedbackChannel.WHATSAPP,
    externalId: "demo-whatsapp-standard-001",
    title: null,
    message:
      "Hello, I ordered breakfast at 8:10 and it arrived cold. Can someone check what happened?",
    rating: null,
    status: FeedbackStatus.IN_REVIEW,
    priority: FeedbackPriority.HIGH,
    assignedToMembershipId: SUPPORT_MEMBERSHIP_ID,
    assignedToLabel: "Eric Habimana",
    categoryId: categoryIds.productFood,
    categoryLabel: "Product / Food Quality",
    customerId: customerIds.david,
    customerName: "David Mugisha",
    customerEmail: null,
    customerPhone: "+250 788 111 004",
    sourceUrl: null,
    languageCode: "en",
    occurredAt: new Date("2026-08-04T08:10:00.000Z"),
    receivedAt: new Date("2026-08-04T08:11:00.000Z"),
    sourceMetadata: {
      sourceType: "demo-external-feedback",
      provider: "WHATSAPP",
      providerLabel: "WhatsApp",
      demoMode: true,
      simulatedExternalData: true,
      liveProviderConnected: false,
      connectionId: "dev_seed_connection_whatsapp",
      originalPreview: "Breakfast order arrived cold.",
      developmentSeed: true
    }
  },
  {
    id: "dev_seed_feedback_instagram",
    ingestionId: "dev_seed_ingestion_instagram",
    businessId: DEMO_BUSINESS_ID,
    branchId: DOWNTOWN_BRANCH_ID,
    channel: FeedbackChannel.INSTAGRAM,
    externalId: "demo-instagram-standard-001",
    title: null,
    message: "The new dessert presentation looks amazing. Is it available every day?",
    rating: null,
    status: FeedbackStatus.NEW,
    priority: FeedbackPriority.NORMAL,
    assignedToMembershipId: null,
    assignedToLabel: null,
    categoryId: categoryIds.product,
    categoryLabel: "Product / Feature Request",
    customerId: customerIds.emma,
    customerName: "Emma Kayitesi",
    customerEmail: "emma@customers.sme.test",
    customerPhone: null,
    sourceUrl: "https://social.example.test/instagram/comment/001",
    languageCode: "en",
    occurredAt: new Date("2026-08-05T18:10:00.000Z"),
    receivedAt: new Date("2026-08-05T18:12:00.000Z"),
    sourceMetadata: {
      sourceType: "demo-external-feedback",
      provider: "INSTAGRAM",
      providerLabel: "Instagram",
      demoMode: true,
      simulatedExternalData: true,
      liveProviderConnected: false,
      connectionId: "dev_seed_connection_instagram",
      originalPreview: "Question about the new dessert.",
      developmentSeed: true
    }
  },
  {
    id: "dev_seed_feedback_x",
    ingestionId: "dev_seed_ingestion_x",
    businessId: DEMO_BUSINESS_ID,
    branchId: DOWNTOWN_BRANCH_ID,
    channel: FeedbackChannel.X,
    externalId: "demo-x-standard-002",
    title: "Pickup queue feedback",
    message:
      "The queue at pickup was confusing. A separate sign for online orders would help.",
    rating: 3,
    status: FeedbackStatus.CLOSED,
    priority: FeedbackPriority.NORMAL,
    assignedToMembershipId: OPERATIONS_MEMBERSHIP_ID,
    assignedToLabel: "Diane Iradukunda",
    categoryId: categoryIds.waitingTime,
    categoryLabel: "Waiting Time",
    customerId: null,
    customerName: "Guest customer",
    customerEmail: null,
    customerPhone: null,
    sourceUrl: "https://social.example.test/x/reply/002",
    languageCode: "en",
    occurredAt: new Date("2026-08-06T15:05:00.000Z"),
    receivedAt: new Date("2026-08-06T15:06:00.000Z"),
    sourceMetadata: {
      sourceType: "demo-external-feedback",
      provider: "X",
      providerLabel: "X",
      demoMode: true,
      simulatedExternalData: true,
      liveProviderConnected: false,
      connectionId: "dev_seed_connection_x",
      originalPreview: "Pickup queue signage suggestion.",
      developmentSeed: true
    }
  },
  {
    id: "dev_seed_feedback_google_review",
    ingestionId: "dev_seed_ingestion_google_review",
    businessId: DEMO_BUSINESS_ID,
    branchId: PRIMARY_BRANCH_ID,
    channel: FeedbackChannel.GOOGLE_REVIEW,
    externalId: "demo-google-reviews-standard-001",
    title: "Excellent lunch experience",
    message:
      "The team handled our lunch rush beautifully. Fast service, warm staff, and excellent food.",
    rating: 5,
    status: FeedbackStatus.RESOLVED,
    priority: FeedbackPriority.NORMAL,
    assignedToMembershipId: MANAGER_MEMBERSHIP_ID,
    assignedToLabel: "Claudine Mukamana",
    categoryId: categoryIds.praise,
    categoryLabel: "Praise / Compliment",
    customerId: null,
    customerName: "Aline N.",
    customerEmail: null,
    customerPhone: null,
    sourceUrl: "https://reviews.example.test/kigali-waffle/001",
    languageCode: "en",
    occurredAt: new Date("2026-08-07T08:25:00.000Z"),
    receivedAt: new Date("2026-08-07T08:27:00.000Z"),
    sourceMetadata: {
      sourceType: "demo-external-feedback",
      provider: "GOOGLE_REVIEWS",
      providerLabel: "Google Reviews",
      demoMode: true,
      simulatedExternalData: true,
      liveProviderConnected: false,
      connectionId: "dev_seed_connection_google_reviews",
      originalRating: 5,
      originalPreview: "Fast service, warm staff, and excellent food.",
      developmentSeed: true
    }
  },
  {
    id: "dev_seed_feedback_email",
    ingestionId: "dev_seed_ingestion_email",
    businessId: DEMO_BUSINESS_ID,
    branchId: PRIMARY_BRANCH_ID,
    channel: FeedbackChannel.EMAIL,
    externalId: "demo-email-standard-001",
    title: "Invoice and service feedback",
    message:
      "The catering was well organized, but the final invoice arrived with the wrong branch name. Please correct it before Friday.",
    rating: 3,
    status: FeedbackStatus.IN_REVIEW,
    priority: FeedbackPriority.HIGH,
    assignedToMembershipId: ADMIN_MEMBERSHIP_ID,
    assignedToLabel: "Patrick Nshimiyimana",
    categoryId: categoryIds.billing,
    categoryLabel: "Billing & Payments",
    customerId: customerIds.alice,
    customerName: "Alice M.",
    customerEmail: "alice@customers.sme.test",
    customerPhone: null,
    sourceUrl: null,
    languageCode: "en",
    occurredAt: new Date("2026-08-08T09:15:00.000Z"),
    receivedAt: new Date("2026-08-08T09:16:00.000Z"),
    sourceMetadata: {
      sourceType: "demo-external-feedback",
      provider: "EMAIL",
      providerLabel: "Email",
      demoMode: true,
      simulatedExternalData: true,
      liveProviderConnected: false,
      connectionId: "dev_seed_connection_email",
      subject: "Invoice and service feedback",
      originalPreview: "Invoice has the wrong branch name.",
      developmentSeed: true
    },
    attachments: [
      {
        id: "dev_seed_attachment_invoice_note",
        filename: "invoice-note.txt",
        mimeType: "text/plain",
        sizeBytes: 428,
        externalUrl: null,
        checksum: sha256("development-seed-invoice-note"),
        metadata: { demoAttachment: true, metadataOnly: true, developmentSeed: true }
      }
    ]
  },
  {
    id: "dev_seed_feedback_facebook",
    ingestionId: "dev_seed_ingestion_facebook",
    businessId: DEMO_BUSINESS_ID,
    branchId: DOWNTOWN_BRANCH_ID,
    channel: FeedbackChannel.FACEBOOK,
    externalId: "demo-facebook-standard-001",
    title: "Weekend brunch compliment",
    message:
      "The weekend brunch was lovely, especially the fruit selection and the friendly host.",
    rating: 5,
    status: FeedbackStatus.RESOLVED,
    priority: FeedbackPriority.LOW,
    assignedToMembershipId: OPERATIONS_MEMBERSHIP_ID,
    assignedToLabel: "Diane Iradukunda",
    categoryId: categoryIds.praise,
    categoryLabel: "Praise / Compliment",
    customerId: null,
    customerName: "Claudine A.",
    customerEmail: null,
    customerPhone: null,
    sourceUrl: "https://social.example.test/facebook/comment/001",
    languageCode: "en",
    occurredAt: new Date("2026-08-09T16:00:00.000Z"),
    receivedAt: new Date("2026-08-09T16:02:00.000Z"),
    sourceMetadata: {
      sourceType: "demo-external-feedback",
      provider: "FACEBOOK",
      providerLabel: "Facebook",
      demoMode: true,
      simulatedExternalData: true,
      liveProviderConnected: false,
      connectionId: "dev_seed_connection_facebook",
      originalPreview: "Lovely weekend brunch and friendly host.",
      developmentSeed: true
    }
  },
  {
    id: "dev_seed_feedback_other",
    ingestionId: "dev_seed_ingestion_other",
    businessId: DEMO_BUSINESS_ID,
    branchId: PRIMARY_BRANCH_ID,
    channel: FeedbackChannel.OTHER,
    externalId: "dev-seed-other-001",
    title: "Dining room temperature",
    message: "The dining room felt cooler than expected during our afternoon visit.",
    rating: null,
    status: FeedbackStatus.CLOSED,
    priority: FeedbackPriority.LOW,
    assignedToMembershipId: null,
    assignedToLabel: null,
    categoryId: null,
    categoryLabel: null,
    customerId: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    sourceUrl: null,
    languageCode: "en",
    occurredAt: new Date("2026-08-10T11:30:00.000Z"),
    receivedAt: new Date("2026-08-10T11:31:00.000Z"),
    sourceMetadata: {
      sourceType: "development-seed-survey",
      developmentSeed: true
    }
  },
  {
    id: "dev_seed_feedback_isolation",
    ingestionId: "dev_seed_ingestion_isolation",
    businessId: ISOLATION_BUSINESS_ID,
    branchId: ISOLATION_BRANCH_ID,
    channel: FeedbackChannel.MANUAL,
    externalId: "dev-seed-isolation-manual-001",
    title: "Tenant isolation fixture",
    message:
      "This feedback belongs only to the isolated development tenant and must not appear in the demo tenant.",
    rating: 4,
    status: FeedbackStatus.NEW,
    priority: FeedbackPriority.NORMAL,
    assignedToMembershipId: ISOLATION_OWNER_MEMBERSHIP_ID,
    assignedToLabel: "Samuel Testtenant",
    categoryId: categoryIds.isolation,
    categoryLabel: "Isolation Test",
    customerId: null,
    customerName: "Same Name Different Tenant",
    customerEmail: "customer@demo.sme.test",
    customerPhone: null,
    sourceUrl: null,
    languageCode: "en",
    occurredAt: new Date("2026-08-11T09:00:00.000Z"),
    receivedAt: new Date("2026-08-11T09:01:00.000Z"),
    sourceMetadata: { sourceType: "manual-entry", developmentSeed: true }
  }
];

const RETIRED_SEED_FEEDBACK_IDS = new Set([
  "dev_seed_feedback_whatsapp",
  "dev_seed_feedback_instagram",
  "dev_seed_feedback_x",
  "dev_seed_feedback_google_review",
  "dev_seed_feedback_email",
  "dev_seed_feedback_facebook",
  "dev_seed_feedback_other"
]);

export const DEVELOPMENT_SEED_FEEDBACK_FIXTURES: readonly FeedbackSeedFixture[] =
  ALL_LEGACY_DEVELOPMENT_FEEDBACK_FIXTURES.filter(
    (fixture) => !RETIRED_SEED_FEEDBACK_IDS.has(fixture.id)
  );

type IntegrationSeedFixture = {
  id: string;
  provider: IntegrationProvider;
  mode: typeof IntegrationMode.DEMO;
  status: IntegrationConnectionStatus;
  displayName: string;
  defaultBranchId: string;
  demoScenario: IntegrationDemoScenario;
  feedbackId: string;
  ingestionId: string;
  externalId: string;
  sourceLabel: string;
};

export const RETIRED_DEVELOPMENT_SEED_INTEGRATION_FIXTURES: readonly IntegrationSeedFixture[] =
  [
    {
      id: "dev_seed_connection_google_reviews",
      provider: IntegrationProvider.GOOGLE_REVIEWS,
      mode: IntegrationMode.DEMO,
      status: IntegrationConnectionStatus.CONNECTED,
      displayName: "Google Reviews Demo",
      defaultBranchId: PRIMARY_BRANCH_ID,
      demoScenario: IntegrationDemoScenario.STANDARD_MIXED,
      feedbackId: "dev_seed_feedback_google_review",
      ingestionId: "dev_seed_ingestion_google_review",
      externalId: "demo-google-reviews-standard-001",
      sourceLabel: "5-star review"
    },
    {
      id: "dev_seed_connection_whatsapp",
      provider: IntegrationProvider.WHATSAPP,
      mode: IntegrationMode.DEMO,
      status: IntegrationConnectionStatus.CONNECTED,
      displayName: "WhatsApp Demo",
      defaultBranchId: PRIMARY_BRANCH_ID,
      demoScenario: IntegrationDemoScenario.STANDARD_MIXED,
      feedbackId: "dev_seed_feedback_whatsapp",
      ingestionId: "dev_seed_ingestion_whatsapp",
      externalId: "demo-whatsapp-standard-001",
      sourceLabel: "Inbound WhatsApp complaint"
    },
    {
      id: "dev_seed_connection_email",
      provider: IntegrationProvider.EMAIL,
      mode: IntegrationMode.DEMO,
      status: IntegrationConnectionStatus.PAUSED,
      displayName: "Email Demo",
      defaultBranchId: PRIMARY_BRANCH_ID,
      demoScenario: IntegrationDemoScenario.STANDARD_MIXED,
      feedbackId: "dev_seed_feedback_email",
      ingestionId: "dev_seed_ingestion_email",
      externalId: "demo-email-standard-001",
      sourceLabel: "Customer email"
    },
    {
      id: "dev_seed_connection_x",
      provider: IntegrationProvider.X,
      mode: IntegrationMode.DEMO,
      status: IntegrationConnectionStatus.DISCONNECTED,
      displayName: "X Demo",
      defaultBranchId: DOWNTOWN_BRANCH_ID,
      demoScenario: IntegrationDemoScenario.STANDARD_MIXED,
      feedbackId: "dev_seed_feedback_x",
      ingestionId: "dev_seed_ingestion_x",
      externalId: "demo-x-standard-002",
      sourceLabel: "Simulated reply"
    },
    {
      id: "dev_seed_connection_facebook",
      provider: IntegrationProvider.FACEBOOK,
      mode: IntegrationMode.DEMO,
      status: IntegrationConnectionStatus.ERROR,
      displayName: "Facebook Demo",
      defaultBranchId: DOWNTOWN_BRANCH_ID,
      demoScenario: IntegrationDemoScenario.STANDARD_MIXED,
      feedbackId: "dev_seed_feedback_facebook",
      ingestionId: "dev_seed_ingestion_facebook",
      externalId: "demo-facebook-standard-001",
      sourceLabel: "Simulated page comment"
    },
    {
      id: "dev_seed_connection_instagram",
      provider: IntegrationProvider.INSTAGRAM,
      mode: IntegrationMode.DEMO,
      status: IntegrationConnectionStatus.CONNECTED,
      displayName: "Instagram Partial-Failure Demo",
      defaultBranchId: DOWNTOWN_BRANCH_ID,
      demoScenario: IntegrationDemoScenario.PARTIAL_FAILURE,
      feedbackId: "dev_seed_feedback_instagram",
      ingestionId: "dev_seed_ingestion_instagram",
      externalId: "demo-instagram-standard-001",
      sourceLabel: "Simulated comment"
    }
  ];

export const DEVELOPMENT_SEED_INTEGRATION_FIXTURES: readonly IntegrationSeedFixture[] =
  [];

export type DevelopmentSeedSummary = {
  users: number;
  businesses: number;
  branches: number;
  memberships: number;
  customers: number;
  feedback: number;
  demoConnections: number;
  liveConnections: number;
};

export async function seedDevelopmentData(
  prisma: PrismaClient,
  developmentPassword: string
): Promise<DevelopmentSeedSummary> {
  await seedUsers(prisma, developmentPassword);
  await seedBusinessesAndBranches(prisma);
  await seedMemberships(prisma);
  await seedCategories(prisma);
  await seedCustomers(prisma);
  await seedAutomationRules(prisma);
  await seedPublicFeedbackConfiguration(prisma);
  await seedFeedback(prisma);
  await seedFeedbackActivitiesAndFieldStates(prisma);
  await seedCustomerActivities(prisma);
  await seedAIAnalyses(prisma);
  await seedAutomationHistory(prisma);
  await seedDemoIntegrations(prisma);

  const [users, businesses, branches, memberships, customers, feedback, demoConnections] =
    await Promise.all([
      prisma.user.count({ where: { id: { startsWith: "dev_seed_" } } }),
      prisma.business.count({ where: { id: { startsWith: "dev_seed_" } } }),
      prisma.branch.count({ where: { id: { startsWith: "dev_seed_" } } }),
      prisma.businessMembership.count({ where: { id: { startsWith: "dev_seed_" } } }),
      prisma.customer.count({ where: { id: { startsWith: "dev_seed_" } } }),
      prisma.feedback.count({ where: { id: { startsWith: "dev_seed_" } } }),
      prisma.integrationConnection.count({
        where: { id: { startsWith: "dev_seed_" }, mode: IntegrationMode.DEMO }
      })
    ]);

  const liveConnections = await prisma.integrationConnection.count({
    where: { id: { startsWith: "dev_seed_" }, mode: IntegrationMode.LIVE }
  });

  return {
    users,
    businesses,
    branches,
    memberships,
    customers,
    feedback,
    demoConnections,
    liveConnections
  };
}

async function seedUsers(prisma: PrismaClient, password: string): Promise<void> {
  for (const account of DEVELOPMENT_SEED_LOGIN_ACCOUNTS) {
    const [existingById, existingByEmail] = await Promise.all([
      prisma.user.findUnique({ where: { id: account.id } }),
      prisma.user.findUnique({ where: { email: account.email } })
    ]);

    if (existingById && existingById.email !== account.email) {
      throw new Error(`Development seed ID ${account.id} belongs to another email.`);
    }

    if (existingByEmail && existingByEmail.id !== account.id) {
      throw new Error(
        `Development seed email ${account.email} belongs to a non-seed-managed user.`
      );
    }

    const existing = existingById ?? existingByEmail;
    const passwordMatches = existing?.passwordHash
      ? await safePasswordMatch(existing.passwordHash, password)
      : false;
    const passwordHash = passwordMatches
      ? existing?.passwordHash
      : await hashPassword(password);

    await prisma.user.upsert({
      where: { id: account.id },
      create: {
        id: account.id,
        email: account.email,
        passwordHash,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        status: AccountStatus.ACTIVE,
        emailVerifiedAt: VERIFIED_AT,
        createdAt: SEED_AT,
        updatedAt: SEED_AT
      },
      update: {
        email: account.email,
        passwordHash,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        status: AccountStatus.ACTIVE,
        emailVerifiedAt: VERIFIED_AT,
        updatedAt: SEED_AT
      }
    });
  }
}

async function seedBusinessesAndBranches(prisma: PrismaClient): Promise<void> {
  await prisma.business.upsert({
    where: { id: DEMO_BUSINESS_ID },
    create: {
      id: DEMO_BUSINESS_ID,
      name: "Kigali Waffle Cuisine",
      industry: "Hospitality and Food Service",
      description:
        "A Kigali-based waffle and casual dining business serving handcrafted waffles, breakfast, brunch, and customer-focused dining experiences.",
      email: "hello@kigaliwaffle.test",
      phone: "+250 788 100 100",
      website: "https://kigaliwaffle.example",
      logoUrl: null,
      country: "Rwanda",
      city: "Kigali",
      district: "Gasabo",
      addressLine: "KG 11 Avenue, Remera",
      timezone: "Africa/Kigali",
      status: BusinessStatus.ACTIVE,
      createdByUserId: "dev_seed_user_owner",
      publicFeedbackEnabled: true,
      publicFeedbackToken: PUBLIC_PORTAL_TOKEN,
      publicFeedbackWelcomeMessage:
        "Thank you for visiting Kigali Waffle Cuisine. Share your experience so our team can serve you better.",
      createdAt: SEED_AT,
      updatedAt: SEED_AT
    },
    update: {
      name: "Kigali Waffle Cuisine",
      industry: "Hospitality and Food Service",
      description:
        "A Kigali-based waffle and casual dining business serving handcrafted waffles, breakfast, brunch, and customer-focused dining experiences.",
      email: "hello@kigaliwaffle.test",
      phone: "+250 788 100 100",
      website: "https://kigaliwaffle.example",
      logoUrl: null,
      country: "Rwanda",
      city: "Kigali",
      district: "Gasabo",
      addressLine: "KG 11 Avenue, Remera",
      timezone: "Africa/Kigali",
      status: BusinessStatus.ACTIVE,
      createdByUserId: "dev_seed_user_owner",
      publicFeedbackEnabled: true,
      publicFeedbackToken: PUBLIC_PORTAL_TOKEN,
      publicFeedbackWelcomeMessage:
        "Thank you for visiting Kigali Waffle Cuisine. Share your experience so our team can serve you better.",
      updatedAt: SEED_AT
    }
  });

  await prisma.business.upsert({
    where: { id: ISOLATION_BUSINESS_ID },
    create: {
      id: ISOLATION_BUSINESS_ID,
      name: "Tenant Isolation Test Company",
      industry: "Development Testing",
      description: "Secondary seed tenant used only for cross-business access checks.",
      email: "hello@isolation.sme.test",
      phone: "+250 788 200 200",
      website: null,
      logoUrl: null,
      country: "Rwanda",
      city: "Kigali",
      district: "Nyarugenge",
      addressLine: "Isolation Street 2",
      timezone: "Africa/Kigali",
      status: BusinessStatus.ACTIVE,
      createdByUserId: "dev_seed_user_isolation_owner",
      publicFeedbackEnabled: false,
      publicFeedbackToken: null,
      publicFeedbackWelcomeMessage: null,
      createdAt: SEED_AT,
      updatedAt: SEED_AT
    },
    update: {
      name: "Tenant Isolation Test Company",
      industry: "Development Testing",
      description: "Secondary seed tenant used only for cross-business access checks.",
      email: "hello@isolation.sme.test",
      phone: "+250 788 200 200",
      website: null,
      logoUrl: null,
      country: "Rwanda",
      city: "Kigali",
      district: "Nyarugenge",
      addressLine: "Isolation Street 2",
      timezone: "Africa/Kigali",
      status: BusinessStatus.ACTIVE,
      createdByUserId: "dev_seed_user_isolation_owner",
      publicFeedbackEnabled: false,
      publicFeedbackToken: null,
      publicFeedbackWelcomeMessage: null,
      updatedAt: SEED_AT
    }
  });

  const branches = [
    {
      id: PRIMARY_BRANCH_ID,
      businessId: DEMO_BUSINESS_ID,
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
      businessId: DEMO_BUSINESS_ID,
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
      businessId: DEMO_BUSINESS_ID,
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
    },
    {
      id: ISOLATION_BRANCH_ID,
      businessId: ISOLATION_BUSINESS_ID,
      name: "Isolation Primary Branch",
      code: "ISOLATION",
      addressLine: "Tenant Boundary Road 1",
      city: "Kigali",
      district: "Nyarugenge",
      country: "Rwanda",
      phone: "+250 788 200 201",
      email: "branch@isolation.sme.test",
      isPrimary: true,
      status: BranchStatus.ACTIVE
    }
  ] as const;

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      create: { ...branch, createdAt: SEED_AT, updatedAt: SEED_AT },
      update: { ...branch, updatedAt: SEED_AT }
    });
  }
}

async function seedMemberships(prisma: PrismaClient): Promise<void> {
  const memberships = [
    {
      id: OWNER_MEMBERSHIP_ID,
      businessId: DEMO_BUSINESS_ID,
      userId: "dev_seed_user_owner",
      role: BusinessMemberRole.OWNER,
      allBranchesAccess: true,
      invitedByUserId: null
    },
    {
      id: ADMIN_MEMBERSHIP_ID,
      businessId: DEMO_BUSINESS_ID,
      userId: "dev_seed_user_admin",
      role: BusinessMemberRole.ADMIN,
      allBranchesAccess: true,
      invitedByUserId: "dev_seed_user_owner"
    },
    {
      id: MANAGER_MEMBERSHIP_ID,
      businessId: DEMO_BUSINESS_ID,
      userId: "dev_seed_user_manager",
      role: BusinessMemberRole.MANAGER,
      allBranchesAccess: false,
      invitedByUserId: "dev_seed_user_owner"
    },
    {
      id: SUPPORT_MEMBERSHIP_ID,
      businessId: DEMO_BUSINESS_ID,
      userId: "dev_seed_user_support",
      role: BusinessMemberRole.STAFF,
      allBranchesAccess: false,
      invitedByUserId: "dev_seed_user_admin"
    },
    {
      id: OPERATIONS_MEMBERSHIP_ID,
      businessId: DEMO_BUSINESS_ID,
      userId: "dev_seed_user_operations",
      role: BusinessMemberRole.STAFF,
      allBranchesAccess: false,
      invitedByUserId: "dev_seed_user_admin"
    },
    {
      id: ISOLATION_OWNER_MEMBERSHIP_ID,
      businessId: ISOLATION_BUSINESS_ID,
      userId: "dev_seed_user_isolation_owner",
      role: BusinessMemberRole.OWNER,
      allBranchesAccess: true,
      invitedByUserId: null
    }
  ] as const;

  for (const membership of memberships) {
    await prisma.businessMembership.upsert({
      where: { id: membership.id },
      create: {
        ...membership,
        status: BusinessMembershipStatus.ACTIVE,
        joinedAt: SEED_AT,
        createdAt: SEED_AT,
        updatedAt: SEED_AT
      },
      update: {
        ...membership,
        status: BusinessMembershipStatus.ACTIVE,
        joinedAt: SEED_AT,
        updatedAt: SEED_AT
      }
    });
  }

  const accessRows = [
    [MANAGER_MEMBERSHIP_ID, PRIMARY_BRANCH_ID],
    [MANAGER_MEMBERSHIP_ID, DOWNTOWN_BRANCH_ID],
    [SUPPORT_MEMBERSHIP_ID, PRIMARY_BRANCH_ID],
    [OPERATIONS_MEMBERSHIP_ID, DOWNTOWN_BRANCH_ID]
  ] as const;

  for (const [membershipId, branchId] of accessRows) {
    await prisma.membershipBranchAccess.upsert({
      where: { membershipId_branchId: { membershipId, branchId } },
      create: { membershipId, branchId, createdAt: SEED_AT },
      update: {}
    });
  }
}

async function seedCategories(prisma: PrismaClient): Promise<void> {
  const categories = DEFAULT_FEEDBACK_CATEGORIES.map((category) => ({
    id: defaultCategoryIdByKey[category.key],
    businessId: DEMO_BUSINESS_ID,
    ...category,
    isActive: true
  }));

  for (const { id, businessId, name, description, colorKey, isActive } of categories) {
    const data = {
      businessId,
      name,
      description,
      colorKey,
      isActive,
      updatedAt: SEED_AT
    };
    await prisma.feedbackCategory.upsert({
      where: { id },
      create: { id, ...data, createdAt: SEED_AT },
      update: data
    });
  }

  await prisma.feedbackCategory.upsert({
    where: { id: categoryIds.isolation },
    create: {
      id: categoryIds.isolation,
      businessId: ISOLATION_BUSINESS_ID,
      name: "Isolation Test",
      description: "Category fixture used only for cross-business access checks.",
      colorKey: "rose",
      isActive: true,
      createdAt: SEED_AT,
      updatedAt: SEED_AT
    },
    update: {
      businessId: ISOLATION_BUSINESS_ID,
      name: "Isolation Test",
      description: "Category fixture used only for cross-business access checks.",
      colorKey: "rose",
      isActive: true,
      updatedAt: SEED_AT
    }
  });
}

async function seedCustomers(prisma: PrismaClient): Promise<void> {
  const customers = [
    {
      id: customerIds.alice,
      displayName: "Alice Mutesi",
      firstName: "Alice",
      lastName: "Mutesi",
      email: "alice@customers.sme.test",
      normalizedEmail: "alice@customers.sme.test",
      phone: "+250 788 111 001",
      normalizedPhone: "+250788111001",
      status: CustomerStatus.ACTIVE,
      archivedAt: null
    },
    {
      id: customerIds.bob,
      displayName: "Bob Niyonzima",
      firstName: "Bob",
      lastName: "Niyonzima",
      email: "bob@customers.sme.test",
      normalizedEmail: "bob@customers.sme.test",
      phone: "+250 788 111 002",
      normalizedPhone: "+250788111002",
      status: CustomerStatus.ACTIVE,
      archivedAt: null
    },
    {
      id: customerIds.carol,
      displayName: "Carol Uwera",
      firstName: "Carol",
      lastName: "Uwera",
      email: null,
      normalizedEmail: null,
      phone: "+250 788 111 003",
      normalizedPhone: "+250788111003",
      status: CustomerStatus.ACTIVE,
      archivedAt: null
    },
    {
      id: customerIds.david,
      displayName: "David Mugisha",
      firstName: "David",
      lastName: "Mugisha",
      email: null,
      normalizedEmail: null,
      phone: "+250 788 111 004",
      normalizedPhone: "+250788111004",
      status: CustomerStatus.ACTIVE,
      archivedAt: null
    },
    {
      id: customerIds.emma,
      displayName: "Emma Kayitesi",
      firstName: "Emma",
      lastName: "Kayitesi",
      email: "emma@customers.sme.test",
      normalizedEmail: "emma@customers.sme.test",
      phone: null,
      normalizedPhone: null,
      status: CustomerStatus.ACTIVE,
      archivedAt: null
    },
    {
      id: customerIds.archived,
      displayName: "Former Catering Customer",
      firstName: "Former",
      lastName: "Customer",
      email: "archived@customers.sme.test",
      normalizedEmail: "archived@customers.sme.test",
      phone: null,
      normalizedPhone: null,
      status: CustomerStatus.ARCHIVED,
      archivedAt: new Date("2026-08-10T15:00:00.000Z")
    }
  ] as const;

  for (const customer of customers) {
    const data = {
      businessId: DEMO_BUSINESS_ID,
      displayName: customer.displayName,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      normalizedEmail: customer.normalizedEmail,
      phone: customer.phone,
      normalizedPhone: customer.normalizedPhone,
      status: customer.status,
      archivedAt: customer.archivedAt,
      createdByMembershipId: OWNER_MEMBERSHIP_ID,
      updatedByMembershipId: ADMIN_MEMBERSHIP_ID,
      updatedAt: SEED_AT
    };
    await prisma.customer.upsert({
      where: { id: customer.id },
      create: { id: customer.id, ...data, createdAt: SEED_AT },
      update: data
    });
  }
}

async function seedAutomationRules(prisma: PrismaClient): Promise<void> {
  await prisma.automationRule.upsert({
    where: { id: AUTOMATION_RULE_ID },
    create: {
      id: AUTOMATION_RULE_ID,
      businessId: DEMO_BUSINESS_ID,
      name: "Urgent triage for low ratings",
      description:
        "Mark ratings of two or lower as urgent and assign them to the support team.",
      status: AutomationRuleStatus.ACTIVE,
      branchScope: AutomationRuleBranchScope.ALL_BRANCHES,
      trigger: AutomationRuleTrigger.FEEDBACK_CREATED,
      matchMode: AutomationRuleMatchMode.ALL,
      stopProcessingAfterMatch: false,
      position: 1,
      version: 1,
      createdByMembershipId: OWNER_MEMBERSHIP_ID,
      updatedByMembershipId: ADMIN_MEMBERSHIP_ID,
      lastTriggeredAt: new Date("2026-08-02T12:13:00.000Z"),
      executionCount: 1,
      createdAt: SEED_AT,
      updatedAt: SEED_AT
    },
    update: {
      businessId: DEMO_BUSINESS_ID,
      name: "Urgent triage for low ratings",
      description:
        "Mark ratings of two or lower as urgent and assign them to the support team.",
      status: AutomationRuleStatus.ACTIVE,
      branchScope: AutomationRuleBranchScope.ALL_BRANCHES,
      trigger: AutomationRuleTrigger.FEEDBACK_CREATED,
      matchMode: AutomationRuleMatchMode.ALL,
      stopProcessingAfterMatch: false,
      position: 1,
      version: 1,
      createdByMembershipId: OWNER_MEMBERSHIP_ID,
      updatedByMembershipId: ADMIN_MEMBERSHIP_ID,
      archivedAt: null,
      lastTriggeredAt: new Date("2026-08-02T12:13:00.000Z"),
      executionCount: 1,
      updatedAt: SEED_AT
    }
  });

  await prisma.automationCondition.upsert({
    where: { id: "dev_seed_condition_low_rating" },
    create: {
      id: "dev_seed_condition_low_rating",
      ruleId: AUTOMATION_RULE_ID,
      type: AutomationConditionType.RATING,
      operator: AutomationConditionOperator.LESS_THAN_OR_EQUAL,
      position: 1,
      valueNumber: 2
    },
    update: {
      ruleId: AUTOMATION_RULE_ID,
      type: AutomationConditionType.RATING,
      operator: AutomationConditionOperator.LESS_THAN_OR_EQUAL,
      position: 1,
      valueString: null,
      valueNumber: 2,
      valueJson: PrismaRuntime.JsonNull,
      branchId: null,
      categoryId: null
    }
  });

  const actions = [
    {
      id: AUTOMATION_PRIORITY_ACTION_ID,
      type: AutomationActionType.SET_PRIORITY,
      position: 1,
      valueString: FeedbackPriority.URGENT,
      categoryId: null,
      targetMembershipId: null
    },
    {
      id: AUTOMATION_ASSIGN_ACTION_ID,
      type: AutomationActionType.ASSIGN_TO_MEMBERSHIP,
      position: 2,
      valueString: null,
      categoryId: null,
      targetMembershipId: SUPPORT_MEMBERSHIP_ID
    }
  ] as const;

  for (const action of actions) {
    await prisma.automationAction.upsert({
      where: { id: action.id },
      create: { ...action, ruleId: AUTOMATION_RULE_ID },
      update: { ...action, ruleId: AUTOMATION_RULE_ID }
    });
  }

  const draftRuleId = "dev_seed_automation_ai_followup";
  await prisma.automationRule.upsert({
    where: { id: draftRuleId },
    create: {
      id: draftRuleId,
      businessId: DEMO_BUSINESS_ID,
      name: "Draft AI negative sentiment review",
      description: "Review negative customer sentiment from the Kiyovu branch.",
      status: AutomationRuleStatus.DRAFT,
      branchScope: AutomationRuleBranchScope.SELECTED_BRANCHES,
      trigger: AutomationRuleTrigger.AI_ANALYSIS_COMPLETED,
      matchMode: AutomationRuleMatchMode.ALL,
      stopProcessingAfterMatch: true,
      position: 2,
      version: 1,
      createdByMembershipId: OWNER_MEMBERSHIP_ID,
      updatedByMembershipId: OWNER_MEMBERSHIP_ID,
      executionCount: 0,
      createdAt: SEED_AT,
      updatedAt: SEED_AT
    },
    update: {
      businessId: DEMO_BUSINESS_ID,
      name: "Draft AI negative sentiment review",
      description: "Review negative customer sentiment from the Kiyovu branch.",
      status: AutomationRuleStatus.DRAFT,
      branchScope: AutomationRuleBranchScope.SELECTED_BRANCHES,
      trigger: AutomationRuleTrigger.AI_ANALYSIS_COMPLETED,
      matchMode: AutomationRuleMatchMode.ALL,
      stopProcessingAfterMatch: true,
      position: 2,
      version: 1,
      createdByMembershipId: OWNER_MEMBERSHIP_ID,
      updatedByMembershipId: OWNER_MEMBERSHIP_ID,
      archivedAt: null,
      lastTriggeredAt: null,
      executionCount: 0,
      updatedAt: SEED_AT
    }
  });
  await prisma.automationRuleBranch.upsert({
    where: { ruleId_branchId: { ruleId: draftRuleId, branchId: DOWNTOWN_BRANCH_ID } },
    create: { ruleId: draftRuleId, branchId: DOWNTOWN_BRANCH_ID },
    update: {}
  });
  await prisma.automationCondition.upsert({
    where: { id: "dev_seed_condition_negative_sentiment" },
    create: {
      id: "dev_seed_condition_negative_sentiment",
      ruleId: draftRuleId,
      type: AutomationConditionType.SENTIMENT,
      operator: AutomationConditionOperator.EQUALS,
      position: 1,
      valueString: FeedbackAISentiment.NEGATIVE
    },
    update: {
      ruleId: draftRuleId,
      type: AutomationConditionType.SENTIMENT,
      operator: AutomationConditionOperator.EQUALS,
      position: 1,
      valueString: FeedbackAISentiment.NEGATIVE,
      valueNumber: null,
      valueJson: PrismaRuntime.JsonNull,
      branchId: null,
      categoryId: null
    }
  });
  await prisma.automationAction.upsert({
    where: { id: "dev_seed_action_negative_status" },
    create: {
      id: "dev_seed_action_negative_status",
      ruleId: draftRuleId,
      type: AutomationActionType.SET_STATUS,
      position: 1,
      valueString: FeedbackStatus.IN_REVIEW
    },
    update: {
      ruleId: draftRuleId,
      type: AutomationActionType.SET_STATUS,
      position: 1,
      valueString: FeedbackStatus.IN_REVIEW,
      categoryId: null,
      targetMembershipId: null
    }
  });
}

async function seedPublicFeedbackConfiguration(prisma: PrismaClient): Promise<void> {
  const fingerprint = sha256(PUBLIC_PORTAL_TOKEN);
  const qrCodes = [
    {
      id: "dev_seed_qr_business_wide",
      branchId: null,
      name: "All Locations Feedback QR",
      publicToken: "dev-seed-qr-business-wide-v1",
      isActive: true
    },
    {
      id: "dev_seed_qr_downtown",
      branchId: DOWNTOWN_BRANCH_ID,
      name: "Kiyovu Counter QR",
      publicToken: "dev-seed-qr-kiyovu-v1",
      isActive: true
    },
    {
      id: "dev_seed_qr_inactive",
      branchId: PRIMARY_BRANCH_ID,
      name: "Remera Table Cards (Inactive)",
      publicToken: "dev-seed-qr-disabled-v1",
      isActive: false
    }
  ] as const;

  for (const qrCode of qrCodes) {
    await prisma.publicFeedbackQrCode.upsert({
      where: { id: qrCode.id },
      create: {
        ...qrCode,
        businessId: DEMO_BUSINESS_ID,
        portalTokenFingerprint: fingerprint,
        createdByMembershipId: OWNER_MEMBERSHIP_ID,
        createdAt: SEED_AT,
        updatedAt: SEED_AT
      },
      update: {
        ...qrCode,
        businessId: DEMO_BUSINESS_ID,
        portalTokenFingerprint: fingerprint,
        createdByMembershipId: OWNER_MEMBERSHIP_ID,
        updatedAt: SEED_AT
      }
    });
  }
}

async function seedFeedback(prisma: PrismaClient): Promise<void> {
  for (const fixture of DEVELOPMENT_SEED_FEEDBACK_FIXTURES) {
    const payloadHash = sha256(`${fixture.id}:payload:v1`);
    await prisma.feedbackIngestion.upsert({
      where: { id: fixture.ingestionId },
      create: {
        id: fixture.ingestionId,
        businessId: fixture.businessId,
        branchId: fixture.branchId,
        channel: fixture.channel,
        externalId: fixture.externalId,
        idempotencyKey: `development-seed:${fixture.id}`,
        payloadHash,
        status: FeedbackIngestionStatus.COMPLETED,
        processingVersion: "development-seed-v1",
        startedAt: fixture.receivedAt,
        completedAt: fixture.receivedAt,
        createdAt: fixture.receivedAt,
        updatedAt: fixture.receivedAt
      },
      update: {
        businessId: fixture.businessId,
        branchId: fixture.branchId,
        channel: fixture.channel,
        externalId: fixture.externalId,
        idempotencyKey: `development-seed:${fixture.id}`,
        payloadHash,
        status: FeedbackIngestionStatus.COMPLETED,
        processingVersion: "development-seed-v1",
        errorCode: null,
        errorMessage: null,
        startedAt: fixture.receivedAt,
        completedAt: fixture.receivedAt,
        updatedAt: fixture.receivedAt
      }
    });

    await prisma.feedback.upsert({
      where: { id: fixture.id },
      create: {
        id: fixture.id,
        businessId: fixture.businessId,
        branchId: fixture.branchId,
        ingestionId: fixture.ingestionId,
        channel: fixture.channel,
        externalId: fixture.externalId,
        title: fixture.title,
        message: fixture.message,
        rating: fixture.rating,
        status: fixture.status,
        priority: fixture.priority,
        assignedToMembershipId: fixture.assignedToMembershipId,
        categoryId: fixture.categoryId,
        customerId: fixture.customerId,
        customerName: fixture.customerName,
        customerEmail: fixture.customerEmail,
        customerPhone: fixture.customerPhone,
        sourceUrl: fixture.sourceUrl,
        languageCode: fixture.languageCode,
        occurredAt: fixture.occurredAt,
        receivedAt: fixture.receivedAt,
        sourceMetadata: fixture.sourceMetadata,
        createdAt: fixture.receivedAt,
        updatedAt: fixture.receivedAt
      },
      update: {
        businessId: fixture.businessId,
        branchId: fixture.branchId,
        ingestionId: fixture.ingestionId,
        channel: fixture.channel,
        externalId: fixture.externalId,
        title: fixture.title,
        message: fixture.message,
        rating: fixture.rating,
        status: fixture.status,
        priority: fixture.priority,
        assignedToMembershipId: fixture.assignedToMembershipId,
        categoryId: fixture.categoryId,
        customerId: fixture.customerId,
        customerName: fixture.customerName,
        customerEmail: fixture.customerEmail,
        customerPhone: fixture.customerPhone,
        sourceUrl: fixture.sourceUrl,
        languageCode: fixture.languageCode,
        occurredAt: fixture.occurredAt,
        receivedAt: fixture.receivedAt,
        sourceMetadata: fixture.sourceMetadata,
        updatedAt: fixture.receivedAt
      }
    });

    for (const attachment of fixture.attachments ?? []) {
      const data = {
        feedbackId: fixture.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        externalUrl: attachment.externalUrl,
        checksum: attachment.checksum,
        metadata: attachment.metadata,
        createdAt: fixture.receivedAt
      };
      await prisma.feedbackAttachment.upsert({
        where: { id: attachment.id },
        create: { id: attachment.id, ...data },
        update: data
      });
    }
  }
}

async function seedFeedbackActivitiesAndFieldStates(prisma: PrismaClient): Promise<void> {
  for (const fixture of DEVELOPMENT_SEED_FEEDBACK_FIXTURES) {
    const actorMembershipId =
      fixture.businessId === ISOLATION_BUSINESS_ID
        ? ISOLATION_OWNER_MEMBERSHIP_ID
        : MANAGER_MEMBERSHIP_ID;
    const statusTransitions = transitionsForStatus(fixture.status);

    for (const [index, transition] of statusTransitions.entries()) {
      await upsertFeedbackActivity(prisma, {
        id: `${fixture.id}_status_${index + 1}`,
        businessId: fixture.businessId,
        feedbackId: fixture.id,
        actorMembershipId,
        actorType: FeedbackActivityActorType.HUMAN,
        automationRuleId: null,
        automationRuleName: null,
        type: FeedbackActivityType.STATUS_CHANGED,
        fromStatus: transition.from,
        toStatus: transition.to,
        fromValue: null,
        toValue: null,
        note: null,
        createdAt: addMinutes(fixture.receivedAt, 20 + index * 10)
      });
    }

    if (fixture.priority !== FeedbackPriority.NORMAL) {
      const automated = fixture.id === "dev_seed_feedback_public_complaint";
      await upsertFeedbackActivity(prisma, {
        id: `${fixture.id}_priority`,
        businessId: fixture.businessId,
        feedbackId: fixture.id,
        actorMembershipId: automated ? null : actorMembershipId,
        actorType: automated
          ? FeedbackActivityActorType.SYSTEM
          : FeedbackActivityActorType.HUMAN,
        automationRuleId: automated ? AUTOMATION_RULE_ID : null,
        automationRuleName: automated ? "Urgent triage for low ratings" : null,
        type: FeedbackActivityType.PRIORITY_CHANGED,
        fromStatus: null,
        toStatus: null,
        fromValue: FeedbackPriority.NORMAL,
        toValue: fixture.priority,
        note: null,
        createdAt: addMinutes(fixture.receivedAt, 5)
      });
    }

    if (fixture.categoryId && fixture.id !== "dev_seed_feedback_instagram") {
      await upsertFeedbackActivity(prisma, {
        id: `${fixture.id}_category`,
        businessId: fixture.businessId,
        feedbackId: fixture.id,
        actorMembershipId,
        actorType: FeedbackActivityActorType.HUMAN,
        automationRuleId: null,
        automationRuleName: null,
        type: FeedbackActivityType.CATEGORY_CHANGED,
        fromStatus: null,
        toStatus: null,
        fromValue: null,
        toValue: fixture.categoryLabel,
        note: null,
        createdAt: addMinutes(fixture.receivedAt, 8)
      });
    }

    if (fixture.assignedToMembershipId) {
      const automated = fixture.id === "dev_seed_feedback_public_complaint";
      await upsertFeedbackActivity(prisma, {
        id: `${fixture.id}_assignment`,
        businessId: fixture.businessId,
        feedbackId: fixture.id,
        actorMembershipId: automated ? null : actorMembershipId,
        actorType: automated
          ? FeedbackActivityActorType.SYSTEM
          : FeedbackActivityActorType.HUMAN,
        automationRuleId: automated ? AUTOMATION_RULE_ID : null,
        automationRuleName: automated ? "Urgent triage for low ratings" : null,
        type: FeedbackActivityType.ASSIGNMENT_CHANGED,
        fromStatus: null,
        toStatus: null,
        fromValue: null,
        toValue: fixture.assignedToLabel,
        note: null,
        createdAt: addMinutes(fixture.receivedAt, 10)
      });
    }

    if (
      [
        "dev_seed_feedback_public_complaint",
        "dev_seed_feedback_whatsapp",
        "dev_seed_feedback_email"
      ].includes(fixture.id)
    ) {
      await upsertFeedbackActivity(prisma, {
        id: `${fixture.id}_note`,
        businessId: fixture.businessId,
        feedbackId: fixture.id,
        actorMembershipId: fixture.assignedToMembershipId ?? actorMembershipId,
        actorType: FeedbackActivityActorType.HUMAN,
        automationRuleId: null,
        automationRuleName: null,
        type: FeedbackActivityType.NOTE_ADDED,
        fromStatus: null,
        toStatus: null,
        fromValue: null,
        toValue: null,
        note: "Follow-up is in progress; no external message has been sent yet.",
        createdAt: addMinutes(fixture.receivedAt, 30)
      });
    }

    await seedFieldStatesForFeedback(prisma, fixture, actorMembershipId);
  }
}

async function seedFieldStatesForFeedback(
  prisma: PrismaClient,
  fixture: FeedbackSeedFixture,
  actorMembershipId: string
): Promise<void> {
  const automated = fixture.id === "dev_seed_feedback_public_complaint";
  const states = [
    {
      field: FeedbackFieldStateField.STATUS,
      source:
        fixture.status === FeedbackStatus.NEW
          ? FeedbackFieldStateSource.SYSTEM
          : FeedbackFieldStateSource.HUMAN,
      sourceRuleId: null,
      updatedByMembershipId:
        fixture.status === FeedbackStatus.NEW ? null : actorMembershipId
    },
    {
      field: FeedbackFieldStateField.PRIORITY,
      source: automated
        ? FeedbackFieldStateSource.AUTOMATION
        : fixture.priority === FeedbackPriority.NORMAL
          ? FeedbackFieldStateSource.DEFAULT
          : FeedbackFieldStateSource.HUMAN,
      sourceRuleId: automated ? AUTOMATION_RULE_ID : null,
      updatedByMembershipId:
        automated || fixture.priority === FeedbackPriority.NORMAL
          ? null
          : actorMembershipId
    },
    {
      field: FeedbackFieldStateField.CATEGORY,
      source:
        fixture.id === "dev_seed_feedback_instagram"
          ? FeedbackFieldStateSource.AI
          : fixture.categoryId
            ? FeedbackFieldStateSource.HUMAN
            : FeedbackFieldStateSource.DEFAULT,
      sourceRuleId: null,
      updatedByMembershipId:
        fixture.categoryId && fixture.id !== "dev_seed_feedback_instagram"
          ? actorMembershipId
          : null
    },
    {
      field: FeedbackFieldStateField.ASSIGNMENT,
      source: automated
        ? FeedbackFieldStateSource.AUTOMATION
        : fixture.assignedToMembershipId
          ? FeedbackFieldStateSource.HUMAN
          : FeedbackFieldStateSource.DEFAULT,
      sourceRuleId: automated ? AUTOMATION_RULE_ID : null,
      updatedByMembershipId:
        automated || !fixture.assignedToMembershipId ? null : actorMembershipId
    }
  ] as const;

  for (const state of states) {
    await prisma.feedbackFieldState.upsert({
      where: { feedbackId_field: { feedbackId: fixture.id, field: state.field } },
      create: {
        id: `${fixture.id}_field_${state.field.toLowerCase()}`,
        businessId: fixture.businessId,
        feedbackId: fixture.id,
        field: state.field,
        source: state.source,
        sourceRuleId: state.sourceRuleId,
        updatedByMembershipId: state.updatedByMembershipId,
        updatedAt: fixture.receivedAt
      },
      update: {
        businessId: fixture.businessId,
        source: state.source,
        sourceRuleId: state.sourceRuleId,
        updatedByMembershipId: state.updatedByMembershipId,
        updatedAt: fixture.receivedAt
      }
    });
  }
}

async function seedCustomerActivities(prisma: PrismaClient): Promise<void> {
  for (const customerId of Object.values(customerIds)) {
    const archived = customerId === customerIds.archived;
    await upsertCustomerActivity(prisma, {
      id: `${customerId}_created_activity`,
      businessId: DEMO_BUSINESS_ID,
      customerId,
      type: CustomerActivityType.CREATED,
      actorMembershipId: OWNER_MEMBERSHIP_ID,
      feedbackId: null,
      fieldName: null,
      fromValue: null,
      toValue: null,
      createdAt: SEED_AT
    });
    if (archived) {
      await upsertCustomerActivity(prisma, {
        id: `${customerId}_archived_activity`,
        businessId: DEMO_BUSINESS_ID,
        customerId,
        type: CustomerActivityType.ARCHIVED,
        actorMembershipId: ADMIN_MEMBERSHIP_ID,
        feedbackId: null,
        fieldName: "status",
        fromValue: CustomerStatus.ACTIVE,
        toValue: CustomerStatus.ARCHIVED,
        createdAt: new Date("2026-08-10T15:00:00.000Z")
      });
    }
  }

  for (const fixture of DEVELOPMENT_SEED_FEEDBACK_FIXTURES.filter(
    (item) => item.customerId
  )) {
    await upsertCustomerActivity(prisma, {
      id: `${fixture.id}_customer_linked`,
      businessId: fixture.businessId,
      customerId: fixture.customerId!,
      type: CustomerActivityType.FEEDBACK_LINKED,
      actorMembershipId: OWNER_MEMBERSHIP_ID,
      feedbackId: fixture.id,
      fieldName: null,
      fromValue: null,
      toValue: fixture.id,
      createdAt: addMinutes(fixture.receivedAt, 2)
    });
  }
}

async function seedAIAnalyses(prisma: PrismaClient): Promise<void> {
  const analyses = [
    {
      id: "dev_seed_ai_manual_praise",
      feedbackId: "dev_seed_feedback_manual_praise",
      status: FeedbackAIAnalysisStatus.COMPLETED,
      sentiment: FeedbackAISentiment.POSITIVE,
      confidence: 0.97,
      explanation: "Customer explicitly praises speed, kindness, and manager attention.",
      summary: "Group lunch received fast, attentive, and friendly service.",
      suggestedCategoryId: categoryIds.praise,
      categoryConfidence: 0.96,
      applicationResult: "MANUALLY_APPLIED",
      completedAt: new Date("2026-08-01T10:22:00.000Z"),
      errorCode: null,
      errorMessage: null
    },
    {
      id: "dev_seed_ai_public_complaint",
      feedbackId: "dev_seed_feedback_public_complaint",
      status: FeedbackAIAnalysisStatus.COMPLETED,
      sentiment: FeedbackAISentiment.NEGATIVE,
      confidence: 0.95,
      explanation: "The response describes missing items and a long wait for help.",
      summary: "Takeaway order was incomplete and counter assistance was delayed.",
      suggestedCategoryId: categoryIds.service,
      categoryConfidence: 0.94,
      applicationResult: "CONFLICTED",
      completedAt: new Date("2026-08-02T12:14:00.000Z"),
      errorCode: null,
      errorMessage: null
    },
    {
      id: "dev_seed_ai_instagram",
      feedbackId: "dev_seed_feedback_instagram",
      status: FeedbackAIAnalysisStatus.COMPLETED,
      sentiment: FeedbackAISentiment.POSITIVE,
      confidence: 0.81,
      explanation:
        "The customer likes the presentation and asks an availability question.",
      summary:
        "Customer likes the dessert presentation and asks about daily availability.",
      suggestedCategoryId: categoryIds.product,
      categoryConfidence: 0.9,
      applicationResult: "AUTO_APPLIED",
      completedAt: new Date("2026-08-05T18:14:00.000Z"),
      errorCode: null,
      errorMessage: null
    },
    {
      id: "dev_seed_ai_email_failed",
      feedbackId: "dev_seed_feedback_email",
      status: FeedbackAIAnalysisStatus.FAILED,
      sentiment: null,
      confidence: null,
      explanation: null,
      summary: null,
      suggestedCategoryId: null,
      categoryConfidence: null,
      applicationResult: null,
      completedAt: new Date("2026-08-08T09:18:00.000Z"),
      errorCode: "AI_PROVIDER_UNAVAILABLE",
      errorMessage: "The analysis provider was temporarily unavailable."
    },
    {
      id: "dev_seed_ai_other_skipped",
      feedbackId: "dev_seed_feedback_other",
      status: FeedbackAIAnalysisStatus.SKIPPED,
      sentiment: null,
      confidence: null,
      explanation: null,
      summary: null,
      suggestedCategoryId: null,
      categoryConfidence: null,
      applicationResult: null,
      completedAt: new Date("2026-08-10T11:33:00.000Z"),
      errorCode: "AI_DISABLED",
      errorMessage: "AI analysis is disabled for this Business."
    }
  ] as const;

  const seededFeedbackIds = new Set(
    DEVELOPMENT_SEED_FEEDBACK_FIXTURES.map((fixture) => fixture.id)
  );
  for (const analysis of analyses) {
    if (!seededFeedbackIds.has(analysis.feedbackId)) continue;
    const requestedAt = addMinutes(analysis.completedAt, -2);
    const data = {
      businessId: DEMO_BUSINESS_ID,
      feedbackId: analysis.feedbackId,
      status: analysis.status,
      sentiment: analysis.sentiment,
      sentimentConfidence: analysis.confidence,
      sentimentExplanation: analysis.explanation,
      summary: analysis.summary,
      detectedLanguage:
        analysis.status === FeedbackAIAnalysisStatus.COMPLETED ? "en" : null,
      suggestedCategoryId: analysis.suggestedCategoryId,
      categoryConfidence: analysis.categoryConfidence,
      suggestionDismissedAt: null,
      categoryAutoAppliedAt:
        analysis.applicationResult === "AUTO_APPLIED" ? analysis.completedAt : null,
      categoryApplicationResult: analysis.applicationResult,
      provider: "development-fixture",
      model: "deterministic-seed-v1",
      promptVersion: "phase13-v1",
      schemaVersion: "phase13-v1",
      inputFingerprint: sha256(`${analysis.feedbackId}:ai-input:v1`),
      inputTruncated: false,
      analyzedCharCount: analysis.status === FeedbackAIAnalysisStatus.COMPLETED ? 180 : 0,
      errorCode: analysis.errorCode,
      errorMessage: analysis.errorMessage,
      retryCount: analysis.status === FeedbackAIAnalysisStatus.FAILED ? 1 : 0,
      maxRetries: 3,
      nextRetryAt: null,
      requestedAt,
      startedAt:
        analysis.status === FeedbackAIAnalysisStatus.SKIPPED ? null : requestedAt,
      completedAt: analysis.completedAt,
      processingDurationMs:
        analysis.status === FeedbackAIAnalysisStatus.SKIPPED ? null : 1200,
      lockToken: null,
      lockedAt: null,
      lastAttemptAt:
        analysis.status === FeedbackAIAnalysisStatus.SKIPPED
          ? null
          : analysis.completedAt,
      updatedAt: analysis.completedAt
    };
    await prisma.feedbackAIAnalysis.upsert({
      where: { id: analysis.id },
      create: { id: analysis.id, ...data, createdAt: requestedAt },
      update: data
    });
  }
}

async function seedAutomationHistory(prisma: PrismaClient): Promise<void> {
  const feedbackId = "dev_seed_feedback_public_complaint";
  const eventId = "dev_seed_automation_event_low_rating";
  const executionId = "dev_seed_automation_execution_low_rating";
  const inputFingerprint = sha256(`${feedbackId}:automation-input:v1`);
  const completedAt = new Date("2026-08-02T12:13:00.000Z");

  await prisma.automationEvent.upsert({
    where: { id: eventId },
    create: {
      id: eventId,
      businessId: DEMO_BUSINESS_ID,
      feedbackId,
      trigger: AutomationRuleTrigger.FEEDBACK_CREATED,
      status: AutomationEventStatus.COMPLETED,
      eventKey: "dev-seed-feedback-created-public-complaint",
      inputFingerprint,
      eventChainId: sha256("dev-seed-event-chain-public-complaint"),
      eventDepth: 0,
      retryCount: 0,
      maxRetries: 3,
      queuedAt: addMinutes(completedAt, -1),
      startedAt: addMinutes(completedAt, -1),
      completedAt,
      createdAt: addMinutes(completedAt, -1),
      updatedAt: completedAt
    },
    update: {
      businessId: DEMO_BUSINESS_ID,
      feedbackId,
      trigger: AutomationRuleTrigger.FEEDBACK_CREATED,
      status: AutomationEventStatus.COMPLETED,
      eventKey: "dev-seed-feedback-created-public-complaint",
      inputFingerprint,
      eventChainId: sha256("dev-seed-event-chain-public-complaint"),
      eventDepth: 0,
      lockToken: null,
      lockedAt: null,
      retryCount: 0,
      maxRetries: 3,
      errorCode: null,
      errorMessage: null,
      queuedAt: addMinutes(completedAt, -1),
      startedAt: addMinutes(completedAt, -1),
      completedAt,
      updatedAt: completedAt
    }
  });

  await prisma.automationExecution.upsert({
    where: { id: executionId },
    create: {
      id: executionId,
      businessId: DEMO_BUSINESS_ID,
      eventId,
      ruleId: AUTOMATION_RULE_ID,
      feedbackId,
      trigger: AutomationRuleTrigger.FEEDBACK_CREATED,
      status: AutomationExecutionStatus.SUCCESS,
      matched: true,
      ruleVersion: 1,
      ruleSnapshot: {
        name: "Urgent triage for low ratings",
        developmentSeed: true
      },
      conditionResults: [{ condition: "rating <= 2", matched: true }],
      inputFingerprint,
      executionKey: "dev-seed-execution-low-rating-public-complaint-v1",
      actionsSucceeded: 2,
      actionsSkipped: 0,
      actionsFailed: 0,
      startedAt: addMinutes(completedAt, -1),
      completedAt,
      durationMs: 75,
      createdAt: completedAt
    },
    update: {
      businessId: DEMO_BUSINESS_ID,
      eventId,
      ruleId: AUTOMATION_RULE_ID,
      feedbackId,
      trigger: AutomationRuleTrigger.FEEDBACK_CREATED,
      status: AutomationExecutionStatus.SUCCESS,
      matched: true,
      ruleVersion: 1,
      ruleSnapshot: {
        name: "Urgent triage for low ratings",
        developmentSeed: true
      },
      conditionResults: [{ condition: "rating <= 2", matched: true }],
      inputFingerprint,
      executionKey: "dev-seed-execution-low-rating-public-complaint-v1",
      safeErrorCode: null,
      safeErrorMessage: null,
      actionsSucceeded: 2,
      actionsSkipped: 0,
      actionsFailed: 0,
      startedAt: addMinutes(completedAt, -1),
      completedAt,
      durationMs: 75
    }
  });

  const actionExecutions = [
    {
      id: "dev_seed_action_execution_priority",
      actionId: AUTOMATION_PRIORITY_ACTION_ID,
      actionType: AutomationActionType.SET_PRIORITY,
      actionPosition: 1,
      fieldName: "priority",
      previousValue: FeedbackPriority.NORMAL,
      newValue: FeedbackPriority.URGENT
    },
    {
      id: "dev_seed_action_execution_assignment",
      actionId: AUTOMATION_ASSIGN_ACTION_ID,
      actionType: AutomationActionType.ASSIGN_TO_MEMBERSHIP,
      actionPosition: 2,
      fieldName: "assignment",
      previousValue: null,
      newValue: SUPPORT_MEMBERSHIP_ID
    }
  ] as const;

  for (const action of actionExecutions) {
    await prisma.automationActionExecution.upsert({
      where: { id: action.id },
      create: {
        ...action,
        executionId,
        status: AutomationActionExecutionStatus.SUCCESS,
        createdAt: completedAt
      },
      update: {
        ...action,
        executionId,
        status: AutomationActionExecutionStatus.SUCCESS,
        safeErrorCode: null,
        safeErrorMessage: null
      }
    });
  }
}

async function seedDemoIntegrations(prisma: PrismaClient): Promise<void> {
  const baseTime = new Date("2026-08-12T10:00:00.000Z");

  for (const [index, fixture] of DEVELOPMENT_SEED_INTEGRATION_FIXTURES.entries()) {
    const runAt = addMinutes(baseTime, index * 30);
    const pausedAt =
      fixture.status === IntegrationConnectionStatus.PAUSED
        ? addMinutes(runAt, 10)
        : null;
    const disconnectedAt =
      fixture.status === IntegrationConnectionStatus.DISCONNECTED
        ? addMinutes(runAt, 10)
        : null;
    const lastErrorCode =
      fixture.status === IntegrationConnectionStatus.ERROR
        ? "DEMO_CONNECTION_TEST_FAILED"
        : null;

    await prisma.integrationConnection.upsert({
      where: { id: fixture.id },
      create: {
        id: fixture.id,
        businessId: DEMO_BUSINESS_ID,
        provider: fixture.provider,
        mode: fixture.mode,
        status: fixture.status,
        displayName: fixture.displayName,
        defaultBranchId: fixture.defaultBranchId,
        demoScenario: fixture.demoScenario,
        liveProviderType: null,
        providerAccountId: null,
        providerAccountLabel: null,
        providerTenantId: null,
        synchronizationFolder: "INBOX",
        lastProviderCursor: null,
        lastProviderCursorAt: null,
        requiresReauthorization: false,
        lastConnectionTestAt: runAt,
        lastConnectionTestStatus:
          fixture.status === IntegrationConnectionStatus.ERROR ? "FAILED" : "PASSED",
        whatsappPhoneNumberId: null,
        whatsappBusinessAccountId: null,
        whatsappDisplayPhoneNumber: null,
        webhookVerifyTokenHash: null,
        webhookStatus: null,
        lastWebhookReceivedAt: null,
        lastWebhookVerifiedAt: null,
        lastInboundMessageAt: null,
        createdByMembershipId: OWNER_MEMBERSHIP_ID,
        updatedByMembershipId: ADMIN_MEMBERSHIP_ID,
        connectedAt: SEED_AT,
        pausedAt,
        disconnectedAt,
        lastAttemptedSyncAt: runAt,
        lastSuccessfulSyncAt: runAt,
        lastErrorCode,
        totalImported: 1,
        createdAt: SEED_AT,
        updatedAt: runAt
      },
      update: {
        businessId: DEMO_BUSINESS_ID,
        provider: fixture.provider,
        mode: fixture.mode,
        status: fixture.status,
        displayName: fixture.displayName,
        defaultBranchId: fixture.defaultBranchId,
        demoScenario: fixture.demoScenario,
        liveProviderType: null,
        providerAccountId: null,
        providerAccountLabel: null,
        providerTenantId: null,
        synchronizationFolder: "INBOX",
        lastProviderCursor: null,
        lastProviderCursorAt: null,
        requiresReauthorization: false,
        lastConnectionTestAt: runAt,
        lastConnectionTestStatus:
          fixture.status === IntegrationConnectionStatus.ERROR ? "FAILED" : "PASSED",
        whatsappPhoneNumberId: null,
        whatsappBusinessAccountId: null,
        whatsappDisplayPhoneNumber: null,
        webhookVerifyTokenHash: null,
        webhookStatus: null,
        lastWebhookReceivedAt: null,
        lastWebhookVerifiedAt: null,
        lastInboundMessageAt: null,
        createdByMembershipId: OWNER_MEMBERSHIP_ID,
        updatedByMembershipId: ADMIN_MEMBERSHIP_ID,
        connectedAt: SEED_AT,
        pausedAt,
        disconnectedAt,
        lastAttemptedSyncAt: runAt,
        lastSuccessfulSyncAt: runAt,
        lastErrorCode,
        totalImported: 1,
        updatedAt: runAt
      }
    });

    const runId = `${fixture.id}_run`;
    const hasFailure = fixture.demoScenario === IntegrationDemoScenario.PARTIAL_FAILURE;
    await prisma.synchronizationRun.upsert({
      where: { id: runId },
      create: {
        id: runId,
        connectionId: fixture.id,
        businessId: DEMO_BUSINESS_ID,
        provider: fixture.provider,
        mode: fixture.mode,
        status: hasFailure
          ? SynchronizationRunStatus.COMPLETED_WITH_ERRORS
          : SynchronizationRunStatus.COMPLETED,
        triggerType: SynchronizationTriggerType.MANUAL,
        startedByMembershipId: OWNER_MEMBERSHIP_ID,
        demoScenario: fixture.demoScenario,
        requestedAt: addMinutes(runAt, -1),
        startedAt: addMinutes(runAt, -1),
        completedAt: runAt,
        durationMs: 450,
        itemsFetched: hasFailure ? 2 : 1,
        itemsProcessed: hasFailure ? 2 : 1,
        itemsImported: 1,
        itemsDuplicated: 0,
        itemsSkipped: 0,
        itemsFailed: hasFailure ? 1 : 0,
        safeSummary: hasFailure
          ? "Development demo synchronization completed with one intentional safe failure."
          : "Development demo synchronization completed.",
        attempts: 1,
        createdAt: addMinutes(runAt, -1),
        updatedAt: runAt
      },
      update: {
        connectionId: fixture.id,
        businessId: DEMO_BUSINESS_ID,
        provider: fixture.provider,
        mode: fixture.mode,
        status: hasFailure
          ? SynchronizationRunStatus.COMPLETED_WITH_ERRORS
          : SynchronizationRunStatus.COMPLETED,
        triggerType: SynchronizationTriggerType.MANUAL,
        startedByMembershipId: OWNER_MEMBERSHIP_ID,
        demoScenario: fixture.demoScenario,
        requestedAt: addMinutes(runAt, -1),
        startedAt: addMinutes(runAt, -1),
        completedAt: runAt,
        durationMs: 450,
        itemsFetched: hasFailure ? 2 : 1,
        itemsProcessed: hasFailure ? 2 : 1,
        itemsImported: 1,
        itemsDuplicated: 0,
        itemsSkipped: 0,
        itemsFailed: hasFailure ? 1 : 0,
        errorCode: null,
        safeSummary: hasFailure
          ? "Development demo synchronization completed with one intentional safe failure."
          : "Development demo synchronization completed.",
        lockToken: null,
        attempts: 1,
        nextAttemptAt: null,
        updatedAt: runAt
      }
    });

    await prisma.synchronizationItem.upsert({
      where: { id: `${fixture.id}_item_imported` },
      create: {
        id: `${fixture.id}_item_imported`,
        runId,
        connectionId: fixture.id,
        provider: fixture.provider,
        externalId: fixture.externalId,
        payloadHash: sha256(`${fixture.externalId}:sync-item:v1`),
        status: SynchronizationItemStatus.IMPORTED,
        feedbackIngestionId: fixture.ingestionId,
        feedbackId: fixture.feedbackId,
        resultCode: "IMPORTED",
        safeMessage:
          "Simulated external feedback imported by the development seed fixture.",
        externalReceivedAt: addMinutes(runAt, -5),
        sourceLabel: fixture.sourceLabel,
        safePreview: {
          provider: fixture.provider,
          demoMode: true,
          simulatedExternalData: true,
          developmentSeed: true
        },
        processedAt: runAt,
        retryCount: 0,
        createdAt: runAt,
        updatedAt: runAt
      },
      update: {
        runId,
        connectionId: fixture.id,
        provider: fixture.provider,
        externalId: fixture.externalId,
        payloadHash: sha256(`${fixture.externalId}:sync-item:v1`),
        status: SynchronizationItemStatus.IMPORTED,
        feedbackIngestionId: fixture.ingestionId,
        feedbackId: fixture.feedbackId,
        resultCode: "IMPORTED",
        safeMessage:
          "Simulated external feedback imported by the development seed fixture.",
        externalReceivedAt: addMinutes(runAt, -5),
        sourceLabel: fixture.sourceLabel,
        safePreview: {
          provider: fixture.provider,
          demoMode: true,
          simulatedExternalData: true,
          developmentSeed: true
        },
        processedAt: runAt,
        retryCount: 0,
        updatedAt: runAt
      }
    });

    if (hasFailure) {
      const failedExternalId = "demo-instagram-partial-invalid";
      await prisma.synchronizationItem.upsert({
        where: { id: `${fixture.id}_item_failed` },
        create: {
          id: `${fixture.id}_item_failed`,
          runId,
          connectionId: fixture.id,
          provider: fixture.provider,
          externalId: failedExternalId,
          payloadHash: sha256(`${failedExternalId}:sync-item:v1`),
          status: SynchronizationItemStatus.FAILED,
          resultCode: "DEMO_ITEM_INVALID",
          safeMessage: "Intentional development fixture failure for retry-state testing.",
          externalReceivedAt: addMinutes(runAt, -4),
          sourceLabel: "Simulated invalid external item",
          safePreview: {
            provider: fixture.provider,
            demoMode: true,
            simulatedExternalData: true,
            developmentSeed: true
          },
          processedAt: runAt,
          retryCount: 0,
          createdAt: runAt,
          updatedAt: runAt
        },
        update: {
          runId,
          connectionId: fixture.id,
          provider: fixture.provider,
          externalId: failedExternalId,
          payloadHash: sha256(`${failedExternalId}:sync-item:v1`),
          status: SynchronizationItemStatus.FAILED,
          feedbackIngestionId: null,
          feedbackId: null,
          resultCode: "DEMO_ITEM_INVALID",
          safeMessage: "Intentional development fixture failure for retry-state testing.",
          externalReceivedAt: addMinutes(runAt, -4),
          sourceLabel: "Simulated invalid external item",
          safePreview: {
            provider: fixture.provider,
            demoMode: true,
            simulatedExternalData: true,
            developmentSeed: true
          },
          processedAt: runAt,
          retryCount: 0,
          updatedAt: runAt
        }
      });
    }
  }

  // The development seed deliberately creates no LIVE connection, credential,
  // OAuth state, or webhook delivery. This count is checked and reported by the runner.
}

async function upsertFeedbackActivity(
  prisma: PrismaClient,
  data: Prisma.FeedbackActivityUncheckedCreateInput
): Promise<void> {
  const { id, ...values } = data;
  await prisma.feedbackActivity.upsert({
    where: { id },
    create: data,
    update: values
  });
}

async function upsertCustomerActivity(
  prisma: PrismaClient,
  data: Prisma.CustomerActivityUncheckedCreateInput
): Promise<void> {
  const { id, ...values } = data;
  await prisma.customerActivity.upsert({
    where: { id },
    create: data,
    update: values
  });
}

function transitionsForStatus(
  status: FeedbackStatus
): readonly { from: FeedbackStatus; to: FeedbackStatus }[] {
  if (status === FeedbackStatus.IN_REVIEW) {
    return [{ from: FeedbackStatus.NEW, to: FeedbackStatus.IN_REVIEW }];
  }
  if (status === FeedbackStatus.RESOLVED) {
    return [{ from: FeedbackStatus.NEW, to: FeedbackStatus.RESOLVED }];
  }
  if (status === FeedbackStatus.CLOSED) {
    return [
      { from: FeedbackStatus.NEW, to: FeedbackStatus.RESOLVED },
      { from: FeedbackStatus.RESOLVED, to: FeedbackStatus.CLOSED }
    ];
  }
  return [];
}

async function safePasswordMatch(hash: string, password: string): Promise<boolean> {
  try {
    return await verifyPassword(hash, password);
  } catch {
    return false;
  }
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
