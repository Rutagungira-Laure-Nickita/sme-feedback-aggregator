import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import {
  createIntegrationConnectionSchema,
  integrationConnectionIdParamsSchema,
  integrationRunIdParamsSchema,
  integrationRunItemParamsSchema,
  listIntegrationConnectionsQuerySchema,
  listSynchronizationRunsQuerySchema,
  updateIntegrationConnectionSchema
} from "./integration.schemas.js";
import {
  authorizeIntegrationConnection,
  completeGmailOAuthCallback,
  completeOutlookOAuthCallback,
  createIntegrationConnection,
  disconnectIntegrationConnection,
  getIntegrationConnection,
  getSynchronizationRun,
  listConnectionWebhookActivity,
  listConnectionRuns,
  listIntegrationConnections,
  listIntegrationProviders,
  listSynchronizationRunItems,
  pauseIntegrationConnection,
  reconnectIntegrationConnection,
  requestIntegrationSync,
  resumeIntegrationConnection,
  retrySynchronizationItem,
  testIntegrationConnection,
  updateIntegrationConnection
} from "./integration.service.js";
import { IntegrationOAuthAction } from "../../lib/prisma-runtime.js";

export async function listIntegrationProvidersController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = String(request.params.businessId ?? "");
    const result = await listIntegrationProviders(
      { userId: request.auth!.id },
      businessId
    );
    sendSuccess(response, "Integration providers loaded.", result);
  } catch (error) {
    next(error);
  }
}

export async function listIntegrationConnectionsController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = String(request.params.businessId ?? "");
    const query = listIntegrationConnectionsQuerySchema.parse(request.query);
    const result = await listIntegrationConnections(
      { userId: request.auth!.id },
      businessId,
      query
    );
    sendSuccess(response, "Integration connections loaded.", result);
  } catch (error) {
    next(error);
  }
}

export async function createIntegrationConnectionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = String(request.params.businessId ?? "");
    const input = createIntegrationConnectionSchema.parse(request.body);
    const result = await createIntegrationConnection(
      { userId: request.auth!.id },
      businessId,
      input
    );
    sendSuccess(response, "Integration connection started.", result, 201);
  } catch (error) {
    next(error);
  }
}

export async function authorizeIntegrationConnectionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const result = await authorizeIntegrationConnection(
      { userId: request.auth!.id },
      businessId,
      connectionId,
      IntegrationOAuthAction.CONNECT
    );
    sendSuccess(response, "Email authorization started.", result);
  } catch (error) {
    next(error);
  }
}

export async function reauthorizeIntegrationConnectionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const result = await authorizeIntegrationConnection(
      { userId: request.auth!.id },
      businessId,
      connectionId,
      IntegrationOAuthAction.REAUTHORIZE
    );
    sendSuccess(response, "Email reauthorization started.", result);
  } catch (error) {
    next(error);
  }
}

export async function gmailOAuthCallbackController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const redirectUrl = await completeGmailOAuthCallback(
      { userId: request.auth!.id },
      {
        state: typeof request.query.state === "string" ? request.query.state : undefined,
        code: typeof request.query.code === "string" ? request.query.code : undefined,
        error: typeof request.query.error === "string" ? request.query.error : undefined
      }
    );
    response.redirect(303, redirectUrl);
  } catch (error) {
    next(error);
  }
}

export async function outlookOAuthCallbackController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const redirectUrl = await completeOutlookOAuthCallback(
      { userId: request.auth!.id },
      {
        state: typeof request.query.state === "string" ? request.query.state : undefined,
        code: typeof request.query.code === "string" ? request.query.code : undefined,
        error: typeof request.query.error === "string" ? request.query.error : undefined
      }
    );
    response.redirect(303, redirectUrl);
  } catch (error) {
    next(error);
  }
}

export async function getIntegrationConnectionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const result = await getIntegrationConnection(
      { userId: request.auth!.id },
      businessId,
      connectionId
    );
    sendSuccess(response, "Integration connection loaded.", result);
  } catch (error) {
    next(error);
  }
}

