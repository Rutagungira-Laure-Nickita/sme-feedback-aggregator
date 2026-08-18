import { FeedbackChannel } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  FEEDBACK_ERROR_CODES,
  FeedbackProcessingError,
  type FeedbackErrorCode
} from "../modules/feedback-processing/index.js";
import {
  feedbackProcessingService,
  processFeedbackForLocalSimulation
} from "../modules/feedback-processing/feedback-processing.service.js";
import type {
  JsonObject,
  JsonValue,
  NormalizedFeedbackInput
} from "../modules/feedback-processing/index.js";

type CliArgs = {
  values: Record<string, string>;
  commit: boolean;
  simulateFailureAfterIngestion: boolean;
};

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    const input = buildInput(args);

    if (!args.commit) {
      if (args.simulateFailureAfterIngestion) {
        throw new FeedbackCliValidationError(
          "--simulateFailureAfterIngestion requires --commit."
        );
      }

      const result = await feedbackProcessingService.validate(input);
      console.log("Feedback processing dry run accepted.");
      console.log(`businessId=${result.businessId}`);
      console.log(`branchId=${result.branchId}`);
      console.log(`channel=${result.channel}`);
      console.log(`duplicate=${String(result.duplicate)}`);
      console.log("No data was written. Re-run with --commit to persist feedback.");
      return;
    }

    const result = args.simulateFailureAfterIngestion
      ? await processFeedbackForLocalSimulation(input, {
          simulateFailureAfterIngestion: true
        })
      : await feedbackProcessingService.process(input);
    console.log("Feedback processing committed.");
    console.log(`feedbackId=${result.feedbackId}`);
    console.log(`ingestionId=${result.ingestionId}`);
    console.log(`businessId=${result.businessId}`);
    console.log(`branchId=${result.branchId}`);
    console.log(`channel=${result.channel}`);
    console.log(`created=${String(result.created)}`);
    console.log(`duplicate=${String(result.duplicate)}`);
    console.log(`processedAt=${result.processedAt}`);
  } catch (error) {
    printSafeCliError(error);
    process.exitCode = 1;
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      if (process.exitCode !== 1) {
        printSafeCliError(undefined);
        process.exitCode = 1;
      }
    }
  }
}

class FeedbackCliValidationError extends FeedbackProcessingError {
  public constructor(message: string) {
    super(message, FEEDBACK_ERROR_CODES.INPUT_INVALID, 400);
    this.name = "FeedbackCliValidationError";
  }
}

function printSafeCliError(error: unknown): void {
  const safeError = toSafeCliError(error);

  console.error(`${safeError.code}: ${safeError.message}`);
}

function toSafeCliError(error: unknown): {
  code: FeedbackErrorCode;
  message: string;
} {
  if (error instanceof FeedbackProcessingError) {
    return {
      code: error.code as FeedbackErrorCode,
      message: toSafeUserMessage(error)
    };
  }

  return {
    code: FEEDBACK_ERROR_CODES.PROCESSING_FAILED,
    message: "Feedback processing failed."
  };
}

function toSafeUserMessage(error: FeedbackProcessingError): string {
  if (error.code === FEEDBACK_ERROR_CODES.PROCESSING_FAILED) {
    if (error.message === "Simulated local processing failure.") {
      return "Simulated local processing failure.";
    }

    return "Feedback processing failed.";
  }

  if (error.message === "Feedback message is required.") {
    return "Message is required.";
  }

  if (error.message === "Feedback input validation failed.") {
    return "Feedback input is invalid.";
  }

  const sanitized = error.message.replace(/\s+/g, " ").trim();

  return sanitized || "Feedback input is invalid.";
}

