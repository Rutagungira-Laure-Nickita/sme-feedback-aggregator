# Changelog

## 2026-08-31 - Platform Administrator Reporting Consistency Correction

- Standardized the shared report display label for `MANUAL` to `Manual Entry` across Preview, PDF, and CSV without changing the stored enum.
- Corrected Executive Business Adoption to query and count the same supported Live Gmail/WhatsApp connections as Integration Adoption, excluding hidden, Demo, unsupported, historical, and dormant provider records without deleting them.
- Renamed `Imported items (period)` to `Synchronization items imported (period)` to match the existing sum of synchronization-run imported-item counters.
- Replaced timestamp precedence with a maximum relevant provider-activity calculation covering webhook receipts, inbound messages, synchronization attempts/successes, and connection tests; standardized the column as `Last provider activity` in Preview/PDF/CSV.
- Preserved Detailed Feedback Records, hidden-channel and automation exclusions, Business Owner report behavior and authorization, stored feedback/integration data, schema/migrations, credentials, OAuth/webhook processing, and deployment configuration. Focused report suites, frontend regressions, typecheck, lint, Prisma validation, formatting, and production builds pass.

## 2026-08-31 - Owner/Admin Reporting Quality and Detailed Feedback Consistency

- Standardized `Detailed Feedback Records` across Business Owner and all three Platform Administrator reports; Admin rows add Business and Branch while both use original message and received date.
- Extracted one shared sender-resolution/section builder for Gmail, WhatsApp, Manual Entry, Public Form, and `Unknown customer` fallback without exposing internal IDs or source metadata.
- Made report detail rows and `Feedback in selected period` originate from the same canonical active operational scope, including soft-delete, supported-source, tenant/Branch, date, channel, workflow-status, and sentiment rules where accepted.
- Renamed the persisted-link-only customer metric to `Linked customer profiles represented by feedback (period)` instead of implying all named senders are Customer profiles.
- Removed automation queries, highlights, summaries, comparisons, and sections from normal Owner/Admin Preview, PDF, and CSV while preserving automation workers, APIs, services, routes, models, records, and non-report behavior.
- Added responsive Administrator detail Preview, eight-column wrapped/page-safe PDF rendering, all-row PDF/CSV regressions, repeated-header coverage, sender/filter/source/soft-delete/security assertions, and automation-absence tests. No schema, migration, seed, dependency, integration, auth, security-rule, or deployment change was made.

## 2026-08-31 - Business Owner Detailed Feedback Records

- Added a final `Detailed Feedback Records` section to the existing Business Owner report with Customer / Sender, original Feedback, visible Channel, received Date, Category, and Status.
- Reused the canonical tenant/Branch/date/channel/status/sentiment/soft-delete/supported-source report predicate so detail rows reconcile with the report total and cannot include hidden or foreign-tenant feedback.
- Added channel-specific sender fallback resolution for Gmail, WhatsApp, Manual Entry, and Public Form without exposing internal IDs or source metadata.
- Added a responsive desktop table/mobile card Preview, retained the established 12-row web sample notice, and added all-row PDF/CSV output with full CSV messages, wrapped PDF excerpts, clear dates, repeated PDF headers, and page-safe rows.
- Added focused sender, channel, source-message, received-time, scope, hidden/deleted policy, responsive Preview, CSV, and multi-page PDF regression coverage. No schema, migration, dependency, integration, authentication, security-rule, or deployment-configuration change was made.

## 2026-08-25 - Operational Count Integrity and Product-Surface Correction

- Added one canonical active-feedback query predicate so soft-deleted and non-visible-source rows cannot contribute to inbox summaries, customer/category aggregates, staff/owner/platform dashboards, analytics, or owner/platform reports while audit and provider deduplication records remain stored.
- Narrowed normal product channels to exactly Gmail, WhatsApp, Manual Entry, and Public Form; normalized report `EMAIL` labels to Gmail and added the Business Owner Channel distribution donut with fixed four-item legend and zero state.
- Normalized visible roles to Platform Administrator, Business Owner, Manager, Staff, and Customer. Preserved the internal `ADMIN` enum/data and permissions, mapped it to Business Owner, prevented new normal ADMIN invitations/role changes, omitted it from assignee choices, and removed the duplicate administrator from future development seeds.
- Removed QR and Automations from normal navigation, quick actions, marketing, filters, summaries, charts, and reports while preserving routes, components, endpoints, services, database data, and tests.
- Added no schema/migration, dependency, provider configuration, credential, or stored-data mutation. Focused hardening 29/29, connectors 36/36, seed 3/3, Platform Administrator 44/44, Phase 26 34/34, Phase 27 30/30, Phase 28 matrix 136/136, typecheck, lint, Prisma validation, formatting, production build, and diff validation pass; browser verification remains user-owned.

## 2026-08-25 - Supported Channels and Gmail Feedback-Ingestion Correction

- Established one deny-by-default operational policy: Manual Entry, Public Form, QR Code, Live Gmail, and Live WhatsApp are the only visible/queryable product channels; unsupported/Demo records remain stored for audit but cannot be newly created or operated.
- Removed unsupported provider rows/options/metrics from owner, customer, Platform Administrator, dashboard, filter, report, and fresh-seed presentation; retired Facebook/Instagram POST webhook ingestion while preserving signed WhatsApp delivery.
- Added a persisted responsive Grid/Table switch to Business Integrations, aligned Gmail/WhatsApp card actions, and labeled both primary actions `Sync Now` while keeping WhatsApp strictly read-only activity refresh.
- Added configurable Gmail label scoping (default `Customer Feedback`), Inbox-plus-label checks for initial/history sync, safe missing-label errors, and automated/newsletter header/sender safeguards with explicit skipped run items.
- Corrected all-matching feedback selection to persist explicit exclusions across pages and apply the exact population to bulk status/category/delete and Remove all.
- Updated assignee options/labels to `Name — Business Role` and centralized supported source labels/options.
- Added no schema or migration and mutated no stored data. Passed backend/frontend typecheck and lint, integrations 35/35, hardening 22/22, Platform Administrator 44/44, seed 3/3, Phase 26 34/34, Phase 27 30/30, Phase 28 matrix 136/136, formatting, and production build; the existing non-blocking frontend chunk-size advisory remains and browser/provider verification is user-owned.

## 2026-08-21 - Final Product Hardening and UI/UX Pass

- Added Owner/Admin feedback edit, single soft-delete, transactional bulk status/category/delete, current-page/all-matching selection, optimistic concurrency, audit activity, and exact typed confirmation for unfiltered Remove all.
- Added additive feedback soft-delete schema/migration while preserving ingestion, provider deduplication, source records, workflow/AI/automation/customer history, and immutable provider metadata. The migration was created but not applied; no reset, db push, reseed, or data cleanup ran.
- Hardened Staff Branch scope and fail-closed filter validation; added a real Branch-scoped Staff Overview and removed owner/admin configuration navigation for restricted Staff.
- Added the real-data Customer dashboard, My Feedback persisted List/Grid, safe responsive detail, submission destinations, Profile/security routes, session-derived ownership APIs, and `/account` compatibility redirect.
- Preserved Gmail connection/synchronization behavior and aligned WhatsApp actions around read-only Refresh Activity, View Activity, and Test Connection without adding a fake sync path.
- Added independently scrolling desktop sidebars across Business, Platform Administrator, Account, and Customer shells while retaining bounded, dismissible mobile navigation and the established responsive collection-view policy.
- Added 21 focused unit/contract hardening checks and passed Phase 28 136/136, integrations 31/31, Phase 27 30/30, Platform Administrator 44/44, typecheck, lint, Prisma generation/validation, production build, and diff validation. Updated one Phase 28 assertion to ignore irrelevant Tailwind token ordering.

## 2026-08-19 - Phase 29A Prisma ESM Runtime Compatibility for Railway

- Added one typed native-ESM Prisma runtime adapter around the generated CommonJS package.
- Reviewed all 82 backend files with direct Prisma imports and redirected every runtime enum/client/helper use while preserving erased generated types.
- Added focused adapter regression coverage and restored compiled `node dist/server.js` plus `tsx src/server.ts` startup compatibility under Node 24.
- Kept Prisma at 6.19.3 with `prisma-client-js`; no schema, migration, seed semantics, data, API, authorization, or business logic changed.
- Passed backend typecheck/lint/build, Prisma generation/validation, 208/208 complete backend tests, Phase 28 136/136, integrations 31/31, Phase 25.4 49/49, Phase 27 30/30, compiled-output import audit, and both runtime startup smokes.

## 2026-08-18 — Phase 28 Feedback Categories, Kigali Waffle Showcase, and Navigation Polish

- Added the exact 13-category active default taxonomy and provision it transactionally for newly created Businesses without changing custom-category ownership or CRUD behavior.
- Reconciled deterministic category IDs in place and added guarded, dry-run-by-default current-database reconciliation with per-table mutation/protection counts.
- Rebranded `dev_seed_business_kigali_harvest` in place as Kigali Waffle Cuisine and professionalized deterministic branches, customers, feedback/activity, AI messages, QR, portal, and automation copy.
- Preserved five non-seed feedback rows, the connected Live WhatsApp record, all integration records, the tenant-isolation Business, and credential state; no Live Gmail connection existed.
- Added Category/Uncategorized to All Feedback List and Grid, consolidated the category filter, and normalized Business Owner/Platform Administrator report null-category labels.
- Added `100dvh` scrollable authenticated drawers with safe-area, body-lock, Escape, route, and backdrop handling; aligned the shared public navigation to Home, About, How It Works, Features, Contact.
- Added Phase 28 category/navigation/reconciliation safeguards and updated Phase 27's intentional list-column assertion.
- No dependency, Prisma schema, migration, applied-migration, destructive reset, or new Live provider change was made.

## 2026-08-18 - Phase 27 — Full Product UI/UX Overhaul

- Reworked shared owner/admin/public surfaces around the fixed Indigo design system, improved responsive spacing, premium cards, clearer empty states, and easier owner/admin logout placement.
- Replaced the Business Owner overview's placeholder visualization with real 30-day report-backed KPIs, feedback trends, sentiment, channel distribution, important feedback, workspace health, and quick actions.
- Added one centralized Business Owner integration allowlist for Live WhatsApp and Gmail, removed Demo controls/cards/operational rows from the owner UI, and changed owner report integration, synchronization, and webhook queries to Live-only while preserving Demo data, the connector registry, future provider backend code, and Platform Administrator capabilities.
- Simplified feedback and customer List views, redesigned their Grid cards, centered the complete feedback detail modal, upgraded QR management and automation rule presentation, improved Customer/Branch/Staff details and back navigation, and organized Settings into Business Profile, Public Feedback, AI Analysis, and Feedback Categories tabs.
- Redesigned Platform Administrator Users, Feedback, and Integrations cards without changing filters, details, actions, authorization, or reporting.
- Rebuilt the public marketing pages and legal presentation around current capabilities, removed Pricing and `/pricing`, kept informational routes available to authenticated sessions, and placed the unchanged Login/Register core experiences inside the shared session-aware header/footer.
- Added Phase 27 allowlist/static regressions and updated affected reporting/routing assertions. No dependency, schema, migration, seed, or database data change was made.

## 2026-08-18 - Phase 26A — Business Owner Report Export Polish After Freebuff Review

- Inspected the inherited Phase 26 backend, frontend, tests, shared reporting infrastructure, worktree diff, tenant authorization, and database/migration surface before editing; preserved the existing tenant-scoped shared-renderer architecture.
- Added context-aware shared report branding: Business Owner PDFs and PDF metadata use `BUSINESS REPORTING`, Business Owner CSV records that report context, and Platform Administrator PDFs retain `PLATFORM ADMINISTRATION` without duplicating the renderer.
- Corrected Business Owner Integration Adoption to aggregate the already scoped connection collection by Provider only. The current fixture reports one WhatsApp row with count 2 and a total of 7, while detailed WhatsApp Live/Demo connection rows remain separate.
- Added focused branding, context-leakage, provider aggregation, Preview/PDF/CSV agreement, detail-mode preservation, CSV safety, and PDF pagination/footer regression coverage. No report calculation, tenant authorization, Prisma schema, migration, seed, or development data changed.

## 2026-08-18 - Phase 26 — Business Owner Comprehensive Reporting

