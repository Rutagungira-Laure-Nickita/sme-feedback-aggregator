import type { Prisma, Customer } from "@prisma/client";
import { CustomerStatus } from "../../lib/prisma-runtime.js";
import { prisma } from "../../lib/prisma.js";
import {
  normalizeEmailForLookup,
  normalizeNameForSuggestion,
  normalizePhoneForMatching
} from "./customer-normalization.js";
import type { CustomerMatchGroups, CustomerMatchSummary } from "./customer.types.js";

type PrismaClientOrTransaction = typeof prisma | Prisma.TransactionClient;

export type CustomerMatchInput = {
  businessId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  customerWhere?: Prisma.CustomerWhereInput;
};

export class CustomerMatchingService {
  public async findAutomaticLink(
    input: CustomerMatchInput,
    client: PrismaClientOrTransaction = prisma
  ): Promise<{ customerId: string } | null> {
    const normalizedEmail = normalizeEmailForLookup(input.email);
    const normalizedPhone = normalizePhoneForMatching(input.phone);

    if (!normalizedEmail && !normalizedPhone) {
      return null;
    }

    const baseWhere = this.buildWhere(input);
    const [emailMatches, phoneMatches] = await Promise.all([
      normalizedEmail
        ? client.customer.findMany({
            where: {
              ...baseWhere,
              status: CustomerStatus.ACTIVE,
              normalizedEmail
            },
            select: { id: true }
          })
        : Promise.resolve([]),
      normalizedPhone
        ? client.customer.findMany({
            where: {
              ...baseWhere,
              status: CustomerStatus.ACTIVE,
              normalizedPhone
            },
            select: { id: true }
          })
        : Promise.resolve([])
    ]);

    if (emailMatches.length > 1 || phoneMatches.length > 1) {
      return null;
    }

    const emailId = emailMatches[0]?.id ?? null;
    const phoneId = phoneMatches[0]?.id ?? null;

    if (emailId && phoneId && emailId === phoneId) {
      return { customerId: emailId };
    }

    if (emailId && !phoneId) {
      return { customerId: emailId };
    }

    if (phoneId && !emailId) {
      return { customerId: phoneId };
    }

    return null;
  }

  public async findPossibleMatches(
    input: CustomerMatchInput,
    client: PrismaClientOrTransaction = prisma
  ): Promise<CustomerMatchGroups> {
    const normalizedEmail = normalizeEmailForLookup(input.email);
    const normalizedPhone = normalizePhoneForMatching(input.phone);
    const normalizedName = normalizeNameForSuggestion(input.name);
    const baseWhere = this.buildWhere(input);

    const [emailMatches, phoneMatches, nameMatches, archivedMatches] = await Promise.all([
      normalizedEmail
        ? client.customer.findMany({
            where: {
              ...baseWhere,
              status: CustomerStatus.ACTIVE,
              normalizedEmail
            },
            orderBy: { updatedAt: "desc" },
            take: 10
          })
        : Promise.resolve([]),
      normalizedPhone
        ? client.customer.findMany({
            where: {
              ...baseWhere,
              status: CustomerStatus.ACTIVE,
              normalizedPhone
            },
            orderBy: { updatedAt: "desc" },
            take: 10
          })
        : Promise.resolve([]),
      normalizedName
        ? client.customer.findMany({
            where: {
              ...baseWhere,
              status: CustomerStatus.ACTIVE,
              displayName: { equals: input.name?.trim() }
            },
            orderBy: { updatedAt: "desc" },
            take: 10
          })
        : Promise.resolve([]),
      normalizedEmail || normalizedPhone
        ? client.customer.findMany({
            where: {
              ...baseWhere,
              status: CustomerStatus.ARCHIVED,
              OR: [
                ...(normalizedEmail ? [{ normalizedEmail }] : []),
                ...(normalizedPhone ? [{ normalizedPhone }] : [])
              ]
            },
            orderBy: { updatedAt: "desc" },
            take: 10
          })
        : Promise.resolve([])
    ]);

    const emailIds = new Set(emailMatches.map((customer) => customer.id));
    const phoneIds = new Set(phoneMatches.map((customer) => customer.id));
    const conflicting = [...emailMatches, ...phoneMatches].filter(
      (customer) =>
        (emailIds.size > 0 && phoneIds.size > 0 && !emailIds.has(customer.id)) ||
        (emailIds.size > 0 && phoneIds.size > 0 && !phoneIds.has(customer.id))
    );

    return {
      exactEmailMatches: dedupeCustomers(emailMatches).map(toMatchSummary),
      exactPhoneMatches: dedupeCustomers(phoneMatches).map(toMatchSummary),
      conflictingMatches: dedupeCustomers(conflicting).map(toMatchSummary),
      exactNameSuggestions: dedupeCustomers(
        nameMatches.filter(
          (customer) => !emailIds.has(customer.id) && !phoneIds.has(customer.id)
        )
      ).map(toMatchSummary),
      archivedMatches: dedupeCustomers(archivedMatches).map(toMatchSummary)
    };
  }

  private buildWhere(input: CustomerMatchInput): Prisma.CustomerWhereInput {
    return {
      businessId: input.businessId,
      ...(input.customerWhere ?? {})
    };
  }
}

export const customerMatchingService = new CustomerMatchingService();

function dedupeCustomers<T extends Pick<Customer, "id">>(customers: T[]): T[] {
  const seen = new Set<string>();
  return customers.filter((customer) => {
    if (seen.has(customer.id)) {
      return false;
    }
    seen.add(customer.id);
    return true;
  });
}

export function toMatchSummary(
  customer: Pick<
    Customer,
    "id" | "displayName" | "email" | "phone" | "status" | "createdAt" | "updatedAt"
  >
): CustomerMatchSummary {
  return {
    id: customer.id,
    displayName: customer.displayName,
    email: customer.email,
    phone: customer.phone,
    status: customer.status,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString()
  };
}
