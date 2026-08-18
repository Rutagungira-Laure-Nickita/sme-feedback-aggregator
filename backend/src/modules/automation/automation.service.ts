import { randomUUID } from "node:crypto";
import {
  AutomationActionExecutionStatus,
  AutomationActionType,
  AutomationEventStatus,
  AutomationExecutionStatus,
  AutomationRuleBranchScope,
  AutomationRuleStatus,
  AutomationRuleTrigger,
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus,
  FeedbackActivityActorType,
  FeedbackActivityType,
  FeedbackFieldStateField,
  FeedbackFieldStateSource,
  FeedbackPriority,
  FeedbackStatus,
  Prisma,
  type AutomationAction,
  type AutomationCondition,
  type AutomationRule,
  type BusinessMembership
} from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { isValidTransition } from "../feedback-workflow/feedback-workflow.types.js";
import { AUTOMATION_ERRORS, safeAutomationErrorMessage } from "./automation.errors.js";
import {
  createAutomationFingerprint,
  evaluateCondition,
  matchConditionResults,
  MAX_ACTIVE_RULES_PER_BUSINESS,
  MAX_EVENT_CHAIN_DEPTH,
  MAX_NON_ARCHIVED_RULES_PER_BUSINESS,
  normalizeRuleDefinitionInput,
  validateRuleDefinitionShape,
  type AutomationFeedbackSnapshot
} from "./automation.policy.js";
import type {
  ExecutionListQuery,
  PreviewRunInput,
  RuleDefinitionInput,
  RuleListQuery,
  RuleUpdateInput
} from "./automation.schemas.js";
import {
  deriveHistoricalFeedbackFieldSource,
  initialFeedbackFieldSource,
  isHumanOwnedFieldSource
} from "./automation.field-source.js";

type Actor = { userId: string };

type MembershipContext = {
  businessId: string;
  membership: BusinessMembership & {
    branchAccess: { branchId: string }[];
    business: { status: BusinessStatus };
  };
};

type RuleWithDefinition = AutomationRule & {
  branches: { branchId: string }[];
  conditions: AutomationCondition[];
  actions: AutomationAction[];
};

type ActionResult = {
  actionId?: string;
  actionType: AutomationActionType;
  actionPosition: number;
  status: AutomationActionExecutionStatus;
  fieldName: string | null;
  previousValue: string | null;
  newValue: string | null;
  safeErrorCode: string | null;
  safeErrorMessage: string | null;
};

const FIELD_FOR_ACTION: Record<AutomationActionType, FeedbackFieldStateField | null> = {
  SET_PRIORITY: FeedbackFieldStateField.PRIORITY,
  SET_CATEGORY: FeedbackFieldStateField.CATEGORY,
  ASSIGN_TO_MEMBERSHIP: FeedbackFieldStateField.ASSIGNMENT,
  UNASSIGN: FeedbackFieldStateField.ASSIGNMENT,
  SET_STATUS: FeedbackFieldStateField.STATUS
};

export async function listAutomationRules(
  actor: Actor,
  businessId: string,
  query: RuleListQuery
) {
  await resolveAutomationManagementContext(actor, businessId);
  const where: Prisma.AutomationRuleWhereInput = {
    businessId,
    ...(query.includeArchived ? {} : { status: { not: AutomationRuleStatus.ARCHIVED } }),
    ...(query.status ? { status: query.status } : {}),
    ...(query.trigger ? { trigger: query.trigger } : {}),
    ...(query.branchScope ? { branchScope: query.branchScope } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { description: { contains: query.search } }
          ]
        }
      : {})
  };
  const skip = (query.page - 1) * query.pageSize;
  const [items, total, counts, executionCountToday] = await Promise.all([
    prisma.automationRule.findMany({
      where,
      include: {
        branches: { select: { branchId: true } },
        conditions: { orderBy: { position: "asc" } },
        actions: { orderBy: { position: "asc" } }
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      skip,
      take: query.pageSize
    }),
    prisma.automationRule.count({ where }),
    prisma.automationRule.groupBy({
      by: ["status"],
      where: { businessId },
      _count: { _all: true }
    }),
    prisma.automationExecution.count({
      where: {
        businessId,
        createdAt: { gte: startOfToday() }
      }
    })
  ]);

  const countMap = Object.fromEntries(
    counts.map((count) => [count.status, count._count._all])
  ) as Partial<Record<AutomationRuleStatus, number>>;

  return {
    items: items.map(serializeRule),
    summary: {
      total: Object.values(countMap).reduce((sum, count) => sum + count, 0),
      active: countMap.ACTIVE ?? 0,
      paused: countMap.PAUSED ?? 0,
      draft: countMap.DRAFT ?? 0,
      archived: countMap.ARCHIVED ?? 0,
      executionsToday: executionCountToday
    },
    pagination: toPagination(query.page, query.pageSize, total)
  };
}

export async function getAutomationRule(
  actor: Actor,
  businessId: string,
  ruleId: string
) {
  await resolveAutomationManagementContext(actor, businessId);
  const rule = await loadRule(businessId, ruleId);
  return serializeRule(rule);
}

export async function createAutomationRule(
  actor: Actor,
  businessId: string,
  definition: RuleDefinitionInput
) {
  const normalizedDefinition = normalizeRuleDefinitionInput(definition);
  const context = await resolveAutomationManagementContext(actor, businessId);
  await enforceRuleLimits(businessId, { creatingActive: false });
  await validateDefinitionTargets(businessId, normalizedDefinition, {
    requireExecutable: false
  });
  const position =
    (
      await prisma.automationRule.aggregate({
        where: { businessId, status: { not: AutomationRuleStatus.ARCHIVED } },
        _max: { position: true }
      })
    )._max.position ?? 0;

  const rule = await prisma.$transaction(async (tx) => {
    const created = await tx.automationRule.create({
      data: {
        businessId,
        name: normalizedDefinition.name,
        description: normalizedDefinition.description || null,
        trigger: normalizedDefinition.trigger,
        branchScope: normalizedDefinition.branchScope,
        matchMode: normalizedDefinition.matchMode,
        stopProcessingAfterMatch: normalizedDefinition.stopProcessingAfterMatch,
        position: position + 1,
        createdByMembershipId: context.membership.id,
        updatedByMembershipId: context.membership.id
      }
    });
    await replaceRuleChildren(tx, businessId, created.id, normalizedDefinition);
    return tx.automationRule.findUniqueOrThrow({
      where: { id: created.id },
      include: ruleInclude()
    });
  });

  return serializeRule(rule);
}

export async function updateAutomationRule(
  actor: Actor,
  businessId: string,
  ruleId: string,
  input: RuleUpdateInput
) {
  const normalizedInput = normalizeRuleDefinitionInput(input);
  const context = await resolveAutomationManagementContext(actor, businessId);
  const current = await loadRule(businessId, ruleId);
  if (current.status === AutomationRuleStatus.ARCHIVED) {
    throw new AppError(
      "Archived automation rules cannot be edited.",
      AUTOMATION_ERRORS.RULE_ARCHIVED,
      409
    );
  }
  if (
    input.expectedUpdatedAt &&
    current.updatedAt.toISOString() !== input.expectedUpdatedAt
  ) {
    throw new AppError(
      "This automation rule changed. Refresh before editing.",
      AUTOMATION_ERRORS.STALE_RULE,
      409
    );
  }
  await validateDefinitionTargets(businessId, normalizedInput, {
    requireExecutable: current.status === AutomationRuleStatus.ACTIVE
  });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.automationRule.update({
      where: { id: ruleId },
      data: {
        name: normalizedInput.name,
        description: normalizedInput.description || null,
        trigger: normalizedInput.trigger,
        branchScope: normalizedInput.branchScope,
        matchMode: normalizedInput.matchMode,
        stopProcessingAfterMatch: normalizedInput.stopProcessingAfterMatch,
        version: { increment: 1 },
        updatedByMembershipId: context.membership.id
      }
    });
    await replaceRuleChildren(tx, businessId, ruleId, normalizedInput);
    return tx.automationRule.findUniqueOrThrow({
      where: { id: ruleId },
      include: ruleInclude()
    });
  });

  return serializeRule(updated);
}

