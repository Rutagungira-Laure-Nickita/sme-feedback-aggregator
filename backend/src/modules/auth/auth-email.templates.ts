import { env } from "../../config/env.js";

type EmailTemplateUser = {
  email: string;
  firstName: string;
};

type AuthEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

const applicationName = "SME Feedback Aggregator";

export function buildEmailVerificationEmail(
  user: EmailTemplateUser,
  rawToken: string,
  expiresAt: Date
): AuthEmailTemplate {
  const link = buildFrontendLink("/verify-email", rawToken);
  const firstName = escapeHtml(user.firstName);
  const expiry = formatExpiry(expiresAt);

  return {
    subject: "Verify your email address",
    text: [
      `Hello ${user.firstName},`,
      "",
      `Welcome to ${applicationName}. Please verify your email address by opening this link:`,
      link,
      "",
      `This link expires ${expiry}.`,
      "",
      "If you did not create this account, you can ignore this email."
    ].join("\n"),
    html: baseEmailHtml({
      title: "Verify your email address",
      body: [
        `Hello ${firstName},`,
        `Welcome to ${applicationName}. Please verify your email address to finish creating your account.`,
        `This link expires ${escapeHtml(expiry)}.`,
        "If you did not create this account, you can ignore this email."
      ],
      ctaLabel: "Verify email",
      ctaUrl: link
    })
  };
}

export function buildPasswordResetEmail(
  user: EmailTemplateUser,
  rawToken: string,
  expiresAt: Date
): AuthEmailTemplate {
  const link = buildFrontendLink("/reset-password", rawToken);
  const firstName = escapeHtml(user.firstName);
  const expiry = formatExpiry(expiresAt);

  return {
    subject: "Reset your password",
    text: [
      `Hello ${user.firstName},`,
      "",
      `A password reset was requested for your ${applicationName} account. Open this link to set a new password:`,
      link,
      "",
      `This link expires ${expiry}.`,
      "",
      "If you did not request this reset, ignore this email and your password will stay unchanged."
    ].join("\n"),
    html: baseEmailHtml({
      title: "Reset your password",
      body: [
        `Hello ${firstName},`,
        `A password reset was requested for your ${applicationName} account.`,
        `This link expires ${escapeHtml(expiry)}.`,
        "If you did not request this reset, ignore this email and your password will stay unchanged."
      ],
      ctaLabel: "Reset password",
      ctaUrl: link
    })
  };
}

function buildFrontendLink(path: string, rawToken: string): string {
  const url = new URL(path, env.APP_FRONTEND_URL);
  url.searchParams.set("token", rawToken);

  return url.toString();
}

function baseEmailHtml(options: {
  title: string;
  body: string[];
  ctaLabel: string;
  ctaUrl: string;
}): string {
  const paragraphs = options.body
    .map((paragraph) => `<p style="margin:0 0 16px">${paragraph}</p>`)
    .join("");

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f7f8fb;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:28px">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#334155">${applicationName}</p>
        <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">${escapeHtml(options.title)}</h1>
        <div style="font-size:15px;line-height:1.6;color:#334155">${paragraphs}</div>
        <p style="margin:24px 0">
          <a href="${escapeHtml(options.ctaUrl)}" style="display:inline-block;background:#020617;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-weight:700">
            ${escapeHtml(options.ctaLabel)}
          </a>
        </p>
        <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#64748b">
          If the button does not work, paste this link into your browser:<br />
          <span style="word-break:break-all">${escapeHtml(options.ctaUrl)}</span>
        </p>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatExpiry(expiresAt: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(expiresAt);
}
