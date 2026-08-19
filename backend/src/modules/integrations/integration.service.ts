import { createHash, randomUUID } from "node:crypto";
import type {
  Branch,
  BusinessMembership,
  IntegrationConnection,
  SynchronizationRun
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  BranchStatus,
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus,
  EmailProviderType,
  IntegrationConnectionStatus,
  IntegrationCredentialType,
  IntegrationOAuthAction,
  IntegrationMode,
  IntegrationProvider,
  Prisma as PrismaRuntime,
  SynchronizationItemStatus,
  SynchronizationRunStatus,
  SynchronizationTriggerType
} from "../../lib/prisma-runtime.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import {
  feedbackProcessingService,
  type JsonObject
} from "../feedback-processing/index.js";
import { integrationConnectorRegistry } from "./integration-registry.js";
import {
  INTEGRATION_ERRORS,
  IntegrationError,
  type IntegrationErrorCode,
  safeIntegrationError
} from "./integration.errors.js";
import type {
  CreateIntegrationConnectionInput,
  ListIntegrationConnectionsQuery,
  ListSynchronizationRunsQuery,
  UpdateIntegrationConnectionInput
} from "./integration.schemas.js";
import type {
  ExternalFeedbackItem,
  IntegrationConnectionContext
} from "./integration.types.js";
import {
  assertLiveEmailConfigured,
  createGmailAuthorizationSession,
  exchangeGmailAuthorizationCode,
  maskEmail,
  oauthVerifierAssociatedData
} from "./gmail-live-connector.js";
import {
  assertLiveOutlookConfigured,
  createOutlookAuthorizationSession,
  exchangeOutlookAuthorizationCode,
  outlookVerifierAssociatedData
} from "./outlook-live-connector.js";
import {
  assertLiveMetaSocialConfigured,
  storeMetaSocialAccessToken
} from "./meta-social-live-connector.js";
import {
  assertIntegrationEncryptionReady,
  decryptIntegrationSecret,
  encryptIntegrationSecret
} from "./integration-credential-encryption.js";
import {
  assertLiveWhatsAppConfigured,
  currentWhatsAppVerifyTokenHash,
  maskPhone,
  storeWhatsAppAccessToken
} from "./whatsapp-live-connector.js";

type Actor = { userId: string };
type LiveEmailProviderType =
  typeof EmailProviderType.GMAIL | typeof EmailProviderType.MICROSOFT;
type ManagementContext = {
  businessId: string;
  membership: BusinessMembership & {
    branchAccess: { branchId: string; branch: Branch }[];
    business: { status: BusinessStatus };
  };
};

const ACTIVE_RUN_STATUSES = [
  SynchronizationRunStatus.PENDING,
  SynchronizationRunStatus.RUNNING
];
const MAX_CONNECTIONS_PER_BUSINESS = 6;
const MAX_SYNC_ITEMS = 20;
const MAX_ITEM_RETRIES = 3;
const STALE_RUN_MINUTES = 15;
const OAUTH_STATE_TTL_MINUTES = 10;

const connectionInclude = {
  defaultBranch: { select: { id: true, name: true, status: true } },
  synchronizationRuns: {
    orderBy: { createdAt: "desc" },
    take: 1
  }
} satisfies Prisma.IntegrationConnectionInclude;

export async function listIntegrationProviders(actor: Actor, businessId: string) {
  await resolveIntegrationManagementContext(actor, businessId);
  const connections = await prisma.integrationConnection.findMany({
    where: { businessId },
    include: { defaultBranch: { select: { id: true, name: true, status: true } } }
  });
  const connectionByProvider = new Map(
    connections.map((connection) => [
      connectionKey(connection.provider, connection.mode),
      serializeConnection(connection)
    ])
  );

  return {
    providers: integrationConnectorRegistry.listProviders().map((provider) => {
      const liveEmail =
        provider.provider === IntegrationProvider.EMAIL &&
        provider.mode === IntegrationMode.LIVE;
      const liveWhatsApp =
        provider.provider === IntegrationProvider.WHATSAPP &&
        provider.mode === IntegrationMode.LIVE;
      const liveMetaSocial =
        (provider.provider === IntegrationProvider.FACEBOOK ||
          provider.provider === IntegrationProvider.INSTAGRAM) &&
        provider.mode === IntegrationMode.LIVE;
      return {
        ...provider,
        demoMode: provider.mode === IntegrationMode.DEMO,
        liveAvailable: liveEmail
          ? isLiveEmailConfigured()
          : liveWhatsApp
            ? isLiveWhatsAppConfigured()
            : liveMetaSocial
              ? isLiveMetaSocialConfigured()
              : false,
        disclosure:
          provider.mode === IntegrationMode.LIVE
            ? liveWhatsApp
              ? "Live WhatsApp imports real inbound Meta WhatsApp text messages through signed webhooks. Non-text media is not downloaded and outbound replies are not supported."
              : liveMetaSocial
                ? `${providerLabel(provider.provider)} Live imports supported real comments through signed Meta webhooks. Replies, DMs, publishing, and media downloads are not supported.`
                : "Live Email imports real Gmail or Outlook Inbox messages. It is inbound-only, manual, limited to the latest 20 messages initially, and never changes provider read state."
            : "Demo Mode uses simulated external data. No real provider account is connected.",
        connection:
          connectionByProvider.get(connectionKey(provider.provider, provider.mode)) ??
          null
      };
    })
  };
}

