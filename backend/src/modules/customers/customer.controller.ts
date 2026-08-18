import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import {
  createCustomerFromFeedbackSchema,
  customerCreateSchema,
  customerFeedbackQuerySchema,
  customerIdParamsSchema,
  customerListQuerySchema,
  customerMatchesQuerySchema,
  customerUpdateSchema,
  expectedUpdatedAtSchema,
  feedbackCustomerLinkSchema,
  feedbackCustomerParamsSchema
} from "./customer.schemas.js";
import {
  archiveCustomer,
  createCustomer,
  createCustomerFromFeedback,
  getCustomer,
  getFeedbackCustomerMatches,
  getFeedbackCustomerState,
  linkFeedbackCustomer,
  listCustomerActivity,
  listCustomerFeedback,
  listCustomers,
  reactivateCustomer,
  updateCustomer
} from "./customer.service.js";

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
        .join("; ") ?? "Invalid customer input.";

    throw new AppError(message, "VALIDATION_ERROR", 400);
  }

  return result.data as T;
}

export async function listCustomersController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = parseInput(customerListQuerySchema.safeParse(request.query));
    const result = await listCustomers(
      getActor(request),
      request.params.businessId ?? "",
      query
    );
    sendSuccess(response, "Customers loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function createCustomerController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseInput(customerCreateSchema.safeParse(request.body));
    const result = await createCustomer(
      getActor(request),
      request.params.businessId ?? "",
      input
    );
    sendSuccess(response, "Customer created", result, 201);
  } catch (error) {
    next(error);
  }
}

export async function getCustomerController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(customerIdParamsSchema.safeParse(request.params));
    const result = await getCustomer(
      getActor(request),
      params.businessId,
      params.customerId
    );
    sendSuccess(response, "Customer loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function updateCustomerController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(customerIdParamsSchema.safeParse(request.params));
    const input = parseInput(customerUpdateSchema.safeParse(request.body));
    const result = await updateCustomer(
      getActor(request),
      params.businessId,
      params.customerId,
      input
    );
    sendSuccess(response, "Customer updated", result);
  } catch (error) {
    next(error);
  }
}

export async function archiveCustomerController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(customerIdParamsSchema.safeParse(request.params));
    const input = parseInput(expectedUpdatedAtSchema.safeParse(request.body));
    const result = await archiveCustomer(
      getActor(request),
      params.businessId,
      params.customerId,
      input
    );
    sendSuccess(response, "Customer archived", result);
  } catch (error) {
    next(error);
  }
}

export async function reactivateCustomerController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(customerIdParamsSchema.safeParse(request.params));
    const input = parseInput(expectedUpdatedAtSchema.safeParse(request.body));
    const result = await reactivateCustomer(
      getActor(request),
      params.businessId,
      params.customerId,
      input
    );
    sendSuccess(response, "Customer reactivated", result);
  } catch (error) {
    next(error);
  }
}

export async function listCustomerFeedbackController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(customerIdParamsSchema.safeParse(request.params));
    const query = parseInput(customerFeedbackQuerySchema.safeParse(request.query));
    const result = await listCustomerFeedback(
      getActor(request),
      params.businessId,
      params.customerId,
      query
    );
    sendSuccess(response, "Customer feedback loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function listCustomerActivityController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(customerIdParamsSchema.safeParse(request.params));
    const result = await listCustomerActivity(
      getActor(request),
      params.businessId,
      params.customerId
    );
    sendSuccess(response, "Customer activity loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function getFeedbackCustomerMatchesController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(feedbackCustomerParamsSchema.safeParse(request.params));
    const query = parseInput(customerMatchesQuerySchema.safeParse(request.query));
    const result = await getFeedbackCustomerMatches(
      getActor(request),
      params.businessId,
      params.feedbackId,
      query.search
    );
    sendSuccess(response, "Customer matches loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function getFeedbackCustomerController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(feedbackCustomerParamsSchema.safeParse(request.params));
    const result = await getFeedbackCustomerState(
      getActor(request),
      params.businessId,
      params.feedbackId
    );
    sendSuccess(response, "Feedback customer loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function linkFeedbackCustomerController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(feedbackCustomerParamsSchema.safeParse(request.params));
    const input = parseInput(feedbackCustomerLinkSchema.safeParse(request.body));
    const result = await linkFeedbackCustomer(
      getActor(request),
      params.businessId,
      params.feedbackId,
      input
    );
    sendSuccess(response, "Feedback customer link updated", result);
  } catch (error) {
    next(error);
  }
}

export async function createCustomerFromFeedbackController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params = parseInput(feedbackCustomerParamsSchema.safeParse(request.params));
    const input = parseInput(createCustomerFromFeedbackSchema.safeParse(request.body));
    const result = await createCustomerFromFeedback(
      getActor(request),
      params.businessId,
      params.feedbackId,
      input
    );
    sendSuccess(response, "Customer created from feedback", result, 201);
  } catch (error) {
    next(error);
  }
}
