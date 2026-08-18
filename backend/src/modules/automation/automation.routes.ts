import { Router } from "express";
import { automationManagementRateLimiter } from "../../middleware/rate-limit.middleware.js";
import {
  activateAutomationRuleController,
  archiveAutomationRuleController,
  createAutomationRuleController,
  deleteAutomationRuleController,
  duplicateAutomationRuleController,
  getAutomationExecutionController,
  getAutomationRuleController,
  listAutomationExecutionsController,
  listAutomationRulesController,
  listRuleExecutionsController,
  pauseAutomationRuleController,
  previewAutomationRuleController,
  reorderAutomationRulesController,
  runAutomationRuleController,
  unarchiveAutomationRuleController,
  updateAutomationRuleController
} from "./automation.controller.js";

export const automationRulesRouter = Router({ mergeParams: true });
export const automationExecutionsRouter = Router({ mergeParams: true });

automationRulesRouter.use(automationManagementRateLimiter);
automationExecutionsRouter.use(automationManagementRateLimiter);

automationRulesRouter.get("/", listAutomationRulesController);
automationRulesRouter.post("/", createAutomationRuleController);
automationRulesRouter.post("/reorder", reorderAutomationRulesController);
automationRulesRouter.get("/:ruleId", getAutomationRuleController);
automationRulesRouter.patch("/:ruleId", updateAutomationRuleController);
automationRulesRouter.post("/:ruleId/activate", activateAutomationRuleController);
automationRulesRouter.post("/:ruleId/pause", pauseAutomationRuleController);
automationRulesRouter.post("/:ruleId/archive", archiveAutomationRuleController);
automationRulesRouter.post("/:ruleId/unarchive", unarchiveAutomationRuleController);
automationRulesRouter.post("/:ruleId/duplicate", duplicateAutomationRuleController);
automationRulesRouter.post("/:ruleId/test", previewAutomationRuleController);
automationRulesRouter.post("/:ruleId/run", runAutomationRuleController);
automationRulesRouter.get("/:ruleId/executions", listRuleExecutionsController);
automationRulesRouter.delete("/:ruleId", deleteAutomationRuleController);

automationExecutionsRouter.get("/", listAutomationExecutionsController);
automationExecutionsRouter.get("/:executionId", getAutomationExecutionController);
