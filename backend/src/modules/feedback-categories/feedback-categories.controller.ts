import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { sendSuccess } from "../../utils/api-response.js";
import {
  createCategorySchema,
  updateCategorySchema,
  activationSchema,
  categoryParamsSchema,
  listCategoriesQuerySchema
} from "./feedback-categories.schemas.js";
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  updateCategoryActivation
} from "./feedback-categories.service.js";

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
        .join("; ") ?? "Invalid input.";
    throw new AppError(message, "FEEDBACK_CATEGORY_INVALID", 400);
  }
  return result.data as T;
}

export async function listCategoriesController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const businessId = request.params.businessId ?? "";
    const query = parseInput(listCategoriesQuerySchema.safeParse(request.query));
    const result = await listCategories(actor, businessId, query.includeInactive);
    sendSuccess(response, "Categories loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function getCategoryController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(categoryParamsSchema.safeParse(request.params));
    const result = await getCategory(actor, params.businessId, params.categoryId);
    sendSuccess(response, "Category loaded", result);
  } catch (error) {
    next(error);
  }
}

export async function createCategoryController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const businessId = request.params.businessId ?? "";
    const body = parseInput(createCategorySchema.safeParse(request.body));
    const result = await createCategory(actor, businessId, body);
    sendSuccess(response, "Category created", result, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCategoryController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(categoryParamsSchema.safeParse(request.params));
    const body = parseInput(updateCategorySchema.safeParse(request.body));
    const result = await updateCategory(
      actor,
      params.businessId,
      params.categoryId,
      body
    );
    sendSuccess(response, "Category updated", result);
  } catch (error) {
    next(error);
  }
}

export async function activateCategoryController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const actor = getActor(request);
    const params = parseInput(categoryParamsSchema.safeParse(request.params));
    const body = parseInput(activationSchema.safeParse(request.body));
    const result = await updateCategoryActivation(
      actor,
      params.businessId,
      params.categoryId,
      body
    );
    sendSuccess(response, "Category activation updated", result);
  } catch (error) {
    next(error);
  }
}