export async function activateAutomationRule(
  actor: Actor,
  businessId: string,
  ruleId: string
) {
  const context = await resolveAutomationManagementContext(actor, businessId);
  const rule = await loadRule(businessId, ruleId);
  if (rule.status === AutomationRuleStatus.ARCHIVED) {
    throw new AppError(
      "Archived automation rules cannot be activated.",
      AUTOMATION_ERRORS.RULE_ARCHIVED,
      409
    );
  }
  await enforceRuleLimits(businessId, {
    creatingActive: rule.status !== AutomationRuleStatus.ACTIVE
  });
  await validatePersistedRuleTargets(businessId, rule, { requireExecutable: true });
  const updated = await prisma.automationRule.update({
    where: { id: rule.id },
    data: {
      status: AutomationRuleStatus.ACTIVE,
      updatedByMembershipId: context.membership.id
    },
    include: ruleInclude()
  });
  return serializeRule(updated);
}

export async function pauseAutomationRule(
  actor: Actor,
  businessId: string,
  ruleId: string
) {
  const context = await resolveAutomationManagementContext(actor, businessId);
  const rule = await loadRule(businessId, ruleId);
  if (rule.status === AutomationRuleStatus.ARCHIVED) {
    throw new AppError(
      "Archived automation rules cannot be paused.",
      AUTOMATION_ERRORS.RULE_ARCHIVED,
      409
    );
  }
  const updated = await prisma.automationRule.update({
    where: { id: rule.id },
    data: {
      status: AutomationRuleStatus.PAUSED,
      updatedByMembershipId: context.membership.id
    },
    include: ruleInclude()
  });
  return serializeRule(updated);
}

export async function archiveAutomationRule(
  actor: Actor,
  businessId: string,
  ruleId: string
) {
  const context = await resolveAutomationManagementContext(actor, businessId);
  const rule = await loadRule(businessId, ruleId);
  const updated = await prisma.automationRule.update({
    where: { id: rule.id },
    data: {
      status: AutomationRuleStatus.ARCHIVED,
      archivedAt: new Date(),
      updatedByMembershipId: context.membership.id
    },
    include: ruleInclude()
  });
  return serializeRule(updated);
}

export async function unarchiveAutomationRule(
  actor: Actor,
  businessId: string,
  ruleId: string
) {
  const context = await resolveAutomationManagementContext(actor, businessId);
  const rule = await loadRule(businessId, ruleId);
  if (rule.status !== AutomationRuleStatus.ARCHIVED) {
    throw new AppError(
      "Only archived automation rules can be restored.",
      AUTOMATION_ERRORS.RULE_INVALID,
      409
    );
  }
  await enforceRuleLimits(businessId, { creatingActive: false });
  await validatePersistedRuleTargets(businessId, rule, { requireExecutable: false });
  const position =
    (
      await prisma.automationRule.aggregate({
        where: { businessId, status: { not: AutomationRuleStatus.ARCHIVED } },
        _max: { position: true }
      })
    )._max.position ?? 0;
  const updated = await prisma.automationRule.update({
    where: { id: rule.id },
    data: {
      status: AutomationRuleStatus.DRAFT,
      archivedAt: null,
      position: position + 1,
      updatedByMembershipId: context.membership.id
    },
    include: ruleInclude()
  });
  return serializeRule(updated);
}

export async function deleteAutomationRule(
  actor: Actor,
  businessId: string,
  ruleId: string
) {
  await resolveAutomationManagementContext(actor, businessId);
  const rule = await loadRule(businessId, ruleId);
  if (rule.status !== AutomationRuleStatus.ARCHIVED) {
    throw new AppError(
      "Archive this automation rule before deleting it permanently.",
      AUTOMATION_ERRORS.RULE_INVALID,
      409
    );
  }
  await prisma.automationRule.delete({ where: { id: rule.id } });
  return { deleted: true, ruleId: rule.id };
}

export async function duplicateAutomationRule(
  actor: Actor,
  businessId: string,
  ruleId: string
) {
  const context = await resolveAutomationManagementContext(actor, businessId);
  const rule = await loadRule(businessId, ruleId);
  await enforceRuleLimits(businessId, { creatingActive: false });
  const position =
    (
      await prisma.automationRule.aggregate({
        where: { businessId, status: { not: AutomationRuleStatus.ARCHIVED } },
        _max: { position: true }
      })
    )._max.position ?? 0;
  const duplicated = await prisma.$transaction(async (tx) => {
    const created = await tx.automationRule.create({
      data: {
        businessId,
        name: `${rule.name} copy`.slice(0, 120),
        description: rule.description,
        status: AutomationRuleStatus.DRAFT,
        branchScope: rule.branchScope,
        trigger: rule.trigger,
        matchMode: rule.matchMode,
        stopProcessingAfterMatch: rule.stopProcessingAfterMatch,
        position: position + 1,
        createdByMembershipId: context.membership.id,
        updatedByMembershipId: context.membership.id
      }
    });
    await tx.automationRuleBranch.createMany({
      data: rule.branches.map((branch) => ({
        ruleId: created.id,
        branchId: branch.branchId
      }))
    });
    await tx.automationCondition.createMany({
      data: rule.conditions.map((condition) => ({
        ruleId: created.id,
        type: condition.type,
        operator: condition.operator,
        position: condition.position,
        valueString: condition.valueString,
        valueNumber: condition.valueNumber,
        valueJson: condition.valueJson as Prisma.InputJsonValue,
        branchId: condition.branchId,
        categoryId: condition.categoryId
      }))
    });
    await tx.automationAction.createMany({
      data: rule.actions.map((action) => ({
        ruleId: created.id,
        type: action.type,
        position: action.position,
        valueString: action.valueString,
        categoryId: action.categoryId,
        targetMembershipId: action.targetMembershipId
      }))
    });
    return tx.automationRule.findUniqueOrThrow({
      where: { id: created.id },
      include: ruleInclude()
    });
  });
  return serializeRule(duplicated);
}

export async function reorderAutomationRules(
  actor: Actor,
  businessId: string,
  ruleIds: string[]
) {
  await resolveAutomationManagementContext(actor, businessId);
  const existing = await prisma.automationRule.findMany({
    where: {
      businessId,
      id: { in: ruleIds },
      status: { not: AutomationRuleStatus.ARCHIVED }
    },
    select: { id: true }
  });
  if (existing.length !== ruleIds.length) {
    throw new AppError(
      "Only active, paused, or draft rules in this business can be reordered.",
      AUTOMATION_ERRORS.RULE_INVALID,
      400
    );
  }
  await prisma.$transaction(
    ruleIds.map((id, index) =>
      prisma.automationRule.update({
        where: { id },
        data: { position: index + 1 }
      })
    )
  );
  return { reordered: true };
}

export async function previewAutomationRule(
  actor: Actor,
  businessId: string,
  ruleId: string,
  input: PreviewRunInput
) {
  const context = await resolveAutomationManagementContext(actor, businessId);
  const rule = await loadRule(businessId, ruleId);
  await validatePersistedRuleTargets(businessId, rule, { requireExecutable: true });
  const feedback = await loadFeedbackSnapshot(context, input.feedbackId);
  ensureRuleAppliesToBranch(rule, feedback.branchId);
  const conditionResults = rule.conditions.map((condition) =>
    evaluateCondition(condition, feedback)
  );
  const matched = matchConditionResults(rule.matchMode, conditionResults);
  const fieldSources = await getFeedbackFieldSources(feedback);
  const actionPredictions = rule.actions.map((action) =>
    previewAction(action, feedback, fieldSources)
  );
  return {
    matched,
    conditionResults,
    actionPredictions,
    wouldStopProcessing: matched && rule.stopProcessingAfterMatch
  };
}

