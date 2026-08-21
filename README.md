# SME Multi-Channel Customer Feedback Aggregator

## Final Product Hardening + UI/UX Pass

The product now includes professional Owner/Admin feedback management with edit, audited soft-delete, bulk status/category/delete, filtered select-all, strong Remove-all confirmation, and immutable provider/ingestion metadata. Removed feedback is hidden from normal inboxes, dashboards, customer views, AI/automation work, and reports while provider deduplication and history remain preserved.

Staff workspaces now use authenticated Branch-scoped feedback/customer/dashboard data and fail closed on forged filters. Customers have a dedicated real-data `/customer` workspace with Dashboard, My Feedback List/Grid and safe details, Submit Feedback destinations, Profile, and session security. Gmail behavior remains intact; webhook-driven WhatsApp exposes honest Refresh Activity/View Activity/Test Connection actions. Desktop navigation scrolls independently across Business, Admin, Account, and Customer shells, with the established Indigo Light/Dark/System and responsive List/Grid behavior retained.

Migration `20260821120000_final_product_hardening` was created but not applied by Codex. Apply it through the normal migration workflow before running this backend version; never reset or reseed for this change. Automated verification passes, while user-run migration/browser/authorization/tenant/responsive verification remains in `NEXT_STEPS.md`.

## Phase 29A - Railway Prisma ESM Runtime Compatibility

The native-ESM backend now loads Prisma 6.19.3 runtime values through a typed local adapter instead of requesting generated enum names as native named exports from Prisma's CommonJS package. Direct `@prisma/client` imports are type-only outside that adapter, so strict generated model/input/transaction typing is preserved while both compiled `node dist/server.js` and development `tsx src/server.ts` startup work on Node 24. No API, business logic, Prisma schema, migration, seed, or stored data changed.

## Phase 28 — Feedback Category System + Kigali Waffle Cuisine Demo Tenant + Mobile Nav Polish

Businesses now start with 13 practical, active, Business-owned feedback categories while retaining full Owner/Admin custom category management. AI and automations continue to use only active categories owned by the current Business. All Feedback shows Category or `Uncategorized` directly in both List and Grid, and reporting uses the same names.

The canonical deterministic showcase tenant is now Kigali Waffle Cuisine, renamed in place to preserve memberships, branches, customers, feedback, QR/public portal data, automations, Live WhatsApp, and Gmail context. A guarded dry-run reconciliation script is available as `npm run phase28:reconcile`; append `-- --commit` only for the confirmed local deterministic development tenant. It never seeds Live credentials.

Authenticated mobile/tablet drawers now have bounded dynamic-viewport height and internal navigation scrolling. The shared public header order is Home, About, How It Works, Features, Contact across public, Login, and Register surfaces; Pricing remains absent. No Prisma schema or migration change was required. See `NEXT_STEPS.md` for the manual device/workflow checklist.

## Phase 27 — Full Product UI/UX Overhaul

The Business Owner, Platform Administrator, and public experiences now share a more polished responsive Indigo design system. The owner Overview uses real 30-day Business Report data; feedback, customers, QR codes, automations, branch/staff details, and settings have clearer collection and detail hierarchies. Owner integrations expose only Live WhatsApp and Gmail through a centralized allowlist, and Business Owner report integration/activity metrics are Live-only. Demo data and future provider/backend architecture remain preserved for internal/admin use.

The public Home, Features, How It Works, About, Contact, Privacy, and Terms surfaces are redesigned around current capabilities. Pricing and `/pricing` have been removed. Login/Register preserve their main content and behavior inside the shared session-aware public header/footer, and authenticated users may browse informational public pages. No dependency, schema, migration, seed, or stored-data change was required. Automated verification passes; see `NEXT_STEPS.md` for the required user-run browser/responsive checklist.

## Phase 26A — Business Owner Report Export Polish

Business Owner exports use context-aware `BUSINESS REPORTING` branding in PDF and CSV metadata, while Platform Administrator PDFs retain `PLATFORM ADMINISTRATION`. Phase 27 supersedes Phase 26A's former mixed-mode owner adoption/detail behavior: owner reports now include Live integrations and activity only. The existing shared Phase 25.4 renderer, tenant authorization, report calculations, PDF pagination, CSV safety, and database schema remain unchanged. Automated verification passes; the focused regenerated-file retest is in `NEXT_STEPS.md`.

## Phase 26 — Business Owner Comprehensive Reporting

Business Owners now have exactly one report type, `Business Performance & Customer Experience Report`, at `/business/:businessId/reports` (Reports navigation item). The page requires no report-type or Business selection: the Business is resolved from the authenticated owner membership, and tenant isolation is enforced on the backend. It combines Business Performance, Customer Experience, Workflow & Response Performance, and Channel & Operational Health into one Preview/PDF/CSV report with deterministic tie-aware Management Summary, previous-period comparison, explicit lifetime vs period labels, business-wide vs branch-scoped labels, and important high/urgent or negative feedback using normalized safe message content. It reuses the shared Phase 25.4 reporting engine (document, formatter, PDF renderer, CSV safety, health classification, canonical feedback scope) and contains no platform-level API/database health, approval workload, or other-tenant data. No migration or schema change was made; reports remain on-demand. Automated verification passes; the user-run browser/PDF/CSV checklist is in `NEXT_STEPS.md`.

## Phase 25.4B

The targeted PDF section-flow, layout, and report-humanization correction is implemented. Shared PDF rendering now uses canonical page content geometry, restores the cursor after every major helper, keeps section headings/descriptions/initial content together across page breaks, and renders previous-period comparisons as a measured five-column grid. Management Summary, Preview, PDF, and CSV now share initialism-aware display formatting, including `QR Code` instead of `Qr Code`.

Phase 25.4A scope semantics, integration-attention classification, CSV structure/BOM/escaping/formula protection, and physical PDF footer/page-count safeguards remain unchanged. No schema or migration was added. Automated verification is complete; the exact manual downloaded-file retest remains in `NEXT_STEPS.md`.

## Phase 25.4A

The targeted report export and scope consistency correction is implemented. Shared PDF footer rendering no longer creates footer-only pages, and generated Executive, Feedback, and Operations files are programmatically checked at the physical PDF page/content-stream level. Executive reports now state platform, business, or branch scope explicitly and use the actual Prisma relationships for Feedback, membership-access Users, routed Integrations, business-owned Customers, and Business lifecycle state. Preview, PDF, and CSV share one scope contract and supervisor-facing display labels.

CSV remains UTF-8 BOM/escaped output, adds safe enum display names and formula-leading-cell protection, and keeps database enums unchanged. Successful integration connection tests persisted as `PASSED` now classify as healthy instead of needing attention. No schema, migration, seed, report-type, authorization, theme, List/Grid, AI, automation, or integration workflow change was introduced. User-run manual retesting remains in `NEXT_STEPS.md`.

## Phase 25.4

Supervisor-focused reporting consolidation is implemented. `/admin/reports` now intentionally exposes exactly three reports: Executive Platform Report (default), Feedback & Customer Experience Report, and Operations & System Health Report. Supported information from the former eight fragmented choices is consolidated into these management-oriented reports rather than removed.

Reports use real persisted data, clearly distinguish lifetime from selected-period counts, apply report-aware filters, generate deterministic Management Summaries, compare current/previous periods with absolute and safe percentage changes, and handle empty ranges explicitly. The existing Platform Administrator restriction, fixed Indigo branding, preview flow, PDF/CSV generation, UTF-8 CSV, report settings, footer/page numbering, and maximum 366-day window remain. No Prisma migration or external AI summary call was added. Automated verification is complete; browser/PDF/CSV manual verification remains with the user in `NEXT_STEPS.md`.

## Phase 25.3

Strict UI/UX correction is implemented with a fixed professional Indigo design system, one reactive global appearance pipeline, reusable accessible Platform Administrator detail/confirmation modals, compact independent summary cards, substantially redesigned Business Details and Reporting Center pages, organized real-only Platform Settings sections, human-readable operational errors, and the canonical Platform Health label. The Phase 25.2 business lifecycle, tenant blocking, admin actions, security safeguards, report generation, session-aware navigation, and Phase 25.1 List/Grid behavior remain intact.

Arbitrary primary/accent controls were removed. Existing database color columns remain compatibility-only; backend settings responses and reports normalize to Indigo. No new migration was created. The user confirmed migration `20260817120000_phase_25_2_admin_hardening` is applied and Prisma reports the schema up to date; its original migration text remains immutable and unchanged by Phase 25.3. Browser/manual verification remains with the user; see `NEXT_STEPS.md`.

## Phase 25.2

Platform administration hardening and the business approval workflow are implemented. New businesses are pending by default; Platform Administrators have guarded create/edit/approve/reject/suspend/reactivate/archive controls, safe user/session and integration governance, read-only feedback detail oversight, pending-business dashboard alerts, and minimal safe admin activity auditing. Non-active tenants receive a clear restricted-state experience and cannot use operational workspace APIs. Phase 25.3 supersedes the rejected Phase 25.2 pink/dynamic-color and inline-detail presentation.

Global settings drive real public hero/support content, report defaults/branding, identity, and authoritative Light/Dark/System appearance. The visible theme toggle is session-only; every successful Platform Settings save reasserts the platform appearance, and OS preference is used only for System. Public navigation/root/auth redirects are session-aware while informational public routes remain accessible. The Phase 25.1 List/Grid policy is unchanged.

Migration `20260817120000_phase_25_2_admin_hardening` was not applied by Codex; the user confirmed it was applied successfully on 2026-08-17 at 09:44:10.207 with no rollback. See `NEXT_STEPS.md` for the remaining manual checklist.

## Phase 25.1

System-wide responsive refinement, reusable persisted List/Grid collection views, priority admin oversight redesigns, and persisted global Platform Settings are implemented. Platform Administrators can manage safe branding at `/admin/settings`; public branding is read from `/api/platform-settings`; protected updates use `/api/admin/settings`. Migration `20260816120000_phase_25_1_platform_settings` was applied locally by the user. See `PHASE_25_1_RESPONSIVE_COLLECTION_AUDIT.md` for supported collections, intentional exceptions, and responsive decisions. Manual browser/device/authorization verification remains pending with the user.

## Purpose

This project will centralize customer feedback for SMEs across public forms, QR codes, manual entry, email, Google Reviews, WhatsApp, Instagram, and X.