- Added exactly one Business Owner report, `Business Performance & Customer Experience Report`, served at `POST /api/businesses/:businessId/reports/preview` and `POST /api/businesses/:businessId/reports/export`. There is no report-type selector and no Business selector; the Business is resolved from the authenticated active membership of the route business.
- Backend authorization requires an authenticated platform `BUSINESS_OWNER` with an active membership in an active Business; platform `STAFF`, `CUSTOMER`, and `PLATFORM_ADMIN` callers are denied, as are foreign businesses, foreign branches, suspended/removed memberships, and non-active businesses.
- Reused the Phase 25.4 reporting infrastructure: the shared `AdminReportDocument`, display formatter, PDF renderer (canonical geometry, section-aware page breaks, true per-page footers), UTF-8 BOM CSV with escaping and formula protection, connection-health classifier, canonical feedback scope plans, workflow/assignment summarizers, deterministic comparison math, and platform branding settings.
- The owner report combines Business Performance (branches, active members, customer profiles, lifetime/period/today/week/month feedback, open/completed/assigned/unassigned, high/urgent and unresolved high/urgent, average rating, sentiment, AI completion), Workflow & Response Performance (New/In Review/Resolved/Closed, Open/Completed, Assigned/Unassigned, completion rate, workload by branch, previous-period comparison), Feedback & Customer Experience (canonical-scope trend and branch/channel/category/status/priority/sentiment/rating distributions, important high/urgent or negative feedback with normalized safe message content), and Channel & Operational Health (business-only integrations, synchronization, webhooks, AI processing, automation).
- Lifetime vs selected-period values are explicitly labeled; Branch-filtered integration metrics use the required `defaultBranchId` routing relationship; Customer profiles remain labeled business-wide because Customer has no branch ownership relation. No platform-level API/database health, approval workload, other-tenant, or infrastructure telemetry is included.
- Added a responsive `/business/:businessId/reports` page using the existing owner workspace shell and Indigo design system (Light/Dark/System), with date/branch/channel/status/sentiment filters, previous-period comparison, Preview, PDF, and CSV download, KPI overview, Management Summary, report sections, and no fixed-width overflow at ~300px.
- Added focused backend tests (18) covering tenant isolation, role denial, exactly-one report, filters, canonical scope, workflow/assignment partitions, tie-aware Management Summary, operations scoping, export safety, and physical-PDF invariants; added frontend tests (13) covering route/navigation/role gating, no Business selector, filter labels, responsive classes, preview helpers, and Platform Admin report regression. No Prisma schema, migration, seed, or development-data change was made.

## 2026-08-17 - Phase 25.4D — Operations Report Consistency & PDF Readability Correction

- Replaced the Operations Preview comparison's visually ambiguous inline rows with an explicit five-column table directly after Management Summary, using the comparison already present in the shared report document and hiding it when comparison is disabled.
- Added `DRAFT` to shared report display humanization so Preview/PDF/CSV render `Draft` while retaining established initialism capitalization and safe opaque-value behavior.
- Added Operations-specific PDF projections for connection, synchronization, webhook, and automation detail tables. Strategic column combining/reduction, proportional widths, measured wrapping rows/headers, concise UTC timestamps, meaningful bounded excerpts, and repeated page-break headers improve readability without changing the report document.
- Preserved complete CSV columns and ISO timestamps. Clarified `Automation completed (period)` to `Successful automation executions (period)` without changing the underlying success count.
- Preserved all Operations calculations, comparison math, connection-health and core-health semantics, monitoring claims, authorization, CSV safety, and footer/page-count safeguards. No schema, migration, seed, or development-data change was made.
- Added focused Preview, humanization, PDF-projection/wrapping/timestamp, CSV-detail, and physical-page regressions. Typecheck, lint, formatting, Prisma validation, backend/frontend builds, Phase 25.3 frontend 16/16, integrations 31/31, AI 18/18, automation 88/88, and `git diff --check` passed. The Phase 25.4 frontend and backend/Platform Administrator runners were blocked before test discovery by sandbox `spawn EPERM`; elevated retry was unavailable because the environment approval quota was exhausted. No browser/manual testing was performed.

## 2026-08-17 - Phase 25.4C — Feedback & Customer Experience Report Functional Correction

- Fixed Workflow Status completion leakage caused by spreading the canonical feedback predicate and replacing its selected `status` with a completion-status predicate. Open/Completed now derive from the exact scoped workflow distribution for both current and previous periods; Assignment derives from the exact scoped assignee distribution.
- Added one canonical Feedback scope plan shared by Prisma aggregates and parameterized trend queries across Business, Branch, Channel, Workflow Status, Sentiment, and lifetime/current/previous date windows. Explicit `AND` refinements prevent filter replacement.
- Made Management Summary tie-aware and deterministic for one, two, or many leading channels, with safe zero-feedback wording and natural singular/plural counts.
- Changed browser trend Preview to show the most recent 12 rows in ascending chronology while retaining complete trend rows in PDF and CSV.
- Changed Important Feedback to prefer normalized `Feedback.message` over generic titles, added deterministic priority/newest/ID ordering, retained the full safe body in CSV, and added bounded Preview plus measured multi-line PDF excerpts without exposing contacts or provider/source payloads.
- Humanized `OTHER` to `Other`, `CUSTOMER` to `Customer`, and compound enum-style report values while preserving established initialisms and leaving feedback bodies unchanged.
- Added focused scope, workload, tie, trend, body-selection, ordering, humanization, PDF-geometry, cross-format, validation, and security regressions. Verification passed: Phase 25.4 frontend 7/7 and backend 38/38; Platform Administrator 42/42; Phase 25.3 frontend 16/16 plus backend 38/38; integrations 31/31; AI 18/18; automation 88/88; Prisma validation; typecheck; lint; formatting; backend/frontend builds; and `git diff --check`. A read-only Kiyovu/New report smoke returned the expected 2 Open and 0 Completed records with matching workload/comparison values. No browser/manual testing, schema/migration/seed/data mutation, Executive calculation change, or unrelated Admin redesign was performed.

## 2026-08-17 - Phase 25.4B — PDF Section Flow, Layout & Report Humanization Correction

- Fixed shared PDFKit cursor/width leakage that caused later section headings and descriptions to inherit the X position of table, KPI, and visual-summary value text.
- Introduced canonical A4 content geometry and explicit helper cursor restoration; all normal headings/descriptions now start at the same left margin.
- Added section-aware page preflight that groups each heading, complete description, table header, and first row or meaningful initial content; table headers repeat after internal page breaks.
- Replaced inline continued-text previous-period comparisons with a measured five-column grid supporting wrapped metric labels, aligned values, and fully readable zero-baseline wording.
- Centralized generated report labels on the shared display formatter, correcting Management Summary and CSV wording to `QR Code` and preserving QR/AI/API/CSV/PDF/SMS/URL/IP/OAuth initialisms plus established role/provider/workflow labels.
- Preserved Phase 25.4A scope semantics, integration-attention logic, CSV BOM/escaping/formula protection, and physical PDF footer/page-count safeguards. No Prisma schema, migration, seed, report calculation, report architecture, or unrelated Admin change was introduced.
- Added focused layout diagnostics and regression tests. Verification passed: Phase 25.4 frontend 4/4 and backend 30/30; Phase 25.3 frontend 16/16 plus backend 30/30; integrations 31/31; AI 18/18; automation 88/88; Prisma validation; typecheck; lint; formatting; production builds; and `git diff --check`. Manual browser/downloaded-file retesting remains with the user.

## 2026-08-17 - Phase 25.4A Report Export & Scope Consistency Correction

- Fixed shared PDFKit pagination by drawing footers on buffered content pages without allowing normal bottom-margin text flow to create new pages; added a post-footer page-count invariant and object-level physical-PDF regression coverage for Executive, Feedback, and Operations.
- Added shared report scope metadata used by Preview, PDF, and CSV. Executive Branch scope now filters feedback, trends/distributions, branches, membership-access users, and integrations routed through `defaultBranchId`; business-owned Customer profiles and Business lifecycle/approval state remain explicitly labeled business-wide.
- Corrected Business adoption to use selected-branch counts for Branches, Users with branch access, Feedback, and routed providers, with the Customer profile column explicitly business-wide. Added dynamic platform versus in-scope user and comparison labels.
- Humanized approved supervisor-facing report enum values without changing persisted values, retained UTF-8 BOM/escaping, and hardened CSV formula-leading cells.
- Corrected integration health so the persisted successful test value `PASSED` is healthy. The current Kigali Harvest whole-business fixture is correctly 3/7 needing attention rather than 7/7; Kiyovu branch routing is 2/3 needing attention.
- Added focused scope, cross-format, CSV safety, health-classification, and physical-PDF tests. No schema, migration, seed, report architecture, authorization, external integration, or unrelated Admin change was introduced; manual retesting remains with the user.

## 2026-08-17 - Phase 25.4 Supervisor-Focused Reporting Consolidation

- Replaced nine fragmented Platform Administrator report choices with exactly Executive Platform Report, Feedback & Customer Experience Report, and Operations & System Health Report; Executive is the default.
- Consolidated persisted adoption, user/customer, feedback/channel/workflow/category/priority/sentiment/AI, integration/synchronization/webhook, automation, core-service, and approval-workload metrics into three dedicated builders with shared scoping, validation, period comparison, renderers, and fixed Indigo branding.
- Added clear lifetime versus selected-period KPIs, deterministic Management Summaries, report-aware filters, parameterized scoped trends, current/previous/absolute/percentage comparisons with safe zero baselines, semantic sentiment/health colors, human-readable operational notes, and professional zero-result preview/PDF/CSV handling.
- Preserved `PLATFORM_ADMIN` authorization, in-memory no-store PDF/CSV export, UTF-8 BOM/CSV escaping, report footer/page numbering, platform report settings, Phase 25.3 appearance/modals, Phase 25.2 lifecycle, and Phase 25.1 List/Grid behavior. No migration, seed change, external AI summary call, report persistence, or browser/manual testing was introduced.
- Added focused Phase 25.4 backend/frontend tests and completed read-only local database smoke coverage for all three reports, combined feedback filters, and a zero-result period. Verification passed: Phase 25.4 24/24; Phase 25.3 frontend 16/16 plus Platform Administrator backend 19/19 at that run; integrations 31/31; AI 18/18; automation 88/88; Prisma validation; typecheck; lint; formatting; backend/frontend builds; and `git diff --check`. The existing non-blocking Vite chunk advisory remains. No browser/manual testing was performed.

## 2026-08-17 - Phase 25.3 Strict UI/UX Correction, Indigo Design System & Professional Detail Modals

- Replaced rejected pink/rose/fuchsia branding with fixed shared Indigo tokens (`#4F46E5`) across public, auth, account, tenant, admin, navigation, controls, charts, modals, and reports while retaining semantic green/red/amber/neutral states.
- Removed arbitrary primary/accent controls and dynamic token mutation. Deprecated database fields remain compatibility-only and normalize to Indigo at runtime; no new migration was created. After the user confirmed the Phase 25.2 migration was already applied, its temporary Phase 25.3 color edit was reverted byte-for-byte to preserve immutable migration history.
- Fixed global appearance propagation by removing the stale personal-theme storage override, caching only platform appearance for first paint, and adding a settings revision signal that immediately reapplies Light/Dark/System after every save, including same-value saves.
- Added reusable accessible admin detail/technical/danger/confirmation modal components and migrated Manage User, Feedback Details, and Manage Connection away from inline Grid-card expansion. Added human-readable integration errors and collapsed raw technical codes.
- Substantially redesigned Business Details, Reporting Center, organized Platform Settings, and Platform Health while preserving Phase 25.2 lifecycle/actions/security and Phase 25.1 List/Grid behavior.
- Added 16 focused Phase 25.3 checks covering theme, fixed color, modals, mobile architecture, reports, business lifecycle, Platform Health, safe APIs, routing, and collection persistence. Verification passed: Phase 25.3 16/16 plus admin backend 8/8, Phase 25.2 7/7, Phase 25.1 5/5, admin routes 4/4, integration routes 2/2, integrations 31/31, AI 18/18, automation 88/88, Prisma validation, typecheck, lint, format check, backend/frontend production builds, static rejection scans, and `git diff --check`. The frontend retains its non-blocking chunk-size advisory. Browser automation/manual testing was not performed.

## 2026-08-17 - Phase 25.2 Platform Administration Hardening, Design System, and Business Approval

- Added pending-by-default business onboarding with explicit Platform Administrator create/edit/approve/reject/suspend/reactivate/archive transitions and clear non-active tenant experiences.
- Hardened operational boundaries so tenant services require an active business while preserving minimum business-context reads for review-state UI.
- Added safe Platform Administrator user/session governance, read-only feedback detail oversight, safe integration detail/pause/resume/Demo disconnect controls, pending approval KPIs/actions, and minimal audited admin mutations.
- Expanded only genuinely consumed platform settings for public hero/support content and report defaults/branding. The configurable palette introduced in this Phase 25.2 change was superseded by Phase 25.3's fixed Indigo system before migration application.
- Enforced and tested appearance precedence, session-aware public navigation/root routing, authenticated Login/Register redirection, and direct access to informational public routes.
- Added migration `20260817120000_phase_25_2_admin_hardening` for the business lifecycle enum/default, expanded platform settings, and `platform_admin_activities`; it was not applied by Codex and was later confirmed successfully applied by the user on 2026-08-17.
- Preserved the exact Phase 25.1 List/Grid coverage/default/persistence policy and all existing tenant, connector, OAuth, webhook, AI, automation, and report boundaries.
- Verification passed: typecheck, lint, production build, Phase 25.2 focused checks 7/7 plus admin backend 8/8, Phase 25.1 regression checks 5/5 plus admin backend 8/8, AI 18/18, automation 88/88, integrations 31/31, legal 3/3, seed 3/3, and router checks. No browser automation or manual browser testing was performed.

## 2026-08-16 - Phase 25.1 System-Wide Responsive UI, List/Grid Views, and Platform Settings

