import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import {
  INTEGRATION_ERRORS,
  IntegrationError,
  type IntegrationErrorCode
} from "./integration.errors.js";

export function verifyMetaWebhookSignature(input: {
  rawBody: Buffer;
  signatureHeader?: string | string[];
  appSecret?: string | null;
  errorCode?: IntegrationErrorCode;
}): void {
  const appSecret = input.appSecret ?? env.META_WHATSAPP_APP_SECRET;
  const header = Array.isArray(input.signatureHeader)
    ? input.signatureHeader[0]
    : input.signatureHeader;
  const errorCode = input.errorCode ?? INTEGRATION_ERRORS.META_WEBHOOK_SIGNATURE_INVALID;

  if (!appSecret || !header || !header.startsWith("sha256=")) {
    throw new IntegrationError("Meta webhook signature is invalid.", errorCode, 403);
  }

  const providedHex = header.slice("sha256=".length);
  if (!/^[a-fA-F0-9]{64}$/.test(providedHex)) {
    throw new IntegrationError("Meta webhook signature is invalid.", errorCode, 403);
  }

  const expectedHex = createHmac("sha256", appSecret).update(input.rawBody).digest("hex");
  const provided = Buffer.from(providedHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new IntegrationError("Meta webhook signature is invalid.", errorCode, 403);
  }
}

export function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