export async function runAutomationRuleManually(
  actor: Actor,
  businessId: string,
  ruleId: string,
  input: PreviewRunInput
) {
  const context = await resolveAutomationManagementContext(actor, businessId);
  const rule = await loadRule(businessId, ruleId);
  if (rule.status === AutomationRuleStatus.ARCHIVED) {
    throw new AppError(
      "Archived automation rules cannot run.",
      AUTOMATION_ERRORS.RULE_ARCHIVED,
      409
    );
  }
  await validatePersistedRuleTargets(businessId, rule, { requireExecutable: true });
  const feedback = await loadFeedbackSnapshot(context, input.feedbackId);
  ensureRuleAppliesToBranch(rule, feedback.branchId);
  const fingerprint = createInputFingerprint(
    feedback,
    AutomationRuleTrigger.FEEDBACK_CREATED
  );
  return executeRule(rule, feedback, {
    eventId: null,
    trigger: rule.trigger,
    inputFingerprint: fingerprint,
    executionSalt: input.requestKey ?? "manual"
  });
}

export async function listAutomationExecutions(
  actor: Actor,
  businessId: string,
  query: ExecutionListQuery
) {
  await resolveAutomationManagementContext(actor, businessId);
  const where: Prisma.AutomationExecutionWhereInput = {
    businessId,
    ...(query.ruleId ? { ruleId: query.ruleId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.trigger ? { trigger: query.trigger } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {})
          }
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { ruleSnapshot: { path: "$.name", string_contains: query.search } },
            { feedbackId: { contains: query.search } }
          ]
        }
      : {})
  };
  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    prisma.automationExecution.findMany({
      where,
      include: {
        rule: { select: { id: true, name: true } },
        feedback: { select: { id: true, title: true, receivedAt: true } },
        actionExecutions: { orderBy: { actionPosition: "asc" } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize
    }),
    prisma.automationExecution.count({ where })
  ]);
  return {
    items: items.map(serializeExecution),
    pagination: toPagination(query.page, query.pageSize, total)
  };
}

export async function getAutomationExecution(
  actor: Actor,
  businessId: string,
  executionId: string
) {
  await resolveAutomationManagementContext(actor, businessId);
  const execution = await prisma.automationExecution.findFirst({
    where: { id: executionId, businessId },
    include: {
      rule: { select: { id: true, name: true } },
      feedback: { select: { id: true, title: true, receivedAt: true } },
      actionExecutions: { orderBy: { actionPosition: "asc" } }
    }
  });
  if (!execution) {
    throw new AppError(
      "Automation execution was not found.",
      AUTOMATION_ERRORS.RULE_NOT_FOUND,
      404
    );
  }
  return serializeExecution(execution);
}