export async function listIntegrationConnections(
  actor: Actor,
  businessId: string,
  query: ListIntegrationConnectionsQuery
) {
  await resolveIntegrationManagementContext(actor, businessId);
  const requestedMode = query.mode ? (query.mode as IntegrationMode) : undefined;
  const where: Prisma.IntegrationConnectionWhereInput = {
    businessId,
    ...(requestedMode ? { mode: requestedMode } : {}),
    ...(query.provider ? { provider: query.provider as IntegrationProvider } : {}),
    ...(query.status ? { status: query.status as IntegrationConnectionStatus } : {}),
    ...(query.branchId ? { defaultBranchId: query.branchId } : {}),
    ...(query.search
      ? {
          OR: [
            { displayName: { contains: query.search } },
            { defaultBranch: { name: { contains: query.search } } }
          ]
        }
      : {})
  };
  const skip = (query.page - 1) * query.pageSize;
  const [
    connections,
    total,
    statusCounts,
    recentRuns,
    importedTotal,
    duplicateTotal,
    failedTotal
  ] = await Promise.all([
    prisma.integrationConnection.findMany({
      where,
      include: connectionInclude,
      orderBy: [{ provider: "asc" }, { createdAt: "asc" }],
      skip,
      take: query.pageSize
    }),
    prisma.integrationConnection.count({ where }),
    prisma.integrationConnection.groupBy({
      by: ["status"],
      where: { businessId, ...(requestedMode ? { mode: requestedMode } : {}) },
      _count: { _all: true }
    }),
    prisma.synchronizationRun.findMany({
      where: { businessId, ...(requestedMode ? { mode: requestedMode } : {}) },
      include: {
        connection: { select: { id: true, displayName: true, liveProviderType: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.integrationConnection.aggregate({
      where: { businessId, ...(requestedMode ? { mode: requestedMode } : {}) },
      _sum: { totalImported: true }
    }),
    prisma.synchronizationRun.aggregate({
      where: { businessId, ...(requestedMode ? { mode: requestedMode } : {}) },
      _sum: { itemsDuplicated: true }
    }),
    prisma.synchronizationRun.aggregate({
      where: { businessId, ...(requestedMode ? { mode: requestedMode } : {}) },
      _sum: { itemsFailed: true }
    })
  ]);
  const statusMap = Object.fromEntries(
    statusCounts.map((count) => [count.status, count._count._all])
  ) as Partial<Record<IntegrationConnectionStatus, number>>;

  return {
    items: connections.map(serializeConnection),
    summary: {
      total,
      connected: statusMap.CONNECTED ?? 0,
      paused: statusMap.PAUSED ?? 0,
      disconnected: statusMap.DISCONNECTED ?? 0,
      error: statusMap.ERROR ?? 0,
      imported: importedTotal._sum.totalImported ?? 0,
      duplicates: duplicateTotal._sum.itemsDuplicated ?? 0,
      failed: failedTotal._sum.itemsFailed ?? 0
    },
    recentRuns: recentRuns.map(serializeRun),
    pagination: toPagination(query.page, query.pageSize, total)
  };
}

export async function createIntegrationConnection(
  actor: Actor,
  businessId: string,
  input: CreateIntegrationConnectionInput
) {
  const context = await resolveIntegrationManagementContext(actor, businessId);
  const branch = await validateDefaultBranch(businessId, input.defaultBranchId);

  if (input.mode === IntegrationMode.LIVE) {
    if (input.provider === IntegrationProvider.EMAIL) {
      return createLiveEmailConnection(actor, context, input, branch.id);
    }
    if (input.provider === IntegrationProvider.WHATSAPP) {
      return createLiveWhatsAppConnection(context, input, branch.id);
    }
    if (
      input.provider === IntegrationProvider.FACEBOOK ||
      input.provider === IntegrationProvider.INSTAGRAM
    ) {
      return createLiveMetaSocialConnection(context, input, branch.id);
    }
    throw new IntegrationError(
      "This Live provider is not available yet.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }

  assertDemoMode(input.mode);
  integrationConnectorRegistry.getConnector(input.provider, IntegrationMode.DEMO);
  await enforceConnectionLimit(businessId);
  const existingDemo = await prisma.integrationConnection.findFirst({
    where: { businessId, provider: input.provider, mode: IntegrationMode.DEMO },
    select: { id: true }
  });
  if (existingDemo) {
    throw new IntegrationError(
      "A Demo connection already exists for this provider.",
      INTEGRATION_ERRORS.ALREADY_EXISTS,
      409
    );
  }

  try {
    const now = new Date();
    const connection = await prisma.integrationConnection.create({
      data: {
        businessId,
        provider: input.provider,
        mode: IntegrationMode.DEMO,
        status: IntegrationConnectionStatus.CONNECTED,
        displayName: input.displayName,
        defaultBranchId: branch.id,
        demoScenario: input.demoScenario,
        connectedAt: now,
        createdByMembershipId: context.membership.id,
        updatedByMembershipId: context.membership.id
      },
      include: connectionInclude
    });

    return serializeConnection(connection);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new IntegrationError(
        "A Demo connection already exists for this provider.",
        INTEGRATION_ERRORS.ALREADY_EXISTS,
        409
      );
    }

    throw error;
  }
}

async function createLiveEmailConnection(
  actor: Actor,
  context: ManagementContext,
  input: CreateIntegrationConnectionInput,
  defaultBranchId: string
) {
  assertIntegrationEncryptionReady();
  if (
    input.provider !== IntegrationProvider.EMAIL ||
    !isSupportedLiveEmailProvider(input.liveProviderType)
  ) {
    throw new IntegrationError(
      "Choose Gmail or Outlook for this Live Email connection.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }
  assertLiveEmailProviderConfigured(input.liveProviderType);
  integrationConnectorRegistry.getConnector(
    IntegrationProvider.EMAIL,
    IntegrationMode.LIVE
  );

  const lastErrorCode = liveEmailAuthorizationRequiredCode(input.liveProviderType);
  const existing = await prisma.integrationConnection.findFirst({
    where: {
      businessId: context.businessId,
      provider: IntegrationProvider.EMAIL,
      mode: IntegrationMode.LIVE,
      liveProviderType: input.liveProviderType
    },
    select: { id: true }
  });
  const connection = existing
    ? await prisma.integrationConnection.update({
        where: { id: existing.id },
        data: {
          displayName: input.displayName,
          defaultBranchId,
          liveProviderType: input.liveProviderType,
          synchronizationFolder: "INBOX",
          status: IntegrationConnectionStatus.ERROR,
          requiresReauthorization: true,
          lastErrorCode,
          updatedByMembershipId: context.membership.id,
          disconnectedAt: null,
          pausedAt: null
        },
        include: connectionInclude
      })
    : await prisma.integrationConnection.create({
        data: {
          businessId: context.businessId,
          provider: IntegrationProvider.EMAIL,
          mode: IntegrationMode.LIVE,
          status: IntegrationConnectionStatus.ERROR,
          displayName: input.displayName,
          defaultBranchId,
          demoScenario: null,
          liveProviderType: input.liveProviderType,
          synchronizationFolder: "INBOX",
          requiresReauthorization: true,
          lastErrorCode,
          createdByMembershipId: context.membership.id,
          updatedByMembershipId: context.membership.id
        },
        include: connectionInclude
      });

  const authorization = await createOAuthStateForConnection({
    actor,
    membershipId: context.membership.id,
    businessId: context.businessId,
    connectionId: connection.id,
    defaultBranchId,
    emailProviderType: input.liveProviderType,
    action: IntegrationOAuthAction.CONNECT
  });

  return {
    connection: serializeConnection(connection),
    authorizationUrl: authorization.authorizationUrl,
    expiresAt: authorization.expiresAt.toISOString(),
    message: `Continue to ${liveEmailProviderName(input.liveProviderType)} to authorize Inbox access.`
  };
}

async function createLiveWhatsAppConnection(
  context: ManagementContext,
  input: CreateIntegrationConnectionInput,
  defaultBranchId: string
) {
  assertLiveWhatsAppConfigured();
  assertIntegrationEncryptionReady();
  integrationConnectorRegistry.getConnector(
    IntegrationProvider.WHATSAPP,
    IntegrationMode.LIVE
  );

  if (!input.phoneNumberId || !input.wabaId || !input.temporaryAccessToken) {
    throw new IntegrationError(
      "Meta phone number ID, WABA ID, and temporary access token are required.",
      INTEGRATION_ERRORS.CONFIGURATION_INVALID,
      400
    );
  }

  const now = new Date();
  const safeDisplayPhone = input.displayPhoneNumber ?? null;
  try {
    const existing = await prisma.integrationConnection.findFirst({
      where: {
        businessId: context.businessId,
        provider: IntegrationProvider.WHATSAPP,
        mode: IntegrationMode.LIVE
      },
      select: { id: true }
    });
    const connection = existing
      ? await prisma.integrationConnection.update({
          where: { id: existing.id },
          data: {
            displayName: input.displayName,
            defaultBranchId,
            synchronizationFolder: "WEBHOOK",
            status: IntegrationConnectionStatus.CONNECTED,
            requiresReauthorization: false,
            providerAccountId: input.phoneNumberId,
            providerAccountLabel: maskPhone(safeDisplayPhone),
            providerTenantId: input.wabaId,
            whatsappPhoneNumberId: input.phoneNumberId,
            whatsappBusinessAccountId: input.wabaId,
            whatsappDisplayPhoneNumber: safeDisplayPhone,
            webhookVerifyTokenHash: currentWhatsAppVerifyTokenHash(),
            webhookStatus: "PENDING_VERIFICATION",
            connectedAt: now,
            disconnectedAt: null,
            pausedAt: null,
            lastErrorCode: null,
            updatedByMembershipId: context.membership.id
          },
          include: connectionInclude
        })
      : await prisma.integrationConnection.create({
          data: {
            businessId: context.businessId,
            provider: IntegrationProvider.WHATSAPP,
            mode: IntegrationMode.LIVE,
            status: IntegrationConnectionStatus.CONNECTED,
            displayName: input.displayName,
            defaultBranchId,
            demoScenario: null,
            synchronizationFolder: "WEBHOOK",
            requiresReauthorization: false,
            providerAccountId: input.phoneNumberId,
            providerAccountLabel: maskPhone(safeDisplayPhone),
            providerTenantId: input.wabaId,
            whatsappPhoneNumberId: input.phoneNumberId,
            whatsappBusinessAccountId: input.wabaId,
            whatsappDisplayPhoneNumber: safeDisplayPhone,
            webhookVerifyTokenHash: currentWhatsAppVerifyTokenHash(),
            webhookStatus: "PENDING_VERIFICATION",
            connectedAt: now,
            createdByMembershipId: context.membership.id,
            updatedByMembershipId: context.membership.id
          },
          include: connectionInclude
        });

    await storeWhatsAppAccessToken({
      connectionId: connection.id,
      accessToken: input.temporaryAccessToken
    });

    return serializeConnection(connection);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new IntegrationError(
        "A Live WhatsApp connection already exists for this business or phone number.",
        INTEGRATION_ERRORS.ALREADY_EXISTS,
        409
      );
    }
    throw error;
  }
}

async function createLiveMetaSocialConnection(
  context: ManagementContext,
  input: CreateIntegrationConnectionInput,
  defaultBranchId: string
) {
  assertLiveMetaSocialConfigured();
  assertIntegrationEncryptionReady();
  if (
    input.provider !== IntegrationProvider.FACEBOOK &&
    input.provider !== IntegrationProvider.INSTAGRAM
  ) {
    throw new IntegrationError(
      "Choose Facebook or Instagram for this Live social connection.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }
  integrationConnectorRegistry.getConnector(input.provider, IntegrationMode.LIVE);

  if (!input.providerAccountId || !input.temporaryAccessToken) {
    throw new IntegrationError(
      "Meta account ID and temporary access token are required.",
      INTEGRATION_ERRORS.CONFIGURATION_INVALID,
      400
    );
  }

  const existing = await prisma.integrationConnection.findFirst({
    where: {
      businessId: context.businessId,
      provider: input.provider,
      mode: IntegrationMode.LIVE
    },
    select: { id: true }
  });
  const now = new Date();
  const providerAccountLabel =
    input.provider === IntegrationProvider.INSTAGRAM && input.providerAccountLabel
      ? formatInstagramLabel(input.providerAccountLabel)
      : (input.providerAccountLabel ?? null);

  try {
    const connection = existing
      ? await prisma.integrationConnection.update({
          where: { id: existing.id },
          data: {
            displayName: input.displayName,
            defaultBranchId,
            synchronizationFolder: "WEBHOOK",
            status: IntegrationConnectionStatus.CONNECTED,
            requiresReauthorization: false,
            providerAccountId: input.providerAccountId,
            providerAccountLabel,
            providerTenantId: input.providerAccountType ?? null,
            webhookVerifyTokenHash: currentWhatsAppVerifyTokenHash(),
            webhookStatus: "PENDING_VERIFICATION",
            connectedAt: now,
            disconnectedAt: null,
            pausedAt: null,
            lastErrorCode: null,
            updatedByMembershipId: context.membership.id
          },
          include: connectionInclude
        })
      : await prisma.integrationConnection.create({
          data: {
            businessId: context.businessId,
            provider: input.provider,
            mode: IntegrationMode.LIVE,
            status: IntegrationConnectionStatus.CONNECTED,
            displayName: input.displayName,
            defaultBranchId,
            demoScenario: null,
            synchronizationFolder: "WEBHOOK",
            requiresReauthorization: false,
            providerAccountId: input.providerAccountId,
            providerAccountLabel,
            providerTenantId: input.providerAccountType ?? null,
            webhookVerifyTokenHash: currentWhatsAppVerifyTokenHash(),
            webhookStatus: "PENDING_VERIFICATION",
            connectedAt: now,
            createdByMembershipId: context.membership.id,
            updatedByMembershipId: context.membership.id
          },
          include: connectionInclude
        });

    await storeMetaSocialAccessToken({
      connectionId: connection.id,
      provider: input.provider,
      accessToken: input.temporaryAccessToken
    });

    return serializeConnection(connection);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new IntegrationError(
        `A Live ${providerLabel(input.provider)} connection already exists for this business.`,
        INTEGRATION_ERRORS.ALREADY_EXISTS,
        409
      );
    }
    throw error;
  }
}

export async function getIntegrationConnection(
  actor: Actor,
  businessId: string,
  connectionId: string
) {
  await resolveIntegrationManagementContext(actor, businessId);
  return serializeConnection(await loadConnection(businessId, connectionId));
}

export async function updateIntegrationConnection(
  actor: Actor,
  businessId: string,
  connectionId: string,
  input: UpdateIntegrationConnectionInput
) {
  const context = await resolveIntegrationManagementContext(actor, businessId);
  const existing = await loadConnection(businessId, connectionId);
  if (input.defaultBranchId) {
    await validateDefaultBranch(businessId, input.defaultBranchId);
  }

  const connection = await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      ...(input.displayName ? { displayName: input.displayName } : {}),
      ...(input.defaultBranchId ? { defaultBranchId: input.defaultBranchId } : {}),
      ...(input.demoScenario ? { demoScenario: input.demoScenario } : {}),
      ...(existing.provider === IntegrationProvider.WHATSAPP &&
      existing.mode === IntegrationMode.LIVE
        ? {
            ...(input.phoneNumberId
              ? {
                  whatsappPhoneNumberId: input.phoneNumberId,
                  providerAccountId: input.phoneNumberId
                }
              : {}),
            ...(input.wabaId
              ? {
                  whatsappBusinessAccountId: input.wabaId,
                  providerTenantId: input.wabaId
                }
              : {}),
            ...(input.displayPhoneNumber
              ? {
                  whatsappDisplayPhoneNumber: input.displayPhoneNumber,
                  providerAccountLabel: maskPhone(input.displayPhoneNumber)
                }
              : {}),
            webhookVerifyTokenHash: currentWhatsAppVerifyTokenHash()
          }
        : {}),
      ...((existing.provider === IntegrationProvider.FACEBOOK ||
        existing.provider === IntegrationProvider.INSTAGRAM) &&
      existing.mode === IntegrationMode.LIVE
        ? {
            ...(input.providerAccountId
              ? { providerAccountId: input.providerAccountId }
              : {}),
            ...(input.providerAccountLabel
              ? {
                  providerAccountLabel:
                    existing.provider === IntegrationProvider.INSTAGRAM
                      ? formatInstagramLabel(input.providerAccountLabel)
                      : input.providerAccountLabel
                }
              : {}),
            ...(input.providerAccountType
              ? { providerTenantId: input.providerAccountType }
              : {}),
            webhookVerifyTokenHash: currentWhatsAppVerifyTokenHash()
          }
        : {}),
      updatedByMembershipId: context.membership.id,
      lastErrorCode: null
    },
    include: connectionInclude
  });

  if (
    existing.provider === IntegrationProvider.WHATSAPP &&
    existing.mode === IntegrationMode.LIVE &&
    input.temporaryAccessToken
  ) {
    await storeWhatsAppAccessToken({
      connectionId,
      accessToken: input.temporaryAccessToken
    });
  }
  if (
    (existing.provider === IntegrationProvider.FACEBOOK ||
      existing.provider === IntegrationProvider.INSTAGRAM) &&
    existing.mode === IntegrationMode.LIVE &&
    input.temporaryAccessToken
  ) {
    await storeMetaSocialAccessToken({
      connectionId,
      provider: existing.provider,
      accessToken: input.temporaryAccessToken
    });
  }

  return serializeConnection(connection);
}

export async function testIntegrationConnection(
  actor: Actor,
  businessId: string,
  connectionId: string
) {
  await resolveIntegrationManagementContext(actor, businessId);
  const connection = await loadConnection(businessId, connectionId);
  assertConnectionCanRun(connection);
  await validateDefaultBranch(businessId, connection.defaultBranchId);
  const connector = integrationConnectorRegistry.getConnector(
    connection.provider,
    connection.mode
  );

  return connector.testConnection(toConnectorContext(connection));
}

export async function authorizeIntegrationConnection(
  actor: Actor,
  businessId: string,
  connectionId: string,
  action: IntegrationOAuthAction = IntegrationOAuthAction.REAUTHORIZE
) {
  const context = await resolveIntegrationManagementContext(actor, businessId);
  const connection = await loadConnection(businessId, connectionId);
  assertLiveEmailConnection(connection);
  const emailProviderType = requireLiveEmailProviderType(connection.liveProviderType);
  await validateDefaultBranch(businessId, connection.defaultBranchId);
  const authorization = await createOAuthStateForConnection({
    actor,
    membershipId: context.membership.id,
    businessId,
    connectionId,
    defaultBranchId: connection.defaultBranchId,
    emailProviderType,
    action
  });

  await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      status: IntegrationConnectionStatus.ERROR,
      requiresReauthorization: true,
      lastErrorCode: liveEmailAuthorizationRequiredCode(emailProviderType),
      updatedByMembershipId: context.membership.id
    }
  });

  return {
    authorizationUrl: authorization.authorizationUrl,
    expiresAt: authorization.expiresAt.toISOString()
  };
}

export async function completeGmailOAuthCallback(
  actor: Actor,
  input: { state?: string; code?: string; error?: string }
): Promise<string> {
  return completeEmailOAuthCallback(actor, input, EmailProviderType.GMAIL);
}

export async function completeOutlookOAuthCallback(
  actor: Actor,
  input: { state?: string; code?: string; error?: string }
): Promise<string> {
  return completeEmailOAuthCallback(actor, input, EmailProviderType.MICROSOFT);
}

async function completeEmailOAuthCallback(
  actor: Actor,
  input: { state?: string; code?: string; error?: string },
  expectedEmailProviderType: LiveEmailProviderType
): Promise<string> {
  if (input.error) {
    return buildIntegrationsRedirect(
      null,
      "error",
      "LIVE_EMAIL_AUTHORIZATION_DENIED",
      expectedEmailProviderType
    );
  }
  if (!input.state || !input.code) {
    return buildIntegrationsRedirect(
      null,
      "error",
      "LIVE_EMAIL_AUTHORIZATION_FAILED",
      expectedEmailProviderType
    );
  }

  try {
    const stateHash = sha256(input.state);
    const state = await prisma.integrationOAuthState.findUnique({
      where: { stateHash },
      include: { connection: true }
    });

    if (!state) {
      throw new IntegrationError(
        "OAuth state was not found.",
        INTEGRATION_ERRORS.OAUTH_STATE_INVALID,
        400
      );
    }
    if (state.usedAt) {
      throw new IntegrationError(
        "OAuth state was already used.",
        INTEGRATION_ERRORS.OAUTH_STATE_REPLAYED,
        409
      );
    }
    if (state.expiresAt <= new Date()) {
      throw new IntegrationError(
        "OAuth state expired.",
        INTEGRATION_ERRORS.OAUTH_STATE_EXPIRED,
        409
      );
    }
    if (state.userId !== actor.userId) {
      throw new IntegrationError(
        "OAuth state does not match the authenticated user.",
        INTEGRATION_ERRORS.OAUTH_STATE_INVALID,
        403
      );
    }
    if (
      state.provider !== IntegrationProvider.EMAIL ||
      state.emailProviderType !== expectedEmailProviderType ||
      state.connection.provider !== IntegrationProvider.EMAIL ||
      state.connection.mode !== IntegrationMode.LIVE
    ) {
      throw new IntegrationError(
        "OAuth state does not match Live Email.",
        INTEGRATION_ERRORS.OAUTH_STATE_INVALID,
        400
      );
    }

    const context = await resolveIntegrationManagementContext(actor, state.businessId);
    if (state.membershipId !== context.membership.id) {
      throw new IntegrationError(
        "OAuth state does not match this membership.",
        INTEGRATION_ERRORS.OAUTH_STATE_INVALID,
        403
      );
    }
    await validateDefaultBranch(state.businessId, state.defaultBranchId);
    const codeVerifier = decryptIntegrationSecret(
      state.encryptedCodeVerifier,
      verifierAssociatedData(state.connectionId, expectedEmailProviderType)
    );

    const consumed = await prisma.integrationOAuthState.updateMany({
      where: { id: state.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() }
    });
    if (consumed.count === 0) {
      throw new IntegrationError(
        "OAuth state was already used.",
        INTEGRATION_ERRORS.OAUTH_STATE_REPLAYED,
        409
      );
    }

    const gmailResult =
      expectedEmailProviderType === EmailProviderType.GMAIL
        ? await exchangeGmailAuthorizationCode({
            connectionId: state.connectionId,
            code: input.code,
            codeVerifier
          })
        : null;
    const outlookResult =
      expectedEmailProviderType === EmailProviderType.MICROSOFT
        ? await exchangeOutlookAuthorizationCode({
            connectionId: state.connectionId,
            code: input.code,
            codeVerifier
          })
        : null;
    const identity = gmailResult?.identity ?? outlookResult!.identity;
    const connectedAt = new Date();
    const connection = await prisma.integrationConnection.update({
      where: { id: state.connectionId },
      data: {
        status: IntegrationConnectionStatus.CONNECTED,
        connectedAt,
        disconnectedAt: null,
        pausedAt: null,
        defaultBranchId: state.defaultBranchId,
        liveProviderType: expectedEmailProviderType,
        providerAccountId: identity.id,
        providerAccountLabel: maskEmail(identity.emailAddress),
        providerTenantId:
          expectedEmailProviderType === EmailProviderType.MICROSOFT
            ? (outlookResult?.identity.tenantId ?? null)
            : null,
        lastProviderCursor: gmailResult?.identity.historyId ?? null,
        lastProviderCursorAt: gmailResult?.identity.historyId ? connectedAt : null,
        requiresReauthorization: false,
        lastConnectionTestAt: connectedAt,
        lastConnectionTestStatus: "PASSED",
        lastErrorCode: null,
        updatedByMembershipId: context.membership.id
      }
    });

    return buildIntegrationsRedirect(
      connection,
      "connected",
      null,
      expectedEmailProviderType
    );
  } catch (error) {
    const safeError = safeIntegrationError(error);
    return buildIntegrationsRedirect(
      null,
      "error",
      safeError.code,
      expectedEmailProviderType
    );
  }
}

export async function pauseIntegrationConnection(
  actor: Actor,
  businessId: string,
  connectionId: string
) {
  const context = await resolveIntegrationManagementContext(actor, businessId);
  await loadConnection(businessId, connectionId);
  const connection = await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      status: IntegrationConnectionStatus.PAUSED,
      pausedAt: new Date(),
      updatedByMembershipId: context.membership.id
    },
    include: connectionInclude
  });

  return serializeConnection(connection);
}