Phase 1 is complete and manually verified. Phase 2A core email/password authentication, roles, and sessions is complete and manually verified. Phase 2B Google registration, Google login, and secure account linking is complete and manually verified. Phase 2C email verification, forgot password, password reset, and final authentication hardening is complete and manually verified. The Phase 2 login page and remaining Phase 2 authentication/account pages have also been redesigned with premium light/dark theme support and still require manual visual, responsive, and auth-flow verification. The complete public-facing website has been implemented before Phase 3 and manually approved. Phase 3 businesses, branches, staff, invitations, workspace switching, and platform-administrator oversight are implemented and manually verified. Phase 4 standard feedback processing is implemented and manually verified. Phase 5 manual-entry connector backend and frontend are implemented and manually verified. Phase 6 public feedback portal is implemented and manually verified. Phase 7 QR-code feedback submissions are implemented and manually verified.

## Current Phase

Phase 1: Project Foundation is complete and manually verified.

Phase 3: Businesses, Branches, and Staff is implemented and manually verified.

Phase 4: Standard Feedback Processing Service is implemented and manually verified.

Phase 5: Manual Entry Connector backend and frontend are implemented and manually verified.

Phase 6: Public Feedback Portal is implemented and manually verified.

Phase 7: QR-Code Feedback Submissions is implemented and manually verified.

Phase 8: Unified Feedback Inbox backend and frontend are implemented. A feedback-details drawer layout and responsiveness repair has also been implemented for the All Feedback page. Full manual verification is still pending.

Phase 9: Feedback Details and Workflow backend and frontend are implemented. Status tracking (NEW, IN_REVIEW, RESOLVED, CLOSED), controlled status transitions, private internal notes, and an append-only activity timeline are implemented. The Phase 9 migration is applied. Full manual verification is still pending.

Phase 10: Assignment, Categories, and Priorities backend and frontend are implemented. The Phase 10 migration is applied. Core manual assignment, category, priority, role, branch, responsive, and dark-mode workflows have passed manual testing. Full verification remains pending because cross-business tenant-isolation, platform-administrator access, concurrency, failure-handling, final regression, and final security checks are deferred until after Phase 20.

Phase 11: Customer Profiles backend, frontend, database, security, and documentation implementation is complete. Migration `20260726110000_phase_11_customer_profiles` is applied locally. Manual verification is still pending. Customer profiles remain separate from immutable `Feedback` customer snapshot fields.

Phase 12: Full Search and Filters backend and frontend implementation is complete. Manual verification is still pending. The user plans to manually test Phases 11 and 12 together.

Phase 13: AI Sentiment Analysis, Categorization, and Summaries backend, frontend, database, security, and documentation implementation is complete. Migration `20260727083000_phase_13_ai_feedback_analysis` is applied locally. Manual verification is still pending.

Phase 13 manual AI retry has been repaired so user-triggered Retry resets automatic retry eligibility, keeps the previous generated AI review visible while a replacement is pending or if the latest retry fails, and disables Retry while an analysis is already queued or processing. Manual verification is still pending.

Phase 14: Automation Rules Engine backend, frontend, database, worker, security, tests, and documentation implementation is complete. Migration `20260727091241_phase_14_automation_rules` and follow-up migration `20260727143000_phase_14_field_source_backfill` are applied locally. Manual verification is still pending. The current plan is to manually test Phases 11, 12, 13, and 14 together.

Phase 20: Connector Framework and Demo Synchronization backend, frontend, database, worker hook, tests, and documentation implementation is complete. Migration `20260803090000_phase_20_connector_framework_demo_sync` is applied locally. The implementation is Demo Mode-only, clearly discloses simulated external data, uses the Phase 4 feedback-processing service for imports, and avoids direct `Feedback` inserts, provider credentials, live provider APIs, webhooks, public simulator routes, scheduled provider polling, and Phase 21 through Phase 25 behavior. The integrations page has been rebuilt with the approved premium reference hierarchy, friendly labels, provider cards, summary/activity panels, run history, and Connect Demo/result states. Manual verification is still pending.

Phase 21: Live Email Integration is implemented for the Gmail-only OAuth MVP. Migration `20260805090000_phase_21_live_email_gmail_oauth` is applied locally. The implementation adds one Live Email connection per Business, one default active Branch, Demo/Live Email coexistence by mode, Gmail OAuth PKCE flow state, encrypted backend-only credentials, Inbox-only manual synchronization, latest-20 initial import, Gmail history-ID incremental cursor, provider-ID/Message-ID deduplication, metadata-only attachments, plain-text-only imported Feedback messages, safe Live Email inbox metadata, and reuse of the Phase 20 connector framework plus Phase 4 feedback-processing service. The user reported that real Gmail OAuth configuration, real Gmail connection, first real Gmail synchronization, imported Gmail feedback visibility in Unified Inbox, and a duplicate-safe incremental second sync have passed core manual verification. Exhaustive Phase 21 security/regression verification remains pending.

Phase 22: Live WhatsApp Cloud API Meta test-number inbound webhook MVP is implemented. Migration `20260810120000_phase_22_live_whatsapp_cloud_api` is applied locally. Manual Meta test-number/browser verification is still pending.

Phase 23: Live Outlook / Microsoft Email inbound OAuth MVP is implemented. Migration `20260810170000_phase_23_live_outlook_email` is applied locally. Manual real Outlook OAuth/browser synchronization verification is still pending.

Phase 24: Live Facebook + Instagram Meta Social Feedback Webhook Integration MVP is implemented for inbound comments only. No Prisma migration was required. Manual Meta/browser verification is still pending; live Google Reviews, X, replies, DMs, publishing, media download, moderation, multiple social accounts, and production social OAuth onboarding remain deferred.

Phase 25: Platform Administrator Dashboard & Reporting is implemented. Platform Administrators now land on `/admin` and have functional platform-wide Dashboard, Businesses, Users, Feedback, Integrations, Reports, and System Health pages backed by real database data. Phase 25.4 supersedes the original nine-report catalog with exactly three supervisor-focused reports that generate on demand as PDF or CSV. No report history/files are persisted and no Prisma migration was required. Manual browser/report verification remains pending.

Phase 24 Meta application publishing support is implemented with public backend legal pages at `GET /privacy`, `GET /terms`, and `GET /data-deletion`. They are served directly by Express on port 5000 without authentication, frontend routing, database queries, tracking, or external page dependencies, so the current Cloudflare tunnel can expose them to Meta. Automated HTTP tests pass; manual tunnel/public URL verification remains pending with the user.

The Phase 24 Meta webhook GET verification blocker is repaired. `GET /api/integrations/meta/webhook` returns the exact challenge for the existing configured verify token without requiring a raw body, signature header, or database operation; invalid/missing verification input is handled as controlled 4xx responses. Signed Facebook/Instagram POST delivery and the existing Phase 22 WhatsApp webhook security path are unchanged. Manual localhost and Meta callback retesting remain pending.

The shared Meta POST WhatsApp dispatch blocker is repaired. Signed `whatsapp_business_account` payloads sent to `/api/integrations/meta/webhook` now dispatch to the existing Phase 22 WhatsApp processor after raw-body HMAC validation, while signed Facebook Page and Instagram payloads remain on the Phase 24 social processor. WhatsApp connection lookup now matches the signed WABA ID when present together with the phone-number ID. Automated import, duplicate-replay, media-skip, signature, GET-challenge, and social regression tests pass; manual signed webhook and Inbox verification remain pending.

The user has reported core supervisor-facing checks passed for Phase 11 Customer creation/profile, Phase 12 search/filter persistence, Phase 13 AI configuration readiness, and Phase 14 rule creation/activation. Exhaustive manual verification remains pending, so Phases 11 through 14 are not marked fully manually verified.

Role-based authenticated landing sends platform administrators to `/admin`, business owners and staff through `/business`, and customers to `/account`. Protected-route return redirects are preserved, and root/error fallbacks use the same destination map. Manual browser verification is still pending.

The business setup form has been repaired with visible required-field markers, placeholders for every setup field, and frontend validation aligned with backend rules for primary branch code and optional primary branch contact fields. Manual browser verification is still pending.

The customer create/edit modal has been repaired so React Hook Form captures filled input values correctly, and all customer modal fields now include placeholders. Manual browser verification is still pending.

The Feedback Inbox filter display has been repaired so `/business/:businessId/feedback` uses a compact primary toolbar and advanced filter popover with shadcn-style Radix dropdowns. All Phase 12 filters, URL state, active chips, and backend filter behavior are preserved. Manual browser verification is still pending.

Workspace dropdowns and date inputs have been standardized: remaining native frontend select/option controls now use shared shadcn-style Radix selects, and native date/datetime-local controls now use a shared popover calendar/date-time field. Submitted values, URL filter keys, and backend behavior are preserved. Manual browser verification is still pending.

The Customer list filter display has been repaired so `/business/:businessId/customers` uses a compact primary toolbar, advanced filter popover, and wider desktop-table breakpoint to keep controls and row actions reachable at zoomed and narrower layouts. URL state and backend customer filtering behavior are preserved. Manual browser verification is still pending.

The Automation builder row layout has been repaired so `/business/:businessId/automations` condition/action controls and move/delete buttons wrap cleanly instead of squeezing long selected labels such as `Less Than Or Equal`. Automation rule behavior and backend execution are preserved. Manual browser verification is still pending.

Automation draft creation has been repaired so stale condition/action target fields are cleared before submit and normalized again on the backend before validation and persistence. Empty or irrelevant category/member/branch IDs no longer reach Prisma foreign keys as backend 500 errors. Manual browser verification is still pending.

Automation management UX has been repaired so successful new-rule creation resets the builder with a success notice, duplicate/delete actions use confirmation dialogs, archived rules can be restored as drafts or permanently deleted after archive, and Review and test uses a feedback picker instead of a raw feedback ID. Manual browser verification is still pending.

Automation rule selection and feedback picking have been improved so clicking a saved rule row/card body loads it into the builder, action buttons are excluded from selection, and Review and test feedback search/pagination uses backend-filtered feedback results. Manual browser verification is still pending.

Portal sidebar fixed-scroll behavior was reverted at the user's request, so business workspace and account portal sidebars scroll together with page content again. Business and account sidebars still include bottom Sign out actions, the account mobile menu opens a real drawer with logout, and the admin shell has a header Sign out action because it has no sidebar. Manual browser verification is still pending.

