import { Router } from "express";
import {
  archiveCustomerController,
  createCustomerController,
  createCustomerFromFeedbackController,
  getCustomerController,
  getFeedbackCustomerController,
  getFeedbackCustomerMatchesController,
  linkFeedbackCustomerController,
  listCustomerActivityController,
  listCustomerFeedbackController,
  listCustomersController,
  reactivateCustomerController,
  updateCustomerController
} from "./customer.controller.js";

export const customersRouter = Router({ mergeParams: true });
export const feedbackCustomerRouter = Router({ mergeParams: true });

customersRouter.get("/", listCustomersController);
customersRouter.post("/", createCustomerController);
customersRouter.get("/:customerId", getCustomerController);
customersRouter.patch("/:customerId", updateCustomerController);
customersRouter.post("/:customerId/archive", archiveCustomerController);
customersRouter.post("/:customerId/reactivate", reactivateCustomerController);
customersRouter.get("/:customerId/feedback", listCustomerFeedbackController);
customersRouter.get("/:customerId/activity", listCustomerActivityController);

feedbackCustomerRouter.get("/:feedbackId/customer", getFeedbackCustomerController);
feedbackCustomerRouter.patch("/:feedbackId/customer", linkFeedbackCustomerController);
feedbackCustomerRouter.post(
  "/:feedbackId/customer",
  createCustomerFromFeedbackController
);
feedbackCustomerRouter.get(
  "/:feedbackId/customer-matches",
  getFeedbackCustomerMatchesController
);