export async function scheduleAutomationEvent(
  feedbackId: string,
  trigger: AutomationRuleTrigger
): Promise<void> {
  try {
    const feedback = await loadFeedbackSnapshotForSystem(feedbackId);
    if (!feedback) return;
    await ensureInitialFieldStates(feedback);
    if (trigger === AutomationRuleTrigger.AI_ANALYSIS_COMPLETED && !feedback.aiAnalysis) {
      return;
    }
    const inputFingerprint = createInputFingerprint(feedback, trigger);
    const eventKey = createAutomationFingerprint({
      businessId: feedback.businessId,
      feedbackId: feedback.id,
      trigger,
      inputFingerprint
    }).slice(0, 96);
    await prisma.automationEvent.create({
      data: {
        businessId: feedback.businessId,
        feedbackId: feedback.id,
        trigger,
        inputFingerprint,
        eventKey,
        eventChainId: randomUUID(),
        maxRetries: env.AUTOMATION_MAX_RETRIES
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      logger.debug({ feedbackId, trigger }, "Automation event already queued");
      return;
    }
    logger.warn(
      { feedbackId, trigger, code: "AUTOMATION_SCHEDULE_FAILED" },
      "Automation scheduling failed"
    );
  }
}

export async function processAutomationEventBatch(): Promise<void> {
  if (!env.AUTOMATION_WORKER_ENABLED) return;
  await recoverStaleAutomationEvents();
  const claimToken = randomUUID();
  const now = new Date();
  const candidates = await prisma.automationEvent.findMany({
    where: {
      status: AutomationEventStatus.QUEUED,
      retryCount: { lte: env.AUTOMATION_MAX_RETRIES }
    },
    orderBy: [{ queuedAt: "asc" }, { id: "asc" }],
    take: env.AUTOMATION_WORKER_BATCH_SIZE,
    select: { id: true }
  });

  for (const candidate of candidates) {
    const claimed = await prisma.automationEvent.updateMany({
      where: { id: candidate.id, status: AutomationEventStatus.QUEUED },
      data: {
        status: AutomationEventStatus.PROCESSING,
        lockToken: claimToken,
        lockedAt: now,
        startedAt: now,
        errorCode: null,
        errorMessage: null
      }
    });
    if (claimed.count !== 1) continue;
    await processClaimedAutomationEvent(candidate.id, claimToken);
  }
}

async function processClaimedAutomationEvent(eventId: string, claimToken: string) {
  const event = await prisma.automationEvent.findFirst({
    where: { id: eventId, lockToken: claimToken },
    select: {
      id: true,
      businessId: true,
      feedbackId: true,
      trigger: true,
      inputFingerprint: true,
      eventDepth: true
    }
  });
  if (!event) return;
  if (event.eventDepth > MAX_EVENT_CHAIN_DEPTH) {
    await markEventFailed(event.id, AUTOMATION_ERRORS.LOOP_PREVENTED, false);
    return;
  }
  try {
    const feedback = await loadFeedbackSnapshotForSystem(event.feedbackId);
    if (!feedback) {
      await markEventFailed(event.id, AUTOMATION_ERRORS.EXECUTION_FAILED, false);
      return;
    }
    const rules = await prisma.automationRule.findMany({
      where: {
        businessId: event.businessId,
        trigger: event.trigger,
        status: AutomationRuleStatus.ACTIVE,
        OR: [
          { branchScope: AutomationRuleBranchScope.ALL_BRANCHES },
          { branches: { some: { branchId: feedback.branchId } } }
        ]
      },
      include: ruleInclude(),
      orderBy: [{ position: "asc" }, { createdAt: "asc" }]
    });

    for (const rule of rules) {
      const execution = await executeRule(rule, feedback, {
        eventId: event.id,
        trigger: event.trigger,
        inputFingerprint: event.inputFingerprint,
        executionSalt: event.id
      });
      if (
        execution.matched &&
        rule.stopProcessingAfterMatch &&
        execution.status !== AutomationExecutionStatus.NOT_MATCHED
      ) {
        break;
      }
    }
    await prisma.automationEvent.update({
      where: { id: event.id },
      data: {
        status: AutomationEventStatus.COMPLETED,
        completedAt: new Date(),
        lockToken: null,
        lockedAt: null
      }
    });
  } catch (error) {
    await markEventFailed(event.id, toSafeAutomationCode(error), true);
  }
}

async function executeRule(
  rule: RuleWithDefinition,
  feedback: AutomationFeedbackSnapshot,
  options: {
    eventId: string | null;
    trigger: AutomationRuleTrigger;
    inputFingerprint: string;
    executionSalt: string;
  }
) {
  const startedAt = new Date();
  const conditionResults = rule.conditions.map((condition) =>
    evaluateCondition(condition, feedback)
  );
  const matched = matchConditionResults(rule.matchMode, conditionResults);
  const executionKey = createAutomationFingerprint({
    ruleId: rule.id,
    ruleVersion: rule.version,
    feedbackId: feedback.id,
    trigger: options.trigger,
    inputFingerprint: options.inputFingerprint,
    salt: options.executionSalt
  }).slice(0, 128);

  const existing = await prisma.automationExecution.findUnique({
    where: { executionKey },
    include: { actionExecutions: true }
  });
  if (existing) {
    return existing;
  }

  if (!matched) {
    return prisma.automationExecution.create({
      data: {
        businessId: feedback.businessId,
        eventId: options.eventId,
        ruleId: rule.id,
        feedbackId: feedback.id,
        trigger: options.trigger,
        status: AutomationExecutionStatus.NOT_MATCHED,
        matched: false,
        ruleVersion: rule.version,
        ruleSnapshot: toPrismaJson(ruleSnapshot(rule)),
        conditionResults: toPrismaJson(conditionResults),
        inputFingerprint: options.inputFingerprint,
        executionKey,
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime()
      },
      include: { actionExecutions: true }
    });
  }

  const actionResults: ActionResult[] = [];
  for (const action of rule.actions.sort((a, b) => a.position - b.position)) {
    actionResults.push(await executeAction(rule, action, feedback));
  }

  const succeeded = actionResults.filter((result) => result.status === "SUCCESS").length;
  const failed = actionResults.filter(
    (result) => result.status === "FAILED" || result.status === "CONFLICTED"
  ).length;
  const skipped = actionResults.filter((result) => result.status === "SKIPPED").length;
  const status =
    failed > 0 && succeeded === 0
      ? AutomationExecutionStatus.FAILED
      : failed > 0 || skipped > 0
        ? succeeded > 0
          ? AutomationExecutionStatus.PARTIAL
          : AutomationExecutionStatus.SKIPPED
        : AutomationExecutionStatus.SUCCESS;
  const completedAt = new Date();

  const execution = await prisma.automationExecution.create({
    data: {
      businessId: feedback.businessId,
      eventId: options.eventId,
      ruleId: rule.id,
      feedbackId: feedback.id,
      trigger: options.trigger,
      status,
      matched: true,
      ruleVersion: rule.version,
      ruleSnapshot: toPrismaJson(ruleSnapshot(rule)),
      conditionResults: toPrismaJson(conditionResults),
      inputFingerprint: options.inputFingerprint,
      executionKey,
      actionsSucceeded: succeeded,
      actionsSkipped: skipped,
      actionsFailed: failed,
      safeErrorCode:
        status === AutomationExecutionStatus.PARTIAL
          ? AUTOMATION_ERRORS.EXECUTION_PARTIAL
          : status === AutomationExecutionStatus.FAILED
            ? AUTOMATION_ERRORS.EXECUTION_FAILED
            : null,
      safeErrorMessage:
        status === AutomationExecutionStatus.PARTIAL ||
        status === AutomationExecutionStatus.FAILED
          ? safeAutomationErrorMessage(AUTOMATION_ERRORS.EXECUTION_PARTIAL)
          : null,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      actionExecutions: {
        create: actionResults.map((result) => ({
          actionId: result.actionId,
          actionType: result.actionType,
          actionPosition: result.actionPosition,
          status: result.status,
          fieldName: result.fieldName,
          previousValue: result.previousValue,
          newValue: result.newValue,
          safeErrorCode: result.safeErrorCode,
          safeErrorMessage: result.safeErrorMessage
        }))
      }
    },
    include: { actionExecutions: true }
  });

  await prisma.automationRule.updateMany({
    where: { id: rule.id },
    data: {
      executionCount: { increment: 1 },
      lastTriggeredAt: completedAt
    }
  });
  return execution;
}

async function executeAction(
  rule: RuleWithDefinition,
  action: AutomationAction,
  feedback: AutomationFeedbackSnapshot
): Promise<ActionResult> {
  const field = FIELD_FOR_ACTION[action.type];
  const base = {
    actionId: action.id,
    actionType: action.type,
    actionPosition: action.position,
    fieldName: field,
    safeErrorCode: null,
    safeErrorMessage: null
  };

  try {
    if (!field) {
      return { ...base, status: "FAILED", previousValue: null, newValue: null };
    }
    const source = await getFieldSource(feedback, field);
    if (isHumanOwnedFieldSource(source)) {
      return {
        ...base,
        status: "SKIPPED",
        previousValue: currentFieldValue(feedback, field),
        newValue: desiredValueForAction(action),
        safeErrorCode: AUTOMATION_ERRORS.HUMAN_OVERRIDE,
        safeErrorMessage: safeAutomationErrorMessage(AUTOMATION_ERRORS.HUMAN_OVERRIDE)
      };
    }

    switch (action.type) {
      case "SET_PRIORITY":
        return await applyPriority(rule, action, feedback, base);
      case "SET_CATEGORY":
        return await applyCategory(rule, action, feedback, base);
      case "ASSIGN_TO_MEMBERSHIP":
        return await applyAssignment(rule, action, feedback, base);
      case "UNASSIGN":
        return await applyUnassignment(rule, action, feedback, base);
      case "SET_STATUS":
        return await applyStatus(rule, action, feedback, base);
      default:
        return {
          ...base,
          status: "FAILED",
          previousValue: null,
          newValue: null,
          safeErrorCode: AUTOMATION_ERRORS.ACTION_INVALID,
          safeErrorMessage: safeAutomationErrorMessage(AUTOMATION_ERRORS.ACTION_INVALID)
        };
    }
  } catch (error) {
    const code = toSafeAutomationCode(error);
    return {
      ...base,
      status: "FAILED",
      previousValue: currentFieldValue(feedback, field),
      newValue: desiredValueForAction(action),
      safeErrorCode: code,
      safeErrorMessage: safeAutomationErrorMessage(code)
    };
  }
}

async function applyPriority(
  rule: RuleWithDefinition,
  action: AutomationAction,
  feedback: AutomationFeedbackSnapshot,
  base: Omit<ActionResult, "status" | "previousValue" | "newValue">
): Promise<ActionResult> {
  const priority = action.valueString as FeedbackPriority | null;
  if (!priority || !Object.values(FeedbackPriority).includes(priority)) {
    throw new AppError(
      "Priority action is invalid.",
      AUTOMATION_ERRORS.ACTION_INVALID,
      400
    );
  }
  if (feedback.priority === priority) {
    return { ...base, status: "SUCCESS", previousValue: priority, newValue: priority };
  }
  const previousPriority = feedback.priority;
  const result = await prisma.feedback.updateMany({
    where: {
      id: feedback.id,
      businessId: feedback.businessId,
      priority: previousPriority
    },
    data: { priority }
  });
  if (result.count !== 1) {
    return conflictResult(base, previousPriority, priority);
  }
  await recordSystemActivity(
    rule,
    feedback,
    "PRIORITY_CHANGED",
    previousPriority,
    priority
  );
  await setFieldSource(feedback, "PRIORITY", rule.id);
  feedback.priority = priority;
  return {
    ...base,
    status: "SUCCESS",
    previousValue: previousPriority,
    newValue: priority
  };
}

async function applyCategory(
  rule: RuleWithDefinition,
  action: AutomationAction,
  feedback: AutomationFeedbackSnapshot,
  base: Omit<ActionResult, "status" | "previousValue" | "newValue">
): Promise<ActionResult> {
  if (!action.categoryId) {
    throw new AppError(
      "Category action is invalid.",
      AUTOMATION_ERRORS.ACTION_INVALID,
      400
    );
  }
  const category = await prisma.feedbackCategory.findFirst({
    where: { id: action.categoryId, businessId: feedback.businessId },
    select: { id: true, name: true, isActive: true }
  });
  if (!category) {
    throw new AppError(
      "Category target is inaccessible.",
      AUTOMATION_ERRORS.TARGET_INACCESSIBLE,
      400
    );
  }
  if (!category.isActive) {
    throw new AppError(
      "Category target is inactive.",
      AUTOMATION_ERRORS.CATEGORY_INACTIVE,
      400
    );
  }
  if (feedback.categoryId === category.id) {
    return {
      ...base,
      status: "SUCCESS",
      previousValue: category.name,
      newValue: category.name
    };
  }
  const previousName = await categoryName(feedback.categoryId);
  const result = await prisma.feedback.updateMany({
    where: {
      id: feedback.id,
      businessId: feedback.businessId,
      categoryId: feedback.categoryId
    },
    data: { categoryId: category.id }
  });
  if (result.count !== 1) return conflictResult(base, previousName, category.name);
  await recordSystemActivity(
    rule,
    feedback,
    "CATEGORY_CHANGED",
    previousName,
    category.name
  );
  await setFieldSource(feedback, "CATEGORY", rule.id);
  feedback.categoryId = category.id;
  return {
    ...base,
    status: "SUCCESS",
    previousValue: previousName,
    newValue: category.name
  };
}

async function applyAssignment(
  rule: RuleWithDefinition,
  action: AutomationAction,
  feedback: AutomationFeedbackSnapshot,
  base: Omit<ActionResult, "status" | "previousValue" | "newValue">
): Promise<ActionResult> {
  if (!action.targetMembershipId) {
    throw new AppError(
      "Assignment action is invalid.",
      AUTOMATION_ERRORS.ACTION_INVALID,
      400
    );
  }
  const target = await prisma.businessMembership.findFirst({
    where: { id: action.targetMembershipId, businessId: feedback.businessId },
    include: {
      user: { select: { firstName: true, lastName: true } },
      branchAccess: { select: { branchId: true } }
    }
  });
  if (!target) {
    throw new AppError(
      "Assignment target is inaccessible.",
      AUTOMATION_ERRORS.TARGET_INACCESSIBLE,
      400
    );
  }
  if (target.status !== BusinessMembershipStatus.ACTIVE) {
    throw new AppError(
      "Assignment target is inactive.",
      AUTOMATION_ERRORS.TARGET_INACTIVE,
      400
    );
  }
  if (!membershipCanAccessBranch(target, feedback.branchId)) {
    throw new AppError(
      "Assignment target is not eligible.",
      AUTOMATION_ERRORS.TARGET_INACCESSIBLE,
      400
    );
  }
  const targetName = `${target.user.firstName} ${target.user.lastName}`.trim();
  const previousName = await membershipName(feedback.assignedToMembershipId);
  if (feedback.assignedToMembershipId === target.id) {
    return {
      ...base,
      status: "SUCCESS",
      previousValue: targetName,
      newValue: targetName
    };
  }
  const result = await prisma.feedback.updateMany({
    where: {
      id: feedback.id,
      businessId: feedback.businessId,
      assignedToMembershipId: feedback.assignedToMembershipId
    },
    data: { assignedToMembershipId: target.id }
  });
  if (result.count !== 1) return conflictResult(base, previousName, targetName);
  await recordSystemActivity(
    rule,
    feedback,
    "ASSIGNMENT_CHANGED",
    previousName,
    targetName
  );
  await setFieldSource(feedback, "ASSIGNMENT", rule.id);
  feedback.assignedToMembershipId = target.id;
  return {
    ...base,
    status: "SUCCESS",
    previousValue: previousName,
    newValue: targetName
  };
}

async function applyUnassignment(
  rule: RuleWithDefinition,
  _action: AutomationAction,
  feedback: AutomationFeedbackSnapshot,
  base: Omit<ActionResult, "status" | "previousValue" | "newValue">
): Promise<ActionResult> {
  const previousName = await membershipName(feedback.assignedToMembershipId);
  if (!feedback.assignedToMembershipId) {
    return {
      ...base,
      status: "SUCCESS",
      previousValue: "Unassigned",
      newValue: "Unassigned"
    };
  }
  const result = await prisma.feedback.updateMany({
    where: {
      id: feedback.id,
      businessId: feedback.businessId,
      assignedToMembershipId: feedback.assignedToMembershipId
    },
    data: { assignedToMembershipId: null }
  });
  if (result.count !== 1) return conflictResult(base, previousName, "Unassigned");
  await recordSystemActivity(
    rule,
    feedback,
    "ASSIGNMENT_CHANGED",
    previousName,
    "Unassigned"
  );
  await setFieldSource(feedback, "ASSIGNMENT", rule.id);
  feedback.assignedToMembershipId = null;
  return {
    ...base,
    status: "SUCCESS",
    previousValue: previousName,
    newValue: "Unassigned"
  };
}

async function applyStatus(
  rule: RuleWithDefinition,
  action: AutomationAction,
  feedback: AutomationFeedbackSnapshot,
  base: Omit<ActionResult, "status" | "previousValue" | "newValue">
): Promise<ActionResult> {
  const status = action.valueString as FeedbackStatus | null;
  if (!status || !Object.values(FeedbackStatus).includes(status)) {
    throw new AppError(
      "Status action is invalid.",
      AUTOMATION_ERRORS.ACTION_INVALID,
      400
    );
  }
  if (feedback.status === status) {
    return { ...base, status: "SUCCESS", previousValue: status, newValue: status };
  }
  const previousStatus = feedback.status;
  if (!isValidTransition(previousStatus, status)) {
    return {
      ...base,
      status: "FAILED",
      previousValue: previousStatus,
      newValue: status,
      safeErrorCode: AUTOMATION_ERRORS.STATUS_CONFLICT,
      safeErrorMessage: safeAutomationErrorMessage(AUTOMATION_ERRORS.STATUS_CONFLICT)
    };
  }
  const result = await prisma.feedback.updateMany({
    where: { id: feedback.id, businessId: feedback.businessId, status: previousStatus },
    data: { status }
  });
  if (result.count !== 1) return conflictResult(base, previousStatus, status);
  await recordSystemActivity(rule, feedback, "STATUS_CHANGED", previousStatus, status);
  await setFieldSource(feedback, "STATUS", rule.id);
  feedback.status = status;
  return { ...base, status: "SUCCESS", previousValue: previousStatus, newValue: status };
}

async function validateDefinitionTargets(
  businessId: string,
  definition: RuleDefinitionInput,
  options: { requireExecutable: boolean }
) {
  const shape = validateRuleDefinitionShape(definition, options);
  const issues = [...shape.issues];
  if (definition.branchScope === "SELECTED_BRANCHES") {
    const count = await prisma.branch.count({
      where: { businessId, id: { in: definition.branchIds }, status: "ACTIVE" }
    });
    if (count !== new Set(definition.branchIds).size) {
      issues.push({
        path: "branchIds",
        message: "Every selected branch must be active and belong to this business.",
        code: AUTOMATION_ERRORS.TARGET_INACCESSIBLE
      });
    }
  }
  for (const [index, condition] of definition.conditions.entries()) {
    if (condition.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: condition.branchId, businessId, status: "ACTIVE" },
        select: { id: true }
      });
      if (!branch) {
        issues.push({
          path: `conditions.${index}.branchId`,
          message: "Condition branch must be active and belong to this business.",
          code: AUTOMATION_ERRORS.TARGET_INACCESSIBLE
        });
      }
    }
    if (condition.categoryId) {
      const category = await prisma.feedbackCategory.findFirst({
        where: { id: condition.categoryId, businessId, isActive: true },
        select: { id: true }
      });
      if (!category) {
        issues.push({
          path: `conditions.${index}.categoryId`,
          message: "Condition category must be active and belong to this business.",
          code: AUTOMATION_ERRORS.CATEGORY_INACTIVE
        });
      }
    }
  }
  for (const [index, action] of definition.actions.entries()) {
    if (action.categoryId) {
      const category = await prisma.feedbackCategory.findFirst({
        where: { id: action.categoryId, businessId, isActive: true },
        select: { id: true }
      });
      if (!category) {
        issues.push({
          path: `actions.${index}.categoryId`,
          message: "Action category must be active and belong to this business.",
          code: AUTOMATION_ERRORS.CATEGORY_INACTIVE
        });
      }
    }
    if (action.membershipId) {
      const membership = await prisma.businessMembership.findFirst({
        where: { id: action.membershipId, businessId, status: "ACTIVE" },
        include: { branchAccess: { select: { branchId: true } } }
      });
      if (!membership) {
        issues.push({
          path: `actions.${index}.membershipId`,
          message: "Assignment target must be an active member of this business.",
          code: AUTOMATION_ERRORS.TARGET_INACTIVE
        });
      } else if (
        definition.branchScope === "SELECTED_BRANCHES" &&
        !definition.branchIds.every((branchId) =>
          membershipCanAccessBranch(membership, branchId)
        )
      ) {
        issues.push({
          path: `actions.${index}.membershipId`,
          message: "Assignment target must be eligible for each selected branch.",
          code: AUTOMATION_ERRORS.TARGET_INACCESSIBLE
        });
      }
    }
  }
  if (issues.length > 0) {
    throw new AppError(
      issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "),
      AUTOMATION_ERRORS.RULE_INVALID,
      400
    );
  }
}