- Added a reusable accessible List/Grid toggle with exact responsive/item-count defaults and independently persisted per-page local preferences.
- Applied List/Grid views to admin Businesses, Users, Feedback, and Integrations and tenant Unified Feedback, Customers, Branches, Staff, Invitations, Automation Rules, and QR Codes; documented justified exceptions for dashboard, chronological, generated-report, security, settings-editor, fixed-provider, and authored-content surfaces.
- Redesigned `/admin/feedback` and `/admin/integrations` with compact collapsible filters, active counts, clear actions, responsive cards, empty states, persisted views, and narrow-safe pagination while preserving backend query contracts.
- Added `/admin/settings`, public safe branding reads, protected Platform Administrator settings reads/updates, strict validation, singleton Prisma persistence, and migration `20260816120000_phase_25_1_platform_settings`.
- Applied platform identity, headline, footer, default appearance, logo, document title, contrast-aware primary/accent CSS tokens, and shared button/focus styling globally.
- Removed the 320px body floor, reduced very-narrow shell gutters, constrained dialogs to the dynamic viewport, kept existing mobile drawers, and improved wrapping/internal overflow behavior around 300px.
- Added focused frontend policy/static tests and backend validation/authorization/persistence-wiring tests. Prisma validation/generation, typecheck, lint, separate backend/frontend builds, 5 frontend Phase 25.1 tests, 8 backend admin tests, and 4 frontend admin checks pass. Browser/manual testing and migration application remain with the user.

## 2026-08-16 - Phase 25 Platform Administrator Dashboard & Reporting

- Replaced the `/admin/businesses`-only Platform Administrator entry with a responsive professional console at `/admin`; Platform Administrator login now lands there, while Business Owner/Staff/Customer redirects remain unchanged.
- Added functional admin navigation and pages for Dashboard, Businesses, Users, Feedback, Integrations, Reports, and System Health; no dead Activity, Audit, or Settings links were added.
- Added real database-backed KPIs, feedback trend presets/comparison, channel distribution, business growth, sentiment, integration adoption/health, persisted-state action-required items, safe recent activity, and business overview charts/tables through Recharts.
- Improved existing admin Businesses with sorting plus branch, membership, feedback, integration, recent-activity, suspend, and reactivate context.
- Added protected `/api/admin` services for dashboard analytics, filter options, users, feedback, integrations, system health, report preview, and report export. All require `PLATFORM_ADMIN` and exclude secrets.
- Added nine on-demand report types with filtered real data, branded server-generated PDF, and UTF-8 CSV. Report history/files are intentionally not persisted and no Prisma migration was required.
- Added `recharts`, `pdfkit`, and `@types/pdfkit`; added focused Phase 25 backend and frontend tests.
- Static/regression verification passed: Phase 25 10/10 total focused checks, AI 18/18, automation 88/88, integrations 31/31, legal 3/3, seed 3/3, router checks, Prisma validation, typecheck, lint, formatting, and build. Browser/manual testing was not performed.

## 2026-08-16 - Shared Meta Webhook WhatsApp Dispatch Repair

- Fixed signed `whatsapp_business_account` deliveries sent to `/api/integrations/meta/webhook` being accepted by HMAC validation but passed only to the Facebook/Instagram parser, which returned `received: 0` because WhatsApp objects are intentionally not social comment events.
- Added strict post-signature dispatch by Meta `object` type so WhatsApp Business Account deliveries use the existing Phase 22 WhatsApp processor while Facebook Page and Instagram deliveries continue to use the Phase 24 social processor.
- Tightened Live WhatsApp tenant resolution so a signed delivery matches both `entry[].id` (WABA ID, when present) and `metadata.phone_number_id` before processing.
- Added focused HTTP regression coverage for signed WhatsApp text import, WABA/phone lookup, duplicate replay, non-text media skip, signed Facebook/Instagram dispatch, invalid signature rejection, and exact GET challenge behavior.
- Preserved exact raw-body HMAC validation, existing environment variable names/values, Meta/Cloudflare configuration, duplicate protection, Phase 4 ingestion, tenant isolation, and all Prisma schema/migration state. Browser/manual testing remains with the user.

## 2026-08-16 - Clean Database Recovery Runbook and Comprehensive Development Seed

- Extended the existing Prisma seed from a platform-administrator-only workflow to a deterministic, idempotent non-production dataset covering authentication roles, two tenant-isolated businesses, branch access, customers, all feedback channels and workflow states, public/QR intake, AI result states, automation definitions/history, and Demo integration synchronization history.
- Added stable `dev_seed_*` ownership, reserved `.test` login identities, configurable local password hashing, conflict guards, record-level upserts, production disabling, and focused fixture safety/coverage tests.
- Seeded six integrations exclusively as clearly labeled Demo Mode records and deliberately created no Live connections, credentials, OAuth states, webhook deliveries, external provider calls, AI requests, or automation jobs.
- Documented a manual local XAMPP recovery sequence that drops and recreates only `sme_feedback_aggregator`, applies the existing committed migrations, regenerates Prisma Client, seeds, and verifies migration status. Codex executed no destructive database or browser/manual operation.
- Confirmed this maintenance change requires no Prisma schema or migration modification; notifications and persisted analytics remain unseeded because those later-phase models are not implemented.

## 2026-08-16 - Meta Webhook GET Verification Repair

- Fixed `GET /api/integrations/meta/webhook` returning `INTERNAL_SERVER_ERROR` after a valid token match because the protocol handshake awaited an unrelated Prisma connection-status update.
- Kept GET verification limited to the required Meta query parameters and the existing backend `META_WHATSAPP_VERIFY_TOKEN`, returning the exact `hub.challenge` as plain text without requiring a raw body or `X-Hub-Signature-256`.
- Added controlled `400` handling for missing verification parameters and `403` handling for invalid mode/token values with a dedicated safe integration error code.
- Added focused HTTP regression tests for valid token/challenge behavior, invalid token behavior, missing parameters, unsigned GET verification, and mandatory POST signature enforcement.
- Preserved Phase 24 Facebook/Instagram signed POST processing, the separate Phase 22 WhatsApp webhook behavior, existing environment variable names/values, and all database/schema/migration and AI/automation worker code.

## 2026-08-11 - Public Backend Legal Pages for Meta App Publishing

- Added unauthenticated Express pages at `GET /privacy`, `GET /terms`, and `GET /data-deletion` so the existing backend Cloudflare tunnel can provide Meta with public legal URLs.
- Added responsive, dependency-free HTML for the SME Feedback Aggregator Privacy Policy, Terms of Service, and User Data Deletion Instructions, including cross-links and the application contact email `thecominggreatone@gmail.com`.
- Kept the pages outside frontend authentication and `/api` business/integration flows; they perform no database query, set no application cookie, load no external script or asset, and expose no configuration secret.
- Added native HTTP-level backend tests confirming unauthenticated `200` HTML responses and required page text.
- Confirmed no Prisma schema change, migration, package, integration behavior change, browser session, browser automation, screenshot, or manual-verification claim was added.

## 2026-08-10 - Phase 24 Live Facebook + Instagram Meta Social Webhook Implementation

- Implemented the Live Facebook Page and Live Instagram professional-account inbound comment webhook MVP on the existing Facebook and Instagram integration cards.
- Added shared Meta webhook security helpers and reused them from Live WhatsApp so Facebook, Instagram, and WhatsApp validate `X-Hub-Signature-256` over exact raw request bytes before JSON parsing.
- Added `/api/integrations/meta/webhook` GET/POST endpoints, Live Facebook/Instagram connector registration, encrypted backend-only developer/test token storage, one same-provider social connection per Business in service logic, signed webhook delivery processing, provider comment ID deduplication, safe webhook activity, and Unified Inbox Live Facebook/Instagram source details.
- Reused existing Phase 20/22/23 integration storage; no Prisma migration was required.
- Updated `/business/:businessId/integrations` to support Live Facebook and Live Instagram setup/edit/test/webhook-activity states on the existing provider surfaces without adding duplicate cards or Sync Now for webhook-driven Live social connections.
- Confirmed no replies, DMs, Messenger, publishing, moderation, media download, polling, scheduled sync, production OAuth onboarding, multiple social accounts per provider, live Google Reviews, X, browser automation, screenshots/reference images, or direct `Feedback` insert path was added. Manual Meta/browser verification remains pending.

## 2026-08-10 - Phase 23 Live Outlook / Microsoft Email Implementation

- Implemented the inbound-only Live Outlook Microsoft Graph OAuth MVP on the existing Live Email integration surface.
- Added migration `20260810170000_phase_23_live_outlook_email`, changing Live Email cardinality to one connection per email provider type per Business so Gmail and Outlook can coexist while duplicate Gmail/duplicate Outlook connections remain blocked by service logic.
- Added Microsoft OAuth initiation/callback handling with PKCE state, encrypted backend-only token storage, delegated `offline_access User.Read Mail.Read` scopes, Microsoft Graph v1.0 Inbox-only reads, immutable ID preference, text-body preference, latest-20 initial import, delta cursor handling, and metadata-only attachment mapping.
- Added an Email Live connector facade that dispatches to Gmail or Outlook while preserving the Phase 20 connector contract and mandatory Phase 4 `FeedbackProcessingService` ingestion path.
- Updated `/business/:businessId/integrations` to keep a single Email Live card with separate Gmail and Outlook rows, provider-specific OAuth notices, provider picker, reauthorization actions, run details text, and safe masked mailbox display.
- Confirmed no Mail.Send, SMTP/IMAP mailbox sync, outbound email/replies, Graph beta, full mailbox scan, scheduled sync/webhooks, provider polling, attachment binary download, or direct `Feedback` insert path was added. Manual real Outlook OAuth/sync/browser verification remains pending.

## 2026-08-10 - Phase 22 Live WhatsApp Cloud API Implementation

- Implemented the Meta test-number inbound webhook MVP for Live WhatsApp Cloud API.
- Added migration `20260810120000_phase_22_live_whatsapp_cloud_api` for Live WhatsApp connection metadata, `META_WHATSAPP` credentials, `WEBHOOK` trigger type, and safe webhook delivery activity records; applied it locally after shortening MySQL constraint names and resolving the initial identifier-length migration failure.
- Added the Live WhatsApp connector, Graph phone-number test, encrypted backend-only access-token storage, GET webhook verification, raw-body `X-Hub-Signature-256` validation, phone-number-ID tenant resolution, inbound text-message normalization, provider-message-ID deduplication, and Phase 4 `FeedbackProcessingService` ingestion reuse.
- Updated `/business/:businessId/integrations` to support Live WhatsApp setup/edit states on the existing WhatsApp provider surface, show masked identifiers/webhook status, remove Sync Now for Live WhatsApp, and expose webhook activity.
- Confirmed no outbound WhatsApp replies, templates, media download, polling, scheduled sync, Redis queue, production phone-number onboarding, WhatsApp Web/Twilio path, browser automation, screenshots/reference images, Outlook, live Google Reviews, or social media implementation was added.
- Added focused integration tests for Live WhatsApp registration, signature validation, sender normalization/masking, feedback normalization, and disabled manual sync entry points. Manual Meta test-number/browser verification remains pending.

## 2026-08-10 - Phase 22 Live WhatsApp Cloud API Discovery

- Completed documentation-only discovery in `PHASE_22_DISCOVERY_REPORT.md` for a same-day Meta test-number Live WhatsApp MVP.
- Recommended inbound text webhook ingestion through Meta WhatsApp Cloud API, public HTTPS callback, GET verification, `X-Hub-Signature-256` raw-body signature validation, phone-number-ID tenant resolution, encrypted Meta credential storage, one Live WhatsApp connection per Business, one required active default Branch, Demo/Live WhatsApp coexistence, provider-message-ID deduplication, and mandatory Phase 4 `FeedbackProcessingService` reuse.
- Recommended Cloudflare Quick Tunnel for temporary local HTTPS webhook testing on Windows without Docker or public app deployment.
- Recorded that non-text messages, media downloads, outbound replies, templates, production phone-number onboarding, polling, scheduled sync, Redis, Outlook, and social live integrations remain out of scope.
- Confirmed no application code, Prisma schema, migration, package, reference image, Meta app, Meta credential, WhatsApp Cloud API call, public webhook, tunnel, real WhatsApp message processing, browser session, browser automation, manual verification claim, or Outlook implementation was added.

## 2026-08-05 - Phase 21 Live Gmail Integration Implementation

- Recovered the interrupted Phase 21 implementation and completed the Gmail-only Live Email MVP.
- Added Gmail OAuth initiation/callback handling with PKCE-backed one-time state, encrypted backend-only credential storage, Live Email connection metadata, Gmail Inbox synchronization, history-ID cursor support, metadata-only attachment mapping, plain-text-only message extraction, and safe inbox source metadata.
- Reused the Phase 20 connector framework and Phase 4 `FeedbackProcessingService` for imports; no direct `Feedback` insertion path, IMAP/SMTP mailbox connector, outbound email, scheduled sync, webhook handling, raw MIME storage, or attachment binary storage was added.
- Extended `/business/:businessId/integrations` with Demo/Live Email coexistence, Gmail authorization and reauthorization states, Live Mode disclosures, masked account display, and the Phase 21 reference images.
- Added focused Phase 21 tests for credential encryption and Gmail message parsing/normalization with mocked data only; no live Gmail API calls or real Gmail credentials were used in automated tests.
- Created and applied migration `20260805090000_phase_21_live_email_gmail_oauth` locally.