export async function resumeIntegrationConnection(
  actor: Actor,
  businessId: string,
  connectionId: string
) {
  const context = await resolveIntegrationManagementContext(actor, businessId);
  const connection = await loadConnection(businessId, connectionId);
  if (connection.status === IntegrationConnectionStatus.DISCONNECTED) {
    throw new IntegrationError(
      "Reconnect this connection before syncing.",
      INTEGRATION_ERRORS.NOT_CONNECTED,
      409
    );
  }

  const updated = await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      status: IntegrationConnectionStatus.CONNECTED,
      pausedAt: null,
      updatedByMembershipId: context.membership.id,
      lastErrorCode: null
    },
    include: connectionInclude
  });

  return serializeConnection(updated);
}

export async function disconnectIntegrationConnection(
  actor: Actor,
  businessId: string,
  connectionId: string
) {
  const context = await resolveIntegrationManagementContext(actor, businessId);
  const existing = await loadConnection(businessId, connectionId);
  if (existing.mode === IntegrationMode.LIVE) {
    const connector = integrationConnectorRegistry.getConnector(
      existing.provider,
      existing.mode
    );
    await connector.revokeAuthorization?.(toConnectorContext(existing));
    await prisma.integrationCredential.deleteMany({
      where: {
        connectionId,
        credentialType: isWebhookDrivenLiveProvider(existing.provider)
          ? IntegrationCredentialType.META_WHATSAPP
          : IntegrationCredentialType.OAUTH2
      }
    });
  }
  const connection = await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      status: IntegrationConnectionStatus.DISCONNECTED,
      disconnectedAt: new Date(),
      updatedByMembershipId: context.membership.id,
      requiresReauthorization:
        existing.mode === IntegrationMode.LIVE &&
        existing.provider === IntegrationProvider.EMAIL,
      webhookStatus: isWebhookDrivenLiveProvider(existing.provider)
        ? "DISCONNECTED"
        : undefined,
      lastErrorCode:
        existing.mode === IntegrationMode.LIVE &&
        existing.provider === IntegrationProvider.EMAIL
          ? INTEGRATION_ERRORS.LIVE_EMAIL_AUTHORIZATION_REQUIRED
          : existing.lastErrorCode
    },
    include: connectionInclude
  });

  return serializeConnection(connection);
}