The Branch form has been repaired so `/business/:businessId/branches/new` shows required-field `*` markers, placeholders on every input, and responsive save/back action alignment. Branch API behavior and backend authorization are preserved. Manual browser verification is still pending.

The shared Business workspace header has been repaired so workspace controls and page action buttons stay side-by-side on tablet/desktop where space allows, with a tighter active-business selector and clean mobile stacking. Business switching, routing, customer queries, and backend authorization are preserved. Manual browser verification is still pending.

Implemented in Phase 2A:

- Email/password registration and login.
- `PLATFORM_ADMIN`, `BUSINESS_OWNER`, `STAFF`, and `CUSTOMER` roles.
- Public self-registration for `BUSINESS_OWNER` and `CUSTOMER` only.
- JWT access and refresh tokens in HttpOnly cookies.
- Refresh-token rotation with database-backed sessions.
- Logout, logout-all, session listing, and session revocation.
- Current-user endpoint.
- Backend authentication and role middleware.
- Frontend login, registration, account, protected-route, public-only-route, and role-guard foundations.
- Shared frontend default authenticated destination helper for role-based post-login landing.

Implemented in Phase 2B:

- Google registration for new `BUSINESS_OWNER` and `CUSTOMER` users.
- Google login for already-linked Google identities.
- Explicit authenticated Google account linking from `/account`.
- External account storage using Google `sub`, not email, as the permanent identifier.
- Duplicate-account prevention and no automatic email-based linking.
- Google-only account support with `passwordHash = null`.
- Safe auth-method status on the account page.

Implemented in Phase 2C:

- Email verification for new password registrations.
- Verification-email resend and confirmation.
- Provider-independent SMTP delivery through Nodemailer.
- Forgot-password and password-reset flows.
- Hashed, single-use, expiring account tokens.
- Full session revocation after password reset.
- Frontend routes for verification pending, verify email, forgot password, and reset password.
- Legacy migration strategy that keeps existing password users verified.

Implemented in the Phase 2 login-page redesign:

- Premium split `/login` layout inspired by the requested `frontend/references/login-page-design.png` direction from the attached task brief.
- Native React/Tailwind analytics and customer-feedback illustration area.
- Global class-based light/dark theme support with CSS variable tokens.
- Visible login-page theme toggle with local preference persistence and system-theme fallback on first visit.
- Reusable auth UI components for alert states, primary buttons, brand mark, auth card surface, password visibility, security note, and login illustration.
- Visual refinement against the approved reference, including a centered rounded outer stage, explicit headline line breaks, floating analytics/review cards, refined security-note layout, and phone-like mobile proportions.
- Focused login form proportion correction with a roughly 60/40 desktop split, a 440-460px desktop form-card width band, larger login-only fields and buttons, a wider responsive Google credential control, stronger form typography, improved spacing, and light/dark card contrast refinements.
- Preserved email/password login, Google login, forgot-password navigation, create-account navigation, original-route redirect, unverified-email handling, verification/reset success messages, loading states, validation errors, backend login errors, auth store updates, and public-only route behavior.

Implemented in the Phase 2 authentication/account premium redesign:

- Premium reference-driven redesigns for `/register`, `/verify-email-pending`, `/verify-email`, `/forgot-password`, `/reset-password`, `/password-reset-success`, `/account`, and `/account/sessions`.
- Shared `PremiumAuthShell` for public auth pages and `AccountShell` for protected account/settings pages.
- Larger, more comfortable forms, role selection cards, verification and reset confirmation states, security notes, account profile overview, sign-in method status, recent activity, active-session summary, and dedicated active-session management.
- Native React/Tailwind/Lucide translations of `frontend/references/01-register.png` through `frontend/references/08-active-sessions.png`.
- Preserved existing Phase 2A, Phase 2B, and Phase 2C auth/account behavior without changing backend API contracts.

Implemented in the public website pass before Phase 3:

- Public pages for Home, Features, How It Works, About, Contact, Privacy Policy, and Terms of Service.
- Routes for `/`, `/features`, `/how-it-works`, `/about`, `/contact`, `/privacy-policy`, and `/terms-of-service`.
- A shared public layout with sticky navigation, active route states, keyboard-accessible mobile menu, scroll locking while the mobile menu is open, theme toggle, login and register calls to action, and shared footer.
- Native React/Tailwind/Lucide translations of the approved public references `frontend/references/01-home.png` through `frontend/references/08-terms-of-service.png`.
- Lightweight document titles and meta descriptions per public page.
- Product-truthfulness labels that distinguish available authentication features from planned feedback, AI, workflow, reporting, and integration features.
- No checkout, payment processing, active subscription billing, pricing page, or binding commercial pricing is included.
- A validated Contact page using React Hook Form and Zod. Direct form delivery is not configured because no backend contact endpoint or public inbox is documented.
- Draft Privacy Policy and Terms of Service pages grounded in the current architecture and requiring professional legal review before production launch.

Implemented in Phase 3:

- Prisma models and enums for businesses, branches, business memberships, membership branch access, staff invitations, and staff invitation branch access.
- Transactional business onboarding that creates the business, primary branch, owner membership, and owner all-branch access together.
- Business workspace APIs, business switching data, settings updates, suspended-business blocking, and active-membership enforcement.
- Branch list, create, edit, details, set-primary, activate, deactivate, status badges, branch staff counts, and branch-access checks.
- Staff membership list, details, role/status management, owner/admin protections, branch assignment, and tenant-scoped membership authorization.
- Staff invitations with SMTP delivery, hashed tokens, resend token rotation, cancellation, preview, current-session acceptance, new password-account acceptance, and safe Google acceptance.
- Platform administrator business oversight routes for listing, details, suspension, and reactivation.
- Responsive premium workspace, invitation-acceptance, and admin pages based on the Phase 3 references.

Implemented in Phase 4:

- Standard internal feedback-processing service for future sources.
- Prisma `FeedbackChannel` and `FeedbackIngestionStatus` enums.
- Prisma `FeedbackIngestion`, `Feedback`, and `FeedbackAttachment` models related to existing Phase 3 businesses and branches.
- Normalized feedback input contract with Zod validation.
- Deterministic normalization for messages, optional strings, email casing, language codes, timestamps, metadata, and attachments.
- Active business validation, active branch validation, cross-business branch rejection, and active primary-branch fallback when `branchId` is omitted.
- Canonical SHA-256 payload hashing with stable object-key ordering.
- Idempotency protection scoped by `businessId`, `channel`, and `idempotencyKey`.
- External source duplicate protection scoped by `businessId`, `channel`, and `externalId`.
- Transactional feedback and attachment-metadata persistence.
- Safe `FAILED` ingestion tracking after a processing row has been created.
- Future connector-adapter interface foundation.
- Local dry-run/commit simulation helper that reuses the real service.

Implemented in Phase 5 backend:

- Authenticated endpoint `POST /api/businesses/:businessId/feedback/manual`.
- Required `Idempotency-Key` header for manual submissions.
- Request validation for explicit `branchId`, message, rating, occurred datetime, language code, customer snapshot, manual source type, source note/reference/source URL, and metadata-only attachments.
- Manual source types: `PHONE_CALL`, `IN_PERSON`, `SUGGESTION_BOX`, `SMS`, `EMAIL_COPY`, `SOCIAL_MEDIA_COPY`, and `OTHER`.
- `ManualFeedbackSourceAdapter` that maps manual submissions into Phase 4 `NormalizedFeedbackInput` with `FeedbackChannel.MANUAL`.
- Phase 4 processing service reuse for normalization, canonical SHA-256 payload hashing, idempotency duplicate returns, idempotency conflicts, transactional persistence, attachment metadata persistence, and safe failed-ingestion behavior.
- Business membership authorization for `OWNER`, `ADMIN`, `MANAGER`, and `STAFF`, with manager/staff branch-access enforcement.
- Suspended membership, removed membership, suspended business, inactive branch, cross-business branch, and no-membership blocking.
- Focused manual-feedback rate limit of 120 submissions per 15 minutes per authenticated user and route business.
- Safe response shape that excludes customer PII, source metadata, actor IDs, payload hashes, Prisma records, and stack traces.

Implemented in Phase 5 frontend:

- Protected workspace route `/business/:businessId/feedback/manual`.
- Reference-led Add customer feedback page using the approved Phase 5 primary and states boards.
- Six-section manual-entry form for location/source, feedback content, customer snapshot, source details, attachment references, and review/submit.
- Right-side submission summary and privacy/security panel.
- Loading, empty active-branch, validation, success, duplicate, and API-error states.
- Client-side validation for the manual-entry API contract and metadata-only attachment references.
- API submission with a generated `Idempotency-Key` header and safe response parsing.
- Feedback sidebar group with Add Feedback navigation and disabled All Feedback placeholder until later inbox/listing phases.

Implemented in Phase 6:

- Public feedback portal settings on each business with secure disabled-by-default behavior.
- Owner/Admin workspace controls at `/business/:businessId/settings` to enable/disable the portal, edit the welcome message, copy/open the public link, and regenerate the link after confirmation.
- Stable public URL format: `/feedback/:portalToken`.
- Authenticated settings endpoints and unauthenticated public configuration/submission endpoints.
- Public feedback submissions without login.
- Active branch selection, required rating, required message, optional date, optional customer contact details, and optional follow-up permission.
- Required frontend-generated `Idempotency-Key` header, duplicate handling, and conflict handling through the Phase 4 processing service.
- Safe business logo display with initials fallback when a logo URL is missing, blank, invalid, or fails to load.
- `PublicFeedbackSourceAdapter` using `FeedbackChannel.PUBLIC_FORM`.
- Public rate limiting, honeypot handling, disabled/not-found/no-active-branches states, success state, duplicate state, light/dark mode, and responsive mobile layout.
- No attachments, Unified Inbox, feedback-management workflow, customer profiles, AI, reports, notifications, or external integrations.

Implemented in Phase 7:

- Managed QR-code records for the Phase 6 public feedback portal.
- Protected workspace route `/business/:businessId/feedback/qr-codes`.
- Authenticated QR-code management endpoints for list, create, rename, regenerate, and disable.
- Business-wide and branch-specific QR codes, with branch-specific public forms locked to the backend `fixedBranchId`.
- Stable public QR URL format: `/feedback/qr/:qrToken`.
- Public QR configuration and submission endpoints without login.
- QR submissions processed through `QrFeedbackSourceAdapter` and stored as `FeedbackChannel.QR_CODE`.
- Required frontend-generated `Idempotency-Key` header, duplicate handling, and conflict handling through the Phase 4 processing service.
- QR token rotation, stale-link protection after Phase 6 portal token regeneration, inactive QR handling, disabled portal handling, and safe unavailable states.
- Browser-generated QR preview, PNG download, and print sheet without backend QR image storage.
- Owner/Admin management controls, manager view-only branch-aware access, and shared workspace navigation.
- QR management records with reachable desktop sticky actions and stacked tablet/mobile cards for copy/open, PNG download, print, regenerate, and disable controls.
- No public attachments, QR scan analytics, Unified Inbox, feedback-management workflow, customer profiles, AI, reports, notifications, or external integrations.

Implemented in Phase 11:

- Prisma `CustomerStatus`, `Customer`, `CustomerActivityType`, `CustomerActivity`, and nullable `Feedback.customerId`.
- Business-scoped customer profiles with immutable feedback customer snapshots preserved.
- No historical customer backfill; existing feedback remains unlinked after migration.
- Customer list with search, pagination, status filtering, sorting, responsive table/cards, branch-safe aggregates, and owner/admin manual customer creation.
- Customer details route with profile header, branch-safe feedback summary, linked feedback history, owner/admin edit/archive/reactivate, and owner/admin customer activity.
- Feedback drawer customer section showing submitted customer snapshot separately from linked customer profile.
- Owner/admin/manager feedback link, change, unlink, and create-from-feedback actions; staff read-only customer link access.
- Deterministic exact email/phone matching with human-reviewed possible-match groups. Fuzzy matching, AI matching, name-only automatic linking, merge, notes, follow-up consent, and preferred contact method are not implemented.
- Non-blocking ingestion auto-linking through `FeedbackProcessingService` after new feedback persistence.
- Final Phase 11 design references: `frontend/references/phase11-customer-profiles-primary.png` and `frontend/references/phase11-customer-profiles-states.png`.

Implemented in Phase 12:

- Shared safe backend search normalization for trimmed, whitespace-collapsed, null-byte-safe, length-capped search with email and phone lookup normalization.
- Expanded Feedback Inbox search across feedback title/message, submitted customer snapshots, and linked Customer identity fields.
- Feedback Inbox filters for branch, status, channel, assignee, assignment state, category, category state, priority, rating exact/min/max/unrated, received-date preset/custom range, and linked/unlinked Customer state.
- Feedback Inbox filter presentation now keeps common filters aligned in a compact toolbar and places advanced filters in a styled popover, without removing any filter behavior.
- Feedback Inbox sorting and date filters now use `Feedback.receivedAt`.
- Customer list filters for search, status, linked-feedback branch/channel/rating/latest-date range, and contact state.
- Customer list filter presentation now keeps search/status/branch/sort aligned in a compact toolbar, places secondary filters in a styled popover, and keeps card layout available on narrower or zoomed widths.
- Shared workspace header presentation now gives the active-business selector a tighter width and keeps page action buttons aligned in a row on tablet/desktop where space allows.
- Customer `latestFeedback` sorting now uses branch-safe accessible linked feedback dates.
- Customer feedback history now has URL-backed search, filters, sort, and pagination.
- Active filter chips, remove-one-filter behavior, clear-all behavior, controlled URL-synchronized search, and responsive filter controls.
- Confirmed no Prisma schema change, migration, package, external search service, AI/fuzzy/semantic search, saved views, exports, reports, notifications, customer accounts, Phase 13 work, or Phase 20 work was added.

Implemented in Phase 13:

- Backend-only Gemini provider integration through `@google/genai`, guarded by `AI_ANALYSIS_ENABLED`, `GEMINI_API_KEY`, model, timeout, retry, backfill, and daily-limit environment variables.
- Centralized AI-analysis service, provider abstraction, strict structured output validation, prompt-injection boundaries, input minimization, truncation/fingerprinting, sanitized errors, and a database-backed worker.
- Prisma `FeedbackAIAnalysisStatus`, `FeedbackAISentiment`, and `FeedbackAIAnalysis` model through migration `20260727083000_phase_13_ai_feedback_analysis`.
- Non-blocking analysis scheduling after Phase 4 feedback persistence without provider calls from source adapters.
- Sentiment, confidence, detected language, concise summary, suggested active category, retry state, and safe application/dismissal metadata.
- AI sentiment/status/suggestion-state filters in the Phase 12 inbox, AI badges in desktop/mobile feedback lists, an AI analysis panel in the feedback drawer, and owner/admin-only AI status/backfill controls in Business Settings.
- Human override protection: existing human categories are not overwritten by AI suggestions, retries, or delayed worker results.
- Focused automated tests for AI output validation, input preparation/truncation, lifecycle policy, retry/error classification, daily-limit boundaries, and prompt construction.
- Final Phase 13 design references: `frontend/references/phase13-ai-analysis-primary.png` and `frontend/references/phase13-ai-analysis-states.png`.

Implemented in Phase 14:

- Automation Rules Engine backend, frontend, database, worker, security, tests, and documentation scope.
- Owner/admin-only rule management, lifecycle controls, preview/manual-run actions, URL-backed list filters, execution history, and automation-aware feedback activity rendering.
- Rule builder condition/action rows now use responsive container-aware layout and single-line selected values so long labels and row controls remain usable at zoomed and narrower widths.
- Rule definition normalization now clears stale or blank condition/action target IDs on frontend submit and backend create/update before validation and database persistence.
- Rule creation now clears the builder after successful create, duplicate/delete use confirmation dialogs, archived rules can be restored as drafts or permanently deleted after archive, and Review and test uses an accessible feedback picker.
- Saved rule rows/cards now load the rule into the builder from the broad clickable area except action controls, and the Review and test feedback picker searches/paginates through the existing backend feedback-list query.

Phase 13 manual verification remains pending. Phase 14 Automation Rules Engine implementation is complete and manual verification remains pending. Phases 11, 12, 13, and 14 are planned to be manually tested together.

Not implemented yet:

- Phase 11, Phase 12, Phase 13, and Phase 14 manual verification, notifications, replies, Business Owner analytics/reporting expansion, customer accounts, payments, business deletion, ownership transfer, and remaining external integrations. Phase 25 Platform Administrator analytics/reports are implemented. Phases 8, 9, and 10 are implemented and core manual workflows passed, but they must not be marked fully verified until deferred post-Phase-20 multi-tenant/security/regression checks pass.

## Future Integrations and Synchronization Roadmap

Real external synchronization with providers such as WhatsApp Business, Google Reviews, X, Facebook, Instagram, and Email is deferred because live connectivity depends on provider API approval, OAuth or credential setup, token refresh, webhook or polling infrastructure, rate limits, provider permissions, and provider availability.

The approved strategy is to implement a professional Phase 20 demo synchronization framework before live provider work. Phase 20 must be clearly labeled as Demo Mode, simulated external data, and not connected to the real provider. The demo proves the connector architecture without falsely claiming production provider connectivity.

Approved demo synchronization flow:

```text
Customer creates feedback in a provider simulator
-> simulated provider stores the source item
-> demo connector reads the item
-> provider adapter converts it to NormalizedFeedbackInput
-> existing Phase 4 FeedbackProcessingService validates, normalizes, deduplicates, and persists it
-> imported feedback appears in the unified inbox
-> the original source remains visible
```

Demo connectors must use the real Phase 4 ingestion pipeline and must not insert directly into the `Feedback` table. The external provider call is simulated; internal normalization, deduplication, processing, storage, and inbox display are real.

Planned provider simulators:

- Google Reviews: reviewer name, star rating, review text, business location, and publish review.
- WhatsApp: customer name, customer phone, business branch, conversation or message, and send message.
- Email: sender name, sender email, subject, message body, optional attachment metadata, and send email.
- X: display name, handle, post text, mention or reply type, and publish post.
- Facebook and Instagram: commenter name, page/post/media context, comment or direct-message text, and publish item.

The deadline-oriented implementation should prioritize Google Reviews, WhatsApp, and Email. X, Facebook, and Instagram may start as lighter simulators or source previews if time is limited.

Each integration workspace should include a provider-inspired source preview inside this application's own design system. These views should not copy provider interfaces pixel-for-pixel, but should show provider-specific source details such as reviewer or sender, rating or post type, original text, location or branch, posted/received date, attachment indicator where relevant, import status, and whether the item is in Demo Mode.

Planned synchronization workspace behavior includes connecting and disconnecting a demo source, syncing now, optional simulated automatic sync, viewing provider source items, importing one item, importing selected items, importing all new items, showing last sync time, connection health, imported item count, sync history, retrying failed imports, and opening imported feedback in the unified inbox. Planned source item states are Not imported, Pending, Imported, Duplicate, Skipped, Failed, and Retrying.

Imported feedback should preserve safe tenant-scoped source metadata where relevant: provider, Demo Mode, original author, original rating, original post/message date, external source item ID, imported date, source location or branch, connection name, source type, and original preview. Synchronization internals must not be exposed through public routes.

Revised later roadmap:

- Phase 20 - Connector Framework and Demo Synchronization: shared connector architecture, demo and live connection modes, provider simulators, source preview lists, manual sync, optional simulated automatic sync, sync history, connection health, retry flow, real Phase 4 ingestion, and source details in the inbox.
- Phase 21 - Live Email Synchronization: Gmail-only OAuth MVP implemented with bounded Inbox import, encrypted credentials, metadata-only attachments, and core real Gmail connection/synchronization reported passed by the user; exhaustive security/regression verification and IMAP remain pending/deferred.
- Phase 22 - Live WhatsApp Cloud API: Meta test-number inbound text webhook MVP implemented with signature validation, phone-number-ID tenant resolution, encrypted Meta token storage, safe webhook activity, and Unified Inbox import; manual Meta test-number/browser verification pending.
- Phase 23 - Live Outlook Synchronization: Microsoft Graph OAuth inbound-only MVP implemented with bounded Inbox import, encrypted credentials, metadata-only attachments, Gmail/Outlook coexistence, and delta cursor support; manual real Outlook OAuth/browser synchronization verification pending.
- Phase 24 - Live Google Reviews and Social Media Synchronization: Live Facebook and Instagram inbound comment webhook MVP implemented; manual Meta/browser verification pending. Live Google Business Profile, X, replies, DMs, publishing, media download, moderation, multiple social accounts, and production social OAuth onboarding remain deferred.
- Phase 25 - Platform Administrator Dashboard & Reporting: implemented; manual browser/report verification pending.
- Phase 26 - Integration Monitoring and Recovery: connector health monitoring, expired token handling, retry queues, provider outage recovery, webhook health, rate-limit handling, synchronization alerts, failed-run recovery, and long-term reliability.