## 2026-08-05 - Phase 21 Live Email Integration Discovery

- Completed documentation-only discovery for Phase 21 Live Email Integration in `PHASE_21_DISCOVERY_REPORT.md`.
- Recommended a Gmail-only OAuth MVP with one Live Email connection per Business, one default active Branch, Inbox-only manual synchronization, latest-20 initial import, Gmail history-ID incremental cursor, provider-ID/Message-ID deduplication, metadata-only attachments, plain-text-only Feedback messages, encrypted backend-only credentials, and Phase 20/Phase 4 pipeline reuse.
- Recorded that Phase 21 implementation has not started and that no application code, Prisma schema, migration, package, reference image, credentials, mailbox connection, provider API call, IMAP/SMTP call, email import, browser session, browser automation, or manual verification was added.
- Confirmed Phase 22, Phase 23, Phase 24, and Phase 25 have not started.

## 2026-08-05 - Phase 20 Provider Card Grid Repair

- Updated `/business/:businessId/integrations` so the Phase 20 provider-card grid remains one column on mobile and two columns from the tablet breakpoint upward, removing the previous three-card desktop expansion.
- Preserved provider card content, actions, filters, summary panels, synchronization history, API calls, permissions, Demo Mode labeling, backend behavior, reference files, and manual-verification status.

## 2026-08-03 - Phase 20 Integrations Premium UI Redesign

- Rebuilt `/business/:businessId/integrations` as a reference-aligned premium workspace with a stronger header action set, prominent Demo Mode banner, responsive filter row, provider connection cards, integration summary rail, recent activity rail, and redesigned synchronization run history.
- Consolidated raw enum display behind friendly labels for providers, connection states, scenarios, run statuses, item statuses, and safe result codes.
- Added polished card/dialog states for connected, paused, disconnected, error, running/progress, completed, completed-with-errors, failed, empty, and loading scenarios while preserving existing Phase 20 API calls, query keys, cache invalidation, branch selection, lifecycle actions, sync, item retry, run history, and Demo Mode boundaries.
- Confirmed no backend business rules, Prisma schema, migration, provider credentials, OAuth, webhooks, live provider calls, reference files, browser sessions, browser automation, screenshots, or manual verification claims were added.

## 2026-08-03 - Phase 20 Integrations Route Repair

- Repaired Phase 20 frontend integration routing so `/business/:businessId/integrations` remains the canonical workspace route and planned integration detail/history URLs redirect there instead of reaching the wildcard 404.
- Added a focused static router regression check for route registration, fallback ordering, lazy export wiring, and owner/admin sidebar linking.
- Updated memory documentation to keep Phase 20 manual browser/functional verification pending with the user.

## 2026-08-03 - Phase 20 Connector Framework and Demo Synchronization Implementation

- Implemented the Demo Mode-only connector framework for Google Reviews, WhatsApp, Email, X, Facebook, and Instagram.
- Added migration `20260803090000_phase_20_connector_framework_demo_sync` for `IntegrationConnection`, `SynchronizationRun`, `SynchronizationItem`, integration enums, and the `FACEBOOK` feedback channel; applied it locally.
- Added owner/admin-only integration APIs for provider discovery, connection create/edit/test/sync, pause/resume/disconnect/reconnect, run history, item results, and failed-item retry.
- Added deterministic demo connectors that normalize simulated provider items into `NormalizedFeedbackInput` and import only through `FeedbackProcessingService.process`.
- Added `/business/:businessId/integrations`, owner/admin workspace navigation, Demo Mode disclosure, provider cards, connection controls, run history, item results, and inbox channel/source updates for demo imports.
- Added disabled-by-default integration sync worker environment settings and focused Phase 20 backend tests.
- Verified Prisma validation/generation, migration deploy/status, direct database shape, format, typecheck, lint, build, Phase 13 tests, Phase 14 tests, Phase 20 tests, and `git diff --check`. Manual browser/functional verification remains pending.

## 2026-08-03 - Phase 20 Connector Framework Discovery

- Completed documentation-only discovery for Phase 20 Connector Framework and Demo Synchronization.
- Added `PHASE_20_DISCOVERY_REPORT.md` with the recommended Demo Mode connector MVP, provider list, connector interface, registry, database shape, API plan, UI plan, security limits, test strategy, manual demonstration path, and out-of-scope live-provider boundaries.
- Recorded that Phase 20 implementation has not started, no application code changed, Prisma schema is unchanged, no migration/package/reference image/browser work was added, no provider API was called, and no feedback was imported.
- Updated project memory to preserve the latest manual-verification state: Phase 11 and Phase 12 core supervisor workflows have passed, Phase 13 AI configuration readiness has passed, Phase 14 rule creation/activation has passed, and exhaustive manual verification remains pending.

## 2026-08-02 - AI Manual Retry Eligibility and Review Preservation Repair

- Reworked Phase 13 manual AI retry so clicking Retry resets the automatic retry counter instead of pushing already-exhausted analyses farther past `AI_MAX_RETRIES`.
- Kept queued and processing retry requests eligible for the AI worker, including rows that had previously reached the automatic retry ceiling.
- Preserved the last generated AI sentiment, language, and summary while a new retry is pending or if the latest retry fails, while clearing stale category-suggestion lifecycle before replacement suggestions are generated.
- Updated the feedback drawer AI panel to disable Retry while an analysis is queued or processing and to clearly label when the previous AI review is being shown.

## 2026-08-02 - Portal Sidebar Shared Scroll Revert

- Reverted the fixed desktop sidebar scrolling behavior so business and account sidebars once again scroll together with the page content.
- Removed the hidden internal sidebar scrollbar utility because sidebar navigation no longer owns its own scroll pane.
- Kept the useful bottom sidebar Sign out actions, the account mobile drawer, and the admin header Sign out action.

## 2026-08-02 - Feedback Inbox Filter Toolbar Wrapping Repair

- Reworked the feedback inbox primary filter toolbar from a rigid single-line grid into a wrapping responsive toolbar.
- Kept the search field at a healthy minimum width and let visible filters wrap within the panel when there is not enough horizontal room, avoiding horizontal overflow.
- Preserved the same search debounce, URL-backed filters, advanced filter popover, clear action, and backend request parameters.

## 2026-08-02 - Feedback Inbox Search Toolbar Alignment Repair

- Reworked the feedback inbox primary filter toolbar so the search field gets a proper wide column on large screens instead of collapsing beside branch/status/channel/sort controls.
- Preserved the same search query behavior, debouncing, URL-backed filters, advanced filter popover, clear action, and backend request parameters.

## 2026-08-02 - Portal Sidebar Scrollbar Polish

- Hid the internal business and account sidebar navigation scrollbars while keeping the sidebar navigation scrollable on short viewports.
- Preserved the fixed-sidebar behavior, bottom Sign out actions, mobile account drawer behavior, and all route/auth behavior.

## 2026-08-02 - Portal Sidebar Fixed Scroll and Logout Repair

- Updated business workspace sidebars so desktop page scrolling happens in the main content pane while the sidebar remains fixed inside the workspace frame.
- Updated account portal sidebars with the same fixed desktop behavior and added a working mobile account navigation drawer.
- Added bottom-of-sidebar Sign out actions to business and account portal sidebars using the existing logout flow.
- Added a platform-admin header Sign out action because the current admin portal does not have a sidebar.
- Preserved backend authentication contracts, cookie/session logout behavior, protected-route behavior, business switching, and existing navigation destinations.

## 2026-08-02 - Automation Rule Selection and Feedback Picker Usability Repair

- Made automation rules selectable by clicking the whole desktop table row, excluding the actions column, instead of requiring users to discover that only the rule name was clickable.
- Made mobile automation rule cards selectable from the whole card body while keeping lifecycle action buttons separate.
- Replaced the Review and test feedback picker data flow with backend-searched, paginated feedback results so owners/admins can search feedback content, customer names, branches, and other existing feedback-search fields without loading only one large static option list.
- Preserved automation rule save, lifecycle actions, test/manual-run backend validation, tenant/branch enforcement, and existing feedback list API contracts.

## 2026-08-02 - Automation Management UX and Archive Lifecycle Repair

- Updated `/business/:businessId/automations` so creating a rule resets the builder back to an empty draft state and shows a success notice instead of leaving the just-saved rule in the form.
- Added shadcn-style confirmation dialogs before duplicating or permanently deleting automation rules.
- Added owner/admin backend and frontend support to restore archived rules as drafts and permanently delete only already archived rules.
- Replaced the raw Review and test feedback ID field with a shadcn-style feedback picker loaded from accessible feedback records.
- Preserved automation validation, rule execution, human override protection, tenant/branch enforcement, worker behavior, and existing archive behavior. No Prisma migration was required.

## 2026-08-02 - Automation Draft Target Normalization Repair

- Fixed automation draft creation/editing so stale action target fields are normalized before submission and again on the backend before validation and persistence.
- Prevented an empty or irrelevant `categoryId` left over from a previously selected `SET_CATEGORY` action from reaching Prisma as `AutomationAction.category_id = ""`, which caused a backend `P2003` foreign-key failure and a 500 response.
- Added backend automation policy coverage for stale target cleanup and blank selected ID normalization.
- Preserved automation rule contracts, active-rule validation, tenant/branch/category/member checks, execution behavior, worker behavior, and existing Phase 14 field-source protection.

## 2026-08-02 - Business Workspace Header Responsive Alignment Repair

- Reworked the shared business `WorkspaceShell` header so title, workspace search, active-business selector, theme/notification controls, and page actions stay in a horizontal flex layout on tablet/desktop where space allows and stack cleanly on mobile.
- Reduced the active-business selector width so longer business names such as `Kigali Universe` do not force customer page action buttons into a narrow vertical column.
- Kept the `/business/:businessId/customers` Refresh and New Customer actions side-by-side outside mobile layouts.
- Confirmed this is a frontend presentation repair only; no backend API contract, Prisma schema, migration, business switching behavior, customer query behavior, customer mutation behavior, tenant/branch authorization, feedback, AI, automation, public feedback, or QR behavior was changed.

## 2026-08-02 - Branch Form Responsive Required Field Repair

- Reworked `/business/:businessId/branches/new` branch form layout so the form stays stacked until wider viewports, the address field has full-width room, and action buttons wrap/stack cleanly instead of crowding a narrow side column.
- Added visible `*` markers to required branch fields: branch name, code, country, city, and address.
- Added placeholders to every branch form input while preserving React Hook Form ownership, validation, submit behavior, and branch create/edit API payloads.
- Confirmed this is a frontend presentation repair only; no backend API contract, Prisma schema, migration, branch authorization, business setup behavior, feedback, customer, AI, automation, public feedback, or QR behavior was changed.

## 2026-08-02 - Automation Builder Responsive Row Repair

- Reworked `/business/:businessId/automations` rule-builder condition/action rows so type, operator, value, and row controls use a container-aware grid instead of viewport-only columns.
- Prevented long shadcn-style select values such as `Less Than Or Equal` from wrapping into tall broken controls by truncating selected values on one line.
- Delayed the automations split workspace layout to a wider breakpoint so the builder stacks instead of squeezing on narrower or zoomed layouts.
- Confirmed this is a frontend presentation repair only; no automation API contract, Prisma schema, migration, rule validation, execution worker, tenant/branch authorization, AI, customer, public feedback, or QR behavior was changed.

## 2026-08-02 - Customer List Filter Display and Responsive Repair

- Reworked `/business/:businessId/customers` so search, status, branch, sort, clear, and an advanced-filter trigger stay in a compact responsive toolbar instead of rendering every customer filter inline.
- Moved channel, contact-state, rating-range, and latest-feedback date filters into a styled popover while preserving their existing URL-backed parameters and backend query behavior.
- Raised the customer desktop table breakpoint and kept stacked customer cards available on narrower or zoomed layouts so row actions remain reachable.
- Confirmed this is a frontend presentation repair only; no backend API contract, Prisma schema, migration, tenant/branch authorization, customer creation, feedback linking, AI, automation, public feedback, or QR behavior was changed.

## 2026-08-02 - Workspace Dropdown and Date Picker Standardization

- Replaced remaining native frontend `<select>/<option>` dropdowns with shared shadcn-style Radix select fields across public feedback, manual feedback, QR creation, workspace business switching, customer filters, customer feedback history, inbox pagination/assignment, automation filters/builders, category settings, staff role management, invitations, and shared status filters.
- Replaced native date and datetime-local controls with a shared shadcn-style popover calendar/date-time field while preserving submitted string formats for URL filters and feedback occurrence dates.
- Confirmed this is a frontend UI-control standardization only; backend API contracts, Prisma schema, tenant/branch authorization, public/QR token behavior, idempotency, and feedback/customer/automation semantics were not changed.

## 2026-08-02 - Feedback Inbox Filter Display Repair

- Reworked `/business/:businessId/feedback` filter presentation so search, branch, status, channel, sort, clear, and the advanced-filter trigger stay aligned in a compact toolbar instead of showing every filter in one dense grid.
- Added local shadcn-style Radix Select and Popover UI primitives for styled inbox dropdowns and the advanced filter popover.
- Preserved all existing Phase 12 filters, URL-backed query state, active filter chips, and backend query behavior; no backend API contract, Prisma schema, migration, public feedback, QR, customer, AI, or automation behavior was changed.