async function validatePersistedRuleTargets(
  businessId: string,
  rule: RuleWithDefinition,
  options: { requireExecutable: boolean }
) {
  await validateDefinitionTargets(businessId, persistedRuleToDefinition(rule), options);
}

function persistedRuleToDefinition(rule: RuleWithDefinition): RuleDefinitionInput {
  return {
    name: rule.name,
    description: rule.description,
    trigger: rule.trigger,
    branchScope: rule.branchScope,
    branchIds: rule.branches.map((branch) => branch.branchId),
    matchMode: rule.matchMode,
    stopProcessingAfterMatch: rule.stopProcessingAfterMatch,
    conditions: rule.conditions.map((condition) => ({
      type: condition.type,
      operator: condition.operator,
      value: condition.valueString,
      values: Array.isArray(condition.valueJson)
        ? condition.valueJson.filter(
            (value): value is string => typeof value === "string"
          )
        : [],
      valueNumber: condition.valueNumber,
      branchId: condition.branchId,
      categoryId: condition.categoryId
    })),
    actions: rule.actions.map((action) => ({
      type: action.type,
      priority:
        action.type === "SET_PRIORITY" ? (action.valueString as FeedbackPriority) : null,
      status:
        action.type === "SET_STATUS" ? (action.valueString as FeedbackStatus) : null,
      categoryId: action.categoryId,
      membershipId: action.targetMembershipId
    }))
  };
}

