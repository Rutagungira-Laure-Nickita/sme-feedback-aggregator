import type { Prisma } from "@prisma/client";

export const DEFAULT_FEEDBACK_CATEGORIES = [
  {
    key: "service-quality",
    name: "Service Quality",
    description:
      "Service speed, responsiveness, attentiveness, and overall service delivery.",
    colorKey: "blue"
  },
  {
    key: "product-food-quality",
    name: "Product / Food Quality",
    description:
      "Quality, freshness, preparation, presentation, or condition of products and food.",
    colorKey: "orange"
  },
  {
    key: "staff-conduct",
    name: "Staff Conduct",
    description: "Staff professionalism, friendliness, communication, or behavior.",
    colorKey: "violet"
  },
  {
    key: "waiting-time",
    name: "Waiting Time",
    description: "Queues, delays, service speed, preparation time, or delivery time.",
    colorKey: "amber"
  },
  {
    key: "order-accuracy",
    name: "Order Accuracy",
    description:
      "Missing items, wrong products, incorrect orders, or fulfillment mistakes.",
    colorKey: "rose"
  },
  {
    key: "billing-payments",
    name: "Billing & Payments",
    description:
      "Prices, invoices, charges, payment methods, refunds, or billing errors.",
    colorKey: "amber"
  },
  {
    key: "facilities-cleanliness",
    name: "Facilities & Cleanliness",
    description:
      "Cleanliness, hygiene, seating, environment, accessibility, or physical facilities.",
    colorKey: "emerald"
  },
  {
    key: "digital-experience",
    name: "Digital Experience",
    description:
      "Website, online ordering, digital forms, links, or digital communication.",
    colorKey: "indigo"
  },
  {
    key: "complaint",
    name: "Complaint",
    description:
      "General complaints that do not fit a more specific operational category.",
    colorKey: "rose"
  },
  {
    key: "praise-compliment",
    name: "Praise / Compliment",
    description:
      "Positive recognition or appreciation for a product, service, team member, or experience.",
    colorKey: "emerald"
  },
  {
    key: "suggestion-improvement",
    name: "Suggestion / Improvement",
    description:
      "Customer suggestions for improving the business or customer experience.",
    colorKey: "violet"
  },
  {
    key: "product-feature-request",
    name: "Product / Feature Request",
    description: "Requests for a new product, service, menu item, option, or capability.",
    colorKey: "indigo"
  },
  {
    key: "other",
    name: "Other",
    description: "Feedback that does not clearly fit another active category.",
    colorKey: "slate"
  }
] as const;

export type DefaultFeedbackCategory = (typeof DEFAULT_FEEDBACK_CATEGORIES)[number];

type FeedbackCategoryWriter = Pick<Prisma.TransactionClient, "feedbackCategory">;

export function defaultFeedbackCategoryData(businessId: string) {
  return DEFAULT_FEEDBACK_CATEGORIES.map(({ key: _key, ...category }) => ({
    businessId,
    ...category,
    isActive: true
  }));
}

export async function createDefaultFeedbackCategories(
  tx: FeedbackCategoryWriter,
  businessId: string
): Promise<void> {
  await tx.feedbackCategory.createMany({
    data: defaultFeedbackCategoryData(businessId),
    skipDuplicates: true
  });
}