Phase 20 is the demonstration phase. Phase 21 Gmail Live Email implementation is complete and the user reported the core real Gmail connection/synchronization workflow passed, while exhaustive security/regression verification remains pending. Phase 22 Live WhatsApp Cloud API implementation is complete for the Meta test-number inbound webhook MVP, while manual Meta test-number/browser verification remains pending. Phase 23 Outlook/Microsoft Graph Live Email implementation is complete, while manual real Outlook OAuth/browser synchronization verification remains pending. Phase 24 Live Facebook and Instagram comment webhook implementation is complete, while manual Meta/browser verification remains pending. Phase 4 remains the shared ingestion, normalization, deduplication, and persistence foundation, and Phase 8 remains the unified inbox that displays imported feedback.

## Technology Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Axios, Zustand, React Hook Form, Zod, Lucide React, @react-oauth/google, qrcode
- Backend: Node.js, Express, TypeScript, Prisma ORM, MySQL-compatible database, REST API, Zod, Pino, Helmet, CORS, cookie-parser, express-rate-limit, Argon2id, JSON Web Tokens, google-auth-library, googleapis, html-to-text, Nodemailer
- Development: npm workspaces, ESLint, Prettier, tsx, concurrently, strict TypeScript

## Repository Structure

```text
backend/
  prisma/migrations
  prisma/schema.prisma
  prisma/seed.ts
  src/config
  src/lib
  src/middleware
  src/modules/auth
  src/modules/businesses
  src/modules/feedback-processing
  src/modules/health
  src/modules/manual-feedback
  src/scripts
  src/types
  src/utils
  src/app.ts
  src/server.ts
frontend/
  src/api
  src/app
  src/app/theme
  src/components
  src/features/auth
  src/features/businesses
  src/features/health
  src/features/public
  src/hooks
  src/lib
  src/routes
  src/store
  src/types
AGENTS.md
ARCHITECTURE.md
API_NOTES.md
DATABASE_NOTES.md
DEPLOYMENT.md
SECURITY_NOTES.md
IMPLEMENTATION_STATUS.md
NEXT_STEPS.md
CHANGELOG.md
README.md
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- XAMPP with MySQL/MariaDB

Docker is not required and is not used.

## XAMPP and MySQL Setup

1. Open the XAMPP Control Panel.
2. Start MySQL.
3. Open phpMyAdmin:

```text
http://localhost/phpmyadmin
```

4. Create a database named:

```text
sme_feedback_aggregator
```

The default local connection example assumes username `root`, an empty password, and port `3306`.

## Environment Setup

Create local environment files from the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend example:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
DATABASE_URL="mysql://root:@localhost:3306/sme_feedback_aggregator"
LOG_LEVEL=info
JWT_ACCESS_SECRET=replace-with-at-least-32-characters-access-secret
JWT_REFRESH_SECRET=replace-with-at-least-32-characters-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
# COOKIE_DOMAIN=
GOOGLE_AUTH_ENABLED=false
GOOGLE_CLIENT_ID=
EMAIL_ENABLED=false
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM_NAME="SME Feedback Aggregator"
EMAIL_FROM_ADDRESS=
APP_FRONTEND_URL=http://localhost:5173
EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_MINUTES=1440
PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES=30
STAFF_INVITATION_EXPIRES_IN_HOURS=48
PLATFORM_ADMIN_EMAIL=platform-admin@example.com
PLATFORM_ADMIN_PASSWORD=replace-with-a-local-platform-admin-password
PLATFORM_ADMIN_FIRST_NAME=Platform
PLATFORM_ADMIN_LAST_NAME=Admin
```

Frontend example:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=
```

Real `.env` files are ignored by Git. Do not commit real JWT secrets, database credentials, seed passwords, Google client IDs, SMTP usernames, or SMTP passwords.

## Google Authentication Setup

Google auth is disabled by default so email/password auth keeps working before credentials are configured.

Manual Google Cloud setup:

1. Create or select a Google Cloud project.
2. Configure Google authentication branding and consent information.
3. Create an OAuth 2.0 Client ID of type Web application.
4. Add this local authorized JavaScript origin:

```text
http://localhost:5173
```

5. Add production frontend origins later when deployment begins.
6. Copy the Web client ID into:

```env
# backend/.env
GOOGLE_AUTH_ENABLED=true
GOOGLE_CLIENT_ID=your-google-web-client-id
```

```env
# frontend/.env
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id
```

7. Restart frontend and backend after environment changes.

The same Web client ID should normally be used for `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. A Google client secret is not required for this ID-token verification flow.

Use `localhost` consistently for local setup because Google authorized JavaScript origins and backend CORS depend on exact origins.

## Email Verification and Password Reset Setup

Email delivery is disabled by default so the backend can start before SMTP is configured:

```env
EMAIL_ENABLED=false
```

With email disabled, existing login and Google authentication continue working. New password registration, verification resend, and forgot-password requests return a safe `EMAIL_DELIVERY_NOT_CONFIGURED` error.

To test Phase 2C locally, configure a standard SMTP account in `backend/.env`:

```env
EMAIL_ENABLED=true
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM_NAME="SME Feedback Aggregator"
EMAIL_FROM_ADDRESS=no-reply@example.com
APP_FRONTEND_URL=http://localhost:5173
EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_MINUTES=1440
PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES=30
STAFF_INVITATION_EXPIRES_IN_HOURS=48
```

Restart the backend after changing email variables. The verification link uses `/verify-email?token=...`; the reset link uses `/reset-password?token=...`; staff invitations use `/invitations/accept?token=...`.

## Installation

```bash
npm install
```

## Prisma Setup

Validate the schema:

```bash
npm run prisma:validate
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Apply migrations locally:

```bash
npm run prisma:migrate
```

The Phase 2A migration is:

```text
backend/prisma/migrations/20260720120942_phase_2a_auth_foundation/migration.sql
```

The Phase 2B migration is:

```text
backend/prisma/migrations/20260721061424_phase_2b_google_auth/migration.sql
```

The Phase 2C migration is:

```text
backend/prisma/migrations/20260721074742_phase_2c_email_verification_password_reset/migration.sql
```

The Phase 3 migration is:

```text
backend/prisma/migrations/20260722135525_phase_3_businesses_branches_staff/migration.sql
```

The Phase 4 migration is:

```text
backend/prisma/migrations/20260722150908_phase_4_standard_feedback_processing/migration.sql
```

The Phase 6 migration is:

```text
backend/prisma/migrations/20260724120000_phase_6_public_feedback_portal/migration.sql
```

The Phase 7 migration is:

```text
backend/prisma/migrations/20260724130000_phase_7_qr_feedback_submissions/migration.sql
```

The Phase 9 migration is:

```text
backend/prisma/migrations/20260725141331_phase_9_feedback_workflow/migration.sql
```

The Phase 10 migration is:

```text
backend/prisma/migrations/20260725162942_phase_10_assignment_categories_priorities/migration.sql
```

Phase 10 adds single-assignee ownership, business-scoped categories, and four-level priority workflow to the existing inbox/detail surfaces.

- Inbox list filters now include assignee (`me`, `unassigned`, or active member), category, and priority.
- Inbox list and detail responses include safe assignee, category, and priority fields.
- Detail workflow controls support eligible assignee selection, unassignment, category assignment/unassignment, and priority updates.
- Business Settings includes category management for owners/admins; managers and staff can view active categories without management actions.
- Activity timeline entries record assignment, category, and priority changes with before/after snapshots.
- Existing feedback receives default priority `NORMAL`; assignment and category are nullable and preserve historical records when memberships/categories are removed.

Do not run destructive reset commands.

## Platform Administrator and Development Seed

Platform administrator accounts are not publicly registered. Configure the `PLATFORM_ADMIN_*` variables in `backend/.env`, then run:

```bash
npm run prisma:seed
```

If you prefer to run from the backend workspace:

```bash
cd backend
npm run prisma:seed
```

The seed normalizes the email, hashes the password with Argon2id, creates the account with the exact `PLATFORM_ADMIN` role and `ACTIVE` status, marks the email verified, avoids duplicate administrators, and never logs the plaintext password. A platform administrator is not automatically added to any business and does not receive a `BusinessMembership`.

If the configured email already belongs to a `PLATFORM_ADMIN`, the seed safely reconciles seed-managed account fields only when needed. If the email belongs to a non-admin user, the seed stops with a clear error rather than promoting that user.

Outside production, the same command also reconciles a comprehensive deterministic development dataset by default. Set `DEVELOPMENT_SEED_ENABLED=false` to skip it or set `DEVELOPMENT_SEED_PASSWORD` to replace the local-only default `DevOnlyPass123!`. The seed provides:

- Demo owner, administrator, manager, two staff accounts, a customer account, and a separate tenant-isolation owner, all using reserved `.test` emails.
- Two businesses, active/inactive branches, role and branch-access combinations, active/archived customers, categories, every feedback channel, all status and priority values, assignments, workflow history, public portal and QR fixtures.
- Completed, failed, skipped, and suggestion-oriented AI fixtures without provider calls; active/draft automation fixtures and execution history without starting workers.
- Six clearly labeled Demo Mode integrations with synchronization history. It creates no Live connection, provider credential, OAuth state, webhook delivery, or external provider request.

The fixture uses stable `dev_seed_*` IDs and record-level upserts, so repeated runs reconcile its own records without deleting unrelated local data. `NODE_ENV=production` always skips the comprehensive development dataset.

The representative local logins all use `DEVELOPMENT_SEED_PASSWORD`:

```text
owner@demo.sme.test
admin@demo.sme.test
manager@demo.sme.test
support@demo.sme.test
operations@demo.sme.test
customer@demo.sme.test
owner@isolation.sme.test
```

If the local database is corrupted and contains no valuable data, rebuild only `sme_feedback_aggregator` manually. Use the exact one-command-at-a-time runbook in `DATABASE_NOTES.md`; never use the drop command against a shared or production database, and do not use `prisma migrate reset`.

## Development Commands

Run backend and frontend together:

```bash
npm run dev
```

Run only the backend:

```bash
npm run dev -w backend
```

Run only the frontend:

```bash
npm run dev -w frontend
```

## Build and Quality Commands

```bash
npm run prisma:validate
npm run prisma:generate
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Local Feedback Processing Simulation