async function replaceRuleChildren(
  tx: Prisma.TransactionClient,
  businessId: string,
  ruleId: string,
  definition: RuleDefinitionInput
) {
  await tx.automationRuleBranch.deleteMany({ where: { ruleId } });
  await tx.automationCondition.deleteMany({ where: { ruleId } });
  await tx.automationAction.deleteMany({ where: { ruleId } });
  if (definition.branchScope === "SELECTED_BRANCHES") {
    await tx.automationRuleBranch.createMany({
      data: [...new Set(definition.branchIds)].map((branchId) => ({ ruleId, branchId }))
    });
  }
  await tx.automationCondition.createMany({
    data: definition.conditions.map((condition, index) => ({
      ruleId,
      type: condition.type,
      operator: condition.operator,
      position: index + 1,
      valueString: condition.value ?? null,
      valueNumber: condition.valueNumber ?? null,
      valueJson: condition.operator === "IN" ? (condition.values ?? []) : Prisma.DbNull,
      branchId: condition.branchId ?? null,
      categoryId: condition.categoryId ?? null
    }))
  });
  await tx.automationAction.createMany({
    data: definition.actions.map((action, index) => ({
      ruleId,
      type: action.type,
      position: index + 1,
      valueString: action.priority ?? action.status ?? null,
      categoryId: action.categoryId ?? null,
      targetMembershipId: action.membershipId ?? null
    }))
  });
  await tx.automationRule.update({
    where: { id: ruleId },
    data: {
      branchScope: definition.branchScope,
      updatedByMembershipId: undefined
    }
  });
  void businessId;
}

async function resolveAutomationManagementContext(
  actor: Actor,
  businessId: string
): Promise<MembershipContext> {
  const membership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId, userId: actor.userId } },
    include: {
      business: { select: { status: true } },
      branchAccess: { select: { branchId: true } }
    }
  });
  if (!membership || membership.status !== BusinessMembershipStatus.ACTIVE) {
    throw new AppError("Automation access denied.", AUTOMATION_ERRORS.ACCESS_DENIED, 403);
  }
  if (membership.business.status !== BusinessStatus.ACTIVE) {
    throw new AppError("This business is suspended.", "BUSINESS_SUSPENDED", 403);
  }
  if (
    membership.role !== BusinessMemberRole.OWNER &&
    membership.role !== BusinessMemberRole.ADMIN
  ) {
    throw new AppError(
      "Automation management requires owner or admin access.",
      AUTOMATION_ERRORS.ACCESS_DENIED,
      403
    );
  }
  return { businessId, membership };
}

async function loadRule(businessId: string, ruleId: string): Promise<RuleWithDefinition> {
  const rule = await prisma.automationRule.findFirst({
    where: { id: ruleId, businessId },
    include: ruleInclude()
  });
  if (!rule) {
    throw new AppError(
      "Automation rule was not found.",
      AUTOMATION_ERRORS.RULE_NOT_FOUND,
      404
    );
  }
  return rule;
}

async function loadFeedbackSnapshot(
  context: MembershipContext,
  feedbackId: string
): Promise<AutomationFeedbackSnapshot> {
  const branchIds =
    context.membership.role === BusinessMemberRole.OWNER ||
    context.membership.role === BusinessMemberRole.ADMIN ||
    context.membership.allBranchesAccess
      ? null
      : context.membership.branchAccess.map((branch) => branch.branchId);
  const feedback = await prisma.feedback.findFirst({
    where: {
      id: feedbackId,
      businessId: context.businessId,
      ...(branchIds ? { branchId: { in: branchIds } } : {})
    },
    include: { aiAnalysis: true }
  });
  if (!feedback) {
    throw new AppError("Feedback was not found.", "FEEDBACK_NOT_FOUND", 404);
  }
  return feedback;
}

async function loadFeedbackSnapshotForSystem(
  feedbackId: string
): Promise<AutomationFeedbackSnapshot | null> {
  return prisma.feedback.findUnique({
    where: { id: feedbackId },
    include: { aiAnalysis: true }
  });
}

function ensureRuleAppliesToBranch(rule: RuleWithDefinition, branchId: string): void {
  if (
    rule.branchScope === AutomationRuleBranchScope.SELECTED_BRANCHES &&
    !rule.branches.some((branch) => branch.branchId === branchId)
  ) {
    throw new AppError(
      "This rule is not scoped to the selected feedback branch.",
      AUTOMATION_ERRORS.TARGET_INACCESSIBLE,
      403
    );
  }
}

async function enforceRuleLimits(
  businessId: string,
  options: { creatingActive: boolean }
) {
  const [nonArchivedCount, activeCount] = await Promise.all([
    prisma.automationRule.count({
      where: { businessId, status: { not: AutomationRuleStatus.ARCHIVED } }
    }),
    prisma.automationRule.count({
      where: { businessId, status: AutomationRuleStatus.ACTIVE }
    })
  ]);
  if (nonArchivedCount >= MAX_NON_ARCHIVED_RULES_PER_BUSINESS) {
    throw new AppError(
      "This business has reached the automation rule limit.",
      AUTOMATION_ERRORS.LIMIT_REACHED,
      409
    );
  }
  if (options.creatingActive && activeCount >= MAX_ACTIVE_RULES_PER_BUSINESS) {
    throw new AppError(
      "This business has reached the active automation rule limit.",
      AUTOMATION_ERRORS.LIMIT_REACHED,
      409
    );
  }
}