## 2026-08-02 - Customer Form Ref and Placeholder Repair

- Fixed customer create/edit modal inputs so React Hook Form refs are forwarded to the actual input elements, allowing filled values to be captured correctly before validation.
- Added placeholders to the customer form fields used by Customer Profiles and the inbox create-from-feedback flow.
- Confirmed this is a frontend customer-form repair only; no backend API contract, database schema, migration, authentication, business setup, public feedback, QR, inbox filtering, AI, or automation behavior was changed.

## 2026-08-02 - Business Setup Required Field and Placeholder Repair

- Updated `/business/setup` to show visible `*` markers on required business and primary-branch fields and add placeholders to every setup field.
- Aligned frontend setup validation for optional primary-branch email, optional primary-branch phone, and primary-branch code with backend validation so invalid values surface as inline form errors before submission.
- Corrected the shared `TextField` wrapper class handling so layout classes such as `sm:col-span-2` apply to the field container instead of replacing the input styling.
- Confirmed this is a frontend setup-page UX/validation repair only; no backend API contract, database schema, migration, authentication, role redirect, membership enforcement, public feedback, QR, inbox, customer, AI, or automation behavior was changed.

## 2026-08-02 - Role-Based Auth Landing Repair

- Repaired default authenticated landing so platform administrators go to `/admin/businesses`, business owners and staff go through `/business`, and customers remain on `/account`.
- Preserved protected-route return behavior so users who are redirected to login from an authenticated route still return to their originally requested URL after successful email or Google login.
- Updated public-only, role-guard, root/error fallback redirects to use the same role-based destination helper instead of always sending authenticated users to `/account`.
- Confirmed this is a frontend routing repair only; no backend API contract, database schema, migration, business membership enforcement, idempotency, public portal, QR token, inbox, customer, AI, or automation behavior was changed.

## 2026-07-27 - Phase 14 Completion Audit and Field-Source Backfill

- Added follow-up migration `20260727143000_phase_14_field_source_backfill` without editing the applied Phase 14 base migration.
- Added `FeedbackFieldStateSource.DEFAULT` and backfilled `STATUS`, `PRIORITY`, `CATEGORY`, and `ASSIGNMENT` ownership rows for every existing feedback record without changing feedback values, executing rules, queueing automation events, or calling Gemini.
- Updated live automation field-source policy so new feedback initializes status as `SYSTEM` and priority/category/assignment as `DEFAULT`, while human, AI, and automation operations keep their explicit ownership semantics.
- Added focused Phase 14 tests for field-source policy, condition evaluation, validation/schema behavior, idempotency fingerprints, safe errors, rule limits, and preview/human-override policy.
- Made the automation rules list filters URL-backed through `search`, `status`, and `trigger` query parameters.
- Verified the local database now has 48 `FeedbackFieldState` rows for 12 feedback rows, with 12 rows per field and no duplicate `(feedbackId, field)` pairs. Manual browser/functional verification remains pending.

## 2026-07-27 - Phase 14 Automation Rules Engine Implementation

- Implemented Phase 14 Automation Rules Engine backend, frontend, database, worker, security, tests, and documentation scope.
- Added Prisma migration `20260727091241_phase_14_automation_rules` for automation rules, selected branch scopes, conditions, actions, queued events, executions, per-action execution results, field-source tracking, and system automation activity metadata.
- Added owner/admin-only automation APIs for rule CRUD, activate, pause, archive, duplicate, reorder, dry-run preview, manual run, execution list, and execution detail.
- Added non-blocking automation scheduling after feedback persistence and AI analysis completion, plus a database-backed worker with claim tokens, stale recovery, retry limits, idempotency fingerprints, loop-depth metadata, and safe errors/logs.
- Added system workflow actions for status, priority, category, assignment, and unassignment without impersonating a human member, while preserving human override protection through `FeedbackFieldState`.
- Added `/business/:businessId/automations`, workspace navigation, rule builder UI, lifecycle controls, preview/manual-run panel, execution history, and automation-aware activity timeline rendering.
- Added `npm run test:automation` with focused policy coverage and verified Prisma/schema/typecheck/lint/build/static checks. Manual browser/functional verification remains pending with the user.

## 2026-07-27 - Phase 14 Automation Rules Engine Discovery

- Completed Phase 14 Automation Rules Engine scope, architecture, security, concurrency, and implementation-readiness discovery as documentation-only work.
- Added `PHASE_14_DISCOVERY_REPORT.md` with the recommended MVP, open decisions, database shape, API plan, worker model, idempotency and loop-prevention strategy, security limits, and manual-test prerequisites.
- Recorded that Phase 14 implementation has not started and no application code, Prisma schema change, migration, package, reference image, browser test, browser automation, screenshot, or manual verification claim was added.
- Recommended owner/admin-only rule management, business-scoped rules, triggers `FEEDBACK_CREATED`, `AI_ANALYSIS_COMPLETED`, and `MANUAL_TEST`, flat `ALL`/`ANY` conditions, deterministic rule order, optional stop-processing, database-backed execution history, field-source tracking, and human override protection.
- Recorded that Phases 11, 12, and 13 manual verification remains pending and that Phases 11, 12, 13, and 14 will be manually tested together after Phase 14 implementation.
- Confirmed Phase 15 notifications/replies and Phase 20 connector work have not started.

## 2026-07-27 - Phase 13 Completion Audit and Test Coverage

- Completed a Phase 13 audit pass without changing the applied Phase 13 migration or running browser/manual verification.
- Added shared AI policy helpers and unit coverage for operational states, category-suggestion lifecycle states, UTC daily-limit boundaries, stale processing cutoffs, retry delays, transient provider failures, and invalid provider output handling.
- Hardened Phase 13 category suggestion lifecycle handling with `AVAILABLE`, `AUTO_APPLIED`, `MANUALLY_APPLIED`, `DISMISSED`, `CONFLICTED`, and `NONE` states while preserving legacy stored strings.
- Added the `aiSuggestionState` inbox filter, frontend URL/query plumbing, active filter chip, drawer lifecycle badges/messages, and expanded backfill result counts.
- Restricted business-wide AI status/backfill controls to owner/admin roles in both backend service logic and Business Settings rendering.
- Updated AI input truncation to slice by Unicode code points and expanded tests for exact-limit, over-limit, deterministic fingerprint, prompt-minimization, strict schema, and unsafe-output cases.
- Verified `npm run test:ai-analysis -w backend` and `npm run typecheck` pass after the audit changes.

## 2026-07-27 - Phase 13 AI Analysis Implementation

- Implemented Phase 13 AI Sentiment Analysis, Categorization, and Summaries backend, frontend, database, security, and documentation scope.
- Added backend `@google/genai` dependency, Gemini provider wrapper, AI provider abstraction, strict output validation, input minimization/truncation, prompt-injection boundaries, sanitized errors, bounded retries, daily business limit enforcement, and database-backed worker processing.
- Added Prisma migration `20260727083000_phase_13_ai_feedback_analysis` with `FeedbackAIAnalysisStatus`, `FeedbackAISentiment`, `FeedbackAIAnalysis`, and AI workflow activity enum values. The migration does not backfill existing feedback.
- Integrated non-blocking AI scheduling after Phase 4 feedback persistence without provider calls from source adapters.
- Added authenticated AI analysis, retry, category apply/dismiss, business AI status, and owner/admin backfill APIs with tenant, role, branch, human-override, and rate-limit controls.
- Added Phase 12 inbox sentiment/status filters, AI badges, feedback drawer AI analysis panel, and Business Settings AI status/backfill panel.
- Added focused AI validation tests and build configuration that excludes tests from production backend output while keeping them typechecked.
- Applied the migration locally and verified 12 existing feedback rows remain, 0 AI analysis rows were created by migration, and the migration row is present.
- Recorded that Phase 13 manual browser/functional verification remains pending and that Phases 11, 12, and 13 will be manually tested together later.

## 2026-07-26 - Phase 13 AI Analysis Discovery Started

- Started Phase 13 AI Sentiment Analysis, Categorization, and Summaries discovery as documentation-only work.
- Recorded that Phase 13 implementation has not started and no AI provider, model, provider abstraction, endpoint, schema change, migration, package, backfill, UI, reference image, browser test, browser automation, screenshot, or manual verification was added.
- Documented the active Phase 13 boundaries: immutable original feedback, derived AI metadata, centralized backend service, provider abstraction, tenant and branch scoping, human category override, non-blocking ingestion, and no internal notes/customer contact/attachment contents sent to AI in the MVP.
- Recorded that Phase 11 and Phase 12 manual verification remains pending and that Phases 11, 12, and 13 will be manually tested together later.
- Confirmed Phase 14 automation and Phase 20 connector work have not started.

## 2026-07-26 - Phase 12 Full Search and Filters Implementation

- Implemented Phase 12 Full Search and Filters backend and frontend without adding a Prisma schema change, migration, package, external search service, AI search, fuzzy search, saved views, exports, reports, or bulk actions.
- Added shared safe search normalization for trimmed, whitespace-collapsed, null-byte-safe, length-capped search with normalized email and Rwanda-compatible phone lookup support.
- Expanded Feedback Inbox search to submitted feedback/customer snapshot fields plus linked Customer identity fields, while keeping internal notes and activity text out of search.
- Standardized Feedback Inbox date filtering and sorting on `Feedback.receivedAt`.
- Added Feedback Inbox filters for assignment state, category state, rating range and unrated inclusion, received-date presets/custom range, and linked/unlinked Customer state.
- Added Customer list filters for branch, channel, rating range, latest feedback date range, contact state, and branch-safe latest-feedback sorting.
- Added Customer feedback-history URL-backed search, filters, sort, and pagination.
- Added URL-derived active filter chips, remove-one-filter behavior, clear-all behavior, controlled search input synchronization, and responsive filter controls.
- Tightened branch-scoped assignee option loading and safe stale/inaccessible filter ID handling.
- Recorded that Phase 11 and Phase 12 manual browser/functional verification remains pending with the user.

## 2026-07-26 - Phase 12 Search and Filters Discovery

- Completed Phase 12 Full Search and Filters scope, architecture, and implementation-readiness discovery as documentation only.
- Audited current inbox, customer list, customer feedback-history, URL query-state, backend query, role/branch, tenant, and database/index behavior.
- Documented the recommended Phase 12 MVP: consistent search normalization, inbox filter polish, customer list filters, customer feedback-history filters, URL-driven state, option-loading rules, security constraints, accessibility/responsive guidance, and no-migration recommendation for the MVP.
- Recorded that Phase 11 standalone manual verification remains pending because the user chose to manually test Phases 11 and 12 together after Phase 12 implementation.
- Confirmed no application code, Prisma schema, migration, package, reference image, browser testing, browser automation, manual verification claim, Phase 12 implementation, Phase 13 work, or Phase 20 work was added.

## 2026-07-26 - Phase 11 Reference Cleanup and Final Audit

- Renamed `frontend/references/phase11-customer-profiles-primary-premium.png` to `frontend/references/phase11-customer-profiles-primary.png`.
- Renamed `frontend/references/phase11-customer-profiles-states-premium.png` to `frontend/references/phase11-customer-profiles-states.png`.
- Removed extra Phase 11 reference file `frontend/references/phase11-customer-profiles-alternative-premium.png`.
- Confirmed exactly two final Phase 11 reference images remain.
- Audited Phase 11 scope and found no application behavior mismatch requiring code changes.
- Updated documentation for the exact final reference filenames and stale pre-implementation customer-model wording.
- Confirmed migration/database status remains intact, existing feedback remains present, no feedback was linked by migration backfill, Phase 11 manual verification remains pending, Phases 8-10 deferred verification remains pending, and Phase 12 and Phase 20 were not started.

## 2026-07-26 - Phase 11 Customer Profiles

- Implemented Phase 11 Customer Profiles backend, frontend, database, security, and documentation.
- Added Prisma migration `20260726110000_phase_11_customer_profiles` with `CustomerStatus`, `Customer`, `CustomerActivityType`, `CustomerActivity`, and nullable `Feedback.customerId`.
- Preserved immutable feedback snapshot fields `customerName`, `customerEmail`, and `customerPhone`; no historical customer backfill was performed.
- Added customer normalization, deterministic exact email/phone matching, possible-match groups, archive/reactivate, optimistic customer edit concurrency, and transactional feedback link/unlink/create-from-feedback activity.
- Added non-blocking customer auto-linking after new feedback persistence through the existing Phase 4 `FeedbackProcessingService`.
- Added authenticated customer APIs, customer list/detail frontend routes, Customers workspace navigation, and feedback drawer customer integration.
- Finalized Phase 11 reference files as `frontend/references/phase11-customer-profiles-primary.png` and `frontend/references/phase11-customer-profiles-states.png`.
- Confirmed no customer accounts, customer notes, follow-up consent, preferred contact method, fuzzy matching, AI matching, merge/unmerge, hard delete, Phase 12 work, Phase 20 connector work, packages, or external services were added.
- Applied the migration locally and confirmed migration status is up to date.
- Confirmed database state after migration: `customers=0`, existing `feedback=12`, linked feedback rows `0`.
- Manual browser/functional verification remains pending with the user.