function parseArgs(rawArgs: string[]): CliArgs {
  const values: Record<string, string> = {};
  let commit = false;
  let simulateFailureAfterIngestion = false;

  for (let index = 0; index < rawArgs.length; index += 1) {
    const rawArg = rawArgs[index];
    if (!rawArg) {
      continue;
    }

    if (rawArg === "--commit") {
      commit = true;
      continue;
    }

    if (rawArg === "--simulateFailureAfterIngestion") {
      simulateFailureAfterIngestion = true;
      continue;
    }

    if (!rawArg.startsWith("--")) {
      throw new FeedbackCliValidationError("Unexpected CLI argument.");
    }

    const withoutPrefix = rawArg.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");

    if (equalsIndex >= 0) {
      const key = withoutPrefix.slice(0, equalsIndex);
      const value = withoutPrefix.slice(equalsIndex + 1);
      values[key] = value;
      continue;
    }

    const next = rawArgs[index + 1];
    if (!next || next.startsWith("--")) {
      throw new FeedbackCliValidationError("Missing CLI argument value.");
    }

    values[withoutPrefix] = next;
    index += 1;
  }

  return { values, commit, simulateFailureAfterIngestion };
}

function buildInput(args: CliArgs): NormalizedFeedbackInput {
  const businessId = requireArg(args, "businessId");
  const channel = parseChannel(requireArg(args, "channel"));
  const idempotencyKey = requireArg(args, "idempotencyKey");
  const message = requireMessageArg(args);
  const metadata = args.values.metadata ? parseMetadata(args.values.metadata) : undefined;
  const attachments = hasArg(args, "attachments")
    ? parseAttachments(args.values.attachments ?? "")
    : undefined;

  return {
    businessId,
    branchId: optionalArg(args, "branchId"),
    channel,
    externalId: optionalArg(args, "externalId"),
    idempotencyKey,
    title: optionalArg(args, "title"),
    message,
    rating: optionalNumberArg(args, "rating"),
    occurredAt: optionalArg(args, "occurredAt"),
    sourceUrl: optionalArg(args, "sourceUrl"),
    languageCode: optionalArg(args, "languageCode"),
    customer: {
      name: optionalArg(args, "customerName"),
      email: optionalArg(args, "customerEmail"),
      phone: optionalArg(args, "customerPhone")
    },
    attachments,
    metadata
  };
}

function requireArg(args: CliArgs, key: string): string {
  const value = optionalArg(args, key);

  if (!value) {
    throw new FeedbackCliValidationError(`Missing required --${key} argument.`);
  }

  return value;
}

function requireMessageArg(args: CliArgs): string {
  if (!hasArg(args, "message")) {
    throw new FeedbackCliValidationError("Missing required --message argument.");
  }

  const value = args.values.message?.trim();

  if (!value) {
    throw new FeedbackCliValidationError("Message is required.");
  }

  return value;
}

function optionalArg(args: CliArgs, key: string): string | undefined {
  const value = args.values[key]?.trim();

  return value ? value : undefined;
}

function hasArg(args: CliArgs, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(args.values, key);
}

function optionalNumberArg(args: CliArgs, key: string): number | undefined {
  const value = optionalArg(args, key);

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new FeedbackCliValidationError(`--${key} must be a number.`);
  }

  return parsed;
}

function parseChannel(value: string): FeedbackChannel {
  if (Object.values(FeedbackChannel).includes(value as FeedbackChannel)) {
    return value as FeedbackChannel;
  }

  throw new FeedbackCliValidationError(
    `--channel must be one of: ${Object.values(FeedbackChannel).join(", ")}.`
  );
}

function parseMetadata(rawValue: string): JsonObject {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new FeedbackCliValidationError("--metadata must be a valid JSON object.");
  }

  if (!isJsonObject(parsed)) {
    throw new FeedbackCliValidationError("--metadata must be a JSON object.");
  }

  return parsed;
}

function parseAttachments(rawValue: string): NormalizedFeedbackInput["attachments"] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new FeedbackCliValidationError("--attachments must be a valid JSON array.");
  }

  if (!Array.isArray(parsed)) {
    throw new FeedbackCliValidationError("--attachments must be a valid JSON array.");
  }

  return parsed as NormalizedFeedbackInput["attachments"];
}

function isJsonObject(value: unknown): value is JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return typeof value !== "number" || Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  return isJsonObject(value);
}

void main().catch(() => {
  printSafeCliError(undefined);
  process.exitCode = 1;
});
