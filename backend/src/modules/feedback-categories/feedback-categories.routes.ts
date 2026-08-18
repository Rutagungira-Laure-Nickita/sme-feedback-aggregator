import { Router } from "express";
import {
  listCategoriesController,
  getCategoryController,
  createCategoryController,
  updateCategoryController,
  activateCategoryController
} from "./feedback-categories.controller.js";

export const feedbackCategoriesRouter = Router({ mergeParams: true });

// GET /api/businesses/:businessId/feedback-categories
feedbackCategoriesRouter.get("/", listCategoriesController);

// POST /api/businesses/:businessId/feedback-categories
feedbackCategoriesRouter.post("/", createCategoryController);

// GET /api/businesses/:businessId/feedback-categories/:categoryId
feedbackCategoriesRouter.get("/:categoryId", getCategoryController);

// PATCH /api/businesses/:businessId/feedback-categories/:categoryId
feedbackCategoriesRouter.patch("/:categoryId", updateCategoryController);

// PATCH /api/businesses/:businessId/feedback-categories/:categoryId/activation
feedbackCategoriesRouter.patch("/:categoryId/activation", activateCategoryController);