async function ensureInitialFieldStates(feedback: AutomationFeedbackSnapshot) {
  const fields = [
    FeedbackFieldStateField.STATUS,
    FeedbackFieldStateField.PRIORITY,
    FeedbackFieldStateField.CATEGORY,
    FeedbackFieldStateField.ASSIGNMENT
  ];
  await prisma.$transaction(
    fields.map((field) =>
      prisma.feedbackFieldState.upsert({
        where: { feedbackId_field: { feedbackId: feedback.id, field } },
        create: {
          businessId: feedback.businessId,
          feedbackId: feedback.id,
          field,
          source: initialFeedbackFieldSource(field)
        },
        update: {}
      })
    )
  );
}

async function getFeedbackFieldSources(feedback: AutomationFeedbackSnapshot) {
  const result = new Map<FeedbackFieldStateField, FeedbackFieldStateSource>();
  for (const field of Object.values(FeedbackFieldStateField)) {
    result.set(field, await getFieldSource(feedback, field));
  }
  return result;
}

async function getFieldSource(
  feedback: AutomationFeedbackSnapshot,
  field: FeedbackFieldStateField
): Promise<FeedbackFieldStateSource> {
  const state = await prisma.feedbackFieldState.findUnique({
    where: { feedbackId_field: { feedbackId: feedback.id, field } },
    select: { source: true }
  });
  if (state) return state.source;

  const [humanActivity, aiCategoryApplication] = await Promise.all([
    prisma.feedbackActivity.findFirst({
      where: {
        feedbackId: feedback.id,
        actorType: FeedbackActivityActorType.HUMAN,
        type: fieldToActivityType(field)
      },
      select: { id: true }
    }),
    field === FeedbackFieldStateField.CATEGORY
      ? prisma.feedbackAIAnalysis.findFirst({
          where: {
            feedbackId: feedback.id,
            categoryAutoAppliedAt: { not: null },
            categoryApplicationResult: "AUTO_APPLIED"
          },
          select: { id: true }
        })
      : Promise.resolve(null)
  ]);
  return deriveHistoricalFeedbackFieldSource(field, {
    categoryId: feedback.categoryId,
    assignedToMembershipId: feedback.assignedToMembershipId,
    hasHumanStatusActivity:
      field === FeedbackFieldStateField.STATUS && Boolean(humanActivity),
    hasHumanPriorityActivity:
      field === FeedbackFieldStateField.PRIORITY && Boolean(humanActivity),
    hasHumanCategoryActivity:
      field === FeedbackFieldStateField.CATEGORY && Boolean(humanActivity),
    hasHumanAssignmentActivity:
      field === FeedbackFieldStateField.ASSIGNMENT && Boolean(humanActivity),
    hasAIAutoAppliedCategory: Boolean(aiCategoryApplication)
  });
}

async function setFieldSource(
  feedback: AutomationFeedbackSnapshot,
  field: FeedbackFieldStateField,
  ruleId: string
) {
  await prisma.feedbackFieldState.upsert({
    where: { feedbackId_field: { feedbackId: feedback.id, field } },
    create: {
      businessId: feedback.businessId,
      feedbackId: feedback.id,
      field,
      source: FeedbackFieldStateSource.AUTOMATION,
      sourceRuleId: ruleId
    },
    update: {
      source: FeedbackFieldStateSource.AUTOMATION,
      sourceRuleId: ruleId,
      updatedByMembershipId: null
    }
  });
}

export async function markFeedbackFieldHuman(
  businessId: string,
  feedbackId: string,
  field: FeedbackFieldStateField,
  membershipId: string
) {
  await prisma.feedbackFieldState.upsert({
    where: { feedbackId_field: { feedbackId, field } },
    create: {
      businessId,
      feedbackId,
      field,
      source: FeedbackFieldStateSource.HUMAN,
      updatedByMembershipId: membershipId
    },
    update: {
      source: FeedbackFieldStateSource.HUMAN,
      sourceRuleId: null,
      updatedByMembershipId: membershipId
    }
  });
}

export async function markFeedbackFieldAI(
  businessId: string,
  feedbackId: string,
  field: FeedbackFieldStateField
) {
  await prisma.feedbackFieldState.upsert({
    where: { feedbackId_field: { feedbackId, field } },
    create: {
      businessId,
      feedbackId,
      field,
      source: FeedbackFieldStateSource.AI
    },
    update: {
      source: FeedbackFieldStateSource.AI,
      sourceRuleId: null,
      updatedByMembershipId: null
    }
  });
}

function previewAction(
  action: AutomationAction,
  feedback: AutomationFeedbackSnapshot,
  fieldSources: Map<FeedbackFieldStateField, FeedbackFieldStateSource>
) {
  const field = FIELD_FOR_ACTION[action.type];
  const source = field ? fieldSources.get(field) : null;
  const desiredValue = desiredValueForAction(action);
  return {
    actionId: action.id,
    actionType: action.type,
    actionPosition: action.position,
    fieldName: field,
    currentValue: field ? currentFieldValue(feedback, field) : null,
    desiredValue,
    wouldApply: Boolean(field && !isHumanOwnedFieldSource(source)),
    skipReason: isHumanOwnedFieldSource(source) ? AUTOMATION_ERRORS.HUMAN_OVERRIDE : null
  };
}

function recordSystemActivity(
  rule: RuleWithDefinition,
  feedback: AutomationFeedbackSnapshot,
  type: FeedbackActivityType,
  fromValue: string,
  toValue: string
) {
  return prisma.feedbackActivity.create({
    data: {
      businessId: feedback.businessId,
      feedbackId: feedback.id,
      actorType: FeedbackActivityActorType.SYSTEM,
      automationRuleId: rule.id,
      automationRuleName: rule.name,
      type,
      fromStatus: type === "STATUS_CHANGED" ? (fromValue as FeedbackStatus) : null,
      toStatus: type === "STATUS_CHANGED" ? (toValue as FeedbackStatus) : null,
      fromValue: type === "STATUS_CHANGED" ? null : fromValue,
      toValue: type === "STATUS_CHANGED" ? null : toValue
    }
  });
}

function createInputFingerprint(
  feedback: AutomationFeedbackSnapshot,
  trigger: AutomationRuleTrigger
): string {
  return createAutomationFingerprint({
    trigger,
    feedback: {
      id: feedback.id,
      branchId: feedback.branchId,
      channel: feedback.channel,
      rating: feedback.rating,
      status: feedback.status,
      priority: feedback.priority,
      categoryId: feedback.categoryId,
      assignedToMembershipId: feedback.assignedToMembershipId,
      customerId: feedback.customerId,
      updatedAt: feedback.updatedAt.toISOString()
    },
    ai: feedback.aiAnalysis
      ? {
          status: feedback.aiAnalysis.status,
          sentiment: feedback.aiAnalysis.sentiment,
          sentimentConfidence: feedback.aiAnalysis.sentimentConfidence,
          suggestedCategoryId: feedback.aiAnalysis.suggestedCategoryId,
          categoryConfidence: feedback.aiAnalysis.categoryConfidence,
          categoryApplicationResult: feedback.aiAnalysis.categoryApplicationResult,
          categoryAutoAppliedAt: feedback.aiAnalysis.categoryAutoAppliedAt?.toISOString()
        }
      : null
  });
}