export async function reconnectIntegrationConnection(
  actor: Actor,
  businessId: string,
  connectionId: string
) {
  const context = await resolveIntegrationManagementContext(actor, businessId);
  const connection = await loadConnection(businessId, connectionId);
  if (connection.mode === IntegrationMode.LIVE) {
    if (connection.provider === IntegrationProvider.EMAIL) {
      return authorizeIntegrationConnection(
        actor,
        businessId,
        connectionId,
        IntegrationOAuthAction.REAUTHORIZE
      );
    }
    if (isWebhookDrivenLiveProvider(connection.provider)) {
      await validateDefaultBranch(businessId, connection.defaultBranchId);
      const updated = await prisma.integrationConnection.update({
        where: { id: connectionId },
        data: {
          status: IntegrationConnectionStatus.CONNECTED,
          connectedAt: new Date(),
          disconnectedAt: null,
          pausedAt: null,
          webhookStatus: "PENDING_VERIFICATION",
          lastErrorCode: null,
          updatedByMembershipId: context.membership.id
        },
        include: connectionInclude
      });
      return serializeConnection(updated);
    }
  }
  await validateDefaultBranch(businessId, connection.defaultBranchId);
  const updated = await prisma.integrationConnection.update({
    where: { id: connectionId },
    data: {
      status: IntegrationConnectionStatus.CONNECTED,
      connectedAt: new Date(),
      disconnectedAt: null,
      pausedAt: null,
      lastErrorCode: null,
      updatedByMembershipId: context.membership.id
    },
    include: connectionInclude
  });

  return serializeConnection(updated);
}

export async function requestIntegrationSync(
  actor: Actor,
  businessId: string,
  connectionId: string
) {
  const context = await resolveIntegrationManagementContext(actor, businessId);
  const connection = await loadConnection(businessId, connectionId);
  if (
    isWebhookDrivenLiveProvider(connection.provider) &&
    connection.mode === IntegrationMode.LIVE
  ) {
    throw new IntegrationError(
      `Live ${providerLabel(connection.provider)} is webhook-driven and does not support Sync Now.`,
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }
  assertConnectionCanRun(connection);
  await validateDefaultBranch(businessId, connection.defaultBranchId);
  await assertNoActiveRun(connection.id);

  const run = await prisma.synchronizationRun.create({
    data: {
      connectionId: connection.id,
      businessId,
      provider: connection.provider,
      mode: connection.mode,
      status: SynchronizationRunStatus.PENDING,
      triggerType: SynchronizationTriggerType.MANUAL,
      startedByMembershipId: context.membership.id,
      demoScenario: connection.demoScenario,
      nextAttemptAt: new Date()
    }
  });

  return processSynchronizationRun(run.id);
}

export async function listConnectionRuns(
  actor: Actor,
  businessId: string,
  connectionId: string,
  query: ListSynchronizationRunsQuery
) {
  await resolveIntegrationManagementContext(actor, businessId);
  await loadConnection(businessId, connectionId);
  const where: Prisma.SynchronizationRunWhereInput = {
    businessId,
    connectionId,
    ...(query.status ? { status: query.status as SynchronizationRunStatus } : {})
  };
  const skip = (query.page - 1) * query.pageSize;
  const [runs, total] = await Promise.all([
    prisma.synchronizationRun.findMany({
      where,
      include: {
        connection: { select: { id: true, displayName: true, liveProviderType: true } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize
    }),
    prisma.synchronizationRun.count({ where })
  ]);

  return {
    items: runs.map(serializeRun),
    pagination: toPagination(query.page, query.pageSize, total)
  };
}

export async function listConnectionWebhookActivity(
  actor: Actor,
  businessId: string,
  connectionId: string,
  query: ListSynchronizationRunsQuery
) {
  await resolveIntegrationManagementContext(actor, businessId);
  const connection = await loadConnection(businessId, connectionId);
  if (
    !isWebhookDrivenLiveProvider(connection.provider) ||
    connection.mode !== IntegrationMode.LIVE
  ) {
    throw new IntegrationError(
      "Webhook activity is available for Live webhook-driven connections only.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }

  const skip = (query.page - 1) * query.pageSize;
  const where: Prisma.IntegrationWebhookDeliveryWhereInput = {
    businessId,
    connectionId
  };
  const [items, total] = await Promise.all([
    prisma.integrationWebhookDelivery.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip,
      take: query.pageSize
    }),
    prisma.integrationWebhookDelivery.count({ where })
  ]);

  return {
    items: items.map(serializeWebhookDelivery),
    pagination: toPagination(query.page, query.pageSize, total)
  };
}

export async function getSynchronizationRun(
  actor: Actor,
  businessId: string,
  runId: string
) {
  await resolveIntegrationManagementContext(actor, businessId);
  const run = await loadRun(businessId, runId);
  return serializeRun(run);
}

export async function listSynchronizationRunItems(
  actor: Actor,
  businessId: string,
  runId: string,
  query: ListSynchronizationRunsQuery
) {
  await resolveIntegrationManagementContext(actor, businessId);
  await loadRun(businessId, runId);
  const where: Prisma.SynchronizationItemWhereInput = { runId };
  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    prisma.synchronizationItem.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take: query.pageSize
    }),
    prisma.synchronizationItem.count({ where })
  ]);

  return {
    items: items.map(serializeItem),
    pagination: toPagination(query.page, query.pageSize, total)
  };
}

