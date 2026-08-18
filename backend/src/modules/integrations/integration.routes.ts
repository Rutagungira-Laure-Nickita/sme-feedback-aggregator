import { Router } from "express";
import {
  authorizeIntegrationConnectionController,
  createIntegrationConnectionController,
  disconnectIntegrationConnectionController,
  gmailOAuthCallbackController,
  getIntegrationConnectionController,
  getSynchronizationRunController,
  listConnectionWebhookActivityController,
  listConnectionRunsController,
  listIntegrationConnectionsController,
  listIntegrationProvidersController,
  listSynchronizationRunItemsController,
  outlookOAuthCallbackController,
  pauseIntegrationConnectionController,
  reauthorizeIntegrationConnectionController,
  reconnectIntegrationConnectionController,
  resumeIntegrationConnectionController,
  retrySynchronizationItemController,
  syncIntegrationConnectionController,
  testIntegrationConnectionController,
  updateIntegrationConnectionController
} from "./integration.controller.js";

export const integrationProvidersRouter = Router({ mergeParams: true });
export const integrationConnectionsRouter = Router({ mergeParams: true });
export const integrationRunsRouter = Router({ mergeParams: true });
export const integrationOAuthRouter = Router();

integrationProvidersRouter.get("/", listIntegrationProvidersController);

integrationConnectionsRouter.get("/", listIntegrationConnectionsController);
integrationConnectionsRouter.post("/", createIntegrationConnectionController);
integrationConnectionsRouter.get("/:connectionId", getIntegrationConnectionController);
integrationConnectionsRouter.patch(
  "/:connectionId",
  updateIntegrationConnectionController
);
integrationConnectionsRouter.post(
  "/:connectionId/authorize",
  authorizeIntegrationConnectionController
);
integrationConnectionsRouter.post(
  "/:connectionId/test",
  testIntegrationConnectionController
);
integrationConnectionsRouter.post(
  "/:connectionId/sync",
  syncIntegrationConnectionController
);
integrationConnectionsRouter.post(
  "/:connectionId/pause",
  pauseIntegrationConnectionController
);
integrationConnectionsRouter.post(
  "/:connectionId/resume",
  resumeIntegrationConnectionController
);
integrationConnectionsRouter.post(
  "/:connectionId/reauthorize",
  reauthorizeIntegrationConnectionController
);
integrationConnectionsRouter.post(
  "/:connectionId/disconnect",
  disconnectIntegrationConnectionController
);
integrationConnectionsRouter.post(
  "/:connectionId/reconnect",
  reconnectIntegrationConnectionController
);
integrationConnectionsRouter.get("/:connectionId/runs", listConnectionRunsController);
integrationConnectionsRouter.get(
  "/:connectionId/activity",
  listConnectionWebhookActivityController
);

integrationRunsRouter.get("/:runId", getSynchronizationRunController);
integrationRunsRouter.get("/:runId/items", listSynchronizationRunItemsController);
integrationRunsRouter.post(
  "/:runId/items/:itemId/retry",
  retrySynchronizationItemController
);

integrationOAuthRouter.get("/gmail/callback", gmailOAuthCallbackController);
integrationOAuthRouter.get("/outlook/callback", outlookOAuthCallbackController);
