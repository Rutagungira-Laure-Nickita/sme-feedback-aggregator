import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { AppError } from "./app-error.js";
import { logger } from "./logger.js";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

let transporter: Transporter | null = null;

export function assertEmailDeliveryConfigured(): void {
  if (!env.EMAIL_ENABLED) {
    throw new AppError(
      "Email delivery is not configured yet.",
      "EMAIL_DELIVERY_NOT_CONFIGURED",
      503
    );
  }

  if (!env.SMTP_HOST || !env.EMAIL_FROM_ADDRESS) {
    throw new AppError(
      "Email delivery is not configured yet.",
      "EMAIL_DELIVERY_NOT_CONFIGURED",
      503
    );
  }
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  assertEmailDeliveryConfigured();
  const smtpHost = env.SMTP_HOST;
  const fromAddress = env.EMAIL_FROM_ADDRESS;

  if (!smtpHost || !fromAddress) {
    throw new AppError(
      "Email delivery is not configured yet.",
      "EMAIL_DELIVERY_NOT_CONFIGURED",
      503
    );
  }

  try {
    transporter ??= nodemailer.createTransport({
      host: smtpHost,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS
            }
          : undefined
    });

    await transporter.sendMail({
      from: {
        name: env.EMAIL_FROM_NAME,
        address: fromAddress
      },
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
  } catch (error) {
    logger.warn({ error: sanitizeEmailError(error) }, "Email delivery failed");
    throw new AppError(
      "Email could not be delivered right now. Please try again later.",
      "EMAIL_DELIVERY_FAILED",
      503
    );
  }
}

function sanitizeEmailError(error: unknown): { name?: string; code?: string } {
  if (!error || typeof error !== "object") {
    return {};
  }

  const candidate = error as { name?: unknown; code?: unknown };

  return {
    name: typeof candidate.name === "string" ? candidate.name : undefined,
    code: typeof candidate.code === "string" ? candidate.code : undefined
  };
}