export async function retrySynchronizationItem(
  actor: Actor,
  businessId: string,
  runId: string,
  itemId: string
) {
  const context = await resolveIntegrationManagementContext(actor, businessId);
  const item = await prisma.synchronizationItem.findFirst({
    where: { id: itemId, runId, connection: { businessId } },
    include: { connection: true }
  });
  if (!item) {
    throw new IntegrationError(
      "Synchronization item was not found.",
      INTEGRATION_ERRORS.SYNC_ITEM_INVALID,
      404
    );
  }
  if (item.retryCount >= MAX_ITEM_RETRIES) {
    throw new IntegrationError(
      "This synchronization item has reached the retry limit.",
      INTEGRATION_ERRORS.SYNC_STALE_RUN,
      409
    );
  }

  assertConnectionCanRun(item.connection);
  await validateDefaultBranch(businessId, item.connection.defaultBranchId);
  await assertNoActiveRun(item.connection.id);
  const retryRun = await prisma.synchronizationRun.create({
    data: {
      connectionId: item.connection.id,
      businessId,
      provider: item.connection.provider,
      mode: item.connection.mode,
      status: SynchronizationRunStatus.PENDING,
      triggerType: SynchronizationTriggerType.MANUAL,
      startedByMembershipId: context.membership.id,
      demoScenario: item.connection.demoScenario,
      nextAttemptAt: new Date()
    }
  });

  return processSynchronizationRun(retryRun.id, { onlyExternalId: item.externalId });
}

export async function processSynchronizationRunBatch(): Promise<void> {
  const runs = await prisma.synchronizationRun.findMany({
    where: {
      status: SynchronizationRunStatus.PENDING,
      nextAttemptAt: { lte: new Date() }
    },
    orderBy: { requestedAt: "asc" },
    take: env.INTEGRATION_SYNC_WORKER_BATCH_SIZE
  });

  await Promise.all(runs.map((run) => processSynchronizationRun(run.id)));
}

export async function recoverStaleSynchronizationRuns(): Promise<number> {
  const staleBefore = new Date(Date.now() - STALE_RUN_MINUTES * 60_000);
  const result = await prisma.synchronizationRun.updateMany({
    where: {
      status: SynchronizationRunStatus.RUNNING,
      startedAt: { lt: staleBefore },
      attempts: { lt: env.INTEGRATION_SYNC_MAX_RETRIES }
    },
    data: {
      status: SynchronizationRunStatus.PENDING,
      lockToken: null,
      nextAttemptAt: new Date()
    }
  });

  return result.count;
}

export async function processSynchronizationRun(
  runId: string,
  options: { onlyExternalId?: string } = {}
) {
  const claimed = await claimSynchronizationRun(runId);
  if (!claimed) {
    throw new IntegrationError(
      "Synchronization run is already running.",
      INTEGRATION_ERRORS.SYNC_ALREADY_RUNNING,
      409
    );
  }

  const startedAt = claimed.startedAt ?? new Date();
  try {
    const connection = await loadConnection(claimed.businessId, claimed.connectionId);
    assertConnectionCanRun(connection);
    await validateDefaultBranch(claimed.businessId, connection.defaultBranchId);
    const connector = integrationConnectorRegistry.getConnector(
      connection.provider,
      connection.mode
    );
    const connectorContext = toConnectorContext(connection);
    const allItems = (await connector.fetchItems(connectorContext)).slice(
      0,
      MAX_SYNC_ITEMS
    );
    const items = options.onlyExternalId
      ? allItems.filter((item) => item.externalId === options.onlyExternalId)
      : allItems;

    if (options.onlyExternalId && items.length === 0) {
      throw new IntegrationError(
        "The original source item is no longer available.",
        INTEGRATION_ERRORS.SYNC_ITEM_INVALID,
        404
      );
    }

    await prisma.synchronizationRun.update({
      where: { id: claimed.id },
      data: { itemsFetched: items.length }
    });

    const counters = {
      imported: 0,
      duplicated: 0,
      skipped: 0,
      failed: 0,
      processed: 0
    };

    for (const item of items) {
      const result = await processSynchronizationItem(claimed, connectorContext, item);
      counters.processed += 1;
      if (result === SynchronizationItemStatus.IMPORTED) counters.imported += 1;
      if (result === SynchronizationItemStatus.DUPLICATE) counters.duplicated += 1;
      if (result === SynchronizationItemStatus.SKIPPED) counters.skipped += 1;
      if (result === SynchronizationItemStatus.FAILED) counters.failed += 1;
    }

    const completedAt = new Date();
    const status =
      counters.failed > 0 && counters.processed === counters.failed
        ? SynchronizationRunStatus.FAILED
        : counters.failed > 0
          ? SynchronizationRunStatus.COMPLETED_WITH_ERRORS
          : SynchronizationRunStatus.COMPLETED;
    const safeSummary = summarizeRun(status, counters);
    const errorCode =
      status === SynchronizationRunStatus.FAILED
        ? INTEGRATION_ERRORS.SYNC_RUN_FAILED
        : status === SynchronizationRunStatus.COMPLETED_WITH_ERRORS
          ? INTEGRATION_ERRORS.SYNC_PARTIAL_FAILURE
          : null;

    const [updatedRun] = await prisma.$transaction([
      prisma.synchronizationRun.update({
        where: { id: claimed.id },
        data: {
          status,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
          itemsProcessed: counters.processed,
          itemsImported: counters.imported,
          itemsDuplicated: counters.duplicated,
          itemsSkipped: counters.skipped,
          itemsFailed: counters.failed,
          errorCode,
          safeSummary,
          lockToken: null,
          nextAttemptAt: null
        },
        include: {
          connection: {
            select: { id: true, displayName: true, liveProviderType: true }
          }
        }
      }),
      prisma.integrationConnection.update({
        where: { id: claimed.connectionId },
        data: {
          totalImported: { increment: counters.imported },
          lastAttemptedSyncAt: completedAt,
          lastSuccessfulSyncAt:
            status === SynchronizationRunStatus.FAILED ? undefined : completedAt,
          lastErrorCode: errorCode
        }
      })
    ]);
    await connector.onSyncComplete?.(connectorContext, {
      status,
      latestCursor: null,
      completedAt,
      failed: counters.failed
    });

    return serializeRun(updatedRun);
  } catch (error) {
    const safeError = safeIntegrationError(error);
    const completedAt = new Date();
    const run = await prisma.synchronizationRun.update({
      where: { id: claimed.id },
      data: {
        status: SynchronizationRunStatus.FAILED,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        errorCode: safeError.code,
        safeSummary: safeError.message,
        lockToken: null,
        nextAttemptAt: null
      },
      include: {
        connection: { select: { id: true, displayName: true, liveProviderType: true } }
      }
    });
    await prisma.integrationConnection.updateMany({
      where: { id: claimed.connectionId },
      data: {
        status: IntegrationConnectionStatus.ERROR,
        lastAttemptedSyncAt: completedAt,
        lastErrorCode: safeError.code,
        ...(isReauthorizationErrorCode(safeError.code)
          ? { requiresReauthorization: true }
          : {})
      }
    });
    logger.warn({ code: safeError.code, runId: claimed.id }, "Integration sync failed");
    return serializeRun(run);
  }
}

export async function claimSynchronizationRun(
  runId: string
): Promise<SynchronizationRun | null> {
  const lockToken = randomUUID();
  const now = new Date();
  const updated = await prisma.synchronizationRun.updateMany({
    where: { id: runId, status: SynchronizationRunStatus.PENDING },
    data: {
      status: SynchronizationRunStatus.RUNNING,
      startedAt: now,
      lockToken,
      attempts: { increment: 1 }
    }
  });

  if (updated.count === 0) {
    return null;
  }

  return prisma.synchronizationRun.findUnique({
    where: { id: runId }
  });
}

