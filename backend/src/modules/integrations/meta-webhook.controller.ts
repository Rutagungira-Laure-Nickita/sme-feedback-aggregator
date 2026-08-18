import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import {
  processMetaSocialWebhookDelivery,
  verifyMetaSocialWebhookChallenge
} from "./meta-social-live-connector.js";
import { verifyMetaWebhookSignature } from "./meta-webhook-security.js";
import { INTEGRATION_ERRORS, IntegrationError } from "./integration.errors.js";
import { processWhatsAppWebhookDelivery } from "./whatsapp-live-connector.js";

export async function verifyMetaWebhookController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const challenge = await verifyMetaSocialWebhookChallenge({
      mode: request.query["hub.mode"],
      verifyToken: request.query["hub.verify_token"],
      challenge: request.query["hub.challenge"]
    });
    response.status(200).type("text/plain").send(challenge);
  } catch (error) {
    next(error);
  }
}

export async function receiveMetaWebhookController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawBody = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(JSON.stringify(request.body ?? {}));
    const signatureHeader = request.headers["x-hub-signature-256"];

    verifyMetaWebhookSignature({
      rawBody,
      signatureHeader,
      errorCode: INTEGRATION_ERRORS.META_WEBHOOK_SIGNATURE_INVALID
    });

    const objectType = readMetaObjectType(rawBody);
    const result =
      objectType === "whatsapp_business_account"
        ? await processWhatsAppWebhookDelivery({ rawBody, signatureHeader })
        : await processMetaSocialWebhookDelivery({ rawBody, signatureHeader });

    sendSuccess(response, "Meta webhook received.", result);
  } catch (error) {
    next(error);
  }
}

function readMetaObjectType(rawBody: Buffer): string | null {
  try {
    const payload = JSON.parse(rawBody.toString("utf8")) as { object?: unknown };
    return typeof payload.object === "string" ? payload.object : null;
  } catch {
    throw new IntegrationError(
      "Meta webhook payload is invalid JSON.",
      INTEGRATION_ERRORS.META_EVENT_PROCESSING_FAILED,
      400
    );
  }
}
