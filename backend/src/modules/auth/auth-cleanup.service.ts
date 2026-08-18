import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "@prisma/client";

const USED_TOKEN_RETENTION_MS = 24 * 60 * 60_000;
const SESSION_RETENTION_MS = 30 * 24 * 60 * 60_000;

type AuthCleanupClient = Pick<Prisma.TransactionClient, "accountToken" | "session">;

export async function cleanupExpiredAuthData(
  tx: AuthCleanupClient = prisma
): Promise<void> {
  const now = new Date();
  const usedTokenCutoff = new Date(Date.now() - USED_TOKEN_RETENTION_MS);
  const sessionCutoff = new Date(Date.now() - SESSION_RETENTION_MS);

  await tx.accountToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null, lt: usedTokenCutoff } }]
    }
  });

  await tx.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: sessionCutoff } },
        { revokedAt: { not: null, lt: sessionCutoff } }
      ]
    }
  });
}