## 2026-07-26 - Phase 11 Customer Profiles Discovery

- Completed Phase 11 Customer Profiles scope, architecture, and implementation-readiness discovery.
- Confirmed no `Customer` model exists yet and current customer data is stored only as immutable `Feedback` snapshot fields: `customerName`, `customerEmail`, and `customerPhone`.
- Documented the recommended Phase 11 MVP: business-scoped customer profiles, nullable feedback profile links, immutable feedback snapshots, customer list/details, manual creation/editing, manual link/unlink, deterministic email/phone matching, branch-safe aggregates, archive/reactivate, and minimal audit/activity.
- Documented that automatic fuzzy-name matching, irreversible merge, customer accounts, marketing, notifications, exports, external CRM sync, Phase 20 demo connectors, and live provider integrations remain out of scope for Phase 11 MVP.
- Updated memory documentation to record that Phases 8, 9, and 10 have passed core manual workflow, role, branch, responsive, and dark-mode testing but are not fully verified because deferred multi-tenant/security/regression checks remain until after Phase 20.
- Confirmed Phase 11 implementation has not started and Phase 20 has not started.
- Confirmed no application code, Prisma schema, migration, package, browser testing, browser automation, or manual verification claim was added.

## 2026-07-26 - Phase 8 Feedback Details Drawer Layout Repair

- Repaired the All Feedback detail drawer so it renders as a viewport-level right-side drawer instead of being constrained by the inbox/workspace document flow.
- Moved the drawer layer through a React portal mounted on `document.body`, removed the desktop `lg:static` layout path, and kept the existing `feedbackId` URL query synchronization.
- Updated drawer sizing, height, internal scrolling, body-scroll locking, backdrop opacity, close-button sizing, focus handling, and keyboard tab containment.
- Improved long-text wrapping for drawer details, source fields, customer contact values, and activity timeline entries.
- Preserved Phase 8 read-only details, loading/error states, filters, pagination, browser back/forward behavior, and close behavior.
- Preserved Phase 9 status transitions, internal notes, and activity timeline behavior.
- Preserved Phase 10 assignment, category, and priority controls and permissions.
- Confirmed no backend API contract, Prisma schema, migration, package, database record, Phase 11 work, or Phase 20 work was added.
- Browser verification was not performed by Codex; combined Phase 8+9+10 manual verification remains pending with the user.

## 2026-07-26 - Connector Roadmap Demo Synchronization Documentation

- Updated roadmap and memory documentation for the revised Phase 20 through Phase 25 connector strategy.
- Documented Phase 20 as the deadline-oriented Demo Mode synchronization framework using simulated external provider data.
- Documented planned provider simulators for Google Reviews, WhatsApp, Email, X, Facebook, and Instagram, with Google Reviews, WhatsApp, and Email prioritized for the strongest deadline implementation.
- Documented provider-inspired source previews, source item import states, synchronization workspace behavior, retry behavior, source metadata display, and Phase 8 unified inbox linkage.
- Documented mock/live connector architecture, shared connector contract concepts, and required Phase 4 `FeedbackProcessingService` reuse.
- Documented planned future database concepts for integration connections, synchronization runs, cursors, errors, and DEMO/LIVE connection mode without changing the Prisma schema.
- Documented future integration security and deployment considerations for Demo Mode labeling, live provider credentials, webhooks, token refresh, tenant isolation, rate limits, and provider approval.
- Confirmed Phase 8, Phase 9, and Phase 10 manual verification remains pending for combined user testing.
- Confirmed no backend application code, frontend application code, Prisma schema, migrations, packages, browser testing, Phase 11 work, or Phase 20 implementation was added.

## 2026-07-26 - Phase 10 Assignment, Categories, and Priorities

- Audited and completed Phase 10 backend and frontend work without starting Phase 11.
- Added Prisma migration `20260725162942_phase_10_assignment_categories_priorities` for priority, assignment, feedback categories, and activity snapshots.
- Added and hardened category APIs with tenant membership checks and owner/admin management permissions.
- Extended inbox APIs and UI with assignee, category, and priority filters plus safe list/detail response fields.
- Extended workflow APIs and detail drawer controls for assignment, eligible assignees, category assignment, priority updates, and activity timeline entries.
- Added Business Settings category management with create, edit, activate/deactivate, validation, and non-manager read-only visibility.
- Tightened branch-aware assignment rules, scoped update predicates, stale mutation refresh behavior, and tenant-safe filter validation.
- Updated README, architecture, API, database, security, deployment, implementation status, next steps, and AGENTS memory files.
- Confirmed Phase 8, Phase 9, and Phase 10 manual verification remains pending for combined user testing.
- Confirmed Phase 11 did not start.

## 2026-07-25 - Project Documentation Update: Combined Phase 8+9+10 Testing Plan

- Updated all memory files to reflect the user's decision to defer Phase 8 and Phase 9 manual testing until after Phase 10 is implemented.
- Updated AGENTS.md "Current Boundary": Phase 8 and Phase 9 are implemented (manual verification pending); Phase 10 may now begin; Phases 8, 9, and 10 will be tested together; Phase 11 must not start until combined testing is approved.
- Updated README.md: Phase 8 (pending verification), Phase 9 (pending verification, migration applied), Phase 10 (may now begin), updated "Not implemented yet" and "Current Limitations" sections.
- Updated IMPLEMENTATION_STATUS.md: Phase 8 and Phase 9 are pending verification (deferred for Phase 10); Phase 10 may now begin; updated Incomplete and Later-Phase Features sections.
- Updated NEXT_STEPS.md: Full rewrite with the new 8-step sequence (scope, decisions, design, implement, test together, fix, mark verified, start Phase 11).
- Updated CHANGELOG.md: Added this dated entry.
- Updated API_NOTES.md "Current API Limitations": Phase 8 and Phase 9 are implemented (manual verification pending); Phase 10 may now begin.
- Confirmed no application code, Prisma schema, or migrations were changed.
- Confirmed Phase 10 implementation did not start.
- Confirmed Phase 11 did not start.

## 2026-07-25 - Phase 9 Feedback Details and Workflow (resumed from interrupted state)

- Resumed interrupted Phase 9 implementation after internet outage.
- Completed missing frontend workflow panel in the detail drawer:
  - Added `WorkflowPanel` component with current status badge, status transition buttons for all valid transitions, and spinner/disabled states during mutation.
  - Added `ActivityRow` component that renders synthetic FEEDBACK_RECEIVED items, STATUS_CHANGED entries with before/after status badges, and NOTE_ADDED entries with note text.
  - Added add-note form with 2000-character limit, live character counter, trim-based validation, and success/error states.
  - Added `useMutation` for `updateFeedbackStatus` with cache invalidation for inbox list, feedback detail, and activity queries.
  - Added `useMutation` for `addFeedbackNote` with cache invalidation and note-text reset on success.
  - Added `useQuery` for `fetchFeedbackActivity` with loading skeleton state.
  - Added helper functions `getStatusIcon`, `getActivityIcon`, `getActivityBgClass`, `getActivityTextClass`.
- Preserved all existing Phase 8 inbox features: filters, pagination, summary cards, desktop table, mobile cards, detail drawer, URL state sync.
- Fixed unused `useCallback` import lint error.
- Confirmed backend typecheck, frontend typecheck, and frontend lint all pass.
- Confirmed no duplicate modules, routes, models, migrations, services, or components were created.
- Confirmed Phase 10 work was not started.

## 2026-07-25 - Phase 8 Unified Feedback Inbox

- Added backend module `feedback-inbox` with types, Zod schemas, service, controller, and routes.
- Added protected endpoints `GET /api/businesses/:businessId/feedback` (list) and `GET /api/businesses/:businessId/feedback/:feedbackId` (detail).
- Implemented query parameters for page, pageSize, search, branchId, channel, rating, dateFrom, dateTo, and sort.
- Implemented server-side pagination with 10/20/50 page sizes and a hard maximum of 100.
- Implemented branch-aware authorization: OWNER/ADMIN see all branches, MANAGER/STAFF see only accessible branches.
- Implemented cross-tenant protection: feedback scoped by businessId and branchId membership checks.
- Implemented search across title, message, customer name, customer email, and customer phone fields.
- Implemented access-aware summary counts (total, manual, publicForm, qrCode) independent of active filters.
- Implemented safe list response with message preview (180 chars), no full customer PII in list, no internal metadata.
- Implemented safe detail response with full customer snapshot, bounded source metadata allowlisting, and metadata-only attachment references.
- Implemented source label mapping: Manual Entry, Public Form, QR Code with safe detail/reference extraction.
- Mounted inbox routes on existing business router after static feedback routes to avoid conflicts.
- Corrected route ordering so `GET /feedback/manual` falls through gracefully (only POST exists for manual).
- Added frontend protected route at `/business/:businessId/feedback` with lazy loading.
- Connected the existing "All Feedback" sidebar navigation item by removing its disabled state.
- Added `FeedbackInboxPage` with desktop table, mobile cards, summary cards, search, branch/channel/rating/date/sort filters.
- Added URL query parameter synchronization for all filters, page, and feedbackId (detail state).
- Added read-only detail drawer with Esc-to-close, focus management, customer details, source details, attachment references.
- Added scrollable feedback table with sticky column headers and same scroll pattern as Phase 7 table.
- Added all states: loading skeleton, empty inbox, no-results with clear-filters, error with retry, and suspended business banner.
- Added `FeedbackInboxWrapper` that loads business context and branches for the inbox page.
- Added `feedbackInboxApi.ts` with typed API functions for list and detail endpoints.
- Confirmed no Prisma schema change, migration, or new package was added.
- Confirmed no Phase 9 features (workflow, AI, notifications, reports, customer profiles) were implemented.

## 2026-07-25 - Project Memory File Corrections

- Updated AGENTS.md "Current Boundary" to reflect Phase 1 through Phase 7 are complete and verified; Phase 8 is the next active phase.
- Updated README.md: Phase 6 and Phase 7 are now documented as implemented and manually verified; earlier "pending verification" language removed.
- Updated IMPLEMENTATION_STATUS.md: Phase 6 and Phase 7 marked as implemented and manually verified; added Phase 6 and Phase 7 manual verification evidence; removed pending verification items from Incomplete section; updated Later-Phase Features to note Phase 8 is ready to begin.
- Updated NEXT_STEPS.md: complete rewrite to reflect Phase 8 as the immediate next step (design, implement backend/frontend together, manually test). Removed combined Phase 6/7 testing instructions.
- Updated SECURITY_NOTES.md: clarified that Platform Administrators may use dedicated oversight routes without tenant membership but do not automatically bypass BusinessMembership for ordinary tenant operations.
- Confirmed exact Phase 5 reference filenames: `phase5_manual_feedback_primary.png`, `phase5_manual_feedback_states.png`.
- Confirmed exact Phase 6 reference filenames: `phase6-public-feedback-primary.png`, `phase6-public-feedback-states.png`.
- Confirmed exact Phase 7 reference filenames: `phase7-qr-feedback-primary.png`, `phase7-qr-feedback-states.png`.
- Ran `git diff --check` — no whitespace errors found.
- Ran `npm run format:check` — only the pre-existing unrelated `.vscode/settings.json` formatting issue was reported; no project source files were modified.
- Confirmed no application code, dependencies, Prisma schema, or migrations were changed.

## 2026-07-25 - Phase 6/7 Public Feedback Form Defect Fixes

- Fixed branch-specific QR public forms so the frontend uses `fixedBranchId` from the QR configuration as the locked branch source of truth, initializes React Hook Form after async config load, hides the editable branch selector, and submits the fixed branch ID internally.
- Added frontend QR configuration validation so a branch-scoped QR response must include its fixed branch in the returned branch list instead of silently rendering the business-wide branch selector.
- Replaced the public feedback raw logo image with a safe business-brand avatar that shows a real logo only after it loads and otherwise falls back to business initials in light and dark mode.
- Confirmed backend QR configuration and submission enforcement already return `fixedBranchId`, return only the fixed active branch for branch-specific QR codes, and reject mismatched branch submissions with `QR_FEEDBACK_BRANCH_LOCKED`; no backend changes were required.

## 2026-07-25 - Phase 7 QR Management Actions Accessibility Fix

- Fixed the QR Codes page records layout so the Actions column is no longer clipped by the table/card container.
- Replaced the hidden-overflow QR records wrapper with a desktop horizontal scroll container and sticky right-side Actions column.
- Added stacked QR cards below the desktop breakpoint so QR actions remain reachable on tablet and mobile without horizontal page overflow.
- Kept existing QR creation, preview, copy/open, PNG download, print, rename, regenerate, disable, light/dark styling, business-wide behavior, branch-specific behavior, API contracts, and token/idempotency behavior unchanged.
- Confirmed no backend, database, public QR submission, portal link, attachment, scan analytics, inbox, workflow, AI, reports, notifications, or external integration code was changed.

## 2026-07-24 - Phase 7 QR-Code Feedback Submissions

