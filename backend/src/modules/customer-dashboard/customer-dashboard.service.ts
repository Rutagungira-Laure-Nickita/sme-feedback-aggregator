import type { Prisma } from "@prisma/client";
import { UserRole } from "../../lib/prisma-runtime.js";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { supportedOperationalFeedbackWhere } from "../integrations/supported-integration-policy.js";

type Actor = { userId: string; role: UserRole };
type CustomerFeedbackQuery = {
  page: number;
  pageSize: number;
  search?: string;
  status?: "NEW" | "IN_REVIEW" | "RESOLVED" | "CLOSED";
  channel?: "MANUAL" | "PUBLIC_FORM" | "QR_CODE" | "WHATSAPP" | "EMAIL";
  sort: "newest" | "oldest";
};

async function customerIdentity(actor: Actor) {
  if (actor.role !== UserRole.CUSTOMER) {
    throw new AppError("Customer access is required.", "FORBIDDEN", 403);
  }
  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { id: true, email: true, firstName: true, lastName: true }
  });
  if (!user) throw new AppError("Customer account not found.", "USER_NOT_FOUND", 404);
  return { ...user, normalizedEmail: user.email.trim().toLowerCase() };
}

function ownershipWhere(
  email: string,
  normalizedEmail: string
): Prisma.FeedbackWhereInput {
  return {
    AND: [
      supportedOperationalFeedbackWhere(),
      {
        deletedAt: null,
        OR: [{ customerEmail: email }, { customer: { is: { normalizedEmail } } }]
      }
    ]
  };
}

const customerFeedbackSelect = {
  id: true,
  title: true,
  message: true,
  channel: true,
  status: true,
  rating: true,
  occurredAt: true,
  receivedAt: true,
  createdAt: true,
  business: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } }
} satisfies Prisma.FeedbackSelect;

function serializeFeedback(
  item: Prisma.FeedbackGetPayload<{ select: typeof customerFeedbackSelect }>
) {
  return {
    ...item,
    occurredAt: item.occurredAt?.toISOString() ?? null,
    receivedAt: item.receivedAt.toISOString(),
    createdAt: item.createdAt.toISOString()
  };
}

export async function getCustomerDashboard(actor: Actor) {
  const user = await customerIdentity(actor);
  const where = ownershipWhere(user.email, user.normalizedEmail);
  const [total, statuses, recent, destinations] = await Promise.all([
    prisma.feedback.count({ where }),
    prisma.feedback.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.feedback.findMany({
      where,
      select: customerFeedbackSelect,
      orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
      take: 5
    }),
    prisma.business.findMany({
      where: {
        publicFeedbackEnabled: true,
        publicFeedbackToken: { not: null },
        feedbacks: { some: where }
      },
      select: { id: true, name: true, publicFeedbackToken: true },
      orderBy: { name: "asc" }
    })
  ]);
  return {
    customer: { firstName: user.firstName, lastName: user.lastName, email: user.email },
    totals: {
      total,
      new: statuses.find((item) => item.status === "NEW")?._count._all ?? 0,
      inReview: statuses.find((item) => item.status === "IN_REVIEW")?._count._all ?? 0,
      resolved: statuses.find((item) => item.status === "RESOLVED")?._count._all ?? 0,
      closed: statuses.find((item) => item.status === "CLOSED")?._count._all ?? 0
    },
    recent: recent.map(serializeFeedback),
    submissionDestinations: destinations.map((item) => ({
      businessId: item.id,
      businessName: item.name,
      path: `/feedback/${item.publicFeedbackToken}`
    }))
  };
}

export async function listCustomerFeedback(actor: Actor, query: CustomerFeedbackQuery) {
  const user = await customerIdentity(actor);
  const base = ownershipWhere(user.email, user.normalizedEmail);
  const where: Prisma.FeedbackWhereInput = {
    AND: [
      base,
      {
        status: query.status,
        channel: query.channel,
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search } },
                { message: { contains: query.search } },
                { business: { is: { name: { contains: query.search } } } },
                { branch: { is: { name: { contains: query.search } } } }
              ]
            }
          : {})
      }
    ]
  };
  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      select: customerFeedbackSelect,
      orderBy:
        query.sort === "oldest"
          ? [{ receivedAt: "asc" }, { id: "asc" }]
          : [{ receivedAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.feedback.count({ where })
  ]);
  return {
    items: items.map(serializeFeedback),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize))
    }
  };
}

export async function getCustomerFeedbackDetail(actor: Actor, feedbackId: string) {
  const user = await customerIdentity(actor);
  const feedback = await prisma.feedback.findFirst({
    where: { id: feedbackId, ...ownershipWhere(user.email, user.normalizedEmail) },
    select: customerFeedbackSelect
  });
  if (!feedback) {
    throw new AppError("Feedback not found.", "CUSTOMER_FEEDBACK_NOT_FOUND", 404);
  }
  return serializeFeedback(feedback);
}