async function processSynchronizationItem(
  run: SynchronizationRun,
  context: IntegrationConnectionContext,
  item: ExternalFeedbackItem
): Promise<SynchronizationItemStatus> {
  const connector = integrationConnectorRegistry.getConnector(
    context.provider,
    context.mode
  );
  const payloadHash = connector.getPayloadHash(item);
  const safePreview = connector.getSafePreview(item);
  const processedAt = new Date();

  try {
    const normalizedInput = connector.normalizeItem(item, context);
    const result = await feedbackProcessingService.process(normalizedInput);
    const status = result.duplicate
      ? SynchronizationItemStatus.DUPLICATE
      : SynchronizationItemStatus.IMPORTED;

    await upsertSynchronizationItem({
      run,
      item,
      payloadHash,
      status,
      resultCode: result.duplicate ? INTEGRATION_ERRORS.SYNC_ITEM_DUPLICATE : "IMPORTED",
      safeMessage: result.duplicate
        ? "Source item already exists. No duplicate feedback was created."
        : "Source item imported through the feedback-processing pipeline.",
      feedbackId: result.feedbackId,
      feedbackIngestionId: result.ingestionId,
      safePreview,
      processedAt
    });

    return status;
  } catch (error) {
    const safeError = item.invalidReason
      ? {
          code: INTEGRATION_ERRORS.SYNC_ITEM_INVALID,
          message: item.invalidReason
        }
      : safeIntegrationError(error);

    await upsertSynchronizationItem({
      run,
      item,
      payloadHash,
      status: SynchronizationItemStatus.FAILED,
      resultCode: safeError.code,
      safeMessage: safeError.message,
      feedbackId: null,
      feedbackIngestionId: null,
      safePreview,
      processedAt
    });

    return SynchronizationItemStatus.FAILED;
  }
}

async function upsertSynchronizationItem(input: {
  run: SynchronizationRun;
  item: ExternalFeedbackItem;
  payloadHash: string;
  status: SynchronizationItemStatus;
  resultCode: string;
  safeMessage: string;
  feedbackId: string | null;
  feedbackIngestionId: string | null;
  safePreview: JsonObject;
  processedAt: Date;
}) {
  await prisma.synchronizationItem.upsert({
    where: {
      connectionId_externalId: {
        connectionId: input.run.connectionId,
        externalId: input.item.externalId
      }
    },
    create: {
      runId: input.run.id,
      connectionId: input.run.connectionId,
      provider: input.run.provider,
      externalId: input.item.externalId,
      payloadHash: input.payloadHash,
      status: input.status,
      resultCode: input.resultCode,
      safeMessage: input.safeMessage,
      feedbackId: input.feedbackId,
      feedbackIngestionId: input.feedbackIngestionId,
      externalReceivedAt: new Date(input.item.occurredAt),
      sourceLabel: input.item.sourceLabel,
      safePreview: input.safePreview as Prisma.InputJsonValue,
      processedAt: input.processedAt
    },
    update: {
      runId: input.run.id,
      payloadHash: input.payloadHash,
      status: input.status,
      resultCode: input.resultCode,
      safeMessage: input.safeMessage,
      feedbackId: input.feedbackId,
      feedbackIngestionId: input.feedbackIngestionId,
      externalReceivedAt: new Date(input.item.occurredAt),
      sourceLabel: input.item.sourceLabel,
      safePreview: input.safePreview as Prisma.InputJsonValue,
      processedAt: input.processedAt,
      retryCount:
        input.status === SynchronizationItemStatus.FAILED ? { increment: 1 } : undefined
    }
  });
}

async function resolveIntegrationManagementContext(
  actor: Actor,
  businessId: string
): Promise<ManagementContext> {
  const membership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId: actor.userId } },
    include: {
      branchAccess: { include: { branch: true } },
      business: { select: { status: true } }
    }
  });

  if (!membership) {
    throw new IntegrationError(
      "Integration management requires active owner or admin membership.",
      INTEGRATION_ERRORS.ACCESS_DENIED,
      403
    );
  }

  if (membership.status !== BusinessMembershipStatus.ACTIVE) {
    throw new IntegrationError(
      "Integration management requires active membership.",
      INTEGRATION_ERRORS.ACCESS_DENIED,
      403
    );
  }

  if (membership.business.status !== BusinessStatus.ACTIVE) {
    throw new IntegrationError(
      "This business is suspended.",
      INTEGRATION_ERRORS.ACCESS_DENIED,
      403
    );
  }

  if (
    membership.role !== BusinessMemberRole.OWNER &&
    membership.role !== BusinessMemberRole.ADMIN
  ) {
    throw new IntegrationError(
      "Integration management requires owner or admin access.",
      INTEGRATION_ERRORS.ACCESS_DENIED,
      403
    );
  }

  return { businessId, membership };
}

async function validateDefaultBranch(businessId: string, branchId: string) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, businessId },
    select: { id: true, name: true, status: true }
  });

  if (!branch) {
    throw new IntegrationError(
      "Choose an active branch for this Demo connection.",
      INTEGRATION_ERRORS.CONFIGURATION_INVALID,
      400
    );
  }

  if (branch.status !== BranchStatus.ACTIVE) {
    throw new IntegrationError(
      "Choose an active branch before synchronizing this connection.",
      INTEGRATION_ERRORS.BRANCH_INACTIVE,
      409
    );
  }

  return branch;
}

async function enforceConnectionLimit(businessId: string): Promise<void> {
  const total = await prisma.integrationConnection.count({
    where: { businessId, mode: IntegrationMode.DEMO }
  });

  if (total >= MAX_CONNECTIONS_PER_BUSINESS) {
    throw new IntegrationError(
      "This business already has the maximum number of Demo connections.",
      INTEGRATION_ERRORS.CONFIGURATION_INVALID,
      409
    );
  }
}

async function assertNoActiveRun(connectionId: string): Promise<void> {
  const active = await prisma.synchronizationRun.findFirst({
    where: { connectionId, status: { in: ACTIVE_RUN_STATUSES } },
    select: { id: true }
  });

  if (active) {
    throw new IntegrationError(
      "A synchronization run is already active for this connection.",
      INTEGRATION_ERRORS.SYNC_ALREADY_RUNNING,
      409
    );
  }
}

async function loadConnection(
  businessId: string,
  connectionId: string
): Promise<
  IntegrationConnection & {
    defaultBranch: { id: string; name: string; status: BranchStatus };
    synchronizationRuns?: SynchronizationRun[];
  }
> {
  const connection = await prisma.integrationConnection.findFirst({
    where: { id: connectionId, businessId },
    include: connectionInclude
  });

  if (!connection) {
    throw new IntegrationError(
      "Integration connection was not found.",
      INTEGRATION_ERRORS.NOT_FOUND,
      404
    );
  }

  return connection;
}

async function loadRun(businessId: string, runId: string) {
  const run = await prisma.synchronizationRun.findFirst({
    where: { id: runId, businessId },
    include: {
      connection: { select: { id: true, displayName: true, liveProviderType: true } }
    }
  });

  if (!run) {
    throw new IntegrationError(
      "Synchronization run was not found.",
      INTEGRATION_ERRORS.SYNC_RUN_NOT_FOUND,
      404
    );
  }

  return run;
}

function assertDemoMode(mode: IntegrationMode): void {
  if (mode === IntegrationMode.LIVE) {
    throw new IntegrationError(
      "Live provider connections are not available in Phase 20.",
      INTEGRATION_ERRORS.LIVE_NOT_AVAILABLE,
      400
    );
  }
}