function serializeRule(rule: RuleWithDefinition) {
  return {
    id: rule.id,
    businessId: rule.businessId,
    name: rule.name,
    description: rule.description,
    status: rule.status,
    branchScope: rule.branchScope,
    branchIds: rule.branches.map((branch) => branch.branchId),
    trigger: rule.trigger,
    matchMode: rule.matchMode,
    stopProcessingAfterMatch: rule.stopProcessingAfterMatch,
    position: rule.position,
    version: rule.version,
    executionCount: rule.executionCount,
    lastTriggeredAt: rule.lastTriggeredAt?.toISOString() ?? null,
    archivedAt: rule.archivedAt?.toISOString() ?? null,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    conditions: rule.conditions.map((condition) => ({
      id: condition.id,
      type: condition.type,
      operator: condition.operator,
      position: condition.position,
      value: condition.valueString,
      values: Array.isArray(condition.valueJson) ? condition.valueJson : [],
      valueNumber: condition.valueNumber,
      branchId: condition.branchId,
      categoryId: condition.categoryId
    })),
    actions: rule.actions.map((action) => ({
      id: action.id,
      type: action.type,
      position: action.position,
      priority: action.type === "SET_PRIORITY" ? action.valueString : null,
      status: action.type === "SET_STATUS" ? action.valueString : null,
      categoryId: action.categoryId,
      membershipId: action.targetMembershipId
    }))
  };
}

function serializeExecution(
  execution: Prisma.AutomationExecutionGetPayload<{
    include: {
      rule: { select: { id: true; name: true } };
      feedback: { select: { id: true; title: true; receivedAt: true } };
      actionExecutions: true;
    };
  }>
) {
  return {
    id: execution.id,
    businessId: execution.businessId,
    rule: execution.rule,
    feedback: {
      id: execution.feedback.id,
      title: execution.feedback.title,
      receivedAt: execution.feedback.receivedAt.toISOString()
    },
    trigger: execution.trigger,
    status: execution.status,
    matched: execution.matched,
    ruleVersion: execution.ruleVersion,
    ruleSnapshot: execution.ruleSnapshot,
    conditionResults: execution.conditionResults,
    safeErrorCode: execution.safeErrorCode,
    safeErrorMessage: execution.safeErrorMessage,
    actionsSucceeded: execution.actionsSucceeded,
    actionsSkipped: execution.actionsSkipped,
    actionsFailed: execution.actionsFailed,
    startedAt: execution.startedAt?.toISOString() ?? null,
    completedAt: execution.completedAt?.toISOString() ?? null,
    durationMs: execution.durationMs,
    createdAt: execution.createdAt.toISOString(),
    actionResults: execution.actionExecutions.map((action) => ({
      id: action.id,
      actionType: action.actionType,
      actionPosition: action.actionPosition,
      status: action.status,
      fieldName: action.fieldName,
      previousValue: action.previousValue,
      newValue: action.newValue,
      safeErrorCode: action.safeErrorCode,
      safeErrorMessage: action.safeErrorMessage,
      createdAt: action.createdAt.toISOString()
    }))
  };
}

function ruleSnapshot(rule: RuleWithDefinition) {
  const serialized = serializeRule(rule);
  return {
    id: serialized.id,
    name: serialized.name,
    description: serialized.description,
    trigger: serialized.trigger,
    matchMode: serialized.matchMode,
    branchScope: serialized.branchScope,
    branchIds: serialized.branchIds,
    stopProcessingAfterMatch: serialized.stopProcessingAfterMatch,
    version: serialized.version,
    conditions: serialized.conditions,
    actions: serialized.actions
  };
}

function ruleInclude() {
  return {
    branches: { select: { branchId: true } },
    conditions: { orderBy: { position: "asc" } },
    actions: { orderBy: { position: "asc" } }
  } satisfies Prisma.AutomationRuleInclude;
}

function toPagination(page: number, pageSize: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages
  };
}

function currentFieldValue(
  feedback: AutomationFeedbackSnapshot,
  field: FeedbackFieldStateField | null
): string | null {
  switch (field) {
    case "STATUS":
      return feedback.status;
    case "PRIORITY":
      return feedback.priority;
    case "CATEGORY":
      return feedback.categoryId ?? "No category";
    case "ASSIGNMENT":
      return feedback.assignedToMembershipId ?? "Unassigned";
    default:
      return null;
  }
}

function desiredValueForAction(action: AutomationAction): string | null {
  return (
    action.valueString ?? action.categoryId ?? action.targetMembershipId ?? "Unassigned"
  );
}

function fieldToActivityType(field: FeedbackFieldStateField): FeedbackActivityType {
  switch (field) {
    case "STATUS":
      return FeedbackActivityType.STATUS_CHANGED;
    case "PRIORITY":
      return FeedbackActivityType.PRIORITY_CHANGED;
    case "CATEGORY":
      return FeedbackActivityType.CATEGORY_CHANGED;
    case "ASSIGNMENT":
      return FeedbackActivityType.ASSIGNMENT_CHANGED;
  }
}

function conflictResult(
  base: Omit<ActionResult, "status" | "previousValue" | "newValue">,
  previousValue: string,
  newValue: string
): ActionResult {
  return {
    ...base,
    status: "CONFLICTED",
    previousValue,
    newValue,
    safeErrorCode: AUTOMATION_ERRORS.STATUS_CONFLICT,
    safeErrorMessage: safeAutomationErrorMessage(AUTOMATION_ERRORS.STATUS_CONFLICT)
  };
}

function membershipCanAccessBranch(
  membership: Pick<BusinessMembership, "role" | "allBranchesAccess"> & {
    branchAccess: { branchId: string }[];
  },
  branchId: string
): boolean {
  return (
    membership.role === BusinessMemberRole.OWNER ||
    membership.role === BusinessMemberRole.ADMIN ||
    membership.allBranchesAccess ||
    membership.branchAccess.some((access) => access.branchId === branchId)
  );
}

async function membershipName(membershipId: string | null): Promise<string> {
  if (!membershipId) return "Unassigned";
  const membership = await prisma.businessMembership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { firstName: true, lastName: true } } }
  });
  return membership
    ? `${membership.user.firstName} ${membership.user.lastName}`.trim()
    : "Unavailable member";
}

async function categoryName(categoryId: string | null): Promise<string> {
  if (!categoryId) return "No category";
  const category = await prisma.feedbackCategory.findUnique({
    where: { id: categoryId },
    select: { name: true }
  });
  return category?.name ?? "Unavailable category";
}

async function recoverStaleAutomationEvents() {
  const staleBefore = new Date(Date.now() - env.AUTOMATION_WORKER_POLL_INTERVAL_MS * 6);
  const recovered = await prisma.automationEvent.updateMany({
    where: {
      status: AutomationEventStatus.PROCESSING,
      lockedAt: { lt: staleBefore },
      retryCount: { lte: env.AUTOMATION_MAX_RETRIES }
    },
    data: {
      status: AutomationEventStatus.QUEUED,
      lockToken: null,
      lockedAt: null,
      retryCount: { increment: 1 }
    }
  });
  if (recovered.count > 0) {
    logger.warn({ count: recovered.count }, "Recovered stale automation events");
  }
}

async function markEventFailed(
  eventId: string,
  code: string,
  retryable: boolean
): Promise<void> {
  const current = await prisma.automationEvent.findUnique({
    where: { id: eventId },
    select: { retryCount: true, maxRetries: true }
  });
  const shouldRetry =
    retryable && current ? current.retryCount + 1 <= current.maxRetries : false;
  await prisma.automationEvent.update({
    where: { id: eventId },
    data: {
      status: shouldRetry ? AutomationEventStatus.QUEUED : AutomationEventStatus.FAILED,
      retryCount: { increment: 1 },
      errorCode: code,
      errorMessage: safeAutomationErrorMessage(code),
      lockToken: null,
      lockedAt: null,
      completedAt: shouldRetry ? null : new Date()
    }
  });
}

function toSafeAutomationCode(error: unknown): string {
  if (error instanceof AppError) return error.code;
  return AUTOMATION_ERRORS.EXECUTION_FAILED;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
