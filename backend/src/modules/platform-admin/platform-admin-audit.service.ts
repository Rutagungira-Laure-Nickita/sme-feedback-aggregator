import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

type AdminActivityInput = {
  actorUserId: string;
  action: string;
  targetType: "BUSINESS" | "USER" | "INTEGRATION" | "PLATFORM_SETTINGS";
  targetId?: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
};

/** Persists only operational identifiers and safe state changes; never credentials or feedback content. */
export async function recordPlatformAdminActivity(input: AdminActivityInput) {
  return prisma.platformAdminActivity.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      metadata: input.metadata
    }
  });
}
