const CONTACT_EMAIL = "thecominggreatone@gmail.com";

type LegalSection = {
  heading: string;
  content: string;
};

type LegalPageOptions = {
  title: string;
  description: string;
  sections: LegalSection[];
};

function renderLegalPage({ title, description, sections }: LegalPageOptions): string {
  const sectionMarkup = sections
    .map(
      ({ heading, content }) => `
        <section>
          <h2>${heading}</h2>
          ${content}
        </section>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${description}" />
    <title>${title} | SME Feedback Aggregator</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
        color: #172033;
        background: #f4f6fa;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #f4f6fa;
        line-height: 1.7;
      }

      a {
        color: #4338ca;
        text-underline-offset: 0.18em;
      }

      a:hover,
      a:focus-visible {
        color: #312e81;
      }

      .page-shell {
        width: min(100% - 2rem, 880px);
        margin: 0 auto;
        padding: 2rem 0 3rem;
      }

      .document {
        overflow: hidden;
        border: 1px solid #dde2eb;
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 18px 50px rgba(28, 39, 64, 0.08);
      }

      header,
      main,
      footer {
        padding-left: clamp(1.25rem, 4vw, 3.5rem);
        padding-right: clamp(1.25rem, 4vw, 3.5rem);
      }

      header {
        padding-top: clamp(2rem, 5vw, 3.5rem);
        padding-bottom: 2rem;
        border-bottom: 1px solid #e6e9f0;
        background: linear-gradient(145deg, #ffffff, #f7f7ff);
      }

      .brand {
        margin: 0 0 1rem;
        color: #4338ca;
        font-size: 0.82rem;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        color: #111827;
        font-size: clamp(2rem, 6vw, 3.25rem);
        line-height: 1.1;
        letter-spacing: -0.035em;
      }

      .intro {
        max-width: 65ch;
        margin: 1rem 0 0;
        color: #526079;
        font-size: 1.02rem;
      }

      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem 1.2rem;
        margin-top: 1.5rem;
        font-size: 0.95rem;
      }

      main {
        padding-top: 1rem;
        padding-bottom: 2.5rem;
      }

      section {
        padding-top: 1.5rem;
      }

      h2 {
        margin: 0 0 0.55rem;
        color: #1f2937;
        font-size: 1.25rem;
        line-height: 1.35;
      }

      p,
      ul,
      ol {
        margin-top: 0.55rem;
        margin-bottom: 0.55rem;
      }

      ul,
      ol {
        padding-left: 1.4rem;
      }

      li + li {
        margin-top: 0.35rem;
      }

      .notice {
        padding: 1rem 1.1rem;
        border-left: 4px solid #6366f1;
        border-radius: 0 10px 10px 0;
        background: #f5f5ff;
      }

      footer {
        padding-top: 1.5rem;
        padding-bottom: 1.5rem;
        border-top: 1px solid #e6e9f0;
        background: #fafbfc;
        color: #5d687d;
        font-size: 0.92rem;
      }

      footer p {
        margin: 0.2rem 0;
      }

      @media (max-width: 520px) {
        .page-shell {
          width: min(100% - 1rem, 880px);
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
        }

        .document {
          border-radius: 14px;
        }
      }
    </style>
  </head>
  <body>
    <div class="page-shell">
      <article class="document">
        <header>
          <p class="brand">SME Feedback Aggregator</p>
          <h1>${title}</h1>
          <p class="intro">${description}</p>
          <nav aria-label="Legal pages">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/data-deletion">Data Deletion Instructions</a>
          </nav>
        </header>
        <main>${sectionMarkup}</main>
        <footer>
          <p><strong>SME Feedback Aggregator</strong></p>
          <p>Contact: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
        </footer>
      </article>
    </div>
  </body>
</html>`;
}

export const privacyPolicyPage = renderLegalPage({
  title: "Privacy Policy",
  description:
    "This Privacy Policy explains how SME Feedback Aggregator handles information when businesses use the platform to collect and manage customer feedback.",
  sections: [
    {
      heading: "1. Introduction",
      content: `<p>SME Feedback Aggregator helps participating businesses collect, organize, review, and act on customer feedback. This policy describes the information the platform may process, why it is used, and the choices available to users and businesses.</p>`
    },
    {
      heading: "2. Information collected",
      content: `<p>The platform may collect information provided directly by account holders, business administrators, staff members, customers, and authorized third-party services. It may also record limited technical and operational information needed for authentication, security, troubleshooting, synchronization, and service delivery.</p>`
    },
    {
      heading: "3. Business and account information",
      content: `<p>This may include names, email addresses, account roles, business and branch details, staff membership information, authentication and session records, and configuration choices made within the platform.</p>`
    },
    {
      heading: "4. Customer feedback information",
      content: `<p>The platform may process feedback messages, titles, ratings, dates, source channel, branch, workflow status, categories, priorities, assignments, internal activity, and optional customer contact details supplied with feedback. Attachment support is limited to metadata where the application offers it.</p><p>Feedback may originate from channels including Gmail or other supported email services, WhatsApp, Facebook, Instagram, website or public feedback forms, QR submissions, and manual feedback entry.</p>`
    },
    {
      heading: "5. Connected integration and provider information",
      content: `<p>The platform may connect to supported third-party services when a Business Administrator explicitly authorizes an integration. Depending on the integration, the platform may process provider account identifiers, mailbox or page labels, message or comment identifiers, timestamps, safe source previews, connection status, and synchronization or webhook activity.</p><p>Where the application stores provider credentials or tokens, they are stored encrypted and remain backend-only. They are not included in public pages or ordinary feedback responses.</p>`
    },
    {
      heading: "6. How information is used",
      content: `<p>Information is used to provide and secure accounts, route feedback to the correct business and branch, prevent duplicate imports, display a unified feedback inbox, support internal follow-up, maintain workflow history, troubleshoot connections, improve reliability, and comply with legitimate legal obligations.</p>`
    },
    {
      heading: "7. AI-assisted processing",
      content: `<p>When a business enables supported AI features, feedback text and limited related context may be processed to assist with sentiment analysis, summarization, and categorization. AI-generated results are treated as derived suggestions, may be inaccurate, and do not replace human review. Customer contact details, internal notes, provider credentials, and attachment contents are not intended to be sent to the AI provider for these functions.</p>`
    },
    {
      heading: "8. Automation and workflow processing",
      content: `<p>Authorized business administrators may configure workflow rules that evaluate feedback and take limited actions such as setting status, priority, category, or assignment. Automation activity is recorded for accountability, and the platform is designed to protect human-controlled workflow values from unintended automated replacement.</p>`
    },
    {
      heading: "9. Data sharing and service providers",
      content: `<p>Information may be shared with infrastructure, email-delivery, authentication, AI, and connected-platform providers only as needed to operate authorized features. Information may also be disclosed when required by law, to protect security and rights, or during a legitimate organizational transaction subject to appropriate safeguards.</p><p><strong>SME Feedback Aggregator does not sell personal information.</strong></p>`
    },
    {
      heading: "10. Data retention",
      content: `<p>Information is retained for as long as reasonably needed to provide the service, maintain feedback and workflow history, secure accounts, prevent abuse and duplication, meet audit or transaction-integrity needs, and satisfy applicable legal obligations. Retention may differ by information type and business requirements. Connected-provider credentials are retained only while needed for the authorized connection or related security records.</p>`
    },
    {
      heading: "11. Security",
      content: `<p>The platform uses measures such as access controls, tenant and branch authorization, secure password hashing, HttpOnly authentication cookies, encrypted provider credentials where stored, request validation, rate limiting, and sensitive log redaction. No system can guarantee absolute security, and users should protect their credentials and promptly report suspected misuse.</p>`
    },
    {
      heading: "12. Third-party platforms",
      content: `<p>Connected services are governed by their own terms, privacy policies, permissions, availability, and review requirements. SME Feedback Aggregator is not affiliated with or endorsed by Meta, Google, Microsoft, or other third-party providers merely because an integration is supported. Businesses should authorize only accounts and data they are permitted to use.</p>`
    },
    {
      heading: "13. User rights and choices",
      content: `<p>Subject to applicable law and the role of the relevant business as data controller or account administrator, users may request access, correction, export, restriction, disconnection of a provider, or deletion of eligible personal information. Some requests may need to be directed to the business that collected the feedback, and identity or authority may need to be verified.</p>`
    },
    {
      heading: "14. Data deletion",
      content: `<p>Users and businesses may request deletion of eligible account, feedback, customer, or connected-provider information. See the <a href="/data-deletion">User Data Deletion Instructions</a> for the request process and important retention limitations.</p>`
    },
    {
      heading: "15. Changes to this policy",
      content: `<p>This policy may be updated as the platform, its supported integrations, or applicable requirements change. The current version will be published at this URL with materially changed information reflected in the text.</p>`
    },
    {
      heading: "16. Contact",
      content: `<p>Questions or privacy requests may be sent to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`
    }
  ]
});

export const termsOfServicePage = renderLegalPage({
  title: "Terms of Service",
  description:
    "These Terms of Service govern authorized use of SME Feedback Aggregator and its feedback-management features.",
  sections: [
    {
      heading: "1. Acceptance of terms",
      content: `<p>By creating an account, accessing the platform, or using an authorized business workspace, you agree to these Terms of Service. If you use the platform for an organization, you represent that you have authority to accept these terms for that organization.</p>`
    },
    {
      heading: "2. Authorized use",
      content: `<p>You may use SME Feedback Aggregator only for lawful business feedback collection, management, analysis, and related internal workflows. Access is limited to the roles, businesses, branches, and information for which you have permission.</p>`
    },
    {
      heading: "3. Business Administrator responsibility",
      content: `<p>Business Administrators are responsible for configuring workspace access, assigning appropriate staff roles, selecting branches, authorizing integrations, providing required notices, and ensuring their collection and use of customer information is lawful. Administrators must promptly remove access that is no longer appropriate.</p>`
    },
    {
      heading: "4. Connected third-party services",
      content: `<p>The platform may connect to supported third-party services only when an authorized Business Administrator enables and configures the connection. You must comply with the provider's terms, permissions, and policies and may connect only accounts and data you are authorized to access. Provider availability, approvals, and API behavior are outside the platform's control.</p><p>SME Feedback Aggregator is not affiliated with or endorsed by Meta, Google, Microsoft, or other providers merely because a connection is supported.</p>`
    },
    {
      heading: "5. Acceptable use",
      content: `<p>You must not use the platform to violate law or third-party rights; access another business's data; submit malicious code; probe or disrupt security; evade rate limits; send unauthorized communications; collect information deceptively; or upload, import, or process content you have no right to use.</p>`
    },
    {
      heading: "6. Account and security responsibility",
      content: `<p>You are responsible for maintaining accurate account information, safeguarding passwords and connected-provider access, using supported security controls, and notifying the application contact if you suspect unauthorized use. You are responsible for activity performed through accounts you control, except to the extent caused by the platform's own failure to apply reasonable safeguards.</p>`
    },
    {
      heading: "7. Feedback and customer data responsibilities",
      content: `<p>Businesses determine what feedback and customer information they collect through the platform. They are responsible for having an appropriate legal basis, providing required notices, responding to customer rights requests, limiting staff access, and ensuring that submitted content is accurate and appropriate. AI-generated analysis and automation results require human oversight.</p>`
    },
    {
      heading: "8. Service availability",
      content: `<p>The service may change, experience interruptions, or depend on third-party platforms and infrastructure. Features may be disabled, limited, or unavailable during maintenance, provider outages, security incidents, or changes to external APIs and permissions. No uninterrupted or error-free availability is promised.</p>`
    },
    {
      heading: "9. Limitations",
      content: `<p class="notice">To the extent permitted by applicable law, the platform is provided on an “as available” basis. SME Feedback Aggregator is not responsible for decisions made solely from AI suggestions, automation results, customer-submitted content, or third-party provider data. Nothing in these terms excludes liability that cannot lawfully be excluded or limits rights that applicable law does not allow the parties to waive.</p>`
    },
    {
      heading: "10. Termination and disconnection",
      content: `<p>Access may be suspended or terminated for material misuse, security risk, unlawful activity, or violation of these terms. A Business Administrator may pause or disconnect supported integrations and remove staff access. Disconnection does not automatically delete feedback already imported or records that must be retained for legitimate security, audit, transaction-integrity, or legal reasons.</p>`
    },
    {
      heading: "11. Changes to these terms",
      content: `<p>These terms may be updated to reflect service, security, legal, or provider changes. The current version will be published at this URL. Continued use after an updated version takes effect constitutes acceptance where permitted by law.</p>`
    },
    {
      heading: "12. Contact",
      content: `<p>Questions about these terms may be sent to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`
    }
  ]
});

export const dataDeletionPage = renderLegalPage({
  title: "User Data Deletion Instructions",
  description:
    "Use these instructions to request deletion of eligible SME Feedback Aggregator account information or connected-provider data.",
  sections: [
    {
      heading: "Requesting deletion",
      content: `<p>A user or business may request deletion of eligible information associated with an SME Feedback Aggregator account, customer feedback, or a connected provider. This page is the application's User Data Deletion Instructions URL for supported third-party platform configuration.</p>`
    },
    {
      heading: "How to submit a request",
      content: `<ol><li>Send a deletion request to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</li><li>Identify the SME Feedback Aggregator account or business concerned and provide the email address associated with the request.</li><li>Specify whether the request concerns application account information, customer or feedback information, connected-provider information, or all eligible information.</li><li>Provide enough context to locate the information without sending passwords, access tokens, App Secrets, or other credentials.</li><li>The administrator will verify the requester's identity and authority before deletion or disconnection is performed.</li></ol>`
    },
    {
      heading: "Connected-provider data",
      content: `<p>If the request concerns Facebook, Instagram, WhatsApp, Gmail, Outlook, or another authorized provider, identify the relevant business and connection. The administrator may disconnect the provider, revoke or remove stored connection credentials, and delete eligible imported or connection-related information after verification. You may also need to remove the app through the provider's own account settings.</p>`
    },
    {
      heading: "What may be retained",
      content: `<p>Information that must legitimately be retained for security, fraud prevention, audit, transaction integrity, dispute resolution, or legal obligations may be kept only as needed for those purposes. Deletion of a provider connection does not necessarily delete information retained independently by the third-party provider under its own policies.</p>`
    },
    {
      heading: "Questions",
      content: `<p>For questions about the deletion process, contact <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. Do not include passwords, provider tokens, or other secret configuration values in the request.</p>`
    }
  ]
});
