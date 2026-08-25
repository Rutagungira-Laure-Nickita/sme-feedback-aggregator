import {
  AlertCircle,
  BookOpenCheck,
  Building2,
  FileWarning,
  Gavel,
  LockKeyhole,
  Mail,
  Scale,
  UserCheck
} from "lucide-react";
import { LegalPageLayout, type LegalSectionItem } from "../components/LegalPageLayout.js";
import { PublicSeo } from "../components/PublicSeo.js";

const termsSections: LegalSectionItem[] = [
  {
    id: "acceptance-of-terms",
    title: "Acceptance of Terms",
    summary: "Using the service means following these draft terms and applicable laws.",
    icon: BookOpenCheck,
    content: [
      "These Terms describe access to SME Feedback Aggregator during development and early review. They are draft product terms and require professional legal review before production launch.",
      "By creating an account or using the application, users should act lawfully, provide accurate account information, and respect the security and integrity of the service.",
      "No binding commercial subscription terms are created because payment processing and active billing are not implemented."
    ]
  },
  {
    id: "accounts-and-responsibilities",
    title: "Accounts and Responsibilities",
    summary: "Users are responsible for keeping account access secure.",
    icon: UserCheck,
    content: [
      "Users are responsible for maintaining the confidentiality of their account credentials and for activity that occurs under their account.",
      "The application supports email/password accounts, Google authentication when configured, email verification, password reset, session listing, session revocation, logout, and logout-all.",
      "Platform Administrator accounts are created only through the controlled seed process. Staff account invitation workflows are implemented for active Business Owners."
    ]
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    summary: "Use the service for lawful product review and future feedback operations.",
    icon: Scale,
    content: [
      "Users should not attempt to bypass authentication, abuse rate limits, interfere with other users, upload malicious content, or use the service in ways that violate applicable law.",
      "Future feedback features should be used only with customer information that the business is allowed to collect and process.",
      "The app should not be used to send spam, impersonate others, or collect sensitive information without a lawful basis and appropriate safeguards."
    ]
  },
  {
    id: "user-content",
    title: "User Content",
    summary: "Future feedback content remains subject to responsible use.",
    icon: Building2,
    content: [
      "Business, branch, staff membership, and staff invitation records are implemented. Feedback, customer, connector, and report models are not implemented yet.",
      "Future product terms should explain how user content is processed to provide feedback workflows, analytics, support, and service improvement.",
      "No current terms grant unsupported public-use rights, sell user content, or claim production data-processing commitments that are not implemented."
    ]
  },
  {
    id: "limitations-of-service",
    title: "Limitations of Service",
    summary: "The product is in development and availability is not guaranteed.",
    icon: FileWarning,
    content: [
      "SME Feedback Aggregator is still under phased development. Public website pages and dashboard visuals may describe capabilities whose external-provider availability depends on configuration.",
      "Production deployment is not completed. The current local setup uses Vite, Express, and a local MySQL-compatible database.",
      "The service does not currently provide uptime guarantees, production support commitments, payment processing, compliance certifications, or complete feedback integrations."
    ]
  },
  {
    id: "suspension-and-termination",
    title: "Suspension and Termination",
    summary: "Access may be limited for security or misuse.",
    icon: LockKeyhole,
    content: [
      "Accounts can have statuses such as ACTIVE, SUSPENDED, or DISABLED. Suspended or disabled accounts are blocked from authentication where the backend enforces those checks.",
      "Businesses and business memberships can also be suspended, which blocks normal workspace actions.",
      "Sessions can be revoked by logout, logout-all, direct session revocation, refresh-token reuse detection, or password reset.",
      "Future production terms should define formal suspension, termination, appeal, retention, and deletion processes."
    ]
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    summary: "The application code, branding, and interface should be respected.",
    icon: Gavel,
    content: [
      "SME Feedback Aggregator product names, interface designs, documentation, and software belong to their respective owners unless otherwise documented.",
      "Users should not copy, reverse engineer, or misuse the product beyond permissions granted by the project owner or future production terms.",
      "Open-source dependency licenses remain governed by their own license terms."
    ]
  },
  {
    id: "liability-and-governing-terms",
    title: "Liability and Governing Terms",
    summary: "Legal jurisdiction and liability language must be finalized later.",
    icon: AlertCircle,
    content: [
      "This draft does not invent a jurisdiction, registered company name, physical office, warranty, or limitation of liability clause.",
      "Before production launch, qualified legal counsel should add the correct governing law, dispute process, warranty disclaimers, and liability limits for the actual operating entity and deployment geography.",
      "Until then, these Terms should be treated as careful product copy rather than final legal advice."
    ]
  },
  {
    id: "contact-us",
    title: "Contact Us",
    summary: "Use the contact page for questions about these terms.",
    icon: Mail,
    content: [
      "No public legal contact email is documented yet. The Contact page explains that direct form delivery is not configured.",
      "A production-ready legal contact method should be documented before these Terms are used for a live service."
    ]
  }
];

export function TermsOfServicePage(): JSX.Element {
  return (
    <>
      <PublicSeo
        title="Terms of Service | SME Feedback Aggregator"
        description="Draft Terms of Service for SME Feedback Aggregator covering accounts, acceptable use, service limits, suspension, intellectual property, and legal review requirements."
      />
      <LegalPageLayout
        title="Terms of Service"
        updatedAt="July 22, 2026"
        intro="These Terms describe responsible use of SME Feedback Aggregator during phased development and early review. They require professional legal review before production launch."
        sections={termsSections}
        contactTitle="Questions about these Terms?"
        contactDescription="Use the Contact page for product questions while formal legal contact details are prepared."
      />
    </>
  );
}
