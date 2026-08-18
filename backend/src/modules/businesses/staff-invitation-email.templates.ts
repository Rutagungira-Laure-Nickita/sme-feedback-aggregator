import type {
  Branch,
  Business,
  BusinessMemberRole,
  StaffInvitation,
  User
} from "@prisma/client";
import { env } from "../../config/env.js";

type InvitationEmailInput = {
  business: Pick<Business, "name">;
  invitation: Pick<StaffInvitation, "role" | "expiresAt" | "allBranchesAccess">;
  inviter: Pick<User, "firstName" | "lastName">;
  branches: Pick<Branch, "name">[];
  rawToken: string;
};

export function buildStaffInvitationEmail({
  business,
  invitation,
  inviter,
  branches,
  rawToken
}: InvitationEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const acceptUrl = `${env.APP_FRONTEND_URL.replace(/\/$/, "")}/invitations/accept?token=${encodeURIComponent(rawToken)}`;
  const role = formatBusinessRole(invitation.role);
  const branchAccess = invitation.allBranchesAccess
    ? "All active branches"
    : branches.map((branch) => branch.name).join(", ");
  const inviterName = `${inviter.firstName} ${inviter.lastName}`.trim();

  return {
    subject: `Invitation to join ${business.name}`,
    text: [
      `You have been invited to join ${business.name}.`,
      "",
      `${inviterName} invited you as ${role}.`,
      `Branch access: ${branchAccess || "Selected branches"}.`,
      `This invitation expires on ${invitation.expiresAt.toISOString()}.`,
      "",
      `Accept invitation: ${acceptUrl}`,
      "",
      "If you were not expecting this invitation, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h1 style="margin:0 0 12px;font-size:24px">You're invited to ${escapeHtml(business.name)}</h1>
        <p>${escapeHtml(inviterName)} invited you as <strong>${escapeHtml(role)}</strong>.</p>
        <p><strong>Branch access:</strong> ${escapeHtml(branchAccess || "Selected branches")}</p>
        <p>This invitation expires on ${escapeHtml(invitation.expiresAt.toISOString())}.</p>
        <p>
          <a href="${escapeHtml(acceptUrl)}" style="display:inline-block;background:#3f51f8;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">
            Accept invitation
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">If you were not expecting this invitation, you can ignore this email.</p>
      </div>
    `
  };
}

export function formatBusinessRole(role: BusinessMemberRole): string {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
