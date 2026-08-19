import "dotenv/config";
import { AccountStatus, PrismaClient, UserRole } from "../src/lib/prisma-runtime.js";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  DEFAULT_DEVELOPMENT_SEED_PASSWORD,
  seedDevelopmentData
} from "../src/scripts/development-seed.js";
import { hashPassword, verifyPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

const platformAdminSchema = z.object({
  PLATFORM_ADMIN_EMAIL: z
    .string()
    .trim()
    .email()
    .max(255)
    .transform((email) => email.toLowerCase()),
  PLATFORM_ADMIN_PASSWORD: z.string().min(10).max(128),
  PLATFORM_ADMIN_FIRST_NAME: z.string().trim().min(1).max(100),
  PLATFORM_ADMIN_LAST_NAME: z.string().trim().min(1).max(100)
});

const developmentSeedSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEVELOPMENT_SEED_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
  DEVELOPMENT_SEED_PASSWORD: z
    .string()
    .min(10)
    .max(128)
    .default(DEFAULT_DEVELOPMENT_SEED_PASSWORD)
});

async function doesPasswordMatch(
  passwordHash: string | null,
  password: string
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  try {
    return await verifyPassword(passwordHash, password);
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const platformAdminResult = platformAdminSchema.safeParse(process.env);

  if (!platformAdminResult.success) {
    const missingOrInvalidFields = platformAdminResult.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");

    throw new Error(
      `Platform administrator seed requires valid environment variables: ${missingOrInvalidFields}.`
    );
  }

  const platformAdmin = platformAdminResult.data;

  const existingUser = await prisma.user.findUnique({
    where: { email: platformAdmin.PLATFORM_ADMIN_EMAIL }
  });

  const verifiedAt = new Date();

  if (existingUser) {
    if (existingUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new Error(
        "Platform administrator email already belongs to a non-admin account. Choose a dedicated admin email."
      );
    }

    const updates: Prisma.UserUpdateInput = {};

    if (existingUser.email !== platformAdmin.PLATFORM_ADMIN_EMAIL) {
      updates.email = platformAdmin.PLATFORM_ADMIN_EMAIL;
    }

    if (existingUser.firstName !== platformAdmin.PLATFORM_ADMIN_FIRST_NAME) {
      updates.firstName = platformAdmin.PLATFORM_ADMIN_FIRST_NAME;
    }

    if (existingUser.lastName !== platformAdmin.PLATFORM_ADMIN_LAST_NAME) {
      updates.lastName = platformAdmin.PLATFORM_ADMIN_LAST_NAME;
    }

    if (existingUser.status !== AccountStatus.ACTIVE) {
      updates.status = AccountStatus.ACTIVE;
    }

    if (!existingUser.emailVerifiedAt) {
      updates.emailVerifiedAt = verifiedAt;
    }

    const passwordAlreadyMatches = await doesPasswordMatch(
      existingUser.passwordHash,
      platformAdmin.PLATFORM_ADMIN_PASSWORD
    );

    if (!passwordAlreadyMatches) {
      updates.passwordHash = await hashPassword(platformAdmin.PLATFORM_ADMIN_PASSWORD);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: updates
      });

      console.info("Platform administrator seed reconciled.");
    } else {
      console.info("Platform administrator already matches seed configuration.");
    }
  } else {
    await prisma.user.create({
      data: {
        email: platformAdmin.PLATFORM_ADMIN_EMAIL,
        passwordHash: await hashPassword(platformAdmin.PLATFORM_ADMIN_PASSWORD),
        firstName: platformAdmin.PLATFORM_ADMIN_FIRST_NAME,
        lastName: platformAdmin.PLATFORM_ADMIN_LAST_NAME,
        role: UserRole.PLATFORM_ADMIN,
        status: AccountStatus.ACTIVE,
        emailVerifiedAt: verifiedAt
      }
    });

    console.info("Platform administrator seed completed.");
  }

  const developmentSeed = developmentSeedSchema.parse(process.env);
  if (developmentSeed.NODE_ENV === "production") {
    console.info("Comprehensive development seed skipped in production.");
    return;
  }

  if (!developmentSeed.DEVELOPMENT_SEED_ENABLED) {
    console.info("Comprehensive development seed disabled by configuration.");
    return;
  }

  const summary = await seedDevelopmentData(
    prisma,
    developmentSeed.DEVELOPMENT_SEED_PASSWORD
  );
  console.info(
    `Development seed completed: ${summary.users} users, ${summary.businesses} businesses, ${summary.branches} branches, ${summary.memberships} memberships, ${summary.customers} customers, ${summary.feedback} feedback records, ${summary.demoConnections} Demo connections, ${summary.liveConnections} Live connections.`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