Phase 4 has no public or staff-facing feedback submission API. Use the local helper only for manual database/service verification:

```bash
npm run feedback:simulate -- --businessId=<id> --channel=MANUAL --idempotencyKey=<key> --message="Great service"
```

The command defaults to dry run and writes no data. Add `--commit` only when intentionally persisting local test feedback:

```bash
npm run feedback:simulate -- --businessId=<id> --branchId=<id> --channel=MANUAL --idempotencyKey=<key> --message="Great service" --commit
```

Attachment metadata can be supplied as a JSON array with `--attachments`. The helper passes this through the existing Phase 4 normalized input schema, keeps the 10-attachment limit, and stores metadata only when `--commit` is used. It does not download files, upload files, fetch external URLs, or add binary storage.

```bash
npm run feedback:simulate -- --businessId=<id> --branchId=<id> --channel=MANUAL --idempotencyKey=<key> --message="Great service" --attachments='[{"filename":"receipt.jpg","mimeType":"image/jpeg","sizeBytes":245000,"externalUrl":"https://example.com/receipt.jpg","checksum":"sha256-test-checksum","metadata":{"source":"manual-test"}}]' --commit
```

PowerShell can treat quotes and braces specially. Use `npm --%` for PowerShell-safe manual retests:

```powershell
npm --% run feedback:simulate -- --businessId=<id> --branchId=<id> --channel=MANUAL --idempotencyKey=<unique-key> --message="Great service" --attachments=[{"filename":"receipt.jpg","mimeType":"image/jpeg","sizeBytes":245000,"externalUrl":"https://example.com/receipt.jpg","checksum":"sha256-test-checksum","metadata":{"source":"manual-test"}}] --commit
```

The local-only failure simulation option is for development/manual verification only. It requires `--commit`, refuses to run when `NODE_ENV=production`, creates a `FeedbackIngestion`, then reuses the real processing failure path so the ingestion ends as `FAILED` without creating `Feedback` or `FeedbackAttachment` rows.

```powershell
npm --% run feedback:simulate -- --businessId=<id> --branchId=<id> --channel=MANUAL --idempotencyKey=<unique-failure-key> --message="Trigger local failure" --commit --simulateFailureAfterIngestion
```

The helper validates through the real `feedbackProcessingService`, resolves primary branches when `branchId` is omitted, and prints only safe identifiers/status fields or safe `FEEDBACK_*` errors.

## Public Backend Legal Pages

These standalone HTML pages require no login and are served directly by the backend:

```text
GET http://localhost:5000/privacy
GET http://localhost:5000/terms
GET http://localhost:5000/data-deletion
```

With the existing Cloudflare tunnel targeting `http://localhost:5000`, replace the local origin with the generated `https://*.trycloudflare.com` origin for Meta configuration. The pages cross-link to one another and use `thecominggreatone@gmail.com` as the application contact. They do not redirect to port 5173 or query the database.

## Health Endpoints

API health:

```text
GET http://localhost:5000/api/health
```

Database health:

```text
GET http://localhost:5000/api/health/database
```

The frontend status page is available at:

```text
http://localhost:5173/system-status
```

## Authentication Endpoints

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google/register
POST   /api/auth/google/login
POST   /api/auth/google/link
POST   /api/auth/email-verification/resend
POST   /api/auth/email-verification/confirm
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/logout-all
GET    /api/auth/me
GET    /api/auth/sessions
DELETE /api/auth/sessions/:sessionId
```

Auth tokens are set in HttpOnly cookies. The frontend never reads or stores JWTs.

Google registration and login use the same application session architecture as email/password auth. Google credentials are verified on the backend and are never persisted.

New password registrations must verify email before login. Password reset revokes all active sessions for that user and requires signing in again.

## Phase 3 Business Endpoints

```text
GET    /api/businesses/mine
POST   /api/businesses
GET    /api/businesses/:businessId
PATCH  /api/businesses/:businessId
GET    /api/businesses/:businessId/branches
POST   /api/businesses/:businessId/branches
GET    /api/businesses/:businessId/branches/:branchId
PATCH  /api/businesses/:businessId/branches/:branchId
POST   /api/businesses/:businessId/branches/:branchId/set-primary
POST   /api/businesses/:businessId/branches/:branchId/activate
POST   /api/businesses/:businessId/branches/:branchId/deactivate
GET    /api/businesses/:businessId/memberships
GET    /api/businesses/:businessId/memberships/:membershipId
PATCH  /api/businesses/:businessId/memberships/:membershipId/role
PUT    /api/businesses/:businessId/memberships/:membershipId/branch-access
POST   /api/businesses/:businessId/memberships/:membershipId/suspend
POST   /api/businesses/:businessId/memberships/:membershipId/reactivate
DELETE /api/businesses/:businessId/memberships/:membershipId
GET    /api/businesses/:businessId/invitations
POST   /api/businesses/:businessId/invitations
POST   /api/businesses/:businessId/invitations/:invitationId/resend
DELETE /api/businesses/:businessId/invitations/:invitationId
GET    /api/business-invitations/preview?token=<raw-token>
POST   /api/business-invitations/accept/session
POST   /api/business-invitations/accept/password
POST   /api/business-invitations/accept/google
GET    /api/admin/businesses
GET    /api/admin/businesses/:businessId
POST   /api/admin/businesses/:businessId/suspend
POST   /api/admin/businesses/:businessId/reactivate
GET    /api/admin/dashboard?period=7d|30d|90d|12m
GET    /api/admin/filter-options
GET    /api/admin/users
GET    /api/admin/feedback
GET    /api/admin/integrations
GET    /api/admin/system-health
POST   /api/admin/reports/preview
POST   /api/admin/reports/export
```

Business, branch, membership, and invitation management APIs require authenticated tenant access. Every Platform Administrator oversight, analytics, health, and report endpoint requires `PLATFORM_ADMIN`. Phase 25.4 reports support exactly Executive Platform, Feedback & Customer Experience, and Operations & System Health as PDF or CSV; former fragmented identifiers are rejected.

## Phase 4 Internal Feedback Processing

No Phase 4 backend route is mounted. Future connectors should import and call:

```ts
feedbackProcessingService.process(input);
```

The processing pipeline is:

```text
Receive normalized source input
-> validate and normalize input
-> validate active business and active branch
-> fall back to active primary branch when branchId is omitted
-> hash the canonical normalized payload
-> check idempotency and external-source duplicates
-> create PROCESSING ingestion
-> transactionally create feedback and attachment metadata
-> mark ingestion COMPLETED
-> return feedbackId, ingestionId, businessId, branchId, channel, created, duplicate, processedAt
```

Feedback stores optional customer snapshot fields directly on the row: `customerName`, `customerEmail`, and `customerPhone`. Full customer profiles are deferred.

Attachment support is metadata-only in Phase 4. No binary upload, download, scanning, or file storage has been added.

## Phase 5 Manual Feedback Backend

Manual entry is the first real connector that uses the Phase 4 processing service.

```text
POST /api/businesses/:businessId/feedback/manual
```

Required headers:

```text
Content-Type: application/json
Idempotency-Key: <UUID-style random key>
```

Minimal request body:

```json
{
  "branchId": "<BRANCH_ID>",
  "message": "Customer called to say the service was excellent.",
  "source": {
    "type": "PHONE_CALL"
  }
}
```

Full safe response data:

```json
{
  "feedbackId": "string",
  "ingestionId": "string",
  "businessId": "string",
  "branchId": "string",
  "channel": "MANUAL",
  "created": true,
  "duplicate": false,
  "processedAt": "2026-07-24T12:00:00.000Z"
}
```

The same `Idempotency-Key` and same normalized payload returns `200` with `created=false` and `duplicate=true`. Reusing the same key with different normalized content returns `409 FEEDBACK_IDEMPOTENCY_CONFLICT`.

Allowed business roles:

- `OWNER`: any active branch in the business.
- `ADMIN`: any active branch in the business.
- `MANAGER`: all active branches when granted all-branch access, otherwise explicitly assigned active branches only.
- `STAFF`: all active branches when granted all-branch access, otherwise explicitly assigned active branches only.

Attachment support is JSON metadata only. No upload, download, remote URL fetch, binary storage, or file scanning is performed.

## Phase 5 Manual Feedback Frontend

The authenticated manual-entry UI is available at:

```text
/business/:businessId/feedback/manual
```

The page uses the existing business workspace shell and theme system. It includes the reference-led Add customer feedback layout with location/source, feedback, customer information, source details, attachment references, and review/submit sections. The form sends a generated `Idempotency-Key` header to the Phase 5 backend endpoint and displays safe success, duplicate, validation, empty-branch, loading, and API-error states.

The frontend does not upload files, create customer profiles, list all feedback, expose feedback workflow, add public/QR forms, or implement notifications, reports, AI, analytics, or external integrations.

## Phase 6 Public Feedback Portal

Owner/Admin users manage the portal from:

```text
/business/:businessId/settings
```

Authenticated management endpoints:

```text
GET   /api/businesses/:businessId/public-feedback
PATCH /api/businesses/:businessId/public-feedback
POST  /api/businesses/:businessId/public-feedback/regenerate
```

Public customer route:

```text
/feedback/:portalToken
```

Public API endpoints:

```text
GET  /api/public/feedback/:portalToken
POST /api/public/feedback/:portalToken
```

The public route requires no login. The business is fixed by the token and cannot be changed by the customer. Customers choose an active branch when more than one is available, select a required 1-5 rating, enter a required message, optionally provide a date and contact details, and optionally allow follow-up. If follow-up is allowed, email or phone is required.

The frontend sends a generated `Idempotency-Key` header for each intended submission and reuses it for retries of the same unchanged submission. After success or duplicate, the next "Submit Another Feedback" flow receives a new key.

Public submissions are processed only through `PublicFeedbackSourceAdapter` and the existing Phase 4 `feedbackProcessingService`. They are stored as `FeedbackChannel.PUBLIC_FORM`. No public attachment upload, customer profile, inbox, workflow, AI, notification, report, or external integration is implemented.

## Phase 7 QR-Code Feedback Submissions

Owner/Admin users manage QR codes from:

```text
/business/:businessId/feedback/qr-codes
```

Authenticated management endpoints:

```text
GET   /api/businesses/:businessId/public-feedback/qr-codes
POST  /api/businesses/:businessId/public-feedback/qr-codes
POST  /api/businesses/:businessId/public-feedback/qr-codes/:qrCodeId/regenerate
PATCH /api/businesses/:businessId/public-feedback/qr-codes/:qrCodeId
```

Public customer route:

```text
/feedback/qr/:qrToken
```

Public API endpoints:

```text
GET  /api/public/feedback/qr/:qrToken
POST /api/public/feedback/qr/:qrToken
```

QR management requires the Phase 6 public feedback portal to be enabled. Owners/Admins can create business-wide or branch-specific QR codes; managers can view QR codes for their accessible branches. The frontend generates QR previews, PNG downloads, and print sheets from the public URL.

QR public submissions reuse the Phase 6 public feedback form experience. Business-wide QR codes allow active branch selection. Branch-specific QR codes preselect and lock the configured branch from the backend `fixedBranchId`, initialize React Hook Form after the QR configuration loads, hide the editable branch selector, and submit the fixed branch ID internally. Submissions are processed only through `QrFeedbackSourceAdapter` and the existing Phase 4 `feedbackProcessingService`; they are stored as `FeedbackChannel.QR_CODE`. No public attachment upload, scan analytics, customer profile, inbox, workflow, AI, notification, report, or external integration is implemented.

## Frontend Routes

```text
/
/features
/how-it-works
/about
/contact
/privacy-policy
/terms-of-service
/feedback/:portalToken
/feedback/qr/:qrToken
/login
/register
/verify-email-pending
/verify-email
/forgot-password
/reset-password
/password-reset-success
/account
/account/sessions
/business
/business/setup
/business/:businessId
/business/:businessId/feedback/manual
/business/:businessId/feedback/qr-codes
/business/:businessId/customers
/business/:businessId/customers/:customerId
/business/:businessId/automations
/business/:businessId/integrations
/business/:businessId/integrations/:connectionId
/business/:businessId/integrations/:connectionId/history
/business/:businessId/integration-runs/:runId
/business/:businessId/settings
/business/:businessId/branches
/business/:businessId/branches/new
/business/:businessId/branches/:branchId
/business/:businessId/branches/:branchId/edit
/business/:businessId/staff
/business/:businessId/staff/invite
/business/:businessId/staff/:membershipId
/business/:businessId/staff/:membershipId/branches
/business/:businessId/invitations
/invitations/accept
/admin
/admin/businesses
/admin/businesses/:businessId
/admin/users
/admin/feedback
/admin/integrations
/admin/reports
/admin/system-health
/system-status
*
```

The root route is the public Home page. Public marketing and legal pages remain accessible whether the visitor is logged in or logged out.
Unknown frontend routes show a friendly 404 page with a link back to login or account.

## Theme Support

The frontend supports light and dark mode through Tailwind's class-based dark mode and shared CSS variable tokens in `frontend/src/styles.css`. The initial theme is applied in `frontend/index.html` before React loads.

When no explicit preference exists, the app follows the system theme. The login-page theme toggle persists explicit light/dark choices in `localStorage` under `sme-feedback-theme`.

## Manual Phase 2C Testing

After configuring SMTP:

1. Register a new `BUSINESS_OWNER` password account and confirm it redirects to `/verify-email-pending`.
2. Confirm no authenticated session is created after password registration.
3. Open the verification link from the email and confirm `/verify-email` verifies the account.
4. Confirm the verified account can log in.
5. Register another password account and confirm login returns safe unverified-email guidance before verification.
6. Use resend verification from the pending or login flow.
7. Request forgot password and confirm the UI shows the same generic message.
8. Open the reset link from the email, set a new password, and confirm all prior sessions are revoked.
9. Confirm Google registration, Google login, explicit Google linking, logout, logout-all, session listing, session revocation, refresh rotation, `/system-status`, health endpoints, protected routes, public-only routes, `RoleGuard`, and friendly 404 still work.

## Manual Login Redesign Testing

1. Open `http://localhost:5173/login` in light mode and compare the rounded stage, split layout, enlarged form card, illustration, trust/security section, and state colors against `frontend/references/login-page-design.png`.
2. Toggle dark mode and confirm the layout, card surfaces, text contrast, alerts, fields, and buttons remain readable.
3. Refresh the page and confirm the chosen theme persists.
4. Clear the `sme-feedback-theme` local storage key and confirm first visit follows the system color scheme.
5. Check desktop, tablet, and mobile widths, including the corrected desktop 60/40 balance and approximately 375px, 390px, and 430px mobile widths.
6. Confirm email/password login, Google login, forgot password, create account, validation errors, backend login errors, loading state, success messages, keyboard navigation, and original-route redirect still work.

