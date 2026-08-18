import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import {
  processWhatsAppWebhookDelivery,
  verifyWhatsAppWebhookChallenge
} from "./whatsapp-live-connector.js";

export async function verifyWhatsAppWebhookController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const challenge = await verifyWhatsAppWebhookChallenge({
      mode: request.query["hub.mode"],
      verifyToken: request.query["hub.verify_token"],
      challenge: request.query["hub.challenge"]
    });
    response.status(200).type("text/plain").send(challenge);
  } catch (error) {
    next(error);
  }
}

export async function receiveWhatsAppWebhookController(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawBody = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(JSON.stringify(request.body ?? {}));
    const result = await processWhatsAppWebhookDelivery({
      rawBody,
      signatureHeader: request.headers["x-hub-signature-256"]
    });
    sendSuccess(response, "WhatsApp webhook received.", result);
  } catch (error) {
    next(error);
  }
}