function assertConnectionCanRun(
  connection: Pick<
    IntegrationConnection,
    "status" | "mode" | "provider" | "liveProviderType" | "requiresReauthorization"
  >
) {
  if (connection.status === IntegrationConnectionStatus.PAUSED) {
    throw new IntegrationError(
      "Resume this connection before synchronizing.",
      INTEGRATION_ERRORS.PAUSED,
      409
    );
  }
  if (connection.status === IntegrationConnectionStatus.DISCONNECTED) {
    throw new IntegrationError(
      "Reconnect this connection before synchronizing.",
      INTEGRATION_ERRORS.NOT_CONNECTED,
      409
    );
  }
  if (connection.mode === IntegrationMode.LIVE) {
    if (connection.provider === IntegrationProvider.EMAIL) {
      assertLiveEmailConnection(connection);
      const emailProviderType = requireLiveEmailProviderType(connection.liveProviderType);
      if (connection.requiresReauthorization) {
        throw new IntegrationError(
          `Reauthorize ${liveEmailProviderName(emailProviderType)} before synchronizing this connection.`,
          reauthorizationRequiredCode(emailProviderType),
          409
        );
      }
      if (connection.status !== IntegrationConnectionStatus.CONNECTED) {
        throw new IntegrationError(
          "Live Email must be connected before synchronizing.",
          liveEmailAuthorizationRequiredCode(emailProviderType),
          409
        );
      }
      return;
    }
    if (isWebhookDrivenLiveProvider(connection.provider)) {
      if (connection.status !== IntegrationConnectionStatus.CONNECTED) {
        throw new IntegrationError(
          `Live ${providerLabel(connection.provider)} must be connected before receiving webhook events.`,
          connection.provider === IntegrationProvider.WHATSAPP
            ? INTEGRATION_ERRORS.WHATSAPP_CONNECTION_INACTIVE
            : INTEGRATION_ERRORS.META_WEBHOOK_CONNECTION_NOT_FOUND,
          409
        );
      }
      return;
    }
    throw new IntegrationError(
      "This Live provider is not available yet.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }

  assertDemoMode(connection.mode);
}

function toConnectorContext(
  connection: IntegrationConnection
): IntegrationConnectionContext {
  return {
    connectionId: connection.id,
    businessId: connection.businessId,
    defaultBranchId: connection.defaultBranchId,
    displayName: connection.displayName,
    provider: connection.provider,
    mode: connection.mode,
    demoScenario: connection.demoScenario,
    liveProviderType: connection.liveProviderType,
    providerAccountId: connection.providerAccountId,
    providerAccountLabel: connection.providerAccountLabel,
    synchronizationFolder: connection.synchronizationFolder,
    lastProviderCursor: connection.lastProviderCursor,
    whatsappPhoneNumberId: connection.whatsappPhoneNumberId,
    whatsappBusinessAccountId: connection.whatsappBusinessAccountId,
    whatsappDisplayPhoneNumber: connection.whatsappDisplayPhoneNumber
  };
}

async function createOAuthStateForConnection(input: {
  actor: Actor;
  membershipId: string;
  businessId: string;
  connectionId: string;
  defaultBranchId: string;
  emailProviderType: LiveEmailProviderType;
  action: IntegrationOAuthAction;
}): Promise<{ authorizationUrl: string; expiresAt: Date }> {
  const session =
    input.emailProviderType === EmailProviderType.GMAIL
      ? createGmailAuthorizationSession()
      : createOutlookAuthorizationSession();
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MINUTES * 60_000);

  await prisma.integrationOAuthState.create({
    data: {
      businessId: input.businessId,
      connectionId: input.connectionId,
      membershipId: input.membershipId,
      userId: input.actor.userId,
      defaultBranchId: input.defaultBranchId,
      provider: IntegrationProvider.EMAIL,
      emailProviderType: input.emailProviderType,
      action: input.action,
      stateHash: sha256(session.state),
      encryptedCodeVerifier: encryptIntegrationSecret(
        session.codeVerifier,
        verifierAssociatedData(input.connectionId, input.emailProviderType)
      ),
      redirectPath: `/business/${input.businessId}/integrations`,
      expiresAt
    }
  });

  await prisma.integrationOAuthState.deleteMany({
    where: {
      businessId: input.businessId,
      expiresAt: { lt: new Date(Date.now() - OAUTH_STATE_TTL_MINUTES * 60_000) }
    }
  });

  return { authorizationUrl: session.authorizationUrl, expiresAt };
}

function buildIntegrationsRedirect(
  connection: Pick<IntegrationConnection, "id" | "businessId"> | null,
  status: "connected" | "error",
  code: string | null,
  emailProviderType?: LiveEmailProviderType
): string {
  const path = connection
    ? `/business/${connection.businessId}/integrations`
    : "/business";
  const params = new URLSearchParams({
    integration: "email",
    liveEmailStatus: status
  });
  if (connection) params.set("connectionId", connection.id);
  if (code) params.set("errorCode", code);
  if (emailProviderType) {
    params.set("liveEmailProvider", liveEmailProviderSlug(emailProviderType));
  }

  return `${env.APP_FRONTEND_URL.replace(/\/+$/, "")}${path}?${params.toString()}`;
}

function connectionKey(provider: IntegrationProvider, mode: IntegrationMode): string {
  return `${provider}:${mode}`;
}

function isLiveEmailConfigured(): boolean {
  return (
    isLiveEmailProviderConfigured(EmailProviderType.GMAIL) ||
    isLiveEmailProviderConfigured(EmailProviderType.MICROSOFT)
  );
}

function isLiveWhatsAppConfigured(): boolean {
  if (
    !env.LIVE_WHATSAPP_ENABLED ||
    !env.META_WHATSAPP_APP_SECRET ||
    !env.META_WHATSAPP_VERIFY_TOKEN ||
    !env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY
  ) {
    return false;
  }

  return Buffer.from(env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY, "base64").length === 32;
}

function isLiveMetaSocialConfigured(): boolean {
  if (
    !env.LIVE_META_SOCIAL_ENABLED ||
    !env.META_WHATSAPP_APP_SECRET ||
    !env.META_WHATSAPP_VERIFY_TOKEN ||
    !env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY
  ) {
    return false;
  }

  return Buffer.from(env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY, "base64").length === 32;
}

function isWebhookDrivenLiveProvider(provider: IntegrationProvider): boolean {
  return (
    provider === IntegrationProvider.WHATSAPP ||
    provider === IntegrationProvider.FACEBOOK ||
    provider === IntegrationProvider.INSTAGRAM
  );
}

function assertLiveEmailConnection(
  connection: Pick<IntegrationConnection, "provider" | "mode" | "liveProviderType">
): void {
  if (
    connection.provider !== IntegrationProvider.EMAIL ||
    connection.mode !== IntegrationMode.LIVE ||
    !isSupportedLiveEmailProvider(connection.liveProviderType)
  ) {
    throw new IntegrationError(
      "This Live Email connection must use Gmail or Outlook.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }
}

function isSupportedLiveEmailProvider(
  value: EmailProviderType | null | undefined
): value is LiveEmailProviderType {
  return value === EmailProviderType.GMAIL || value === EmailProviderType.MICROSOFT;
}

function requireLiveEmailProviderType(
  value: EmailProviderType | null | undefined
): LiveEmailProviderType {
  if (isSupportedLiveEmailProvider(value)) return value;
  throw new IntegrationError(
    "This Live Email connection must use Gmail or Outlook.",
    INTEGRATION_ERRORS.MODE_UNSUPPORTED,
    400
  );
}

function assertLiveEmailProviderConfigured(providerType: LiveEmailProviderType): void {
  if (providerType === EmailProviderType.GMAIL) {
    assertLiveEmailConfigured();
    return;
  }
  assertLiveOutlookConfigured();
}

function isLiveEmailProviderConfigured(providerType: LiveEmailProviderType): boolean {
  if (!env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY) return false;
  if (Buffer.from(env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY, "base64").length !== 32) {
    return false;
  }
  if (providerType === EmailProviderType.GMAIL) {
    return Boolean(
      env.LIVE_EMAIL_ENABLED &&
      env.GMAIL_OAUTH_CLIENT_ID &&
      env.GMAIL_OAUTH_CLIENT_SECRET &&
      env.GMAIL_OAUTH_REDIRECT_URI
    );
  }
  return Boolean(
    env.LIVE_OUTLOOK_ENABLED &&
    env.MICROSOFT_OAUTH_CLIENT_ID &&
    env.MICROSOFT_OAUTH_CLIENT_SECRET &&
    env.MICROSOFT_OAUTH_REDIRECT_URI
  );
}

function liveEmailAuthorizationRequiredCode(
  providerType: LiveEmailProviderType
): IntegrationErrorCode {
  return providerType === EmailProviderType.GMAIL
    ? INTEGRATION_ERRORS.LIVE_EMAIL_AUTHORIZATION_REQUIRED
    : INTEGRATION_ERRORS.OUTLOOK_AUTHORIZATION_REQUIRED;
}

function reauthorizationRequiredCode(
  providerType: LiveEmailProviderType
): IntegrationErrorCode {
  return providerType === EmailProviderType.GMAIL
    ? INTEGRATION_ERRORS.EMAIL_REAUTHORIZATION_REQUIRED
    : INTEGRATION_ERRORS.OUTLOOK_AUTHORIZATION_REQUIRED;
}

function verifierAssociatedData(
  connectionId: string,
  providerType: LiveEmailProviderType
): string {
  return providerType === EmailProviderType.GMAIL
    ? oauthVerifierAssociatedData(connectionId)
    : outlookVerifierAssociatedData(connectionId);
}

function liveEmailProviderName(providerType: LiveEmailProviderType): string {
  return providerType === EmailProviderType.GMAIL ? "Google" : "Microsoft";
}

function liveEmailProviderSlug(providerType: LiveEmailProviderType): string {
  return providerType === EmailProviderType.GMAIL ? "gmail" : "outlook";
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isReauthorizationErrorCode(code: string): boolean {
  return (
    code === INTEGRATION_ERRORS.EMAIL_REAUTHORIZATION_REQUIRED ||
    code === INTEGRATION_ERRORS.EMAIL_AUTH_REVOKED ||
    code === INTEGRATION_ERRORS.EMAIL_TOKEN_REFRESH_FAILED ||
    code === INTEGRATION_ERRORS.LIVE_EMAIL_AUTHORIZATION_REQUIRED ||
    code === INTEGRATION_ERRORS.OUTLOOK_AUTHORIZATION_REQUIRED ||
    code === INTEGRATION_ERRORS.OUTLOOK_AUTHORIZATION_REVOKED ||
    code === INTEGRATION_ERRORS.OUTLOOK_TOKEN_REFRESH_FAILED
  );
}

function serializeConnection(
  connection: IntegrationConnection & {
    defaultBranch?: { id: string; name: string; status: BranchStatus };
    synchronizationRuns?: SynchronizationRun[];
  }
) {
  const latestRun = connection.synchronizationRuns?.[0] ?? null;
  return {
    id: connection.id,
    businessId: connection.businessId,
    provider: connection.provider,
    providerLabel: providerLabel(connection.provider),
    mode: connection.mode,
    demoMode: connection.mode === IntegrationMode.DEMO,
    liveMode: connection.mode === IntegrationMode.LIVE,
    status: connection.status,
    displayName: connection.displayName,
    defaultBranch: connection.defaultBranch
      ? {
          id: connection.defaultBranch.id,
          name: connection.defaultBranch.name,
          status: connection.defaultBranch.status
        }
      : null,
    demoScenario: connection.demoScenario,
    liveProviderType: connection.liveProviderType,
    providerAccountId: connection.providerAccountId,
    providerAccountLabel: connection.providerAccountLabel,
    synchronizationFolder: connection.synchronizationFolder,
    lastProviderCursorAt: connection.lastProviderCursorAt?.toISOString() ?? null,
    requiresReauthorization: connection.requiresReauthorization,
    lastConnectionTestAt: connection.lastConnectionTestAt?.toISOString() ?? null,
    lastConnectionTestStatus: connection.lastConnectionTestStatus,
    whatsappPhoneNumberId: connection.whatsappPhoneNumberId
      ? maskProviderId(connection.whatsappPhoneNumberId)
      : null,
    whatsappBusinessAccountId: connection.whatsappBusinessAccountId
      ? maskProviderId(connection.whatsappBusinessAccountId)
      : null,
    whatsappDisplayPhoneNumber: maskPhone(connection.whatsappDisplayPhoneNumber),
    webhookStatus: connection.webhookStatus,
    lastWebhookReceivedAt: connection.lastWebhookReceivedAt?.toISOString() ?? null,
    lastWebhookVerifiedAt: connection.lastWebhookVerifiedAt?.toISOString() ?? null,
    lastInboundMessageAt: connection.lastInboundMessageAt?.toISOString() ?? null,
    graphApiVersion:
      isWebhookDrivenLiveProvider(connection.provider) &&
      connection.mode === IntegrationMode.LIVE
        ? env.META_WHATSAPP_GRAPH_API_VERSION
        : null,
    connectedAt: connection.connectedAt?.toISOString() ?? null,
    pausedAt: connection.pausedAt?.toISOString() ?? null,
    disconnectedAt: connection.disconnectedAt?.toISOString() ?? null,
    lastAttemptedSyncAt: connection.lastAttemptedSyncAt?.toISOString() ?? null,
    lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt?.toISOString() ?? null,
    lastErrorCode: connection.lastErrorCode,
    totalImported: connection.totalImported,
    latestRun: latestRun ? serializeRun(latestRun) : null,
    disclosure:
      connection.mode === IntegrationMode.LIVE
        ? connection.provider === IntegrationProvider.WHATSAPP
          ? "Live WhatsApp imports real inbound text messages through signed Meta webhooks. Non-text media is skipped without download, outbound WhatsApp replies are not supported, and imported feedback remains after disconnect."
          : connection.provider === IntegrationProvider.FACEBOOK
            ? "Live Facebook imports supported Page comments through signed Meta webhooks. Replies, Messenger, publishing, media downloads, and reactions-as-feedback are not supported, and imported feedback remains after disconnect."
            : connection.provider === IntegrationProvider.INSTAGRAM
              ? "Live Instagram imports supported professional-account comments through signed Meta webhooks. Mentions are deferred, personal accounts are unsupported, replies, DMs, publishing, and media downloads are not supported, and imported feedback remains after disconnect."
              : "Live Email imports real Gmail or Outlook Inbox messages. It is inbound-only, manual, limited to 20 messages per run, and never changes provider read state."
        : "Demo Mode uses simulated external data. No real provider account is connected.",
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString()
  };
}

function serializeRun(
  run: SynchronizationRun & {
    connection?: {
      id: string;
      displayName: string;
      liveProviderType: EmailProviderType | null;
    } | null;
  }
) {
  return {
    id: run.id,
    connectionId: run.connectionId,
    connection: run.connection
      ? {
          id: run.connection.id,
          displayName: run.connection.displayName,
          liveProviderType: run.connection.liveProviderType
        }
      : null,
    businessId: run.businessId,
    provider: run.provider,
    providerLabel: providerLabel(run.provider),
    mode: run.mode,
    demoMode: run.mode === IntegrationMode.DEMO,
    liveMode: run.mode === IntegrationMode.LIVE,
    liveProviderType: run.connection?.liveProviderType ?? null,
    status: run.status,
    triggerType: run.triggerType,
    demoScenario: run.demoScenario,
    requestedAt: run.requestedAt.toISOString(),
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    durationMs: run.durationMs,
    itemsFetched: run.itemsFetched,
    itemsProcessed: run.itemsProcessed,
    itemsImported: run.itemsImported,
    itemsDuplicated: run.itemsDuplicated,
    itemsSkipped: run.itemsSkipped,
    itemsFailed: run.itemsFailed,
    errorCode: run.errorCode,
    safeSummary: run.safeSummary,
    attempts: run.attempts,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString()
  };
}

function serializeItem(item: {
  id: string;
  runId: string;
  connectionId: string;
  provider: IntegrationProvider;
  externalId: string;
  payloadHash: string;
  status: SynchronizationItemStatus;
  feedbackIngestionId: string | null;
  feedbackId: string | null;
  resultCode: string | null;
  safeMessage: string | null;
  externalReceivedAt: Date | null;
  sourceLabel: string | null;
  safePreview: Prisma.JsonValue | null;
  processedAt: Date | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    runId: item.runId,
    connectionId: item.connectionId,
    provider: item.provider,
    providerLabel: providerLabel(item.provider),
    externalId: item.externalId,
    payloadHash: item.payloadHash,
    status: item.status,
    feedbackIngestionId: item.feedbackIngestionId,
    feedbackId: item.feedbackId,
    resultCode: item.resultCode,
    safeMessage: item.safeMessage,
    externalReceivedAt: item.externalReceivedAt?.toISOString() ?? null,
    sourceLabel: item.sourceLabel,
    safePreview: item.safePreview,
    processedAt: item.processedAt?.toISOString() ?? null,
    retryCount: item.retryCount,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function serializeWebhookDelivery(item: {
  id: string;
  connectionId: string;
  businessId: string;
  provider: IntegrationProvider;
  externalEventId: string | null;
  payloadHash: string;
  status: string;
  resultCode: string | null;
  safeMessage: string | null;
  messageType: string | null;
  senderHash: string | null;
  safePreview: Prisma.JsonValue | null;
  receivedAt: Date;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    connectionId: item.connectionId,
    businessId: item.businessId,
    provider: item.provider,
    providerLabel: providerLabel(item.provider),
    externalEventId: item.externalEventId,
    payloadHash: item.payloadHash,
    status: item.status,
    resultCode: item.resultCode,
    safeMessage: item.safeMessage,
    messageType: item.messageType,
    senderHash: item.senderHash,
    safePreview: item.safePreview,
    receivedAt: item.receivedAt.toISOString(),
    processedAt: item.processedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function summarizeRun(
  status: SynchronizationRunStatus,
  counters: {
    imported: number;
    duplicated: number;
    skipped: number;
    failed: number;
  }
): string {
  if (status === SynchronizationRunStatus.FAILED) {
    return "Synchronization failed. No source items were imported.";
  }
  if (status === SynchronizationRunStatus.COMPLETED_WITH_ERRORS) {
    return `${counters.imported} imported, ${counters.duplicated} duplicates, ${counters.failed} failed.`;
  }
  return `${counters.imported} imported and ${counters.duplicated} duplicates processed.`;
}

function providerLabel(provider: IntegrationProvider): string {
  switch (provider) {
    case IntegrationProvider.GOOGLE_REVIEWS:
      return "Google Reviews";
    case IntegrationProvider.WHATSAPP:
      return "WhatsApp";
    case IntegrationProvider.EMAIL:
      return "Email";
    case IntegrationProvider.X:
      return "X";
    case IntegrationProvider.FACEBOOK:
      return "Facebook";
    case IntegrationProvider.INSTAGRAM:
      return "Instagram";
  }
}

function maskProviderId(value: string): string {
  if (value.length <= 8) return "Configured";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function formatInstagramLabel(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function toPagination(page: number, pageSize: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    totalItems: total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof PrismaRuntime.PrismaClientKnownRequestError && error.code === "P2002"
  );
}