## Manual Auth and Account Redesign Testing

1. Compare `/register`, `/verify-email-pending`, `/verify-email`, `/forgot-password`, `/reset-password`, `/password-reset-success`, `/account`, and `/account/sessions` against `frontend/references/01-register.png` through `frontend/references/08-active-sessions.png`.
2. Confirm light mode, dark mode, theme persistence, desktop, tablet, and mobile layouts.
3. Confirm registration, Google registration, verification resend, verification success/error handling, forgot-password generic success handling, reset-password token handling, reset success navigation, Google account linking, logout, logout-all, active session listing, session revocation, and current-session revocation still work.

## Manual Public Website Testing

1. Review `/`, `/features`, `/how-it-works`, `/about`, `/contact`, `/privacy-policy`, and `/terms-of-service` for the Phase 27 responsive Indigo hierarchy; confirm `/pricing` reaches the friendly not-found route.
2. Confirm light mode, dark mode, theme persistence, and system-theme fallback.
3. Confirm public navigation active states, logo link, Login link, Get Started link, footer links, and mobile menu behavior.
4. Confirm the mobile menu opens and closes with the menu button, closes after navigation, closes with Escape, prevents background scrolling while open, and keeps Login/Get Started visible.
5. Check desktop, tablet, and mobile widths, including 375px, 390px, and 430px, with no horizontal scroll, clipped cards, or overlapping text.
6. Confirm public pages remain accessible when logged in and logged out.
7. Confirm no Pricing navigation, footer link, page, or call to action remains.
8. Confirm the Contact form validates required fields and clearly reports that direct form delivery is not configured after valid submission.
9. Confirm Privacy Policy and Terms of Service draft content is acceptable for product review and send it for professional legal review before production launch.
10. Confirm all existing Phase 2 auth/account routes and `/system-status` still work.

## Manual Phase 3 Testing