export async function updateIntegrationConnectionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const input = updateIntegrationConnectionSchema.parse(request.body);
    const result = await updateIntegrationConnection(
      { userId: request.auth!.id },
      businessId,
      connectionId,
      input
    );
    sendSuccess(response, "Integration connection updated.", result);
  } catch (error) {
    next(error);
  }
}

export async function testIntegrationConnectionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const result = await testIntegrationConnection(
      { userId: request.auth!.id },
      businessId,
      connectionId
    );
    sendSuccess(response, "Demo connection tested.", {
      ...result,
      checkedAt: result.checkedAt.toISOString()
    });
  } catch (error) {
    next(error);
  }
}

export async function syncIntegrationConnectionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const result = await requestIntegrationSync(
      { userId: request.auth!.id },
      businessId,
      connectionId
    );
    sendSuccess(response, "Demo synchronization completed.", result, 202);
  } catch (error) {
    next(error);
  }
}

export async function pauseIntegrationConnectionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const result = await pauseIntegrationConnection(
      { userId: request.auth!.id },
      businessId,
      connectionId
    );
    sendSuccess(response, "Demo connection paused.", result);
  } catch (error) {
    next(error);
  }
}

export async function resumeIntegrationConnectionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const result = await resumeIntegrationConnection(
      { userId: request.auth!.id },
      businessId,
      connectionId
    );
    sendSuccess(response, "Demo connection resumed.", result);
  } catch (error) {
    next(error);
  }
}

export async function disconnectIntegrationConnectionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const result = await disconnectIntegrationConnection(
      { userId: request.auth!.id },
      businessId,
      connectionId
    );
    sendSuccess(response, "Demo connection disconnected.", result);
  } catch (error) {
    next(error);
  }
}

export async function reconnectIntegrationConnectionController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const result = await reconnectIntegrationConnection(
      { userId: request.auth!.id },
      businessId,
      connectionId
    );
    sendSuccess(response, "Demo connection reconnected.", result);
  } catch (error) {
    next(error);
  }
}

export async function listConnectionRunsController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const query = listSynchronizationRunsQuerySchema.parse(request.query);
    const result = await listConnectionRuns(
      { userId: request.auth!.id },
      businessId,
      connectionId,
      query
    );
    sendSuccess(response, "Synchronization runs loaded.", result);
  } catch (error) {
    next(error);
  }
}

export async function listConnectionWebhookActivityController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, connectionId } = integrationConnectionIdParamsSchema.parse(
      request.params
    );
    const query = listSynchronizationRunsQuerySchema.parse(request.query);
    const result = await listConnectionWebhookActivity(
      { userId: request.auth!.id },
      businessId,
      connectionId,
      query
    );
    sendSuccess(response, "Webhook activity loaded.", result);
  } catch (error) {
    next(error);
  }
}

export async function getSynchronizationRunController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, runId } = integrationRunIdParamsSchema.parse(request.params);
    const result = await getSynchronizationRun(
      { userId: request.auth!.id },
      businessId,
      runId
    );
    sendSuccess(response, "Synchronization run loaded.", result);
  } catch (error) {
    next(error);
  }
}

export async function listSynchronizationRunItemsController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, runId } = integrationRunIdParamsSchema.parse(request.params);
    const query = listSynchronizationRunsQuerySchema.parse(request.query);
    const result = await listSynchronizationRunItems(
      { userId: request.auth!.id },
      businessId,
      runId,
      query
    );
    sendSuccess(response, "Synchronization item results loaded.", result);
  } catch (error) {
    next(error);
  }
}

export async function retrySynchronizationItemController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { businessId, runId, itemId } = integrationRunItemParamsSchema.parse(
      request.params
    );
    const result = await retrySynchronizationItem(
      { userId: request.auth!.id },
      businessId,
      runId,
      itemId
    );
    sendSuccess(response, "Synchronization item retry completed.", result, 202);
  } catch (error) {
    next(error);
  }
}
