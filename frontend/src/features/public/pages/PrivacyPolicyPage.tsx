import {
  Cookie,
  Database,
  Mail,
  ServerCog,
  ShieldCheck,
  UserRound,
  Users
} from "lucide-react";
import { LegalPageLayout, type LegalSectionItem } from "../components/LegalPageLayout.js";
import { PublicSeo } from "../components/PublicSeo.js";

const privacySections: LegalSectionItem[] = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    summary: "We collect account and authentication information needed to run the app.",
    icon: UserRound,
    content: [
      "The current implementation stores user account details including email address, first name, last name, role, account status, timestamps, optional last login time, and email verification time.",
      "Password users have Argon2id password hashes stored by the backend. Google-only accounts can exist without a password hash.",
      "The system stores session records with refresh-token hashes, expiration, revocation time, optional IP address, optional user agent, and usage timestamps. It also stores Google account metadata such as provider ID, verified provider email, display name, avatar URL, and last-used time when Google authentication is configured.",
      "Email verification and password reset use account-token records that store only SHA-256 token hashes, purpose, expiry, optional requested IP, and usage timestamps. Raw verification or reset tokens are not stored."
    ]
  },
  {
    id: "how-we-use-information",
    title: "How We Use Information",
    summary:
      "We use information for account access, security, and planned product workflows.",
    icon: ServerCog,
    content: [
      "Account information is used to register users, authenticate sessions, authorize protected routes, support Google login and linking, verify email addresses, reset passwords, and manage active sessions.",
      "Operational metadata such as sessions, user agents, IP addresses, and token records helps protect accounts, rotate refresh tokens, reject reused tokens, and support logout or password-reset session revocation.",
      "Business workspace information is used to manage businesses, branches, staff memberships, branch access, staff invitations, and platform-administrator business oversight. Customer, feedback, analytics, and integration data remain later roadmap areas."
    ]
  },
  {
    id: "data-sharing",
    title: "Data Sharing",
    summary: "We share data only where needed to operate configured services.",
    icon: Users,
    content: [
      "The application may rely on infrastructure providers for hosting, database storage, SMTP delivery, and frontend deployment when production deployment begins. Production deployment is not completed yet.",
      "When Google authentication is enabled, Google ID credentials are verified with Google's official backend library. The app does not store Google access tokens or refresh tokens.",
      "When SMTP email delivery is enabled, verification, password-reset, and staff-invitation messages are sent through the configured SMTP provider. SMTP credentials are environment secrets and must not be committed.",
      "This draft does not claim that data never leaves a jurisdiction or that the service has compliance certifications."
    ]
  },
  {
    id: "data-retention",
    title: "Data Retention",
    summary:
      "We retain information while it is needed for account and security purposes.",
    icon: Database,
    content: [
      "User and external account records remain in the database until later account-management or deletion flows are implemented.",
      "Sessions expire and can be revoked through logout, logout-all, session revocation, and password reset. The backend includes opportunistic cleanup for old expired or revoked sessions.",
      "Account tokens expire, are single-use, and are invalidated when replacement tokens of the same purpose are created. Expired token cleanup is run opportunistically during token workflows."
    ]
  },
  {
    id: "cookies-and-tracking",
    title: "Cookies and Tracking",
    summary: "Authentication uses HttpOnly cookies and the theme uses local storage.",
    icon: Cookie,
    content: [
      "Access and refresh JWTs are stored only in HttpOnly cookies. The frontend does not read or store JWTs in localStorage, sessionStorage, React state, Zustand, or URLs.",
      "The refresh cookie is scoped to the /api/auth path. Local development uses COOKIE_SECURE=false for HTTP, while production must use secure cookies over HTTPS.",
      "The saved platform appearance may be cached in localStorage under sme-platform-appearance to prevent an incorrect first paint. The server setting remains authoritative after load; the visible theme toggle is session-only."
    ]
  },
  {
    id: "your-rights",
    title: "Your Rights",
    summary: "Account and data rights depend on future production policy and law.",
    icon: ShieldCheck,
    content: [
      "Future production policy should describe how users can request access, correction, export, or deletion of personal data.",
      "The current development application does not yet include customer profiles, feedback records, payment billing, business deletion, ownership transfer, or formal privacy-request workflows.",
      "Professional legal review is required before launch so rights, obligations, and request processes match the deployed jurisdictions and providers."
    ]
  },
  {
    id: "contact-us",
    title: "Contact Us",
    summary:
      "Use the contact page for questions while public contact delivery is pending.",
    icon: Mail,
    content: [
      "No public support email address is documented in the project memory files. The Contact page currently validates a form locally and explains that direct delivery is not configured.",
      "A real contact endpoint or documented public inbox should be added in a later scoped task before production launch."
    ]
  }
];

export function PrivacyPolicyPage(): JSX.Element {
  return (
    <>
      <PublicSeo
        title="Privacy Policy | SME Feedback Aggregator"
        description="Draft privacy policy for SME Feedback Aggregator based on the current authentication architecture, cookies, sessions, Google auth, SMTP email, and database schema."
      />
      <LegalPageLayout
        title="Privacy Policy"
        updatedAt="July 22, 2026"
        intro="This Privacy Policy explains how SME Feedback Aggregator currently collects, uses, shares, and protects information based on the implemented authentication architecture and documented roadmap."
        sections={privacySections}
        contactTitle="Questions about your privacy?"
        contactDescription="Reach out through the Contact page while a formal public support channel is being configured."
      />
    </>
  );
}