- Added `PublicFeedbackQrCode` persistence with secure unique public QR tokens, portal-token fingerprints, optional branch scope, active/disabled state, creator membership relation, and no scan counters, feedback counters, or expiry fields.
- Created and applied migration `20260724130000_phase_7_qr_feedback_submissions`.
- Reused the existing `FeedbackChannel.QR_CODE` enum value from Phase 4.
- Added authenticated QR management endpoints under `/api/businesses/:businessId/public-feedback/qr-codes` for list, create, rename/disable update, and individual QR token regeneration.
- Added public QR endpoints under `/api/public/feedback/qr/:qrToken` for safe configuration and anonymous submission.
- Added `QrFeedbackSourceAdapter` that sends QR submissions through the existing Phase 4 feedback-processing service with QR channel, idempotency, duplicate handling, conflict handling, branch validation, and bounded QR metadata.
- Added portal dependency behavior so disabling the Phase 6 portal blocks QR access, re-enabling with the same token restores matching active QR codes, and Phase 6 portal-token regeneration invalidates old QR codes until individual QR regeneration.
- Added the protected workspace QR Codes page at `/business/:businessId/feedback/qr-codes` with QR creation, previews, copy/open, PNG download, print presentation, rename, regenerate, disable, status messaging, light/dark mode, and mobile layout.
- Added the public `/feedback/qr/:qrToken` route using the existing public feedback form behavior with QR endpoint selection and branch-specific branch locking.
- Installed frontend `qrcode` and `@types/qrcode` for client-side QR preview/download/print generation.
- Confirmed no attachments, scan analytics, scan counts, feedback counts, expiry/scheduling, Unified Inbox, feedback workflow, customer profiles, AI, notifications, reports, exports, or external integrations were added.

## 2026-07-24 - Phase 6 Public Feedback Portal

- Added Business public feedback portal settings with disabled-by-default enablement, nullable unique secure token, and optional welcome message.
- Created and applied migration `20260724120000_phase_6_public_feedback_portal`.
- Added authenticated Owner/Admin endpoints for `GET /api/businesses/:businessId/public-feedback`, `PATCH /api/businesses/:businessId/public-feedback`, and `POST /api/businesses/:businessId/public-feedback/regenerate`.
- Added unauthenticated endpoints for `GET /api/public/feedback/:portalToken` and `POST /api/public/feedback/:portalToken`.
- Added `PublicFeedbackSourceAdapter` using `FeedbackChannel.PUBLIC_FORM` and the existing Phase 4 feedback-processing service for normalization, payload hashing, idempotency, duplicate detection, conflict detection, and transactional persistence.
- Added public portal validation for branch, rating, message, optional date, optional customer contact, follow-up permission, honeypot, and required `Idempotency-Key`.
- Added public submission rate limiting and safe unavailable/error behavior for invalid links, disabled portals, suspended businesses, no active branches, inactive/mismatched branches, idempotency conflicts, and processing failures.
- Added the workspace Public Feedback Portal settings UI with status, enable/disable, welcome message, copy link, open portal, and confirmed link-regeneration actions.
- Added the public `/feedback/:portalToken` route with a standalone responsive light/dark feedback form, accessible rating control, character counter, optional contact details, privacy notice, success state, duplicate state, and unavailable states.
- Confirmed no packages, public attachments, QR code generation, Unified Inbox, feedback workflow, customer profiles, AI, notifications, reports, exports, or external integrations were added.

## 2026-07-24 - Phase 5 Manual Feedback Message Binding Fix

- Fixed the Add customer feedback Message textarea so React Hook Form is the single source of truth for the displayed value, change/blur handlers, field name, and DOM ref.
- Converted the local manual-feedback textarea component to forward refs to the real `<textarea>`, preserving RHF registration for textarea-based fields.
- Kept the message character counter tied to the RHF `message` value so typed text updates the count used by validation and submission.
- Audited the other Phase 5 manual-feedback fields for displayed-value-versus-form-state drift and preserved the approved layout, styling, rating behavior, branch-state fix, API contract, idempotency behavior, and backend code.

## 2026-07-24 - Phase 5 Manual Feedback Branch State Consistency

- Fixed the Add customer feedback page so the branch select and submission summary both use the React Hook Form `branchId` value as the single source of truth.
- Changed automatic branch selection to apply only when exactly one accessible active branch is available, and made that selected branch visibly appear in the branch select.
- Changed the submission summary to show `—` when no branch is selected instead of showing a workspace/current branch that is not selected in the form.
- Preserved the approved Phase 5 layout, rating behavior, light/dark mode, responsive behavior, API contract, and idempotency behavior.

## 2026-07-24 - Phase 5 Manual Entry Connector Frontend

- Studied the approved Phase 5 manual-feedback references in `frontend/references/phase5_manual_feedback_primary.png` and `frontend/references/phase5_manual_feedback_states.png`.
- Added the protected workspace route `/business/:businessId/feedback/manual`.
- Implemented the Add customer feedback page with the reference-led workspace shell, six-section manual-entry form, right-side submission summary, privacy/security panel, loading state, empty branch state, validation errors, success alert, and duplicate alert handling.
- Added frontend validation for branch, manual source type, message, rating, date received, language code, customer contact fields, source details, and metadata-only attachment references.
- Added a manual-feedback API helper that sends the required `Idempotency-Key` header, maps the form into `POST /api/businesses/:businessId/feedback/manual`, and parses the safe backend response.
- Added a Feedback sidebar group with Add Feedback active navigation and a disabled All Feedback item because unified feedback listing remains a later phase.
- Preserved existing workspace pages, public pages, authentication pages, backend APIs, Prisma schema, external integrations, inbox, workflow, AI, analytics, reports, file upload, and Phase 6 scope.

## 2026-07-24 - Phase 5 Manual Entry Connector Backend

- Added the authenticated backend endpoint `POST /api/businesses/:businessId/feedback/manual`.
- Added manual-feedback request validation, required `Idempotency-Key` header handling, manual source type validation, and metadata-only attachment support.
- Added `ManualFeedbackSourceAdapter`, mapping trusted route/auth/membership context to `FeedbackChannel.MANUAL` `NormalizedFeedbackInput`.
- Reused the Phase 4 `feedbackProcessingService` for normalization, hashing, idempotency duplicate returns, idempotency conflicts, transactional feedback persistence, attachment metadata persistence, and safe failed-ingestion behavior.
- Enforced active business membership, membership status, business status, active branch status, cross-business branch rejection, and manager/staff branch-access rules before processing.
- Added a focused authenticated manual-feedback rate limiter scoped by route business and user.
- Confirmed no Prisma schema change, migration, frontend manual-entry UI, public feedback portal, QR flow, inbox, workflow, customer profiles, AI, notifications, reports, external integrations, file storage, browser testing, or Phase 6 work was added.

## 2026-07-24 - Phase 4 Final Manual-Verification Support

- Added `--attachments=<JSON array>` support to the local feedback simulation helper, passing parsed arrays through the existing Phase 4 normalized input schema, 10-attachment limit, normalization, hashing, transaction, and persistence behavior.
- Kept attachment support metadata-only with no file download, upload, external URL fetch, binary storage, file scanning, or attachment content logging.
- Added safe invalid attachment JSON handling, including explicit empty `--attachments=` values: `FEEDBACK_INPUT_INVALID: --attachments must be a valid JSON array.`
- Added local-only `--simulateFailureAfterIngestion` support for manual verification of failed-ingestion handling after a `FeedbackIngestion` row is created and before feedback/attachment persistence.
- Kept the failure simulation out of the feedback-processing public barrel, required `--commit`, refused `NODE_ENV=production`, reused the real processing transaction and failed-ingestion marking path, and preserved safe output: `FEEDBACK_PROCESSING_FAILED: Simulated local processing failure.`
- Updated README, API notes, architecture, security notes, deployment notes, implementation status, and next steps.
- Confirmed no database schema, migration, HTTP feedback endpoint, Phase 5 manual-entry connector/UI, public feedback portal, QR flow, inbox, queue, worker, file storage, browser, or browser automation was added.

## 2026-07-24 - Phase 4 Feedback Simulation CLI Error Sanitization Fix

- Fixed the local feedback simulation helper so expected CLI validation and feedback-processing errors are caught at the entry point instead of escaping to Node's default uncaught-error stack output.
- Added safe `FEEDBACK_*: message` formatting for expected helper failures, including `FEEDBACK_INPUT_INVALID: Message is required.` for empty feedback messages.
- Changed unexpected helper failures to print only `FEEDBACK_PROCESSING_FAILED: Feedback processing failed.`
- Preserved successful dry-run and commit output, duplicate handling, idempotency-conflict behavior, and use of the real `feedbackProcessingService`.
- Adjusted the root `feedback:simulate` npm wrapper to avoid nested workspace lifecycle path output for expected helper failures.
- Confirmed no database schema, migration, browser, browser automation, Phase 5, connector, public feedback, QR, inbox, AI, notification, report, or external-integration work was added.

## 2026-07-22 - Local Platform Administrator Seed Alignment

