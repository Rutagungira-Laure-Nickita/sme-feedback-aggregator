import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import {
  businessParamsSchema,
  executionListQuerySchema,
  executionParamsSchema,
  previewRunSchema,
  reorderRulesSchema,
  ruleDefinitionSchema,
  ruleListQuerySchema,
  ruleParamsSchema,
  ruleUpdateSchema
} from "./automation.schemas.js";
import {
  activateAutomationRule,
  archiveAutomationRule,
  createAutomationRule,
  deleteAutomationRule,
  duplicateAutomationRule,
  getAutomationExecution,
  getAutomationRule,
  listAutomationExecutions,
  listAutomationRules,
  pauseAutomationRule,
  previewAutomationRule,
  reorderAutomationRules,
  runAutomationRuleManually,
  unarchiveAutomationRule,
  updateAutomationRule
} from "./automation.service.js";

function getActor(request: Request): { userId: string } {
  if (!request.auth) {
    throw new AppError("Authentication is required.", "AUTHENTICATION_REQUIRED", 401);
  }
  return { userId: request.auth.id };
}

function parseInput<T>(result: { success: boolean; data?: T; error?: unknown }): T {
  if (!result.success) {
    const zodError = result.error as
      { issues?: Array<{ path: (string | number)[]; message: string }> } | undefined;
    const message =
      zodError?.issues
        ?.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ") ?? "Invalid automation request.";
    throw new AppError(message, "AUTOMATION_RULE_INVALID", 400);
  }
  return result.data as T;
}

export async function listAutomationRulesController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessParamsSchema.safeParse(request.params));
    const query = parseInput(ruleListQuerySchema.safeParse(request.query));
    const result = await listAutomationRules(actor, params.businessId, query);
    sendSuccess(response, "Automation rules loaded.", result);
  } catch (error) {
    next(error);
  }
}

export async function createAutomationRuleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessParamsSchema.safeParse(request.params));
    const body = parseInput(ruleDefinitionSchema.safeParse(request.body));
    const result = await createAutomationRule(actor, params.businessId, body);
    sendSuccess(response, "Automation rule created.", result, 201);
  } catch (error) {
    next(error);
  }
}

export async function getAutomationRuleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(ruleParamsSchema.safeParse(request.params));
    const result = await getAutomationRule(actor, params.businessId, params.ruleId);
    sendSuccess(response, "Automation rule loaded.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateAutomationRuleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(ruleParamsSchema.safeParse(request.params));
    const body = parseInput(ruleUpdateSchema.safeParse(request.body));
    const result = await updateAutomationRule(
      actor,
      params.businessId,
      params.ruleId,
      body
    );
    sendSuccess(response, "Automation rule updated.", result);
  } catch (error) {
    next(error);
  }
}

export async function activateAutomationRuleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(ruleParamsSchema.safeParse(request.params));
    const result = await activateAutomationRule(actor, params.businessId, params.ruleId);
    sendSuccess(response, "Automation rule activated.", result);
  } catch (error) {
    next(error);
  }
}

export async function pauseAutomationRuleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(ruleParamsSchema.safeParse(request.params));
    const result = await pauseAutomationRule(actor, params.businessId, params.ruleId);
    sendSuccess(response, "Automation rule paused.", result);
  } catch (error) {
    next(error);
  }
}

export async function archiveAutomationRuleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(ruleParamsSchema.safeParse(request.params));
    const result = await archiveAutomationRule(actor, params.businessId, params.ruleId);
    sendSuccess(response, "Automation rule archived.", result);
  } catch (error) {
    next(error);
  }
}

export async function duplicateAutomationRuleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(ruleParamsSchema.safeParse(request.params));
    const result = await duplicateAutomationRule(actor, params.businessId, params.ruleId);
    sendSuccess(response, "Automation rule duplicated.", result, 201);
  } catch (error) {
    next(error);
  }
}

export async function unarchiveAutomationRuleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(ruleParamsSchema.safeParse(request.params));
    const result = await unarchiveAutomationRule(actor, params.businessId, params.ruleId);
    sendSuccess(response, "Automation rule restored.", result);
  } catch (error) {
    next(error);
  }
}

export async function deleteAutomationRuleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(ruleParamsSchema.safeParse(request.params));
    const result = await deleteAutomationRule(actor, params.businessId, params.ruleId);
    sendSuccess(response, "Automation rule deleted.", result);
  } catch (error) {
    next(error);
  }
}

export async function reorderAutomationRulesController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessParamsSchema.safeParse(request.params));
    const body = parseInput(reorderRulesSchema.safeParse(request.body));
    const result = await reorderAutomationRules(actor, params.businessId, body.ruleIds);
    sendSuccess(response, "Automation rules reordered.", result);
  } catch (error) {
    next(error);
  }
}

export async function previewAutomationRuleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(ruleParamsSchema.safeParse(request.params));
    const body = parseInput(previewRunSchema.safeParse(request.body));
    const result = await previewAutomationRule(
      actor,
      params.businessId,
      params.ruleId,
      body
    );
    sendSuccess(response, "Automation preview completed.", result);
  } catch (error) {
    next(error);
  }
}

export async function runAutomationRuleController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(ruleParamsSchema.safeParse(request.params));
    const body = parseInput(previewRunSchema.safeParse(request.body));
    const result = await runAutomationRuleManually(
      actor,
      params.businessId,
      params.ruleId,
      body
    );
    sendSuccess(response, "Automation rule run completed.", result);
  } catch (error) {
    next(error);
  }
}

export async function listAutomationExecutionsController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(businessParamsSchema.safeParse(request.params));
    const query = parseInput(executionListQuerySchema.safeParse(request.query));
    const result = await listAutomationExecutions(actor, params.businessId, query);
    sendSuccess(response, "Automation executions loaded.", result);
  } catch (error) {
    next(error);
  }
}

export async function listRuleExecutionsController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(ruleParamsSchema.safeParse(request.params));
    const query = parseInput(executionListQuerySchema.safeParse(request.query));
    const result = await listAutomationExecutions(actor, params.businessId, {
      ...query,
      ruleId: params.ruleId
    });
    sendSuccess(response, "Automation rule executions loaded.", result);
  } catch (error) {
    next(error);
  }
}

export async function getAutomationExecutionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(executionParamsSchema.safeParse(request.params));
    const result = await getAutomationExecution(
      actor,
      params.businessId,
      params.executionId
    );
    sendSuccess(response, "Automation execution loaded.", result);
  } catch (error) {
    next(error);
  }
}