1. Sign in as a verified `BUSINESS_OWNER` with no business membership and confirm `/business` sends you to `/business/setup`.
2. Create a business with a primary branch and confirm the business, primary branch, owner membership, and all-branch owner access appear together.
3. Confirm `/business/:businessId`, `/settings`, `/branches`, `/branches/new`, branch details/edit, `/staff`, `/staff/invite`, staff details, branch assignment, `/invitations`, `/invitations/accept`, `/admin/businesses`, and admin business details render in light and dark mode across mobile, tablet, and desktop widths.
4. Create, edit, activate, deactivate, and set primary branches. Confirm duplicate branch codes fail safely and the current primary branch cannot be deactivated.
5. Invite staff with all-branch access and explicit branch access. Confirm invitation creation, pending list, resend, token rotation, cancellation, and expiry behavior.
6. Accept invitations as a signed-in existing user, as a new password user, and through Google. Confirm mismatched email and incompatible Google-account cases fail safely.
7. Confirm owners cannot be demoted, suspended, removed, or narrowed to explicit branches; admins cannot manage owners/admins; only owners can assign admin; users cannot modify their own membership.
8. Confirm manager/staff branch access is limited to assigned branches unless all-branch access is granted.
9. Confirm suspended businesses and suspended/removed memberships block normal workspace actions.
10. Manually attempt cross-business IDs for branch, membership, invitation, and settings requests and confirm backend tenant checks reject them.
11. Configure `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, `PLATFORM_ADMIN_FIRST_NAME`, and `PLATFORM_ADMIN_LAST_NAME` in `backend/.env`, run `npm run prisma:seed`, then sign in as that `PLATFORM_ADMIN` and confirm admin business listing, details, suspension, and reactivation work without granting normal tenant membership.
12. Confirm no Phase 4 feedback, customers, analytics, AI, connectors, reports, payments, business deletion, or ownership-transfer behavior is present.

## Manual Phase 4 Testing

Phase 3 and Phase 4 should be manually tested together.

1. Use existing Phase 3 businesses and branches; do not create tenants through the feedback helper.
2. Run the feedback simulation helper without `--commit` and confirm valid input is accepted without writing rows.
3. Run with `--commit` against an active business and active branch and confirm one `FeedbackIngestion`, one `Feedback`, and any provided `FeedbackAttachment` metadata are stored.
4. Omit `branchId` and confirm feedback resolves to the active primary branch.
5. Confirm a suspended business rejects processing.
6. Confirm an inactive branch rejects processing.
7. Confirm a branch from another business is rejected.
8. Re-run the same `businessId`, `channel`, `idempotencyKey`, and payload and confirm it returns a duplicate result without new feedback or attachment rows.
9. Reuse the same idempotency key with different data and confirm `FEEDBACK_IDEMPOTENCY_CONFLICT`.
10. Reuse the same external ID with compatible data and confirm duplicate behavior.
11. Reuse the same external ID with incompatible data and confirm `FEEDBACK_EXTERNAL_ID_CONFLICT`.
12. Use `--attachments=<JSON array>` and confirm committed attachment metadata stores through `FeedbackAttachment` without file upload, file download, URL fetching, or binary storage.
13. Use `--simulateFailureAfterIngestion` with `--commit` and a unique idempotency key, then confirm the related `FeedbackIngestion` ends as `FAILED` with only safe error code/message fields and no partial `Feedback` or `FeedbackAttachment` rows.
14. Confirm public feedback portal, QR flow, inbox, customer profiles, AI, reports, notifications, and external integrations are still absent.

## Manual Phase 5 Testing

1. Manually verify the backend API with real HTTP requests for login cookies, valid manual feedback, duplicate replay, idempotency conflict, inaccessible branch, inactive branch, suspended business, missing `Idempotency-Key`, invalid rating/email, attachment metadata, and Prisma Studio record inspection.
2. Open `/business/:businessId/feedback/manual` as an authenticated business member and compare the page structure, sidebar/header, form section order, field arrangement, spacing, right submission panel, and button placement against `frontend/references/phase5_manual_feedback_primary.png`.
3. Confirm dark mode, mobile layout, loading state, empty active-branch state, validation errors, success state, duplicate state where reproducible, alerts, and supporting component styles against `frontend/references/phase5_manual_feedback_states.png`.
4. Confirm owner/admin members can submit to active branches, and manager/staff members can submit only to all-branch or explicitly assigned active branches.
5. Confirm the Message textarea updates the character counter and clears required-message validation when valid text is entered, while preserving line breaks and schema trimming.
6. Confirm the frontend records valid manual feedback, shows safe API errors, preserves metadata-only attachment behavior, and does not expose inbox, workflow, customer-profile, AI, report, notification, file-upload, or external-integration features.

## Manual Phase 6 Testing

During verification:

1. Signed in as an active Owner/Admin and opened `http://localhost:5173/business/:businessId/settings`.
2. Confirmed the Public Feedback Portal section is visible with Disabled status, welcome message field, save action, and no public URL until enabling.
3. Enabled the portal, saved settings, and confirmed a public URL appears in the format `http://localhost:5173/feedback/<token>`.
4. Copied the link and opened it in a logged-out or private browser session.
5. Confirmed the public page loads without login, shows only safe business information, shows a real logo only when it loads or initials otherwise, and shows only active branches.
6. With multiple active branches, confirmed no branch is preselected and selecting one is required. With exactly one active branch, confirmed it is visibly preselected.
7. Confirmed rating and message are required, the star rating is keyboard usable, and the message counter updates from React Hook Form state.
8. Submitted valid feedback with rating, message, branch, and optional contact details.
9. Confirmed the success state says the feedback was received and shows only a safe feedback reference.
10. Repeated the same unchanged submission where practical and confirmed the duplicate state says no duplicate was created.
11. Reused the same `Idempotency-Key` with different content through an HTTP client and confirmed `409 FEEDBACK_IDEMPOTENCY_CONFLICT`.
12. Selected follow-up permission without email or phone and confirmed validation requires contact information.
13. Disabled the portal and confirmed the public link becomes unavailable.
14. Re-enabled the portal and confirmed the same link works again unless the link was regenerated.
15. Regenerated the link from settings, confirmed the warning, then confirmed the old link is unavailable and the new link works.
16. Confirmed invalid token, suspended business, no active branches, inactive branch, branch mismatch, rate-limit, processing, and network failure states show safe messages.
17. Confirmed light mode, dark mode, mobile widths around 375px, 390px, and 430px, and desktop layout have no horizontal overflow or overlapping text.
18. Confirmed public submissions appear in Prisma Studio through Phase 4 `FeedbackIngestion` and `Feedback` rows with `PUBLIC_FORM`.
19. Confirmed no public attachments, Unified Inbox, feedback-management workflow, customer profile, AI, notification, report, or external integration appears.

## Manual Phase 7 Testing

During verification:

1. Signed in as an active Owner/Admin, enabled the Phase 6 portal, and opened `http://localhost:5173/business/:businessId/feedback/qr-codes`.
2. Created a business-wide QR code and confirmed the preview, copied URL, opened URL, PNG download, and print sheet all use `http://localhost:5173/feedback/qr/<token>`.
3. Opened the QR URL in a logged-out or private browser session and confirmed the public form loads without login and allows active branch selection.
4. Created a branch-specific QR code and confirmed the public form preselects and locks that branch using the QR configuration `fixedBranchId`.
5. Submitted valid QR feedback and confirmed `FeedbackIngestion` and `Feedback` rows are created with `QR_CODE`.
6. Repeated the same unchanged QR submission where practical and confirmed duplicate handling does not create a second feedback row.
7. Regenerated a QR code and confirmed the old QR URL becomes unavailable while the new QR URL works.
8. Regenerated the Phase 6 public portal link and confirmed existing QR URLs become unavailable until regenerated.
9. Disabled a QR code and confirmed its public QR URL becomes unavailable without deleting existing feedback rows.
10. Confirmed manager view-only access respects branch access, and staff/customer/no-membership users cannot manage QR codes.
11. Confirmed invalid token, disabled portal, suspended business, inactive branch, branch mismatch, rate-limit, processing, and network failure states show safe messages.
12. Confirmed light mode, dark mode, logo initials fallback, mobile widths around 375px, 390px, and 430px, and desktop layout have no horizontal page overflow, clipped QR actions, or overlapping text.
13. Confirmed no public attachments, QR scan analytics, Unified Inbox, feedback-management workflow, customer profile, AI, notification, report, or external integration appears.

## Troubleshooting

If the backend does not start, confirm `backend/.env` exists and contains valid `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` values.

If database health fails, confirm:

- XAMPP MySQL is running.
- The database `sme_feedback_aggregator` exists.
- The database port is `3306`.
- `DATABASE_URL` matches your local MySQL credentials.
- The Phase 2A, Phase 2B, Phase 2C, Phase 3, Phase 4, Phase 6, and Phase 7 migrations have been applied.

If login or registration fails in the browser, confirm:

- The backend is running on `http://localhost:5000`.
- The frontend is running on `http://localhost:5173`.
- `frontend/.env` contains `VITE_API_BASE_URL=http://localhost:5000/api`.
- `FRONTEND_URL` in `backend/.env` matches the Vite URL.
- `COOKIE_SECURE=false` for local HTTP development.

If Google buttons are unavailable, confirm:

- `frontend/.env` contains `VITE_GOOGLE_CLIENT_ID`.
- `backend/.env` contains `GOOGLE_AUTH_ENABLED=true`.
- `backend/.env` contains the matching `GOOGLE_CLIENT_ID`.
- Google Cloud includes `http://localhost:5173` as an authorized JavaScript origin.
- Frontend and backend were restarted after environment changes.

If email delivery fails, confirm:

- `EMAIL_ENABLED=true`.
- `SMTP_HOST`, `SMTP_PORT`, and `EMAIL_FROM_ADDRESS` are set.
- `SMTP_USER` and `SMTP_PASS` are set when your provider requires authentication.
- `APP_FRONTEND_URL=http://localhost:5173` for local testing.
- The backend was restarted after editing `backend/.env`.

If Live Outlook authorization or synchronization fails, confirm:

- `LIVE_OUTLOOK_ENABLED=true`.
- `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`, and `MICROSOFT_OAUTH_REDIRECT_URI` are set in `backend/.env`.
- The Microsoft app redirect URI matches `http://localhost:5000/api/integrations/email/oauth/outlook/callback` for local testing.
- The Microsoft app allows delegated `offline_access`, `User.Read`, and `Mail.Read`.
- `MICROSOFT_OAUTH_TENANT=common` is used when both organizational and personal Microsoft accounts should be allowed.
- `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` is a base64-encoded 32-byte key shared with Gmail Live Email credential storage.
- The backend was restarted after editing `backend/.env`.

If staff invitations fail, also confirm:

- `STAFF_INVITATION_EXPIRES_IN_HOURS` is set to a positive value or omitted to use the default of `48`.
- The inviting account is an active owner or admin member of an active business.
- The invitee email is not already an active member of the same business.
- The selected branch IDs belong to the target business.

If route bundles look stale or Workbox/service-worker messages appear in the
browser console, the repository does not intentionally register a service worker.
Clean up localhost browser state manually:

1. Open Developer Tools.
2. Open Application.
3. Open Service Workers.
4. Unregister any localhost workers.
5. Clear localhost site data.
6. Restart the development server.
7. Hard-refresh the page.

## Current Limitations

Phase 4 includes the standard feedback-processing foundation, Phase 5 includes the authenticated manual-entry connector/API/UI, Phase 6 includes the public feedback portal/API/UI, Phase 7 includes QR-code feedback submission management/API/UI, Phase 8 includes the unified feedback inbox and repaired feedback-details drawer layout, Phase 9 includes feedback status tracking, controlled status transitions, private internal notes, and an append-only activity timeline, Phase 10 includes assignment, categories, and priorities, Phase 11 includes customer profiles connected to feedback history, Phase 12 includes full search and filter implementation, Phase 13 includes AI sentiment analysis, categorization suggestions, and summaries, Phase 14 includes automation rules, execution history, the automation worker, and field-source ownership/backfill protection, Phase 20 includes Demo Mode connector framework, manual demo synchronization, and a premium integrations UI rebuilt against the approved references, Phase 21 includes Gmail Live Email, Phase 22 includes the Meta test-number Live WhatsApp inbound text webhook MVP, Phase 23 includes Outlook/Microsoft Graph Live Email inbound synchronization, Phase 24 includes Live Facebook and Instagram inbound comment webhooks, and Phase 25 includes Platform Administrator analytics and PDF/CSV reporting. Core Phase 8, 9, and 10 manual workflows have passed, but final multi-tenant/security/regression verification is deferred until after Phase 20 manual review. Phase 11, Phase 12, Phase 13, Phase 14, Phase 20, exhaustive Phase 21 security/regression verification, Phase 22 Meta test-number/browser verification, Phase 23 real Outlook OAuth/browser synchronization verification, Phase 24 Meta/browser verification, and Phase 25 manual browser/report verification are pending. The public website is implemented as frontend UI and documentation-grounded content only. Google unlinking, setting a password for Google-only users, customer accounts, notifications, replies, Business Owner analytics/reporting expansion, active billing, contact-form delivery, business deletion, ownership transfer, WhatsApp outbound replies/templates/media downloads/production onboarding, IMAP mailbox sync, outbound email/replies, Google Reviews live sync, X live sync, broader social replies/DMs/publishing/media/moderation, production social OAuth onboarding, and Phase 26 integration monitoring/recovery remain unimplemented.
