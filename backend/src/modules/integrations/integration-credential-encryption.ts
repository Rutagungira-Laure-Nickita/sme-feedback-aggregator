import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import { IntegrationError, INTEGRATION_ERRORS } from "./integration.errors.js";

const ALGORITHM = "aes-256-gcm";
const KEY_VERSION = 1;
const IV_BYTES = 12;

type EncryptionEnvelope = {
  v: number;
  alg: "AES-256-GCM";
  iv: string;
  tag: string;
  ciphertext: string;
};

export function getIntegrationEncryptionKeyVersion(): number {
  return KEY_VERSION;
}

export function assertIntegrationEncryptionReady(): void {
  getIntegrationEncryptionKey();
}

export function encryptIntegrationSecret(value: string, associatedData: string): string {
  const key = getIntegrationEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const envelope: EncryptionEnvelope = {
    v: KEY_VERSION,
    alg: "AES-256-GCM",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };

  return JSON.stringify(envelope);
}

export function decryptIntegrationSecret(
  envelopeValue: string,
  associatedData: string
): string {
  const key = getIntegrationEncryptionKey();
  const envelope = parseEnvelope(envelopeValue);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final()
    ]).toString("utf8");
  } catch {
    throw new IntegrationError(
      "Stored integration credentials could not be decrypted.",
      INTEGRATION_ERRORS.CREDENTIAL_DECRYPTION_FAILED,
      500
    );
  }
}

function getIntegrationEncryptionKey(): Buffer {
  const value = env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY;
  if (!value) {
    throw new IntegrationError(
      "Live integration credential encryption is not configured.",
      INTEGRATION_ERRORS.LIVE_EMAIL_NOT_CONFIGURED,
      503
    );
  }

  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new IntegrationError(
      "Live integration credential encryption is not configured.",
      INTEGRATION_ERRORS.LIVE_EMAIL_NOT_CONFIGURED,
      503
    );
  }

  return key;
}

function parseEnvelope(value: string): EncryptionEnvelope {
  try {
    const parsed = JSON.parse(value) as Partial<EncryptionEnvelope>;
    if (
      parsed.v !== KEY_VERSION ||
      parsed.alg !== "AES-256-GCM" ||
      !parsed.iv ||
      !parsed.tag ||
      !parsed.ciphertext
    ) {
      throw new Error("Invalid envelope");
    }
    return parsed as EncryptionEnvelope;
  } catch {
    throw new IntegrationError(
      "Stored integration credentials are invalid.",
      INTEGRATION_ERRORS.CREDENTIAL_DECRYPTION_FAILED,
      500
    );
  }
}