- Updated the controlled Prisma seed to use `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, `PLATFORM_ADMIN_FIRST_NAME`, and `PLATFORM_ADMIN_LAST_NAME`.
- Kept the seed restricted to the exact `PLATFORM_ADMIN` role with `ACTIVE` status and verified email, using the existing Argon2id password utility and current 10-to-128-character password policy.
- Made the seed idempotent for an existing platform administrator by reconciling only seed-managed fields when needed and refusing to promote an existing non-admin account with the same email.
- Confirmed the seed does not create a `Business`, `Branch`, or `BusinessMembership`, does not change existing business-owner, staff, or customer accounts, and does not log the administrator password.
- Added `npm run prisma:seed` workspace scripts and updated environment examples and memory documentation.
- Confirmed static verification passed: Prisma format, Prisma validate, Prisma generate, typecheck, lint, format check, and build.
- Confirmed `/admin/businesses` routing was not modified, Phase 3 and Phase 4 remain manually unverified, and Phase 5 was not started.

## 2026-07-22 - Phase 4 Standard Feedback Processing Service

- Implemented the shared Phase 4 feedback-processing foundation for future connectors without adding public feedback, manual-entry, QR, inbox, AI, report, notification, or external-provider features.
- Added Prisma enums `FeedbackChannel` and `FeedbackIngestionStatus`.
- Added `FeedbackIngestion`, `Feedback`, and `FeedbackAttachment` models related to existing Phase 3 `Business` and `Branch` records, plus database uniqueness and indexes for idempotency, external source IDs, feedback lookup, failed processing, and attachments.
- Created and applied migration `20260722150908_phase_4_standard_feedback_processing`.
- Added typed normalized feedback input, Zod validation, deterministic normalization, customer contact snapshots, metadata size limits, sensitive metadata key scrubbing, and attachment metadata validation.
- Added deterministic canonical SHA-256 payload hashing for conflict detection and replay handling.
- Added `feedbackProcessingService.process(input)` with active-business validation, active-branch validation, primary-branch fallback, cross-business branch rejection, idempotency duplicate return, idempotency conflict detection, external-ID duplicate/conflict handling, transactional feedback/attachment persistence, and safe failed-ingestion tracking.
- Added future connector-adapter contracts and a lightweight adapter registry foundation.
- Added local-only CLI helper `npm run feedback:simulate -- ...`, defaulting to dry-run validation and requiring `--commit` before writing data.
- Confirmed Phase 3 remains manually unverified, Phase 4 remains manually unverified, and Phase 5 was not implemented.

## 2026-07-22 - Phase 3 Businesses, Branches, Staff, and Invitations

- Implemented the Phase 3 multi-tenant foundation for businesses, branches, business memberships, staff invitations, branch assignments, and platform-admin business oversight.
- Added Prisma models/enums and applied migration `20260722135525_phase_3_businesses_branches_staff`.
- Added transactional business onboarding for eligible `BUSINESS_OWNER` users, creating the business, active primary branch, protected owner membership, and all-branch owner access together.
- Added backend APIs for current-user businesses, business settings, branches, memberships, branch access, invitations, invitation acceptance, and platform-admin business suspension/reactivation.
- Added tenant and IDOR protections for business IDs, branch IDs, membership IDs, invitation IDs, suspended businesses, suspended/removed memberships, owner protection, admin assignment, and branch access.
- Added secure staff invitation tokens with SHA-256 hashes, SMTP email delivery, resend token rotation, cancellation, expiration cleanup, current-session acceptance, new password staff-account acceptance, and safe Google acceptance.
- Added premium responsive frontend routes for `/business`, `/business/setup`, business workspace/settings/branches/staff/invitations, `/invitations/accept`, `/admin/businesses`, and admin business details.
- Added route-level lazy loading for the new Phase 3 route area, preserving existing public, auth, account, health, theme, and 404 behavior.
- Updated public website and legal copy to reflect that business, branch, staff, and invitation foundations are now implemented while later feedback and integration phases remain planned.
- Updated `.env.example` with `STAFF_INVITATION_EXPIRES_IN_HOURS=48` and removed a credentials-looking SMTP example value.
- Confirmed static/database checks passed: Prisma format, Prisma validate, Prisma generate, safe migration creation/application/status, typecheck, lint, format, format check, and build.
- Confirmed no browser, browser automation, Phase 4, feedback models, customer models, connectors, AI, reports, analytics dashboards, payments, business deletion, or ownership transfer were implemented.

## 2026-07-22 - Premium Public Website Before Phase 3

- Implemented the complete public-facing website using the eight approved references in `frontend/references/`: home, features, how it works, pricing, about, contact, privacy policy, and terms of service.
- Added public routes for `/`, `/features`, `/how-it-works`, `/pricing`, `/about`, `/contact`, `/privacy-policy`, and `/terms-of-service`.
- Replaced the `/` authenticated/logged-out redirect with the public Home page while preserving public access for logged-in and logged-out visitors.
- Added shared public website components for layout, navigation, keyboard-accessible mobile menu, footer, metadata, buttons, headings, cards, dashboard previews, channel previews, CTA sections, and legal-page layouts.
- Reused the existing light/dark theme system, CSS variables, Tailwind tokens, `ThemeProvider`, and `ThemeToggle`.
- Recreated the reference visuals with native React, Tailwind, and Lucide UI instead of embedding reference PNGs.
- Added lightweight per-page document titles and meta descriptions.
- Added product-truthfulness copy and labels to distinguish available authentication features from planned feedback, AI, workflow, analytics, reporting, and integration features.
- Implemented pricing as early-access and planned-pricing content only, with no checkout, active billing, payment flow, or commercial pricing commitment.
- Implemented the Contact page with React Hook Form and Zod validation; valid submissions report that direct form delivery is not configured because no backend contact endpoint or public inbox is documented.
- Implemented draft Privacy Policy and Terms of Service pages grounded in current architecture and documented that professional legal review is required before production launch.
- Updated registration-page legal links to the new public Privacy Policy and Terms of Service routes.
- Confirmed static verification passed: `npm run typecheck`, `npm run lint`, `npm run format`, `npm run format:check`, and `npm run build`.
- Confirmed no browser, browser automation, screenshots, backend API changes, database changes, payment processing, contact-delivery backend, Phase 3, feedback workflows, connectors, AI, notifications, reports, or external integrations were implemented.

## 2026-07-22 - Phase 2 Authentication and Account Premium Redesign

- Implemented premium UI redesigns for the 8 approved reference boards in `frontend/references/`: register, email verification pending, email verification success, forgot password, reset password, password reset success, account page, and active sessions.
- Added shared `PremiumAuthShell` and `AccountShell` foundations with coordinated light/dark theme usage, reference-style split auth layouts, account/settings framing, reusable account panels, and status badges.
- Redesigned `/register`, `/verify-email-pending`, `/verify-email`, `/forgot-password`, `/reset-password`, `/password-reset-success`, `/account`, and `/account/sessions`.
- Added the dedicated protected `/account/sessions` route and the dedicated `/password-reset-success` confirmation route.
- Preserved Phase 2A email/password auth, Phase 2B Google registration/login/linking, Phase 2C verification/reset flows, session listing, current-session revocation, logout, logout-all, auth state handling, route guards, and theme switching.
- Confirmed backend APIs, database schema, Phase 3, and later features were not implemented.

## 2026-07-22 - Focused Login Form Proportion Correction

- Rebalanced the redesigned `/login` page so the desktop composition gives the form area roughly 38-42% of the stage instead of a narrow fixed 340px column.
- Increased the login form card to a comfortable responsive width with a desktop band around 440-460px and larger internal desktop padding.
- Added reusable comfortable sizing variants for auth fields and the primary auth button, then applied them only to the login page to avoid redesigning registration or other auth pages.
- Increased login input and sign-in button height to approximately 48px, improved horizontal padding, strengthened focus states, and enlarged the password visibility hit area.
- Made the Google credential button wrapper responsive with a wider preferred login width while preserving the official Google-rendered control.
- Improved login heading, subtitle, divider, create-account text, security-note spacing, light/dark card contrast, and the left illustration footprint so the form reads as the primary action area.
- Preserved login functionality, Google login, forgot-password navigation, create-account navigation, redirects, validation/backend errors, `EMAIL_NOT_VERIFIED` handling, loading states, theme switching, auth store updates, Axios refresh behavior, and `PublicOnlyRoute`.
- Confirmed backend APIs, registration redesign, Phase 3, and later features were not implemented.

## 2026-07-22 - Phase 2 Login Page Visual Refinement Against Approved Reference

- Refined the existing login-page redesign against the now-available `frontend/references/login-page-design.png`.
- Tightened the outer rounded stage, desktop left/right balance, right-side form-card width and placement, headline size and line breaks, typography hierarchy, indigo/blue shades, card borders, shadows, input heights, button height, and vertical spacing.
- Repositioned the left-side illustration cards into a floating sentiment, feedback-count, review, channel, and insight composition closer to the approved reference.
- Adjusted the security-note layout, compact theme-toggle placement, mobile spacing, and mobile phone-like proportions.
- Preserved Google login, password login, redirects, errors, loading states, verification handling, forgot-password navigation, create-account navigation, dark mode, and the existing theme system.
- Confirmed registration-page redesign, backend API changes, Phase 3, and later features were not implemented.

## 2026-07-22 - Phase 2 Login Page Redesign with Light and Dark Themes

- Redesigned the existing `/login` page into a premium split authentication layout following the requested `frontend/references/login-page-design.png` direction from the attached task brief.
- Preserved existing email/password login, Google login, forgot-password navigation, create-account navigation, original-route redirect after login, `EMAIL_NOT_VERIFIED` resend routing, verification-success message, password-reset-success message, loading states, backend validation messages, auth store updates, Axios refresh behavior, and `PublicOnlyRoute` behavior.
- Added Tailwind class-based dark mode and reusable CSS variable theme tokens for background, surface, muted surface, text, border, primary, state, and focus colors.
- Added first-paint theme bootstrap in `frontend/index.html`, a global `ThemeProvider`, system-theme fallback, local theme persistence, and a visible login-page theme toggle.
- Added reusable auth UI components: `Alert`, `AuthCard`, `BrandMark`, `Button`, `LoginIllustration`, `PasswordField`, and `SecurityNote`.
- Recreated the left-side analytics/customer-feedback illustration with React, Tailwind, and Lucide icons rather than embedding the reference image as the live page background.
- Confirmed Phase 3 and later features were not implemented.

## 2026-07-21 - Phase 2C: Email Verification, Forgot Password, Password Reset, and Auth Hardening

- Installed backend `nodemailer` and `@types/nodemailer`.
- Added Prisma `AccountTokenType` and `AccountToken` for hashed, single-use, expiring account tokens.
- Created and applied migration `20260721074742_phase_2c_email_verification_password_reset`.
- Marked existing legacy password users verified during the migration while keeping future password registrations unverified until email confirmation.
- Added provider-independent SMTP email service and safe plain-text/HTML auth email templates.
- Changed password registration to create an unverified account, send a verification email, and avoid creating sessions or auth cookies.
- Added verification resend and confirmation endpoints plus focused rate limiting.
- Added forgot-password and password-reset endpoints with generic request responses, purpose-specific reset tokens, and full session revocation after reset.
- Added conservative cleanup for expired auth tokens and old expired/revoked sessions.
- Hardened malformed JSON handling so parse failures return safe 400 validation errors.
- Added frontend pages for verification pending, verify email, forgot password, and reset password.
- Updated login handling for forgot password, successful verification/reset messages, and `EMAIL_NOT_VERIFIED` resend routing.
- Confirmed Phase 3 and later features were not implemented.

## 2026-07-21 - Phase 2B: Google Registration, Login, and Secure Linking

- Installed backend `google-auth-library` and frontend `@react-oauth/google`.
- Added Prisma `ExternalAuthProvider`, `ExternalAccount`, and `User.emailVerifiedAt`.
- Created and applied migration `20260721061424_phase_2b_google_auth`.
- Added backend Google ID-token verification with configured audience validation and verified-email enforcement.
- Added separate Google registration, Google login, and authenticated Google-linking endpoints.
- Prevented duplicate users and unsafe automatic account linking by email.
- Reused the existing JWT, HttpOnly cookie, refresh-token hash, refresh rotation, and database-backed session architecture for Google auth.
- Added safe auth-method fields to the authenticated user response.
- Added Google registration UI to `/register`, Google login UI to `/login`, and Google status/linking UI to `/account`.
- Added disabled-by-default Google environment examples and documentation.
- Confirmed static verification passed: Prisma format, Prisma validate, Prisma generate, Phase 2B migration, migration status, typecheck, lint, format check, and build.
- Confirmed Phase 2C, Phase 3, and later features were not implemented.

## 2026-07-21 - Phase 2A Stabilization Audit

- Audited Phase 2A authentication across frontend forms, routing, auth state, Axios refresh handling, backend auth endpoints, JWTs, cookies, sessions, Prisma, seed behavior, environment configuration, CORS/security, API error handling, service-worker findings, and Phase 1 health surfaces.
- Fixed `TextField` ref forwarding so React Hook Form receives real input refs and populated registration/login inputs validate correctly.
- Tightened startup auth so a logged-out user settles cleanly without an unnecessary refresh request, while invalid or expired access cookies can still recover through refresh.
- Preserved protected-route path, search, and hash after login.
- Made `RoleGuard` wait for initial auth bootstrap before redirecting.
- Enabled current-session revocation handling in the account session UI and frontend auth state.
- Aligned local backend port examples, docs, and frontend fallback API URL to `5000`, matching the current working `.env` files.
- Added backend environment validation for supported JWT duration syntax and secure `SameSite=None` cookie configuration.
- Confirmed no Workbox or service-worker registration exists in the repository.
- Confirmed Prisma migration status is up to date and documented the Prisma 6.19.3 `package.json#prisma` seed deprecation warning.
- Confirmed Phase 2B and Phase 3 features were not implemented.

## 2026-07-20 - Phase 2A Frontend Routing Recovery

- Tightened the React Router route tree so `/`, `/login`, `/register`, `/account`, and `/system-status` are registered under one root route.
- Added a friendly route error page and wildcard 404 page to replace React Router's default "Unexpected Application Error" screen.
- Confirmed the Vite dev server returns the SPA HTML for `http://localhost:5173/register`.
- Verified typecheck, lint, format check, and production build pass.
- Confirmed Phase 2B and Phase 3 features were not implemented.

## 2026-07-20 - Phase 2A: Core Email/Password Authentication, Roles, and Sessions

- Added Prisma `UserRole` and `AccountStatus` enums plus `User` and `Session` models.
- Created and applied migration `20260720120942_phase_2a_auth_foundation`.
- Added controlled platform administrator seed script, now aligned to `PLATFORM_ADMIN_*` environment variables, with Argon2id password hashing.
- Added backend email/password registration and login for public `BUSINESS_OWNER` and `CUSTOMER` accounts.
- Added JWT access and refresh tokens stored in HttpOnly cookies with separate secrets, issuer/audience checks, and token type checks.
- Added database-backed refresh sessions, refresh-token hashing, refresh-token rotation, reuse rejection, logout, logout-all, session listing, and session revocation.
- Scoped the refresh cookie to `/api/auth` so logout can revoke a session using the refresh token when the access token has expired.
- Added authentication middleware and reusable role-authorization middleware.
- Added auth-specific rate limits for login, registration, and refresh.
- Added frontend login, registration, account, protected route, public-only route, role-guard foundation, session list, revoke controls, logout, and logout-all actions.
- Moved the Phase 1 status surface to `/system-status` and preserved health endpoints.
- Added Axios automatic access-token refresh with a shared in-flight refresh request and one retry per eligible failed request.
- Updated environment examples and project memory documentation.
- Confirmed static verification passed: Prisma format, Prisma validate, Prisma generate, Prisma migrate dev, typecheck, lint, format check, and build.
- Confirmed Google authentication, email verification, password reset, businesses, branches, staff invitations, customers, feedback, connectors, QR codes, dashboards, AI, notifications, reports, and external integrations were not implemented.

## 2026-07-20 - Phase 1 Manual Verification

- Confirmed Phase 1 was manually verified successfully by the user.
- Confirmed the React frontend loads and displays backend API and database connection statuses.
- Confirmed the Express API health endpoint works.
- Confirmed the database health endpoint connects successfully to XAMPP MySQL/MariaDB through Prisma.
- Confirmed Prisma validation, Prisma Client generation, type checking, linting, formatting checks, and production builds passed.
- Confirmed no Phase 2 features were implemented.

## 2026-07-20 - Phase 1: Project Foundation

- Initialized npm workspace with separate backend and frontend packages.
- Added strict TypeScript, ESLint, and Prettier configuration.
- Created modular Express backend foundation with security middleware, logging, rate limiting, CORS, environment validation, and centralized error handling.
- Added Prisma MySQL configuration for local XAMPP development.
- Added health endpoints for API and database connectivity.
- Created React/Vite frontend foundation with Tailwind CSS, React Router, TanStack Query, Axios, Zod, and Lucide React.
- Built responsive Phase 1 status page that calls real backend health endpoints.
- Added environment example files for backend and frontend.
- Added project memory documentation covering architecture, API, database, deployment, security, implementation status, next steps, and agent workflow.
- Installed dependencies and generated `package-lock.json`.
- Verified Prisma validation/generation, TypeScript, linting, formatting, and production build.
- Confirmed no Docker setup and no Phase 2 features were added.
