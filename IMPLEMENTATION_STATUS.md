# Implementation Status

## Business Owner Channel Count Summary

The Reports page and Owner PDF now show `Feedback by Channel` immediately above `Detailed Feedback Records`, listing Gmail, WhatsApp, Manual Entry, and Public Form including zero counts. Counts use all existing detailed rows before preview truncation, inheriting their date, Branch, channel, status, sentiment, tenant, soft-delete, and hidden-source scope. CSV, Platform Administrator reports, filters, queries, and database are unchanged.

Quick verification passes: Owner reporting tests (25 backend, 15 frontend), backend/frontend typechecks, changed-code formatting, and an in-memory check of full-population counts, zero counts, section order, unchanged CSV projection, and no source mutation. The in-memory check initially encountered sandbox `spawn EPERM`; the approved rerun passed. No new known issue; user-run page/PDF verification remains pending and no browser was opened.

## Simplified Reporting and Automatic Feedback Categorization

Implementation and automated verification are complete; user-run browser/download/provider verification remains pending. The Business Owner Reports page now presents only date/Branch/Channel/Workflow Status/Sentiment filters plus `Detailed Feedback Records`. Its PDF/CSV export is projected to the same concise report and contains Customer / Sender, original Feedback, Channel, Date, Category, and Status for every matching row. The richer owner preview document remains available internally to the real-data Overview dashboard, so this simplification does not remove dashboard metrics.

The normal Platform Administrator Reporting Center now exposes one `Platform Overview Report`. It contains exactly four overview cards (Total Businesses, Total Users, Feedback in selected period, Connected Integrations), followed by Businesses, Users, Detailed Feedback Records, and supported Live Gmail/WhatsApp Integrations. Existing platform authorization and Business/Branch/date/channel/status/sentiment scoping remain server-side. Legacy internal report request types/builders are retained for compatibility but are no longer visible report choices.

Every new supported intake now receives a persisted category inside the canonical `FeedbackProcessingService` transaction. An explicit active tenant category from Manual Entry is recorded as human-owned; otherwise the Business-owned canonical `Other` category is used immediately with default provenance. AI analysis automatically replaces only default `Other`, uncategorized legacy state, or an earlier AI-owned category when confidence and active-category validation pass. Human and automation category choices are never overwritten. AI disabled, unavailable, low-confidence, or failed processing leaves the safe `Other` category in place and does not fail ingestion. Manual Entry, Public Form, Gmail, and WhatsApp continue through the same processing service.

A dry-run-by-default, idempotent `categories:backfill` command was added for active operational feedback whose category is still null and is not an intentional human/automation-owned uncategorized state. Apply mode rechecks every row transactionally, assigns only the canonical tenant `Other`, records default field provenance, and queues the existing AI analysis path; soft-deleted and hidden historical provider rows are excluded. No Prisma schema change, migration, reset, reseed, destructive cleanup, credential change, or provider configuration change was made. Manual requirements are recorded in `NEXT_STEPS.md`; do not mark this pass manually verified until they succeed.

Verification passes: Platform Administrator reporting 45/45 backend and 11/11 frontend, Business Owner reporting 25/25 backend and 15/15 frontend, category assignment 4/4, AI analysis 18/18, integrations 36/36, hardening 29/29, backend/frontend typecheck and lint, Prisma validation, changed-file formatting, backend/frontend production builds, and `git diff --check`. The first sandboxed category/hardening launches were blocked before test discovery by Windows `spawn EPERM`; approved reruns passed. The frontend retains the existing non-blocking chunk-size advisory. The dry-run backfill could not inspect local data because the stopped local MariaDB instance did not complete a usable Prisma connection when temporarily started; it was stopped again and no database row was mutated. Run the documented dry run against an available database before deciding whether apply mode is needed. `npm install --include=dev` restored already-declared locked tooling and reported 18 existing audit findings (8 moderate, 10 high); no automatic dependency upgrade was applied.

## Focused Platform Administrator Reporting Consistency Correction

Implementation and automated verification are complete; user-run Preview/PDF/CSV verification remains pending. The shared report display formatter now renders `FeedbackChannel.MANUAL` as `Manual Entry` across Executive, Feedback & Customer Experience, Operations, and Business Owner report documents without changing the stored enum. Executive Business Adoption now loads and counts the same supported Live Gmail/WhatsApp connection population as Integration Adoption, so hidden, Demo, Outlook, social, historical, and dormant provider rows cannot inflate a Business row.

The Operations KPI formerly labeled `Imported items (period)` is now `Synchronization items imported (period)` because its value is the sum of `SynchronizationRun.itemsImported`, not an active-feedback count. Integration Connections now labels the timestamp `Last provider activity` and calculates the maximum of the latest webhook receipt, inbound message, successful/attempted synchronization, and connection test. This makes a newer WhatsApp webhook timestamp authoritative instead of allowing an older inbound timestamp to win by null-coalescing order.

No Detailed Feedback Records query/projection, supported feedback scope, automation behavior, Business Owner authorization, schema, migration, seed, stored row, credential, OAuth/webhook processing, deployment configuration, or dependency changed. Verification passes: Platform Administrator reporting 45/45, Business Owner reporting 24/24, frontend Phase 25.4 11/11, frontend Phase 26 15/15, backend/frontend typecheck and lint, Prisma validation, touched-file formatting, and backend/frontend production builds. A final sandboxed Platform Administrator rerun was blocked before discovery by Windows `spawn EPERM`; the approved rerun passed 45/45. The existing non-blocking frontend chunk-size advisory remains. Manual requirements are in `NEXT_STEPS.md`; do not mark this correction manually verified until they pass.

## Business Owner and Platform Administrator Reporting Quality Pass

Implementation and automated verification are complete; user-run browser/PDF/CSV verification remains pending. Business Owner and all three normal Platform Administrator report documents now end with `Detailed Feedback Records`. Owner rows contain Customer / Sender, original Feedback, Channel, Date, Category, and Status; Administrator rows add Business and Branch. A shared backend formatter applies the same Gmail, WhatsApp, Manual Entry, Public Form, and `Unknown customer` sender fallbacks to both report families.

Each detailed query uses the report's canonical active operational feedback predicate, including `deletedAt = null`, the four-channel supported-source policy, server-authorized Business/Branch scope, date range, and Channel/Workflow Status/Sentiment filters where accepted. `Feedback in selected period` is derived from the detailed population for the owner, Executive, Feedback & Customer Experience, and Operations reports, so totals and full exports reconcile. The persisted-profile-only metric is now consistently labeled `Linked customer profiles represented by feedback (period)`.

Automation report queries, highlights, summaries, comparison rows, and sections were removed from normal Owner/Admin Preview, PDF, and CSV output without changing automation workers, APIs, services, routes, models, records, or non-report tests. CSV retains every full original message and ISO received timestamp. PDF exports all matching rows, wraps a bounded message excerpt, uses eight-column Administrator geometry where required, repeats table headers, and avoids horizontal clipping. No schema, migration, seed, dependency, integration, authentication, security-rule, credential, or deployment-configuration change was made.

Verification passes: Phase 26 reporting 39/39, Phase 25.4 reporting 53/53, hardening/tenant authorization 29/29, backend/frontend typecheck and lint, Prisma validation, touched-file formatting, and backend/frontend production builds. The first sandboxed hardening runner was blocked before discovery by Windows `spawn EPERM`; the approved rerun passed. Prisma validation initially hit the restricted proxy and passed on the approved retry. The existing non-blocking Vite chunk-size advisory remains. Manual requirements are in `NEXT_STEPS.md`; do not mark this pass manually verified until they pass.

## Business Owner Detailed Feedback Records Report Improvement

Implementation and automated verification are complete; user-run browser/PDF/CSV verification remains pending. The existing tenant-scoped Business Owner report now ends with `Detailed Feedback Records`, containing Customer / Sender, original Feedback, Channel, received Date, Category, and Status for every record in the report's canonical filtered feedback population. Sender identity uses the stored submitted/imported snapshot: Gmail display name then email, WhatsApp profile name then phone, Manual Entry/Public Form name then email then phone, and `Unknown customer` when none is usable.

The detail query reuses the exact Business, Branch, date, channel, workflow-status, sentiment, active-source, and `deletedAt = null` predicate used for report totals. The web report previews 12 rows with a responsive desktop table/mobile card list and explicitly states that exports contain the full dataset. CSV retains every full original message and ISO received timestamp; PDF exports every matching row, repeats headers after page breaks, uses clear UTC timestamps, and wraps a bounded 500-character original-message excerpt to keep rows readable. No schema, migration, dependency, integration, authentication, deployment configuration, or tenant authorization changed.

Verification passes: Phase 26 reporting 39/39 (24 backend, 15 frontend), shared Phase 25.4 reporting 49/49, tenant hardening 29/29, backend/frontend typecheck and lint, Prisma validation, touched-file formatting, backend/frontend production builds, and `git diff --check`. The first sandboxed hardening/admin runners were blocked before test discovery by Windows `spawn EPERM`; the approved hardening rerun passed, and the shared reporting suite independently passed its Platform Administrator role guard. Repository-wide `npm run format:check` remains blocked by pre-existing Prettier drift in 360 untouched files, while every file changed for this task passes. `npm install` reports 12 existing audit findings (4 moderate, 8 high); no out-of-scope automatic dependency upgrade was applied. The existing non-blocking Vite chunk-size advisory remains. Manual requirements are in `NEXT_STEPS.md`; do not mark this report improvement manually verified until they pass.

## Focused Operational Count, Role, Channel, and Navigation Correction

Implementation and automated verification are complete; user-run browser verification remains pending. One canonical backend scope now defines normal product feedback as `deletedAt = null` plus exactly four visible sources: Live Gmail, Live WhatsApp, Manual Entry, and Public Form. Inbox summaries, staff/owner/platform dashboards, customer aggregates, category counts, business detail summaries, analytics, and owner/platform reports use that scope. Soft-deleted, QR, Demo, Outlook, social, Google Reviews, X, and other historical rows remain stored and retain ingestion/provider identifiers for audit and deduplication, but cannot contribute to normal lists, totals, charts, filters, or reports. Feedback management invalidates inbox, owner dashboard, staff dashboard, and customer queries after single delete, bulk delete, and Remove all.

The visible role model is Platform Administrator, Business Owner, Manager, Staff, and Customer. The internal `BusinessMemberRole.ADMIN` value remains supported for existing data and permissions, but displays as Business Owner; new staff invitations and role changes expose only Manager and Staff, assignment options omit legacy administrator memberships, and the future development seed no longer creates a duplicate administrator persona. No stored membership was rewritten.

The Business Owner Overview now renders a four-item Channel distribution donut using the same responsive card/chart/legend treatment as Sentiment mix and the active report/branch/date scope. QR Codes and Automations were removed from normal workspace navigation, quick actions, marketing, and visible source controls while their routes, components, services, data, and regression coverage remain intact. No Prisma schema or migration, dependency, provider setting, credential, or stored-data mutation was added. Verification passes: backend/frontend typecheck and lint; focused hardening 29/29; integrations 36/36; seed 3/3; Platform Administrator 44/44; Phase 26 34/34; Phase 27 30/30; Phase 28 matrix 136/136; Prisma validation; formatting; production build; and `git diff --check`. The existing non-blocking Vite chunk-size advisory remains. Manual requirements are in `NEXT_STEPS.md`; do not mark this correction manually verified until they pass.

## Supported Channels, Gmail Label Ingestion, and Bulk-Selection Correction

This earlier correction is retained for history and is superseded by the focused correction above for visible source count and role terminology. The operational product now exposes exactly four feedback channels: Manual Entry, Public Form, Gmail, and WhatsApp. QR is preserved as dormant historical functionality alongside Demo, Outlook, Google Reviews, X, Facebook, and Instagram, but is excluded from normal product presentation and metrics. Only Live Gmail and Live WhatsApp connections may be operated through normal product APIs.

The Business Integrations page has a real persisted responsive Grid/Table preference. Gmail and WhatsApp cards use aligned action regions and both primary buttons read `Sync Now`: Gmail runs real synchronization, while WhatsApp performs a clearly explained read-only activity refresh because inbound webhook delivery remains automatic. Gmail connections now store a configurable label (default `Customer Feedback`); initial and incremental synchronization require both Inbox and that exact Gmail label, and safely skip automated/bulk/newsletter messages using standard headers plus conservative sender safeguards. A missing label returns a controlled configuration error.

All-matching feedback selection now tracks explicitly deselected feedback IDs across page navigation and sends those exclusions to the same authorized filtered bulk scope. Visible row/card state, selected count, bulk status/category/delete, and Remove all therefore operate on the actual selected population. Assignment controls now show `Name — Business Role` consistently. No Prisma schema or migration was added, and no stored integration/feedback row was deleted or rewritten. Verification passes: backend/frontend typecheck and lint; integrations 35/35; hardening 22/22; Platform Administrator 44/44; seed 3/3; Phase 26 34/34; Phase 27 30/30; Phase 28 matrix 136/136; formatting; and the backend/frontend production build. The frontend retains the existing non-blocking chunk-size advisory. Manual requirements are in `NEXT_STEPS.md`; do not mark this correction manually verified until they pass.

## Final Product Hardening + UI/UX Pass

Implementation and automated verification are complete; the new migration and user-run browser/security verification remain pending. Business Owners, including compatible legacy internal `ADMIN` memberships, can edit allowed feedback/customer snapshot fields, change status/category, soft-delete one or many records, select the current page or every matching filtered record, and use an exact `DELETE` confirmation before removing all feedback. Provider channel, external IDs, ingestion/deduplication records, source metadata, and original timestamps remain immutable. Soft-deleted feedback and its related ingestion, workflow, AI, automation, and audit records are preserved but excluded from ordinary inboxes, customer views, dashboards, AI/automation work, and owner/platform reports.

Staff feedback access and the new 30-day staff Overview are derived from the authenticated active membership's assigned Branch set. Forged foreign-Branch, category, customer, or assignee filters now fail instead of broadening a query. Restricted Staff see assigned-Branch controls and no owner/admin configuration navigation. Customers now land at `/customer` and receive a real-data Dashboard, searchable/filterable persisted List/Grid feedback history, safe responsive feedback detail, submission destinations based on Businesses they have interacted with, Profile, and session-security access. Customer APIs expose only feedback owned by the authenticated verified account email or its linked Customer profile and omit internal notes, assignment, AI, source metadata, and audit data.

Gmail retains Connect/Reconnect/Sync now/View Activity behavior. Connected webhook-driven WhatsApp uses Refresh Activity, View Activity, and Test Connection without a fabricated manual-sync path. Business, Platform Administrator, Account, and Customer desktop navigation now scroll independently from page content; existing mobile drawers remain bounded and dismissible. Existing persisted collection-view policy remains authoritative and the Customer collection uses it.

Migration `20260821120000_final_product_hardening` adds nullable feedback soft-delete actor/time fields, two audit activity enum values, indexes, and a membership foreign key. It was created but not applied by Codex; no reset, db push, seed, data cleanup, provider credential, environment variable, dependency, or deployment-configuration mutation was performed. Verification passes: hardening 21/21, Phase 28 matrix 136/136, integrations 31/31, Phase 27 30/30, Platform Administrator 44/44, backend/frontend typecheck and lint, Prisma generation/validation, production build, and `git diff --check`. The frontend build retains the existing non-blocking chunk-size advisory. Manual requirements are in `NEXT_STEPS.md`; do not mark this pass manually verified until they succeed.

## Phase 29A - Prisma ESM Runtime Compatibility for Railway

Implementation and automated verification are complete. The backend remains native ESM/NodeNext, but generated Prisma runtime values no longer rely on Node synthetic named exports from Prisma's CommonJS entry point. `backend/src/lib/prisma-runtime.ts` imports the Prisma package through its stable default CommonJS-compatible binding and exposes true local ESM bindings for all 43 generated enums plus `Prisma` and `PrismaClient`. Direct `@prisma/client` imports outside that adapter are type-only and erased from JavaScript. Mixed Prisma namespace/value consumers retain generated namespace types and use an explicit `PrismaRuntime` value alias for helpers such as `sql`, `DbNull`, `JsonNull`, and known request errors.

The complete backend census reviewed 82 files, 84 direct import declarations, and 388 imported specifiers. Sixty-four files originally had runtime imports; 286 actually runtime-used specifiers were redirected to the adapter, while 25 ordinary enum imports used only as types were corrected to `import type`. Prisma 6.19.3 with the `prisma-client-js` generator remains in place. No business logic, dependency version, API contract, Prisma schema, migration, seed semantics, or database data changed.

Verification passed on Node 24.11.1: `npm install`; Prisma Client generation 6.19.3; backend typecheck, lint, build, Prisma validation, focused adapter test 1/1, complete backend inventory 208/208, Phase 28 matrix 136/136, integrations 31/31, Phase 25.4 reporting 49/49, and Phase 27 30/30. The compiled output has exactly one `@prisma/client` runtime import, the adapter's default import. Both `node dist/server.js` and `npm exec --workspace backend -- tsx src/server.ts` reached API-listening and worker-started logs without Prisma export errors. Final Railway auto-deploy observation remains an external post-push check.

## Phase 28 — Feedback Category System + Kigali Waffle Cuisine Demo Tenant + Mobile Nav Polish

Implementation and automated verification are complete; user-run browser, responsive, and functional verification remains required. The product now has one canonical 13-item default feedback-category catalog. Both Business Owner and Platform Administrator business-creation transactions create those active Business-owned defaults, while the existing Owner/Admin category CRUD, activation controls, tenant isolation, AI active-category allowlist, workflow assignment, filters, automations, and reporting architecture remain authoritative.

All Feedback now displays a Category or `Uncategorized` in both List and Grid. The compact desktop list is Customer, Feedback (with Date secondary), Category, Channel, Status, and View. The single Category filter offers All Categories, Uncategorized, and active categories from the current Business. Owner and Platform Administrator report category distributions now label null category groups `Uncategorized`.

The deterministic `dev_seed_business_kigali_harvest` record was safely renamed in place to `Kigali Waffle Cuisine`; its memberships and relationships were retained. The seed and guarded reconciliation use the original Service, Billing, Praise, Product Request, and Legacy deterministic IDs for Service Quality, Billing & Payments, Praise / Compliment, Product / Feature Request, and Other, and add eight missing deterministic categories. Current-database reconciliation updated 1 Business, 3 branches, 5 existing categories, 2 customers, 10 deterministic feedback rows, 11 deterministic feedback activity labels/notes, 2 deterministic AI messages, 2 QR records, and 2 automation rules, and created 8 category rows. The final dry run was fully unchanged. Five non-seed feedback rows, the connected Live WhatsApp record, all seven integration connections, the tenant-isolation Business, and credentials were untouched. No Live Gmail row existed; the canonical Business context and Connect path remain unchanged.

Business, Platform Administrator, shared Staff, and Account drawers now use `100dvh`, internal vertical scrolling, safe-area padding, background scroll lock/restore, Escape dismissal, route-change dismissal, backdrop dismissal, and horizontal overflow containment. Public navigation is consistently Home, About, How It Works, Features, Contact; the short-screen mobile menu scrolls, and Pricing remains absent.

No Prisma schema or migration was changed. Automated verification passed with 259 distinct assertions (350 raw passes across deliberately overlapping regression commands and focused reruns), 0 failures, and 0 blocked executions after safe approved retries for Windows sandbox `spawn EPERM`. Backend/frontend typecheck, lint, build, Prisma validation, formatting, and `git diff --check` pass; the existing non-blocking Vite chunk-size advisory remains. Manual browser/device verification is recorded in `NEXT_STEPS.md`.

## Phase 27 — Full Product UI/UX Overhaul

Implementation, automated verification, and the user's Phase 27 browser review are complete. The Business Owner workspace now uses a clearer shared shell, real report-backed overview charts and KPIs, compact feedback/customer collections, a centered complete feedback modal, professional QR management, a structured When/If/Then automation builder, improved branch/staff details, and tabbed settings. Business Owner integrations use one centralized visible-provider allowlist and expose only Live WhatsApp and Live Gmail; Demo connections, controls, cards, and operational rows are excluded from the owner surface while the Phase 20 registry, Demo records, future providers, and Platform Administrator capabilities remain intact.

Business Owner report integration connections, synchronization runs, and webhook activity are now queried with `IntegrationMode.LIVE`; Demo metrics/rows are absent from owner Preview/PDF/CSV. The Platform Administrator Users, Feedback, and Integrations grids use redesigned cards, and both owner/admin logout actions are easier to reach without changing authorization or actions. The public Home, Features, How It Works, About, Contact, Privacy, and Terms presentation is rebuilt around current capabilities; Pricing and `/pricing` are removed; Login/Register retain their core forms inside the shared session-aware public header/footer. Fixed Indigo and Light/Dark/System behavior are preserved.

No dependency, Prisma schema, migration, seed, credential, or database-row change was made. Demo seed fixtures remain deterministic and credential-free. Verification passed: Phase 27 30/30; Phase 26 34/34; Phase 25.4 49/49; Phase 25.3 plus Platform Administrator backend 56/56; automation 88/88; integrations 31/31; AI 18/18; router 2/2; legal 3/3; seed safeguards 3/3; backend/frontend typecheck, lint, formatting, production build, Prisma validation, and `git diff --check`. The frontend build retains the non-blocking Vite chunk-size advisory. No browser/manual testing was performed by Codex.

## Phase 26A — Business Owner Report Export Polish After Freebuff Review

Phase 27 supersedes this section's owner Integration Adoption/detail-mode behavior: Business Owner report connections and operational activity are now Live-only; the context-aware export branding and shared renderer behavior described below remain current.

Implementation and automated verification are complete; regenerated-file manual retesting remains with the user. The inherited Phase 26 implementation was inspected before correction and its architecture is safe to preserve: the owner report remains an authenticated, active-membership, tenant-scoped consumer of the shared Phase 25.4 document/formatter/PDF/CSV pipeline. No tenant authorization, Platform Administrator authorization, report calculations, detailed connection rows, Prisma schema, migration, seed, or development data changed.

The shared report branding contract now supports an optional explicit subtitle. Business Owner documents set `BUSINESS REPORTING`; the shared renderer retains `PLATFORM ADMINISTRATION` as the default for all existing Platform Administrator documents. PDF visible branding and PDF subject metadata are therefore context-aware. Business Owner CSV includes `Report context,BUSINESS REPORTING`; existing Platform Administrator CSV structure is unchanged because the context row is emitted only for an explicitly supplied subtitle.

Business Owner Integration Adoption is now derived from the already authorized, Business/Branch-scoped connection collection and aggregated by `IntegrationProvider` only. Preview, visual summary, PDF, and CSV consume the same one-row-per-provider section. A read-only check of the current seven-connection development dataset confirmed Google Reviews 1, WhatsApp 2, Email 1, X 1, Facebook 1, and Instagram 1, with separate connected Live and Demo WhatsApp records. The detailed Integration Connections section is unchanged and continues to show those records separately.

Verification passed: Phase 26 frontend/backend 34/34; Phase 25.4 frontend/backend 49/49; Phase 25.3 frontend plus Platform Administrator backend 56/56; integrations 31/31; AI 18/18; automation 88/88; Phase 20 router 2/2; backend/frontend typecheck and lint; Prisma validation; repository formatting; backend/frontend production builds; and `git diff --check`. The frontend build retains the existing non-blocking Vite chunk-size advisory. The first sandboxed Phase 26 attempt was blocked before frontend test discovery by Windows `spawn EPERM`; the approved rerun executed successfully. A later focused assertion was corrected to account for the renderer's existing uniform-width CSV padding, after which the final suite passed. No browser/manual testing was performed by Codex; the Phase 26A PDF/CSV retest remains required.

## Phase 26 — Business Owner Comprehensive Reporting

Implementation is complete and static verification passes. The Business Owner now has exactly one report type, `Business Performance & Customer Experience Report`, at `/business/:businessId/reports` (Reports navigation item, owner-only). The backend exposes `POST /api/businesses/:businessId/reports/preview` and `POST /api/businesses/:businessId/reports/export`, both requiring an authenticated platform `BUSINESS_OWNER` with an active membership in an active Business; platform `STAFF`, `CUSTOMER`, and `PLATFORM_ADMIN` callers, foreign Businesses, foreign branches, suspended/removed memberships, and non-active businesses are denied. The Business is always resolved from authenticated membership (no body `businessId`, no Business selector, no report-type selector).

The report reuses the Phase 25.4 shared document type, display formatter, PDF renderer (canonical geometry, section-aware page breaks, true per-page footers), UTF-8 BOM CSV with formula protection, `classifyIntegrationHealth`, canonical feedback scope plans, workflow/assignment summarizers, deterministic comparison math, and platform branding. It combines Business Performance, Customer Experience, Workflow & Response Performance, and Channel & Operational Health, with lifetime vs period labels, business-wide vs branch-scoped labels (integrations routed by required `defaultBranchId`; Customer profiles business-wide), important high/urgent or negative feedback using normalized safe message content, deterministic tie-aware Management Summary, previous-period comparison, and no platform-level API/database health, approval workload, or other-tenant data.

The frontend page is responsive (~300px supported, collapsing filter grid, adaptive KPI grid, scrollable tables, usable PDF/CSV controls) and uses the established Indigo design system with Light/Dark/System. No Prisma schema change, migration, seed, or development-data mutation was made; reports remain on-demand and unpersisted.

Verification passed: backend `test:phase26` 18/18 and frontend `test:phase26` 13/13 (10 static + 3 preview); Phase 25.4 backend 40/40 and frontend 4/4; Phase 25.3 frontend 16/16 plus backend/Platform Administrator 24/24; integrations 31/31; AI 18/18; automation 88/88; Phase 20 router checks; backend/frontend typecheck and lint; repository formatting; Prisma validation; backend/frontend production builds; and `git diff --check` (only normal Git LF-to-CRLF working-copy warnings). The frontend build retains the existing non-blocking Vite chunk-size advisory. No browser/manual testing was performed; the Phase 26 manual checklist remains with the user and Phase 26 must not be marked manually verified until it passes.

## Phase 25.4D — Operations Report Consistency & PDF Readability Correction

Implementation is complete; the focused Phase 25.4/Platform Administrator test runner could not execute in this sandbox because Node failed before test discovery with `spawn EPERM`, and the required elevated retry was unavailable because the approval quota was exhausted. User-run Preview/PDF/CSV retesting also remains pending. Operations Preview now renders the existing report-document comparison immediately after Management Summary as an explicit `Metric | Current | Previous | Change | Comparison` table. It performs no second query, hides when comparison is disabled, and retains the existing `No prior baseline` wording for a zero previous value.

Shared report display formatting now renders persisted `DRAFT` as `Draft` while preserving QR, AI, API, CSV, PDF, SMS, URL, IP, OAuth, and all established display mappings. The Operations highlight label is clarified to `Successful automation executions (period)` without changing its `SUCCESS` count.

The shared PDF renderer now applies presentation-only projections to the four wide Operations detail tables. Integration connections combine persisted status and health, retain imported count and a wide operational note, and use a compact last-activity timestamp. Recent synchronization activity retains request time, Business, Provider, Mode, status, imported/failed counts, and a useful summary; duplicates/skipped remain in CSV. Webhook activity retains receipt time, Business, Provider, status, message type, and operational note. Automation activity retains creation time, Business, Rule, status, matched state, and completed/skipped/failed action counts. These tables use intentional column proportions, measured wrapping headers/rows, repeated headers after page breaks, bounded meaningful excerpts, and PDF-only UTC timestamps such as `16 Aug 2026, 18:32`. CSV remains full-column and ISO-timestamped.

No Operations query, comparison calculation, connection-health classifier, core-health semantics, supported monitoring claim, schema, migration, seed, or development data changed. The manually verified canonical values therefore remain sourced from the unchanged builder: 7 connections (1 Live, 6 Demo), 4 Connected, 1 Paused, 1 Disconnected, 1 Error, 3 needing attention; synchronization 5 Completed plus 1 Completed with errors with 6 imported and 1 failed; 5 webhooks; AI 9 Completed and 1 Skipped of 10; automation 1 Success and 5 Not matched of 6; 1 Active and 1 Draft rule; 2 Active and 0 Pending businesses.

Verification passed: backend/frontend typecheck, backend/frontend lint, repository formatting, Prisma validation, backend/frontend production builds, Phase 25.3 frontend 16/16, integrations 31/31, AI 18/18, automation 88/88, and `git diff --check`. Focused regression coverage was added for Operations Preview comparison visibility/disablement, `Draft` plus initialism humanization, PDF table projection and wrapping, compact timestamps, meaningful notes, full CSV columns/ISO timestamps, and physical-page/footer invariants. The Phase 25.4 frontend and backend/Platform Administrator commands were attempted but were blocked before test code ran by the sandbox `spawn EPERM`; the elevated retry was rejected because the environment approval quota was exhausted. The existing non-blocking Vite chunk-size advisory remains. No browser or manual functional testing was performed.

## Phase 25.4C — Feedback & Customer Experience Report Functional Correction

Implementation and automated verification are complete; user-run Preview/PDF/CSV retesting remains pending. The Feedback report now creates one canonical scope plan for Business, Branch, Channel, Workflow Status, Sentiment, and the applicable current/lifetime/previous date window. Prisma aggregates and the parameterized trend query consume that plan. Completion no longer rebuilds or overwrites a status predicate: Open and Completed derive from the exact scoped workflow distribution using the established `NEW`/`IN_REVIEW` versus `RESOLVED`/`CLOSED` semantics. Previous-period workflow comparison uses an identical filter plan with only the date window changed. Assignment derives from the scoped assignee distribution, while every other feedback KPI/distribution/detail query consumes the same scoped `where` or an explicit `AND` refinement.

Management Summary now calculates the complete maximum-count channel set, alphabetically orders display labels for deterministic output, distinguishes one leader from two-or-more tied leaders, includes grammatically correct record counts, and emits only the established no-feedback sentence for an empty scope. Browser trend Preview shows the most recent 12 rows in ascending chronology while PDF and CSV keep the full supported trend series.

Important customer experience feedback still selects High/Urgent or Negative records, now ordered by persisted priority severity, newest receipt time, and stable ID. It prefers the normalized `Feedback.message`, uses `Feedback.title` only as a fallback, and selects no customer contact or source/provider payload. Preview uses a bounded 320-character presentation; PDF uses a whitespace-normalized 220-character ellipsized excerpt in a wider wrapping column with measured growing row heights; CSV retains the full normalized safe body. Shared formatting now renders `OTHER` as `Other`, `CUSTOMER` as `Customer`, and compound enum tokens naturally while preserving QR/AI/API/CSV/PDF/SMS/URL/IP/OAuth and leaving the important-feedback body unchanged.

Verification passed: Phase 25.4 frontend 7/7 and backend/Platform Administrator 38/38; Platform Administrator 42/42; Phase 25.3 frontend 16/16 plus backend 38/38; integrations 31/31; AI 18/18; automation 88/88; backend/frontend typecheck and lint; Prisma validation; backend/frontend production builds; repository formatting; and `git diff --check`. A read-only local document smoke reproduced the confirmed Kiyovu/New scope with 2 feedback, Open 2, Completed 0, Assigned 0, Unassigned 2, workflow New 2/100%, completion Open 2/100% and Completed 0/0%, and previous-period Completed 0. The existing non-blocking Vite chunk-size advisory remains. No browser/manual testing, Prisma schema change, migration, seed mutation, development-feedback mutation, report catalog change, Executive calculation change, or Operations-specific redesign was performed.

## Phase 25.4B — PDF Section Flow, Layout & Report Humanization Correction

Implementation and automated verification are complete; user-run manual PDF/CSV/Preview retesting remains pending. The shared PDFKit renderer now owns canonical A4 content geometry (`contentLeft`, `contentRight`, `contentWidth`, `contentTop`, and `contentBottom`). Every normal heading, description, table, KPI group, comparison grid, and visual summary renders from that geometry and restores the document cursor to `contentLeft`, eliminating leaked right-side X positions and narrow inherited widths.

Major sections now preflight the measured heading, full optional description, table header, and first row (or the initial empty/chart content) before rendering. Insufficient space adds a page before the heading, so descriptions cannot leave orphan fragments above their content. Previous-period comparison now uses a measured five-column `Metric | Current | Previous | Change | Comparison` grid with stable numeric alignment and growing metric/comparison rows.

The report builder now uses the shared display formatter for generated Management Summary, filter, provider, and channel labels. It preserves QR, AI, API, CSV, PDF, SMS, URL, IP, and OAuth capitalization while retaining established mappings such as Google Reviews, Not analyzed, Business Owner, and Platform Administrator. Persisted enum values are unchanged. CSV construction, UTF-8 BOM, escaping, formula-injection protection, Phase 25.4A scope calculations, integration-attention rules, and fixed footer pagination are unchanged.

Verification passed: combined Phase 25.4 frontend 4/4 and backend/Platform Administrator 30/30; Phase 25.3 frontend 16/16 plus backend 30/30; integrations 31/31; AI 18/18; automation 88/88; backend/frontend typecheck and lint; Prisma validation; formatting; backend/frontend production builds; and `git diff --check`. The frontend build retains the existing non-blocking Vite chunk-size advisory. No browser/manual testing, schema change, migration, seed mutation, report calculation change, or unrelated Admin redesign was performed.

## Phase 25.4A Report Export & Scope Consistency Correction

Implementation and automated verification are complete; user-run manual PDF/CSV/preview retesting remains pending. The shared PDFKit renderer now records the buffered content-page count before footer work, draws each footer inside the existing page with PDFKit's bottom-flow boundary temporarily reduced to the physical page edge, restores cursor/margin state, and rejects any footer pass that changes the buffered page count. Object-level tests parse generated Executive, Feedback, and Operations PDFs, inflate every physical page content stream, and prove physical count equals intended count, every page has exactly one true `Page X of Y` footer, and no page is footer-only.

Executive reporting now carries shared scope metadata through Preview, PDF, and CSV. Platform scope remains platform-wide; Business scope restricts every business-scopable query; Branch scope restricts Branch, Feedback, feedback trend/distributions, membership-access Users, and Integration connections routed through the required `defaultBranchId`. Customer profiles and business lifecycle/approval metrics remain explicitly business-wide under Branch filtering because Customer and Business have no branch ownership relation. Business adoption uses filtered relation counts for Branches, membership branch access, Feedback, and routed providers, while its customer column is labeled business-wide. User KPI and previous-period labels dynamically use platform or in-scope wording.

Supervisor-facing report values now humanize explicit safe enum values such as QR Code, Google Reviews, Not analyzed, Business Owner, and Platform Administrator without changing persisted enums or opaque identifiers. CSV retains the UTF-8 BOM and RFC-style escaping and now also neutralizes formula-leading strings. Integration attention uses the established persisted-state classifier, corrected so the project-standard successful test status `PASSED` is healthy. For the current seven Kigali Harvest business connections, whole-business attention is 3/7 (Disconnected X, Paused Email, Error Facebook), not 7/7; the four connected `PASSED` records are healthy. Under the Kiyovu branch filter, three connections are routed there and two require attention.

Verification passed: combined Phase 25.4 reporting/Platform Administrator backend 25/25 and frontend 4/4; Phase 25.3 frontend 16/16; integrations 31/31; AI 18/18; automation 88/88; backend/frontend typecheck and lint; Prisma validation; repository formatting; backend/frontend production builds; and `git diff --check`. The frontend build retains the existing non-blocking Vite chunk-size advisory. No browser/manual testing, schema change, migration, seed mutation, report persistence, or secret-bearing field was added.

## Phase 25.4 Supervisor-Focused Reporting Consolidation

Implementation is complete and manual verification remains pending. The Platform Administrator Reporting Center now exposes exactly three management-information reports: Executive Platform Report (default), Feedback & Customer Experience Report, and Operations & System Health Report. The former Business Adoption, Feedback Intelligence, Channel Performance, Integration Health, AI & Sentiment, Workflow, User & Access, and Automation choices are no longer valid API report types or selectable UI options; their supported persisted metrics are consolidated into the three new builders.

Executive reporting now distinguishes lifetime and selected-period totals and covers business lifecycle/adoption, branches, platform users/account roles, customer profiles, feedback/current workload, channels, workflow, priority, sentiment/AI completion, integrations, and approval workload. Feedback reporting applies business/branch/channel/status/sentiment scope consistently to KPIs, database-side trends, distributions, assignment/completion workload, ratings, and recent important feedback without customer contact or source-payload exposure. Operations reporting covers truthful API/database health, connection health and activity, synchronization outcomes, webhooks, AI processing/staleness, automation rules/executions, and business approval workload without inventing CPU, RAM, uptime, or worker-heartbeat telemetry.

Preview, branded Indigo PDF, UTF-8 BOM CSV, report footer/page numbering, report settings, date validation, the 366-day maximum, previous-period comparison, safe zero-baseline wording, report-aware filters, human-readable operational messages, empty states, and Platform Administrator authorization are preserved or strengthened. A read-only database smoke passed for all three builders, combined feedback filters, and a zero-result period. No Prisma schema change, migration, seed mutation, external AI summary call, report persistence, or browser/manual test was added. Focused and regression verification results are recorded below; user-run browser/PDF/CSV verification remains required.

Phase 25.4 verification passed: focused frontend 4/4 and backend/Platform Administrator 20/20; Phase 25.3 frontend regressions 16/16 plus backend/Platform Administrator 19/19 at that run; integrations 31/31; AI analysis 18/18; automation 88/88; backend/frontend typecheck; backend/frontend lint; repository format check; Prisma validation; backend/frontend production builds; and `git diff --check`. The final Phase 25.4 backend suite contains one additional Executive PDF pagination test, bringing the latest backend total to 20/20 and focused total to 24/24. The frontend build retains the existing non-blocking Vite chunk-size advisory. The first sandboxed TypeScript test/smoke attempts hit the known Windows `spawn EPERM`; approved reruns passed. No browser or manual functional testing was performed.

## Phase 25.3 Strict UI/UX Correction, Indigo Design System & Professional Detail Modals

Implementation is complete and manual verification remains pending. The rejected pink/dynamic-color design is replaced by fixed Indigo CSS tokens across frontend surfaces and report visuals; arbitrary color inputs are removed from Platform Settings. Deprecated color database fields remain schema-compatible but are normalized by the backend and ignored as token inputs. The global appearance root cause was a persisted personal local-storage preference outranking platform settings. The corrected pipeline caches only platform appearance for first paint, uses fetched/saved settings as authority, removes the legacy key, follows OS preference only for System, and increments a settings revision on every fetch/save so Light/Dark/System reapply immediately even for same-value saves.

Platform Administrator user, feedback, and integration summary cards remain compact and never expand inline. Reusable Radix-based centered detail modals provide focus trap, Escape/backdrop behavior, focus restoration, scroll locking, internal scrolling, responsive near-full-screen mobile layout, structured sections, collapsed technical data, copy controls, danger zones, and separate confirmations. Business Details now uses a compact profile/action header, controlled More Actions, KPI row, information/collection sections, compact empty states, and filtered oversight links. Reports now uses a responsive desktop configuration grid, contextual All labels, compact pre-preview summary and retained PDF/CSV flows. Settings uses real-only section navigation. Platform Health is canonical with a guarded legacy redirect.

No Phase 25.3 migration was created. The user confirmed that `20260817120000_phase_25_2_admin_hardening` was already applied successfully on 2026-08-17 at 09:44:10.207 with no rollback and that Prisma reports the schema up to date. A Phase 25.3 edit that had replaced its historical conditional pink updates with unconditional Indigo updates was reverted exactly; the applied migration is unchanged from its original creation text. Database color normalization is unnecessary because the settings service normalizes every read response and every create/update write to fixed Indigo, while frontend and report rendering ignore stored palette values. Focused Phase 25.3 tests pass 16/16 plus Platform Administrator backend 8/8; Phase 25.2 passes 7/7; Phase 25.1 passes 5/5; admin routes pass 4/4; integration routes pass 2/2; integrations pass 31/31; AI passes 18/18; and automation passes 88/88. Prisma validation, root backend/frontend typecheck, root backend/frontend lint, format check, backend production build, frontend production build, static rejection searches, and `git diff --check` pass. The frontend build retains the existing non-blocking Vite chunk-size advisory. No browser automation or manual browser testing was performed.

## Phase 25.2 Platform Administration Hardening, Global Design System, and Business Approval

Implementation is complete. New owner-created and Platform Administrator-created businesses now start as `PENDING`; only a Platform Administrator can move a business through the guarded `PENDING`, `ACTIVE`, `SUSPENDED`, `REJECTED`, and `ARCHIVED` lifecycle. Existing business records retain their stored state. Non-active businesses can load only the minimum business context needed for a clear review/suspension/rejection/archive experience, while tenant operational services require `ACTIVE`. The Platform Administrator can create and safely edit businesses, approve/reject/suspend/reactivate/archive them, inspect and manage user verification/account/session state, inspect feedback without editing it, and inspect/pause/resume supported integrations. Live disconnection remains tenant-admin-only so provider authorization can be revoked through the established connector path.

The Platform Administrator dashboard now includes pending-approval visibility and a direct action-required item. Significant Platform Administrator business, user, integration, and settings mutations are stored in a new safe `PlatformAdminActivity` audit stream without credentials or feedback content. No tenant secrets, OAuth tokens, provider cursors, credential hashes, or raw authentication material are returned from oversight APIs.

Phase 25.2 originally introduced configurable palette fields and a personal-theme precedence rule; both presentation decisions were superseded by Phase 25.3. The retained settings are limited to values consumed by real surfaces: public description/hero/CTA/support content, appearance, and report defaults/branding. The fixed Indigo tokens and authoritative platform-appearance precedence are described in the Phase 25.3 section above. Public navigation is session-aware; authenticated `/` visits redirect by role, `/login` and `/register` remain public-only, and authenticated users may still open informational public routes directly. The Phase 25.1 collection-view policy and route exceptions are unchanged.

Migration `20260817120000_phase_25_2_admin_hardening` was not applied by Codex; the user later confirmed it was applied successfully on 2026-08-17 at 09:44:10.207 with no rollback. Static verification passed: `npm run typecheck`, `npm run lint`, `npm run build`, Phase 25.2 focused tests 7/7 plus Platform Administrator backend tests 8/8, Phase 25.1 regression tests 5/5 plus admin tests 8/8, AI 18/18, automation 88/88, integrations 31/31, legal 3/3, seed 3/3, and integration-router checks. The production build retains the existing non-blocking Vite chunk-size advisory. Prisma Client generation was attempted; the installed client was generated sufficiently for typecheck/build, but a later isolated generate attempt hit restricted-network access to `binaries.prisma.sh`. No migration or database mutation was performed by Codex. Browser automation and manual browser testing were not performed; the manual checklist in `NEXT_STEPS.md` remains with the user.

## Phase 25.1 System-Wide Responsive UI Refinement, List/Grid View, and Platform Settings

Implementation is complete. A reusable, accessible, per-page persisted List/Grid system now covers Platform Administrator Businesses, Users, Feedback, and Integrations plus tenant Unified Feedback, Customers, Branches, Staff, Invitations, Automation Rules, and QR Codes. The exact unsaved default policy is Grid on small/tablet screens, Grid for zero or two-or-more items on every screen, and List only on a large screen with exactly one item. Manual preferences use local storage only and do not trigger server calls. Explicit exceptions and their UX reasons are recorded in `PHASE_25_1_RESPONSIVE_COLLECTION_AUDIT.md`.

`/admin/feedback` and `/admin/integrations` now use compact collapsible filters, active-filter counts/clear actions, responsive record cards, persisted List/Grid controls, empty states, and responsive pagination without changing their existing backend filtering or pagination contracts. `/admin/settings` persists global identity, headline, logo URL, default appearance, and footer text. Its former editable color controls are superseded by Phase 25.3's fixed Indigo system; the stored color columns remain compatibility-only. Safe public settings are read through `GET /api/platform-settings`; `GET/PATCH /api/admin/settings` remain behind `authMiddleware` and `requirePlatformAdmin`. Global branding updates BrandMark, the public headline/footer, document title, and platform appearance.

Migration `20260816120000_phase_25_1_platform_settings` was applied locally by the user before Phase 25.2. Static verification passed: Prisma schema validation and client generation; frontend/backend typecheck and lint; frontend and backend production builds; five focused Phase 25.1 frontend tests; eight Platform Administrator backend tests including settings validation, singleton persistence wiring, and the role guard; and four admin route/API static checks. The combined root build wrapper timed out while the slow backend compiler was still running, so backend and frontend builds were rerun separately and both passed. The frontend retains the existing non-blocking Vite chunk-size warning. Manual browser, responsive, persistence, authorization, and visual verification remains pending with the user.

## Current Phase

Phase 25: Platform Administrator Dashboard & Reporting is implementation-complete. The former `/admin/businesses`-only experience is now a responsive SaaS administration console with `/admin` as the Platform Administrator landing page; functional navigation for dashboard, businesses, users, feedback oversight, integration oversight, reports, and system health; real database-backed KPIs and charts; persisted-state action-required and health logic; safe recent activity; improved business details; and, after Phase 25.4, exactly three supervisor-focused on-demand PDF/CSV report types. Every new `/api/admin/*` route requires `PLATFORM_ADMIN`. Reports and report history are not persisted. No Prisma schema/migration or environment-variable change was required. Manual browser, responsive, visual, filter, authorization, PDF-download, and CSV-download verification remains pending with the user.

Phase 25 static verification passed: focused Phase 25 backend tests passed 6/6 and frontend route/API checks passed 4/4; AI tests passed 18/18; automation tests passed 88/88; integrations passed 31/31; legal passed 3/3; development seed passed 3/3; the existing integration-router checks passed; `npm run prisma:validate`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, and `git diff --check` passed. The production build retained the existing non-blocking Vite chunk-size warning. Prisma Client regeneration was attempted twice but Windows blocked replacement of the in-use query-engine DLL with `EPERM`; Phase 25 has no schema change and the existing generated client passed typecheck/build. `npm audit --omit=dev` reported two existing moderate React Router advisories; no forced major router upgrade was introduced in this phase.

Phase 1: Project Foundation is complete and manually verified by the user.

Phase 2A: Core Email/Password Authentication, Roles, and Sessions is complete, stabilized, and manually verified by the user.

Phase 2B: Google Registration, Google Login, and Secure Account Linking is complete and manually verified by the user.

Phase 2C: Email Verification, Forgot Password, Password Reset, and Final Authentication Hardening is complete and manually verified by the user.

Phase 2 Login Page Redesign has been implemented using the requested split authentication reference direction. Manual visual, theme, responsive, and login-flow verification is still required by the user.

Phase 2 Login Page Visual Refinement has been implemented against the now-available approved reference image at `frontend/references/login-page-design.png`. Manual visual comparison and auth-flow regression testing is still required by the user.

Phase 2 Login Page Focused Form Proportion Correction has been implemented. Manual visual confirmation of the larger form card, desktop balance, light/dark appearance, and responsive behavior is still required by the user.

Phase 2 Authentication and Account Premium Redesign has been implemented across the remaining approved auth/account references. Manual visual, responsive, dark/light theme, and functional regression verification is still required by the user.

The complete public-facing website has been implemented before Phase 3 using the eight approved public-page references in `frontend/references/` and manually approved by the user.

Phase 3: Businesses, Branches, and Staff has been implemented and manually verified by the user.

Phase 4: Standard Feedback Processing Service has been implemented and manually verified by the user.

Phase 4 feedback simulation CLI error sanitization has been fixed. The user reported the safe empty-message validation retest passed during Phase 4 manual checks.

Phase 4 final manual-verification support has been implemented for attachment metadata CLI input and local-only failed-ingestion simulation.

Local Platform Administrator seed alignment has been implemented through the existing Prisma seed workflow. Manual seed execution and admin login verification are still required by the user.

The 2026-08-16 clean-database recovery support and comprehensive development seed are implemented. The existing platform-administrator reconciliation remains intact, while non-production seeding now adds deterministic, idempotent `dev_seed_*` fixtures for two tenant-isolated businesses, active/inactive branches, Owner/Admin/Manager/Staff memberships and branch scopes, customers, every feedback channel and workflow state, public/QR feedback, completed/failed/skipped AI analysis states, automation rules/history, and six Demo Mode integration lifecycles. It creates no Live connection, integration credential, OAuth state, webhook delivery, external AI call, automation job, session, invitation, notification, or provider request. The schema and all committed migrations are unchanged. No database rebuild, migration, seed execution, or browser/manual testing was performed by Codex because the local database is corrupted and destructive recovery is reserved for the user.

Comprehensive development seed static verification passed: `npm run test:seed` passed 3/3 fixture coverage and safety tests; `npm run prisma:validate`, `npm run prisma:generate`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, targeted seed safety inspection, and `git diff --check` passed. The first sandboxed seed-test attempt was blocked by Windows `spawn EPERM`; the same scoped command passed outside the sandbox. Prisma emitted only its existing Prisma-7 configuration deprecation/update notices, and the frontend build emitted the existing non-blocking large-chunk warning. Database migration status and seeded row counts remain manual verification because no database command was run.

Phase 5: Manual Entry Connector backend and frontend have been implemented and manually verified by the user.

Phase 6: Public Feedback Portal is implemented and manually verified by the user.

Phase 7: QR-Code Feedback Submissions is implemented and manually verified by the user.

Phase 8: Unified Feedback Inbox backend and frontend have been implemented. Core manual workflows, filters, details, responsive behavior, and dark-mode behavior have passed manual testing. Full verification remains pending because cross-business tenant-isolation, platform-administrator access, and final regression/security checks are deferred until after Phase 20.

Phase 8 Feedback Details Drawer Layout Repair has been implemented for the All Feedback detail drawer. It fixes viewport-level positioning, right-edge placement, responsive width, full-height sizing, internal drawer scrolling, body-scroll locking, backdrop dimming, focus handling, and long-text wrapping. Manual browser verification is still required by the user.

Phase 9: Feedback Details and Workflow backend and frontend have been implemented. The Phase 9 migration is applied. Core manual status, note, workflow activity, role, and branch workflows have passed manual testing. Full verification remains pending because deferred multi-tenant/security/regression checks remain.

Phase 10: Assignment, Categories, and Priorities backend and frontend have been implemented. The Phase 10 migration is applied. Core manual assignment, category, priority, role, branch, responsive, and dark-mode workflows have passed manual testing. Full verification remains pending because deferred multi-tenant/security/regression checks remain.

Phase 11: Customer Profiles backend, frontend, database, security, and documentation implementation is complete. Migration `20260726110000_phase_11_customer_profiles` is applied locally. Manual browser/functional verification is still required by the user.

Phase 12: Full Search and Filters backend and frontend implementation is complete. Manual browser/functional verification is still pending. The user decided on 2026-07-26 to defer standalone Phase 11 manual verification, implement Phase 12 first, and then manually test Phases 11 and 12 together.

Phase 13: AI Sentiment Analysis, Categorization, and Summaries backend, frontend, database, security, and documentation implementation is complete. Migration `20260727083000_phase_13_ai_feedback_analysis` is applied locally and was not modified during the completion audit. The completion audit added focused backend tests, suggestion-state lifecycle hardening, UTC daily-limit handling, owner/admin-only business AI controls, expanded backfill counts, and the missing inbox AI suggestion-state filter. Manual browser/functional verification is still pending.

Phase 13 manual AI retry repair has been implemented. Manual Retry now resets the automatic retry counter to keep the analysis worker eligible instead of incrementing past `AI_MAX_RETRIES`, treats already queued/processing analyses idempotently, preserves the last generated sentiment/language/summary while a replacement attempt is pending or if the latest retry fails, and disables the feedback-drawer Retry button while work is already queued or processing. No Prisma schema or migration change was required. Manual browser verification is still pending.

Phase 14: Automation Rules Engine backend, frontend, database, worker, security, tests, and documentation implementation is complete. Migration `20260727091241_phase_14_automation_rules` and follow-up migration `20260727143000_phase_14_field_source_backfill` are applied locally. The 2026-07-27 completion audit fixed historical field-source backfill, added `DEFAULT` field ownership, expanded Phase 14 backend tests to 86 passing tests, and made automation list filters URL-backed. Manual browser/functional verification is still pending. The user plans to manually test Phases 11, 12, 13, and 14 together.

Phase 20: Connector Framework and Demo Synchronization backend, frontend, database, worker hook, tests, and documentation implementation is complete. Migration `20260803090000_phase_20_connector_framework_demo_sync` is applied locally. The implementation is Demo Mode-only with Google Reviews, WhatsApp, Email, X, Facebook, and Instagram providers, a shared connector contract, connector registry, one default active Branch per connection, Owner/Admin-only management, manual synchronization, deterministic demo datasets, sync history, per-item safe results, mandatory Phase 4 `FeedbackProcessingService` reuse, and no direct `Feedback` inserts. Manual browser/functional verification is still pending.

Phase 20 integrations route-not-found repair has been implemented. The canonical frontend route is `/business/:businessId/integrations`; planned detail/history URLs now redirect to that canonical workspace route instead of falling through to the wildcard 404. The owner/admin sidebar link still points to the canonical route, and Manager/Staff users remain blocked from integration management by frontend role handling and backend Owner/Admin-only APIs. Manual route retesting is still pending.

Phase 20 integrations premium UI redesign has been implemented for `/business/:businessId/integrations`. The frontend now follows the approved Phase 20 references with a stronger header action set, prominent Demo Mode banner, responsive search/provider/status/branch filters, polished six-provider card grid, friendly labels instead of raw enum text, provider icon treatments, summary and activity panels, redesigned recent synchronization run history, stepped Connect Demo dialog, run details dialog, progress/result states, and mobile card fallbacks. Existing Phase 20 API contracts, query keys, cache invalidation, Owner/Admin access handling, branch selection, connection lifecycle actions, manual sync, run item retry, Demo Mode truthfulness, and backend behavior are preserved. Manual visual/browser verification is still pending and Phase 20 is not manually verified.

Phase 20 provider-card grid repair has been implemented for `/business/:businessId/integrations`. The provider card grid now stays one card per row by default and two cards per row from the `md` breakpoint upward by removing the previous `xl:grid-cols-3` expansion from both the loading skeleton grid and provider card grid. This frontend-only presentation change preserves existing card content, actions, filters, summary panels, synchronization history, API calls, permissions, and Demo Mode behavior. Manual browser verification was not run by Codex.

Phase 20 provider-card grid repair static checks passed: `npm run format`, `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`. `npm run build` completed with the existing non-blocking Vite large-chunk warning, and `git diff --check` reported only normal Git LF-to-CRLF working-copy warnings.

Phase 21: Live Email Integration discovery is complete and documented in `PHASE_21_DISCOVERY_REPORT.md`. The interrupted Phase 21 implementation was recovered and completed. The Gmail-only Live Email MVP now extends the Phase 20 connector framework with Gmail API OAuth initiation/callback handling, PKCE-backed one-time OAuth state, encrypted backend-only integration credentials, one Live Email connection per Business, one required default active Branch, Demo/Live Email coexistence by `IntegrationMode`, Inbox-only manual synchronization, latest-20 initial import, Gmail history-ID incremental cursor, Message-ID/provider-ID deduplication, metadata-only attachments, plain-text-only Feedback messages, safe Live Email inbox metadata, frontend Live Gmail connection and reauthorization states, and mandatory Phase 4 `FeedbackProcessingService` reuse. Migration `20260805090000_phase_21_live_email_gmail_oauth` is applied locally. The user reported that real Gmail OAuth configuration, real Gmail connection, first real Gmail synchronization, imported Gmail feedback visibility in Unified Inbox, and a duplicate-safe incremental second sync have passed core manual verification. Exhaustive Phase 21 security/regression verification remains pending.

Phase 22: Live WhatsApp Cloud API Meta test-number inbound webhook MVP is implemented. Migration `20260810120000_phase_22_live_whatsapp_cloud_api` is applied locally. The implementation adds Live WhatsApp provider registration to the Phase 20 connector framework, existing integrations-page Live WhatsApp setup/edit states, encrypted backend-only Meta access-token storage, one Live WhatsApp connection per Business, one required active default Branch, Demo/Live WhatsApp coexistence, GET verification with `hub.challenge`, pre-parse `X-Hub-Signature-256` raw-body HMAC validation with the Meta App Secret, phone-number-ID connection resolution, inbound text-message-only normalization, provider-message-ID webhook delivery deduplication, safe webhook activity persistence, Unified Inbox Live WhatsApp source details, and mandatory Phase 4 `FeedbackProcessingService` reuse. No outbound replies, templates, media downloads, production phone-number onboarding, polling, scheduled sync, Redis queue, WhatsApp Web/Twilio path, browser/browser automation, screenshot/reference image, Outlook, live Google Reviews, or social media implementation was added. Manual Meta test-number/browser verification is still pending, and Phase 22 is not manually verified.

Phase 23: Live Outlook / Microsoft Email Microsoft Graph OAuth inbound synchronization MVP is implemented. Migration `20260810170000_phase_23_live_outlook_email` is applied locally. The implementation keeps one existing Email Live surface while allowing one Gmail Live connection and one Outlook Live connection per Business, adds Microsoft OAuth initiation/callback handling with PKCE state, encrypted backend-only OAuth credential storage, delegated `offline_access User.Read Mail.Read` scopes, Microsoft Graph v1.0 Inbox-only reads, immutable ID preference, text-body preference, latest-20 initial import, delta cursor handling, metadata-only attachment mapping, safe Outlook inbox source metadata, provider-specific reauthorization/error states, and mandatory Phase 4 `FeedbackProcessingService` reuse. No Mail.Send, SMTP/IMAP sync, outbound email/replies, Graph beta, full mailbox scan, scheduled sync/webhooks, provider polling, attachment binary download, browser/browser automation, screenshot/reference image, direct `Feedback` insert path, live Google Reviews, or social media implementation was added. Manual real Outlook OAuth/browser synchronization verification is still pending, and Phase 23 is not manually verified.

Phase 24: Live Facebook + Instagram Meta Social Feedback Webhook Integration MVP is implemented. No Prisma migration was required; the implementation reuses existing `IntegrationConnection`, `IntegrationCredential`, and `IntegrationWebhookDelivery` storage from Phases 20 through 23. The implementation adds Live Facebook Page and Live Instagram professional-account connector registration, Owner/Admin setup/edit states on the existing Facebook and Instagram cards, encrypted backend-only developer/test token storage, one Live Facebook and one Live Instagram connection per Business enforced in service logic, one required active default Branch, shared Meta GET webhook verification, shared pre-parse `X-Hub-Signature-256` raw-body HMAC validation, Facebook Page ID / Instagram professional-account ID connection resolution, inbound comment-only normalization, provider comment ID webhook delivery deduplication, safe webhook activity records, Unified Inbox Live Facebook/Instagram source details, and mandatory Phase 4 `FeedbackProcessingService` reuse. Instagram mentions are deferred. No replies, DMs, Messenger, publishing, moderation, media download, polling, scheduled sync, production OAuth onboarding, multiple social accounts per provider, browser/browser automation, screenshot/reference image, live Google Reviews, X, direct `Feedback` insert path, or Phase 25 monitoring behavior was added. Manual Meta/browser verification is still pending, and Phase 24 is not manually verified.

Phase 24 public legal-page support for Meta application publishing is implemented. The Express backend now serves `GET /privacy`, `GET /terms`, and `GET /data-deletion` as responsive standalone HTML pages without authentication, frontend routing, redirects, database queries, analytics, tracking, cookies, external scripts, or external assets. The pages cross-link to one another, use `thecominggreatone@gmail.com`, and document privacy, terms, and user-data deletion behavior consistent with the implemented application. HTTP-level automated tests confirm all three routes return `200` and `text/html` without credentials. Manual public Cloudflare-tunnel verification remains pending with the user and is not claimed.

The Phase 24 Meta webhook GET verification blocker is repaired. `GET /api/integrations/meta/webhook` now validates the required `hub.mode`, `hub.verify_token`, and `hub.challenge` parameters, compares the existing `META_WHATSAPP_VERIFY_TOKEN` with timing-safe equality, returns the exact challenge as plain text, and no longer couples a successful Meta handshake to a Prisma connection-status update. Missing parameters return controlled `400` responses and invalid mode/token values return controlled `403` responses. Phase 24 Facebook/Instagram POST processing and Phase 22 WhatsApp raw-body `X-Hub-Signature-256` validation remain unchanged. No environment variable name/value, Prisma schema, migration, AI worker, or automation worker change was made. Manual localhost/Meta verification remains pending with the user.

The shared Meta webhook WhatsApp dispatch defect is repaired. Signed `whatsapp_business_account` deliveries to `POST /api/integrations/meta/webhook` are now routed, after strict raw-body HMAC validation, to the existing Phase 22 WhatsApp processor instead of being passed only to the Phase 24 social parser. Live WhatsApp connection lookup now matches the signed WABA entry ID when present together with `metadata.phone_number_id`. Signed Facebook Page and Instagram payloads continue to use the existing social processor. No environment, Cloudflare, schema, migration, credential, AI worker, or automation worker change was made. Manual signed webhook/import verification remains pending with the user.

Shared Meta WhatsApp dispatch repair static checks passed: the focused Meta/WhatsApp subset passed 18/18 after the first sandboxed attempt hit Windows `spawn EPERM`; the identical scoped command passed outside the sandbox. The complete integration suite passed 31/31. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, and `git diff --check` passed. The build emitted only the existing non-blocking Vite large-chunk warning. No browser/manual testing was performed.

Meta webhook GET verification repair static checks passed: focused HTTP route tests passed 5/5; the complete integration suite passed 29/29; `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`, and `git diff --check` passed. The production build completed with the existing non-blocking Vite large-chunk warning. No browser/manual testing was performed.

Public legal-page support static checks passed: `npm run format`, `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:legal`, `npm run test:integrations`, targeted no-change/source-safety inspection, and `git diff --check`. The legal suite passed 3 tests and the existing integration regression suite passed 24 tests. The first sandboxed legal-suite attempt was blocked by Windows `spawn EPERM`; the same scoped command passed outside the sandbox. The production build completed with the existing non-blocking Vite large-chunk warning. `git diff --check` found no whitespace errors and reported only normal Git LF-to-CRLF working-copy warnings.

Phase 24 static/database checks passed: `npm run format`, `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run test:integrations`, `npm run build`, `npm run prisma:validate`, `npm run prisma:generate`, backend `npx prisma migrate status`, targeted source-safety searches, and `git diff --check`. `npm run build` completed with the existing non-blocking Vite large-chunk warning. A root-level `npx prisma migrate status --schema backend/prisma/schema.prisma` attempt failed because Prisma did not load `backend/.env` and could not find `DATABASE_URL`; rerunning `npx prisma migrate status` from `backend/` succeeded and reported the database schema is up to date. `git diff --check` reported no whitespace errors and only normal Git LF-to-CRLF working-copy warnings.

Phase 23 static/database checks passed: `npx prisma format`, `npm run prisma:validate`, `npm run prisma:generate`, `npm run format:check`, `npm run typecheck`, `npm run test:integrations`, `npm run lint`, `npm run build`, targeted source-safety searches, `git diff --check`, and non-destructive `npx prisma migrate deploy`. `npm run build` completed with the existing non-blocking Vite large-chunk warning. `git diff --check` reported no whitespace errors and only normal Git LF-to-CRLF working-copy warnings. `npx prisma migrate dev --skip-generate` was not used to apply the migration because Prisma detected checksum drift in previously applied Phase 14/22 migration files and requested a destructive reset; no reset was performed. `npx prisma migrate deploy` then applied `20260810170000_phase_23_live_outlook_email` successfully.

Phase 22 discovery static checks passed: `npm run format`, `npm run format:check`, and `git diff --check`. `npm run format:check` reported all matched files use Prettier style. `git diff --check` reported no whitespace errors and only normal Git LF-to-CRLF working-copy warnings for modified Markdown files.

Phase 22 implementation static/database checks passed: `npx prisma format`, `npm run prisma:validate`, `npm run prisma:generate`, `npx prisma migrate status`, `npm run typecheck`, `npm run lint`, `npm run test:integrations`, frontend `npm run lint`, frontend `npm run build`, targeted security/source searches, and `git diff --check`. The initial `npx prisma migrate deploy` attempt hit MySQL error 1059 because Prisma's default generated webhook-delivery unique index name exceeded MySQL's identifier limit after earlier statements had applied; the Phase 22 schema/migration were updated with short explicit constraint names, the missing additive DDL was applied, and `npx prisma migrate resolve --applied 20260810120000_phase_22_live_whatsapp_cloud_api` restored a clean migration state. Final `npx prisma migrate status` reported the database schema is up to date. Post-migration local counts were `IntegrationConnection=3`, `IntegrationCredential=1`, `Feedback=24`, `FeedbackIngestion=25`, and `IntegrationWebhookDelivery=0`. Frontend build completed with the existing non-blocking Vite large-chunk warning.

Phase 21 implementation static/database checks passed: `npm run format:check`, `npm run prisma:validate`, `npm run prisma:generate`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:ai-analysis -w backend`, `npm run test:automation`, and `npm run test:integrations`. `npm run build` completed with the existing non-blocking Vite large-chunk warning. A first `npx prisma migrate status` attempt failed while local MySQL was not reachable; after starting XAMPP MySQL safely, `npx prisma migrate deploy` applied the Phase 21 migration and a final status check reported the database schema is up to date. Final `git diff --check` must be rerun after memory-file updates.

Phase 20 discovery static checks passed: `npm run format`, `npm run format:check`, and `git diff --check`. `git diff --check` reported only normal Git LF-to-CRLF working-copy warnings for modified Markdown files.

Phase 20 implementation static/database checks passed: `npx prisma format`, `npm run prisma:validate`, `npm run prisma:generate`, `npx prisma migrate deploy`, `npx prisma migrate status`, direct Prisma/database table and enum checks, `npm run format`, `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:ai-analysis -w backend`, `npm run test:automation`, `npm run test:integrations`, and `git diff --check`. The first sandboxed `npm run test:integrations` attempts hit Windows `spawn EPERM`; rerunning the same approved npm script outside the sandbox passed 4 tests.

Phase 20 integrations route repair added `npm run test:router` for a static frontend router regression check covering route registration, fallback ordering, lazy export, owner/admin sidebar linking, and integration subroute redirects. Repair static checks passed: `npm run format`, `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:router`, `npm run test:integrations`, and `git diff --check`. `git diff --check` reported only normal Git LF-to-CRLF working-copy warnings, and `npm run build` completed with the existing non-blocking Vite large-chunk warning. Manual browser verification was not run by Codex.

The user reported during Phase 20 discovery that Phase 11 core supervisor-facing Customer creation/profile workflow passed, Phase 12 core supervisor-facing search/Branch/status/priority/refresh-persistence/clear-filter workflow passed, Phase 13 AI configuration readiness passed, and Phase 14 rule creation/activation passed. Exhaustive manual verification remains pending, so Phases 11, 12, 13, and 14 must not be marked fully manually verified.

Role-based authenticated landing repair has been implemented. Default email login, Google login, Google registration, public-only route fallback, root/error redirect fallback, and unauthorized role-guard fallback now use a shared frontend destination helper: platform administrators land on `/admin/businesses`, business owners and staff enter `/business`, and customers remain on `/account`. Protected-route `from` redirects are preserved. Manual browser verification is still required.

Business setup required-field and placeholder repair has been implemented. `/business/setup` now shows visible `*` markers on required fields, placeholders on every setup field, frontend validation for optional primary-branch email/phone, backend-aligned primary-branch code validation, and corrected shared `TextField` wrapper class handling. Manual browser verification is still required.

Customer form ref and placeholder repair has been implemented. The shared customer create/edit modal now forwards React Hook Form refs to real input elements so filled customer values are captured before validation, and all modal fields have placeholders. Manual browser verification is still required.

Feedback Inbox filter display repair has been implemented. `/business/:businessId/feedback` now keeps search, branch, status, channel, sort, clear, and an advanced-filter trigger aligned in a compact toolbar, moves the remaining Phase 12 filters into a styled popover, and uses local shadcn-style Radix Select/Popover primitives for the filter dropdowns. Existing URL-backed filter state, active chips, backend query parameters, and tenant/branch enforcement are preserved. Manual browser verification is still required.

Feedback Inbox search toolbar alignment repair has been refined. `/business/:businessId/feedback` now uses a wrapping primary filter toolbar: the search field keeps a healthy minimum width, and branch/status/channel/sort/filter/clear controls wrap inside the panel when space is tight instead of forcing horizontal overflow. Existing search debouncing, URL-backed filter keys, backend request parameters, advanced filters, tenant/branch enforcement, and feedback list behavior are preserved. Manual browser verification is still required.

Workspace dropdown and date-picker standardization has been implemented. Remaining native frontend `<select>/<option>` controls were replaced with shared shadcn-style Radix select fields, and native date/datetime-local controls were replaced with a shared popover calendar/date-time field. The conversion covers public feedback, manual feedback, QR creation, workspace business switching, customer filters/history, inbox pagination and assignment, automation filters/builders, category settings, staff role management, invitations, and shared status filters. Submitted values, URL filter keys, React Hook Form ownership, backend API contracts, and tenant/branch enforcement are preserved. Manual browser verification is still required.

Customer list filter display and responsive repair has been implemented. `/business/:businessId/customers` now keeps search, status, branch, sort, clear, and an advanced-filter trigger in a compact responsive toolbar, moves channel/contact/rating/latest-feedback filters into a styled popover, and keeps stacked customer cards available below the wider desktop breakpoint so zoomed layouts do not hide row actions. Existing URL-backed filter keys, backend customer query behavior, customer creation, customer linking, and tenant/branch enforcement are preserved. Manual browser verification is still required.

Automation builder responsive row repair has been implemented. `/business/:businessId/automations` now uses container-aware condition/action row grids, keeps long selected operator labels on one line, wraps row move/delete controls cleanly, and delays the split rule-list/builder layout until wider viewports so the builder does not squeeze at zoomed widths. Existing rule definitions, validation, save/preview/run mutations, URL-backed list filters, backend APIs, worker behavior, and tenant/branch enforcement are preserved. Manual browser verification is still required.

Automation draft target normalization repair has been implemented. `/business/:businessId/automations` now normalizes rule-builder actions and conditions before save, and the backend normalizes the submitted definition again before validation and persistence. This prevents stale empty target IDs such as `categoryId: ""` from reaching Prisma foreign keys and turning draft creation into a 500 error. Existing active-rule validation, category/member/branch target checks, tenant enforcement, execution behavior, worker behavior, and field-source protection are preserved. Manual browser verification is still required.

Automation management UX and archive lifecycle repair has been implemented. `/business/:businessId/automations` now resets the builder after successful new-rule creation, shows success notices for save/lifecycle actions, confirms duplicate and permanent-delete actions with a shadcn-style dialog, restores archived rules as drafts, permanently deletes only archived rules, and replaces the raw Review and test feedback ID input with an accessible feedback picker. Backend enforcement remains owner/admin-only and no Prisma migration was required. Manual browser verification is still required.

Automation rule selection and feedback picker usability repair has been implemented. `/business/:businessId/automations` now selects a saved rule when the user clicks anywhere in the desktop rule row except the actions column, and mobile rule cards select from the card body while keeping action buttons separate. The Review and test feedback picker now searches accessible feedback through the existing backend feedback-list search query and paginates results. Existing automation test/manual-run validation, rule lifecycle behavior, feedback API contracts, and tenant/branch enforcement are preserved. Manual browser verification is still required.

Portal sidebar logout repair remains implemented, but the fixed-sidebar scroll behavior and hidden internal sidebar scrollbar polish were reverted at the user's request. Business and account sidebars now scroll together with the page content again, while the bottom Sign out actions, account mobile drawer, and admin header Sign out action remain wired to the existing logout flow. Existing backend auth contracts, session/cookie logout behavior, route guards, business switching, tenant enforcement, and navigation destinations are preserved. Manual browser verification is still required.

Branch form responsive required-field repair has been implemented. `/business/:businessId/branches/new` now keeps the branch form stacked until wider viewports, gives the address field full-width room, aligns save/back actions responsively, marks required branch fields with visible `*` labels, and adds placeholders to every branch input. Existing React Hook Form values, branch validation, create/edit API payloads, backend branch authorization, and tenant enforcement are preserved. Manual browser verification is still required.

Business workspace header responsive alignment repair has been implemented. Shared `WorkspaceShell` header controls now stay in a flex row on tablet/desktop where space allows, the active-business selector is narrower so workspace actions have room, and customer-page action buttons remain side-by-side outside mobile layouts. Existing business switching, workspace search disabled state, theme/notification controls, customer queries, customer mutations, routing, and backend tenant enforcement are preserved. Manual browser verification is still required.

Current required status:

- Phase 3 implemented and manually verified
- Phase 4 implemented and manually verified
- Phase 5 implemented and manually verified
- Phase 6 implemented and manually verified
- Phase 7 implemented and manually verified
- Phase 8 backend implemented
- Phase 8 frontend implemented
- Phase 8 feedback-details drawer layout and responsiveness defect repaired
- Phase 8 core manual workflows passed
- Phase 8 full manual verification still pending because deferred checks remain
- Phase 8 must not be marked manually verified
- Phase 9 backend implemented
- Phase 9 frontend implemented
- Phase 9 migration applied
- Phase 9 core manual workflows passed
- Phase 9 full manual verification still pending because deferred checks remain
- Phase 9 must not be marked manually verified
- Phase 10 backend implemented
- Phase 10 frontend implemented
- Phase 10 migration applied
- Phase 10 static checks passed
- Phase 10 core manual workflows passed
- Phase 10 full manual verification still pending because deferred checks remain
- Phases 8, 9, and 10 must not be marked fully manually verified until deferred cross-business tenant-isolation, platform-administrator, concurrency, failure-handling, final regression, and security checks pass after Phase 20
- Phase 11 Customer Profiles backend implemented
- Phase 11 Customer Profiles frontend implemented
- Phase 11 migration applied
- Phase 11 static checks passed
- Phase 11 manual verification pending
- Phase 12 backend implemented
- Phase 12 frontend implemented
- Phase 12 static checks passed
- Phase 12 manual verification pending
- Phase 13 backend implemented
- Phase 13 frontend implemented
- Phase 13 migration applied
- Phase 13 manual AI retry eligibility and previous-review preservation repair implemented
- Phase 13 audit tests passed (`npm run test:ai-analysis -w backend`)
- Phase 13 static/build verification passed (`npx prisma format`, `npm run prisma:validate -w backend`, `npm run prisma:generate -w backend`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run format`, `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`)
- Phase 13 direct Prisma verification passed after audit: `Feedback.count() = 12`, `FeedbackAIAnalysis.count() = 0`, Phase 13 migration row present, and `feedback_ai_analyses` table present
- Phase 13 manual verification pending
- Phase 13 manual retry repair manual browser verification pending
- Phase 14 backend implemented
- Phase 14 frontend implemented
- Phase 14 base migration applied
- Phase 14 follow-up field-source backfill migration applied
- Phase 14 static/build verification passed after the completion audit (`npx prisma format`, `npm run prisma:validate`, `npm run prisma:generate`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run format`, `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:ai-analysis -w backend`, `npm run test:automation`, and `git diff --check`)
- Phase 14 direct Prisma verification passed after the backfill: `Feedback.count() = 12`, `FeedbackAIAnalysis.count() = 0`, `FeedbackFieldState.count() = 48`, each tracked field has 12 rows, no duplicate `(feedbackId, field)` rows exist, automation rule/event/execution counts remain 0, and Phase 13/14 migration rows and tables are present
- Phase 14 automation tests passed (`npm run test:automation`, 88 tests)
- Phase 14 manual verification pending
- Phase 20 backend implemented
- Phase 20 frontend implemented
- Phase 20 migration applied
- Phase 20 Demo Mode providers implemented for Google Reviews, WhatsApp, Email, X, Facebook, and Instagram
- Phase 20 synchronization imports use `FeedbackProcessingService.process`
- Phase 20 integrations premium frontend redesign implemented against the approved references
- Phase 20 integration tests passed (`npm run test:integrations`, 4 tests)
- Phase 20 static/build/database verification passed
- Phase 20 manual verification pending
- Role-based auth landing frontend repair implemented
- Role-based auth landing manual browser verification pending
- Business setup required-field and placeholder frontend repair implemented
- Business setup required-field and placeholder manual browser verification pending
- Customer form ref and placeholder frontend repair implemented
- Customer form create/edit manual browser verification pending
- Feedback Inbox filter display frontend repair implemented
- Feedback Inbox compact toolbar and shadcn-style dropdown manual browser verification pending
- Feedback Inbox search toolbar alignment frontend repair implemented
- Feedback Inbox search toolbar alignment manual browser verification pending
- Workspace dropdown/date-picker frontend standardization implemented
- Workspace dropdown/date-picker responsive manual browser verification pending
- Customer list compact filter/responsive frontend repair implemented
- Customer list compact filter/responsive manual browser verification pending
- Automation builder responsive row frontend repair implemented
- Automation builder responsive row manual browser verification pending
- Automation draft target normalization frontend/backend repair implemented
- Automation draft target normalization manual browser verification pending
- Automation management UX and archive lifecycle frontend/backend repair implemented
- Automation management UX and archive lifecycle manual browser verification pending
- Automation rule selection and feedback picker frontend usability repair implemented
- Automation rule selection and feedback picker manual browser verification pending
- Portal sidebar fixed-scroll behavior reverted at user request
- Portal sidebar logout affordance frontend repair implemented
- Portal sidebar shared-scroll/logout manual browser verification pending
- Branch form responsive required-field frontend repair implemented
- Branch form responsive required-field manual browser verification pending
- Business workspace header responsive alignment frontend repair implemented
- Business workspace header responsive alignment manual browser verification pending
- Phase 20 discovery complete
- Phase 20 backend/frontend/database implementation complete
- Phase 20 migration applied
- Phase 20 manual browser/functional verification pending
- Phase 21 Gmail-only Live Email backend/frontend/database implementation complete
- Phase 21 migration applied
- Phase 21 core real Gmail connection and synchronization reported passed by the user; exhaustive security/regression verification pending
- Phase 22 Live WhatsApp Cloud API backend/frontend/database implementation complete
- Phase 22 migration applied
- Phase 22 manual Meta test-number/browser verification pending
- Phase 23 Live Outlook / Microsoft Email backend/frontend/database implementation complete
- Phase 23 migration applied
- Phase 23 manual real Outlook OAuth/browser synchronization verification pending
- Phase 24 Live Facebook + Instagram Meta comment webhook backend/frontend implementation complete
- Phase 24 required no Prisma migration
- Phase 24 manual Meta/browser verification pending
- Phase 24 public backend legal pages implemented for Meta application configuration
- Public legal routes require no authentication and do not query the database
- Public tunnel/manual Meta URL verification pending
- Phase 11, Phase 12, Phase 13, Phase 14, and Phase 20 will be manually tested together where workflows overlap

## Approved Future Synchronization Roadmap

Phase 20 discovery and implementation are complete. Phase 21 Live Email Integration discovery and Gmail-only OAuth MVP implementation are complete; the user reported the core real Gmail connection and synchronization workflow passed, with exhaustive security/regression verification pending. Phase 22 Live WhatsApp Cloud API Meta test-number inbound webhook MVP is implemented, but manual Meta test-number/browser verification is pending. Phase 23 Live Outlook / Microsoft Email inbound OAuth MVP is implemented, but manual real Outlook OAuth/browser synchronization verification is pending. Phase 24 Live Facebook and Instagram comment webhook MVP is implemented, but manual Meta/browser verification is pending. Phase 25 Platform Administrator Dashboard & Reporting is implemented, but manual browser/report verification is pending. Live Google Reviews, live X, broader social synchronization, and Phase 26 monitoring/recovery are not started.

The approved synchronization strategy is to implement a professional Demo Mode connector framework before live external provider synchronization. Real external synchronization with providers such as WhatsApp Business, Google Reviews, X, Facebook, Instagram, and Email is deferred because it depends on provider API approval, OAuth configuration, production credentials, token refresh, webhooks or polling, rate limits, provider-specific permissions, and external service availability.

Phase 20 - Connector Framework and Demo Synchronization is the implemented deadline-oriented demonstration phase. It clearly labels simulated provider data as Demo Mode, simulated external data, and not connected to the real provider. It includes shared connector architecture, reserved demo/live connection modes, deterministic Demo provider datasets, manual synchronization, synchronization history, connection health, retry flow, real Phase 4 ingestion, and source details in the inbox.

Phase 20 demo connectors must use the existing Phase 4 `FeedbackProcessingService` through `NormalizedFeedbackInput`. They must not insert directly into the `Feedback` table. The external-provider call is simulated; internal normalization, deduplication, processing, storage, and Phase 8 unified inbox display are real.

Implemented Demo providers:

- Google Reviews: reviewer name, star rating, review text, business location, and publish review.
- WhatsApp: customer name, customer phone, business branch, conversation or message, and send message.
- Email: sender name, sender email, subject, message body, optional attachment metadata, and send email.
- X: display name, handle, post text, mention or reply type, and publish post.
- Facebook and Instagram: commenter name, page/post/media context, comment or direct-message text, and publish item.

The strongest deadline implementation should prioritize Google Reviews, WhatsApp, and Email. X, Facebook, and Instagram may initially be lighter simulators or source previews if time is limited.

Revised later roadmap:

- Phase 20 - Connector Framework and Demo Synchronization: implemented, manual verification pending.
- Phase 21 - Live Email Synchronization: Gmail-only OAuth MVP implemented; core real Gmail connection/synchronization reported passed, exhaustive security/regression verification pending.
- Phase 22 - Live WhatsApp Cloud API: Meta test-number inbound text webhook MVP implemented; manual Meta test-number verification pending.
- Phase 23 - Live Outlook Synchronization: Microsoft Graph OAuth inbound-only MVP implemented; manual real Outlook OAuth/synchronization verification pending.
- Phase 24 - Live Google Reviews and Social Media Synchronization: Live Facebook and Instagram comment webhook MVP implemented, manual Meta/browser verification pending; live Google Reviews, X, replies, DMs, publishing, media download, moderation, multiple social accounts, and production OAuth onboarding remain deferred.
- Phase 25 - Platform Administrator Dashboard & Reporting: implemented, manual verification pending.
- Phase 26 - Integration Monitoring and Recovery: planned, not started.

## Phase 11 Customer Profiles

Implementation completed on 2026-07-26. Manual browser/functional verification is pending with the user.

Current implementation findings:

- Phase 11 added the business-scoped `Customer` model and nullable `Feedback.customerId` link.
- `Feedback` stores immutable customer snapshot fields: `customerName`, `customerEmail`, and `customerPhone`.
- Public form and QR follow-up consent is stored only in bounded source metadata; it is not a customer-profile preference.
- Feedback list responses expose only customer name; feedback detail responses expose snapshot name, email, and phone.
- Inbox search currently checks title, message, customer name, customer email, and customer phone snapshot fields.
- Manual, public form, and QR sources all map through adapters into `NormalizedFeedbackInput`; adapters do not insert feedback directly.
- `FeedbackProcessingService` owns validation, normalization, idempotency, external-ID conflict handling, failed-ingestion safety, and transactional feedback persistence.

Final Phase 11 reference files:

- `frontend/references/phase11-customer-profiles-primary.png`
- `frontend/references/phase11-customer-profiles-states.png`

Implemented Phase 11 scope:

- Added business-scoped `Customer` records, `CustomerStatus`, `CustomerActivity`, `CustomerActivityType`, and nullable `Feedback.customerId`.
- Preserved existing `Feedback.customerName`, `Feedback.customerEmail`, and `Feedback.customerPhone` as immutable historical snapshots.
- Existing feedback rows remained unlinked after migration; no historical customer backfill was performed.
- Added branch-safe customer list, customer detail, customer feedback history, and owner/admin customer activity APIs.
- Added owner/admin manual customer create, edit with `expectedUpdatedAt`, archive, and reactivate.
- Added manager-supported create-from-accessible-feedback plus feedback link/change/unlink for owner/admin/manager; staff is read-only.
- Added deterministic exact email/phone matching and possible-match groups; fuzzy, AI, and name-only automatic linking are not implemented.
- Added non-blocking ingestion auto-linking through `FeedbackProcessingService` after new feedback persistence.
- Added Customers workspace navigation, `/business/:businessId/customers`, `/business/:businessId/customers/:customerId`, and feedback drawer customer-profile integration.

Deferred from the Phase 11 MVP:

- Customer login/accounts, customer-facing portal, marketing campaigns, bulk messaging, CRM pipelines, AI/fuzzy matching, irreversible profile merge, unmerge, customer exports, deletion/right-to-delete automation, bulk import, external CRM sync, Phase 20 demo connectors, live provider credentials, notifications, workflow automation, and analytics/search overhauls.

Known Phase 11 risks:

- Customer profile PII must be tenant-scoped and branch-filtered in list/detail summaries.
- Branch-restricted users must not receive full business-wide customer feedback counts, latest dates, ratings, branch distributions, or history.
- Automatic matching can create false positives for shared emails, family/business phone numbers, recycled numbers, spelling differences, and conflicting email/phone identities.
- Customer profile edits must not mutate old `Feedback` snapshot values.
- Search, errors, logs, and source metadata must not leak inaccessible or sensitive customer data.

Static verification for Phase 11 is recorded in the Static Verification section. Manual verification is not claimed for Phase 11.

## Phase 12 Full Search and Filters Discovery

Discovery completed on 2026-07-26 as documentation only. No application code, Prisma schema, migration, package, design reference, browser test, browser automation, screenshot, or manual verification claim was added.

Current implementation findings:

- The Phase 8 inbox already supports URL-backed `search`, `branchId`, `channel`, `status`, `assignedTo`, `categoryId`, `priority`, `rating`, `dateFrom`, `dateTo`, `sort`, `page`, `pageSize`, and `feedbackId`.
- Inbox backend search currently checks `Feedback.title`, `Feedback.message`, `Feedback.customerName`, email snapshots only when the query contains `@`, and phone snapshots only for phone-like input.
- Inbox date filtering and sorting currently use `createdAt`, while the domain model also has `receivedAt`; Phase 12 should standardize the user-facing "received" date on `receivedAt`.
- Inbox filter option loading reuses branch, membership, and category endpoints. Branch options are actor-branch-scoped; membership options are business-wide active members unless a branch is provided.
- The customer list supports URL-backed `search`, `status`, `sort`, `page`, and `pageSize`, but the visible UI does not expose page-size changes or branch/channel/rating/feedback-date filters.
- Customer search checks profile display/first/last name, email, phone, normalized email, and normalized phone. `latestFeedback` sort currently maps to customer `updatedAt`, not latest linked feedback date.
- Customer feedback history is branch-safe and paginated server-side, but the frontend only loads the first 20 rows and does not expose URL state, pagination, search, filters, or sort controls.
- Branch-restricted customer visibility is intentionally based on accessible linked feedback, and branch-safe aggregates are computed from accessible feedback only.
- Existing indexes cover the recommended Phase 12 MVP baseline: `Feedback.businessId, receivedAt`, `Feedback.branchId, receivedAt`, `Feedback.customerId, receivedAt`, `Customer.businessId, status`, `Customer.businessId, normalizedEmail`, `Customer.businessId, normalizedPhone`, `Customer.businessId, updatedAt`, and `Customer.businessId, displayName`.

Recommended Phase 12 MVP:

- Keep all search/filter state URL-driven and bookmarkable for inbox, customer list, and customer feedback history.
- Standardize search normalization: trim, collapse whitespace, reject null bytes, cap length, lowercase email-like tokens, normalize supported phone forms, and omit empty strings.
- Expand feedback search to submitted snapshot fields plus linked customer profile fields where tenant and branch visibility allow.
- Expand customer list filters to status, linked-feedback branch, channel, rating range, latest feedback date range, feedback count range, linked/unlinked contact presence, and sort by latest feedback, recently updated, name, feedback count, and average rating.
- Expand customer feedback-history filters to search, branch, channel, status, priority, category, assignee, rating/rating range, date range, and newest/oldest sort.
- Add active filter count/chips, one-click individual removals, clear-all behavior, consistent empty/no-results/error states, and responsive mobile filter disclosure.
- Preserve tenant, role, branch, and PII boundaries. Platform administrators without tenant membership remain blocked from tenant search APIs.
- Do not add AI, fuzzy ranking, saved searches, exports, reports, notifications, customer accounts, external integrations, or Phase 20 simulator/connectors in Phase 12.

Open Phase 12 decisions requiring user approval:

- Whether feedback date filters should migrate from current `createdAt` behavior to user-facing `receivedAt` semantics in the implementation.
- Whether the inbox list should search linked customer profile fields in addition to immutable submitted snapshots.
- Whether restricted users should see all active assignee filter options or only assignees eligible for the selected/accessible branch scope.
- Whether the customer list MVP should include numeric feedback-count and average-rating filters, or keep those for a later analytics/reporting phase.
- Whether Phase 12 should create exactly two reference images before implementation, following the project's reference-led frontend workflow.

## Phase 12 Full Search and Filters Implementation

Implementation completed on 2026-07-26. Manual browser/functional verification is pending with the user, and Phase 11 manual verification remains pending so Phases 11 and 12 can be tested together.

Implemented scope:

- Used the required Phase 12 references `frontend/references/phase12-search-filters-primary.png` and `frontend/references/phase12-search-filters-states.png`.
- Added shared backend search normalization in `backend/src/utils/search-normalization.ts` for trimmed, whitespace-collapsed, null-byte-safe, length-capped search terms with email and Rwanda-compatible phone lookup normalization.
- Expanded Feedback Inbox backend search across title, message, submitted customer name/email/phone snapshots, and linked Customer display/name/email/normalized-email/phone/normalized-phone fields.
- Standardized Feedback Inbox sorting and date filtering on `Feedback.receivedAt` while preserving `createdAt` in API payloads for compatibility.
- Added Feedback Inbox filters for assignment state, category state, rating min/max plus unrated inclusion, received-date preset/custom range, and linked/unlinked customer state.
- Made stale/inaccessible Feedback Inbox branch, category, assignee, and customer filter IDs normalize away safely before query execution.
- Tightened membership option loading so branch-restricted users receive active assignee options only for selected accessible branches or at least one accessible branch.
- Expanded Customer list backend filters for status, linked-feedback branch, channel, rating range, latest-feedback date range, and contact state.
- Corrected Customer `latestFeedback` sorting to use branch-safe latest accessible linked feedback dates instead of Customer `updatedAt`.
- Added Customer Feedback-history search, branch/channel/status/priority/assignee/category/rating/date filters, newest/oldest sort, and real URL-backed pagination.
- Updated Feedback Inbox UI with controlled URL-synchronized search, expanded filter controls, date presets, removable active-filter chips, clear-all behavior, and received-date display.
- Updated Customer list UI with URL-backed branch/channel/rating/latest-feedback/contact filters.
- Updated Customer detail feedback history UI with URL-backed search, filters, and pagination.

Phase 12 did not add a Prisma schema change, migration, package, external search service, AI/fuzzy/semantic search, saved views, exports, reports, bulk actions, notifications, customer accounts, Phase 13 work, or Phase 20 connector work.

## Phase 13 AI Sentiment Analysis, Categorization, and Summaries Implementation

Implementation completed on 2026-07-27. Manual browser/functional verification is pending with the user. Phases 11, 12, 13, and 14 are planned to be manually tested together.

Implemented scope:

- Used the required Phase 13 references `frontend/references/phase13-ai-analysis-primary.png` and `frontend/references/phase13-ai-analysis-states.png`.
- Added `@google/genai` to the backend and a centralized `ai-analysis` module with provider abstraction, Gemini provider, output validation, tenant/branch-safe APIs, manual retry/apply/dismiss actions, status/backfill APIs, and a database-backed worker.
- Added Prisma enums `FeedbackAIAnalysisStatus` and `FeedbackAISentiment`, activity types `AI_RETRY_REQUESTED`, `AI_CATEGORY_APPLIED`, and `AI_CATEGORY_DISMISSED`, and model `FeedbackAIAnalysis`.
- Added migration `20260727083000_phase_13_ai_feedback_analysis`; it creates the AI analysis table and enum values only. It does not backfill existing feedback.
- Integrated non-blocking AI scheduling after Phase 4 feedback persistence. Source adapters still use the existing feedback-processing pipeline and do not call AI providers directly.
- Added strict provider output validation, prompt-injection boundaries, input minimization, deterministic input fingerprinting, truncation at `AI_MAX_INPUT_CHARS`, sanitized error states, bounded retries, stale-processing recovery, and a per-business daily analysis limit.
- Added AI sentiment/status filters to the Phase 12 inbox query and URL state, AI badges to desktop/mobile inbox cards, an AI analysis panel in the feedback drawer, and an environment-managed AI settings/status/backfill panel in business settings.
- Preserved human authority over category values: AI suggestions do not overwrite existing human categories, manual apply is conditional, dismissals are recorded, and optional auto-apply only applies to uncategorized feedback above the configured confidence threshold.
- Added focused automated tests for structured output validation, unsafe summary rejection, category-confidence validation, input truncation/fingerprinting, and empty-input skipping.

Phase 13 did not add Phase 14 automation rules, notifications/replies, customer accounts, reports, analytics dashboards, attachment AI, translation, embeddings, semantic search, Phase 20 connector behavior, browser automation, screenshots, or manual verification claims.

## Phase 14 Automation Rules Engine Implementation

Implementation completed on 2026-07-27. Manual browser/functional verification is pending with the user. The earlier implementation-readiness report remains in `PHASE_14_DISCOVERY_REPORT.md`.

Implemented scope:

- Added Prisma migration `20260727091241_phase_14_automation_rules` and applied it locally.
- Added `AutomationRule`, `AutomationRuleBranch`, `AutomationCondition`, `AutomationAction`, `AutomationEvent`, `AutomationExecution`, `AutomationActionExecution`, and `FeedbackFieldState` models.
- Extended `FeedbackActivity` with `actorType`, nullable automation rule metadata, and system attribution support.
- Added owner/admin-only automation rule APIs for list, create, get, update with optimistic concurrency, activate, pause, archive, duplicate, reorder, preview, manual run, execution list, and execution detail.
- Added strict backend validation for rule shape, condition operators and values, action conflicts, active branch/category/member targets, branch scope, rule limits, idempotency, stale rules, and safe errors.
- Added non-blocking scheduling after feedback persistence and after AI analysis completion.
- Added a database-backed automation worker with claim tokens, stale recovery, retry limits, loop-depth metadata, graceful startup/shutdown, and safe logs.
- Added automation-specific system actions for priority, category, assignment, unassignment, and status changes without impersonating a human member.
- Added field-source tracking so human-owned status, priority, category, and assignment values are protected from automation overwrites. AI category auto-apply marks category as AI-owned, and human workflow changes mark fields as human-owned.
- Added frontend automation management at `/business/:businessId/automations`, sidebar navigation, rule builder, filters, summary cards, lifecycle actions, preview/manual-run controls, and execution history.
- Extended feedback activity rendering so system automation rows display as automation rule activity instead of anonymous member activity.

Implemented MVP boundaries:

- Owner/Admin-only rule management.
- Business-scoped rules with no platform-administrator tenant bypass.
- Triggers: `FEEDBACK_CREATED` and `AI_ANALYSIS_COMPLETED`; manual run is an owner/admin execution action.
- Flat condition lists with `ALL` or `ANY`, maximum 10 conditions.
- Conditions covering branch, channel, rating, status, priority, category/no category, assigned/unassigned, linked/unlinked customer, AI status, sentiment, sentiment/category confidence, and AI category suggestion.
- Actions: `SET_PRIORITY`, `SET_CATEGORY`, `ASSIGN_TO_MEMBERSHIP`, `UNASSIGN`, and `SET_STATUS`, maximum 5 actions.
- Deterministic rule order with optional stop-processing-after-match.
- Database-backed execution queue, execution history, idempotency fingerprint, rule version integer, and loop-prevention event-chain data.
- Human values protected from automated overwrites.
- No notifications, customer communication, external messages, webhooks, arbitrary code, scheduled recurring rules, bulk historical processing, or Phase 20 connector behavior.

Final Phase 14 reference files:

- `frontend/references/phase14-automation-rules-primary.png`
- `frontend/references/phase14-automation-rules-states.png`

Manual browser/functional verification is not claimed. No browser, browser automation, or screenshots were opened by Codex during implementation.

Known Phase 12 limitations and follow-up watch points:

- Customer `latestFeedback` sorting is computed from branch-safe aggregates in application code after fetching the matching customer set. It is correct for the current MVP and avoids a schema change, but should be measured with realistic data before large production datasets.
- The advanced Feedback filters are exposed in the existing responsive filter surface with chips rather than a fully separate portal-mounted desktop drawer/sheet. Manual UI review should decide whether a later visual refinement is needed.

## Completed

### Phase 1 Foundation

- Created the npm workspace, strict TypeScript tooling, ESLint, Prettier, Prisma, Express backend, React/Vite frontend, health endpoints, status page, environment examples, and project memory files.
- Phase 1 was manually verified successfully by the user.

### Phase 2A Authentication Foundation

- Added Prisma `UserRole`, `AccountStatus`, `User`, and `Session`.
- Created and applied migration `20260720120942_phase_2a_auth_foundation`.
- Added controlled platform administrator seeding with Argon2id password hashing.
- Added email/password registration and login for public `BUSINESS_OWNER` and `CUSTOMER` accounts.
- Added JWT access and refresh tokens in HttpOnly cookies with separate secrets, issuer, audience, token type, and session ID checks.
- Added database-backed sessions, refresh-token hashing, refresh-token rotation, reuse rejection, logout, logout-all, session listing, and session revocation.
- Added backend auth middleware and role middleware.
- Added auth-specific rate limits for login, registration, and refresh.
- Added frontend login, registration, account page, protected route, public-only route, role guard, startup auth bootstrap, and Axios single-flight refresh handling.
- Preserved Phase 1 health functionality at `/system-status`.
- Added friendly frontend route error and 404 surfaces.
- Completed Phase 2A stabilization fixes and the user has manually verified Phase 2A.

### Phase 2B Google Authentication

- Installed backend `google-auth-library`.
- Installed frontend `@react-oauth/google`.
- Added backend environment validation for `GOOGLE_AUTH_ENABLED` and `GOOGLE_CLIENT_ID`.
- Added frontend `VITE_GOOGLE_CLIENT_ID` handling that does not initialize Google OAuth when missing.
- Added Prisma `ExternalAuthProvider` enum and `ExternalAccount` model.
- Added `User.emailVerifiedAt` for Google-verified matching emails.
- Created and applied migration `20260721061424_phase_2b_google_auth`.
- Added focused backend Google ID-token verification through Google's official Node.js library.
- Added separate endpoints:
  - `POST /api/auth/google/register`
  - `POST /api/auth/google/login`
  - `POST /api/auth/google/link`
- Added Google registration for genuinely new Google users only.
- Added Google login for already-linked Google identities only.
- Added explicit authenticated account linking with same-email enforcement.
- Prevented duplicate users and unsafe automatic email-based linking.
- Preserved existing application sessions, JWTs, HttpOnly cookies, refresh-token hashing, and refresh-token rotation for Google auth.
- Extended the safe user response with non-sensitive auth-method status: `hasPassword`, `hasGoogleAccount`, optional `googleEmail`, optional `avatarUrl`, and `emailVerifiedAt`.
- Added Google registration UI on `/register` while keeping email/password registration.
- Added Google login UI on `/login` while keeping email/password login.
- Added Google-linked and password-available status on `/account`.
- Added account-page Google linking UI and did not add unlinking or password setup.
- Updated Axios refresh exclusions for Google auth-control endpoints.

### Phase 2C Email Verification and Password Reset

- Installed backend `nodemailer` with TypeScript types.
- Added Prisma `AccountTokenType` and `AccountToken` for hashed, single-use, expiring email-verification and password-reset tokens.
- Created and applied migration `20260721074742_phase_2c_email_verification_password_reset`.
- Marked existing legacy password users verified during the Phase 2C migration so pre-verification development accounts are not locked out.
- Added provider-independent SMTP email service with disabled-by-default configuration, safe delivery errors, and no SMTP password or raw token logging.
- Added professional plain-text and HTML templates for email verification and password reset.
- Changed new email/password registration so it creates an unverified user, creates a verification token, sends a verification email, and does not create a session or auth cookies.
- Added email-verification resend and confirmation endpoints with focused rate limiting and generic resend responses.
- Changed password login to verify the password first and then block unverified password users with `EMAIL_NOT_VERIFIED` without creating a session.
- Added forgot-password and reset-password endpoints with generic request responses, purpose-specific tokens, Argon2id password hashing, and all-session revocation after reset.
- Added conservative auth cleanup for expired account tokens and old expired/revoked sessions, run opportunistically during verification/reset token creation.
- Hardened malformed JSON request handling so body-parser failures return safe validation errors instead of internal errors.
- Added frontend routes and pages for `/verify-email-pending`, `/verify-email`, `/forgot-password`, and `/reset-password`.
- Added login-page forgot-password link, verification success messaging, reset success messaging, and safe unverified-email resend routing.

### Phase 2 Login Page Redesign

- Redesigned the existing `/login` page into a premium split authentication composition following the requested `frontend/references/login-page-design.png` direction from the attached task brief.
- Preserved existing email/password login, Google login, forgot-password navigation, create-account navigation, original-route redirect after login, `EMAIL_NOT_VERIFIED` resend routing, verification-success message, password-reset-success message, loading states, backend validation messages, auth store updates, Axios refresh behavior, and `PublicOnlyRoute` behavior.
- Added a global class-based light/dark theme mechanism with CSS variable tokens, Tailwind dark-mode support, first-paint theme bootstrap in `frontend/index.html`, system-theme fallback when no preference is stored, local preference persistence, and a visible theme toggle on the login page.
- Added reusable auth UI components for premium alerts, buttons, brand mark, auth card surface, password visibility input, security note, and the React/Tailwind login illustration panel.
- Recreated the left-side illustration as native React/Tailwind UI with sentiment, feedback-count, review, channel badges, and trust/security elements rather than using the reference image as a page background.

### Phase 2 Login Page Visual Refinement

- Refined the existing `/login` redesign directly against `frontend/references/login-page-design.png`.
- Adjusted the outer page into a centered rounded reference-style stage with softer light background, deeper dark-mode navy background, refined borders, and restrained shadowing.
- Tightened desktop column balance, right-side form-card width, card placement, headline size, explicit headline line breaks, value-proposition layout, illustration-card placement, and security-note placement.
- Tuned reusable auth component sizing for smaller labels, shorter inputs, shorter primary button height, smaller brand mark, and compact theme-toggle placement.
- Updated the left-side analytics visual to use floating sentiment, feedback-count, review, channel, and insight cards closer to the approved reference composition.
- Improved mobile proportions by using a phone-like single-column stage, smaller brand/header treatment, unframed mobile form surface, and tighter vertical spacing.
- Preserved existing login functionality, Google credential handling, password login, redirects, errors, loading states, verification handling, forgot-password navigation, create-account navigation, and the existing theme system.

### Phase 2 Login Page Focused Form Proportion Correction

- Rebalanced the redesigned `/login` page so the desktop form column occupies roughly two-fifths of the stage instead of being capped at a narrow fixed column.
- Increased the login card to a comfortable responsive width with a desktop maximum around 440-460px and larger internal desktop padding.
- Added reusable comfortable sizing variants for shared auth fields and the primary auth button, then applied them only to the login page so other auth pages are not redesigned.
- Increased login input and primary-button heights to approximately 48px, improved horizontal padding, strengthened focus rings, and enlarged the password visibility hit area.
- Made the login Google credential button container responsive with a wider preferred desktop render while preserving the official Google control.
- Increased login form heading, subtitle, supporting text, divider, create-account text, and section spacing so the form reads as the primary action area.
- Slightly reduced and shifted the left analytics illustration footprint so it supports the composition without overpowering the form.
- Preserved existing login functionality, Google login handling, forgot-password navigation, create-account navigation, validation and backend errors, `EMAIL_NOT_VERIFIED` handling, redirects, loading states, auth store updates, Axios refresh behavior, `PublicOnlyRoute`, and theme switching.

### Phase 2 Authentication and Account Premium Redesign

- Implemented the approved premium UI direction for all 8 provided reference boards:
  - `frontend/references/01-register.png`
  - `frontend/references/02-email-verification-pending.png`
  - `frontend/references/03-email-verification-success.png`
  - `frontend/references/04-forgot-password.png`
  - `frontend/references/05-reset-password.png`
  - `frontend/references/06-password-reset-success.png`
  - `frontend/references/07-account-page.png`
  - `frontend/references/08-active-sessions.png`
- Added reusable `PremiumAuthShell` and `AccountShell` foundations for coordinated auth and account settings layouts.
- Redesigned `/register`, `/verify-email-pending`, `/verify-email`, `/forgot-password`, `/reset-password`, `/password-reset-success`, `/account`, and `/account/sessions` with premium light/dark layouts, larger form controls, refined cards, visual hierarchy, and responsive behavior.
- Added a dedicated `/password-reset-success` route and updated successful password reset navigation to land there before returning to sign in.
- Added a dedicated protected `/account/sessions` route for active session review and revocation while keeping the existing `/account` session summary.
- Preserved email/password registration, Google registration, verification resend, email verification confirmation, forgot-password generic success handling, reset-token behavior, password reset, Google account linking, session listing, session revocation including current-session handling, logout, logout-all, route guards, auth state, and theme switching.
- Confirmed backend APIs, database schema, Phase 3, and later features were not implemented.

### Public Website Before Phase 3

- Implemented the complete public-facing website using the approved references:
  - `frontend/references/01-home.png`
  - `frontend/references/02-features.png`
  - `frontend/references/03-how-it-works.png`
  - `frontend/references/04-pricing.png`
  - `frontend/references/05-about.png`
  - `frontend/references/06-contact.png`
  - `frontend/references/07-privacy-policy.png`
  - `frontend/references/08-terms-of-service.png`
- Added public routes for `/`, `/features`, `/how-it-works`, `/pricing`, `/about`, `/contact`, `/privacy-policy`, and `/terms-of-service`.
- Changed `/` from an auth/account redirect into the public Home page. Authenticated and logged-out visitors can both access all public marketing and legal routes.
- Added reusable public website components for layout, navigation, mobile navigation, footer, metadata, marketing buttons, section headings, cards, dashboard/channel previews, call-to-action bands, and legal-page layouts.
- Reused the existing class-based light/dark theme system, CSS variables, Tailwind `app.*` tokens, `ThemeProvider`, and `ThemeToggle`.
- Recreated the public page visuals as native React, Tailwind, and Lucide UI instead of embedding the reference PNGs.
- Added lightweight per-page document titles and meta descriptions without adding a new dependency.
- Added product-truthfulness labels and copy so implemented authentication features are distinguished from planned feedback, AI, automation, reporting, and external integration features.
- Implemented pricing as early-access and planned-pricing content only. No checkout, subscription billing, payment API, or commercial pricing commitment was added.
- Implemented a visually complete Contact page with React Hook Form and Zod validation. Because no backend contact endpoint or public inbox is documented, successful validation shows that direct form delivery is not configured and no message was sent.
- Implemented Privacy Policy and Terms of Service pages grounded in current authentication, cookie, token, database, SMTP, Google-auth, deployment, and roadmap documentation. Professional legal review remains required before production launch.
- Updated registration-page Terms of Service and Privacy Policy links to route to the new public legal pages.
- Confirmed no backend API changes, database changes, payment flow, contact-delivery backend, Phase 3 tenant models, feedback workflows, connectors, AI, notifications, reports, or external integrations were implemented.

### Phase 3 Businesses, Branches, and Staff

- Added Prisma enums `BusinessStatus`, `BranchStatus`, `BusinessMemberRole`, `BusinessMembershipStatus`, and `StaffInvitationStatus`.
- Added relational tenant models `Business`, `Branch`, `BusinessMembership`, `MembershipBranchAccess`, `StaffInvitation`, and `StaffInvitationBranch`.
- Created and applied migration `20260722135525_phase_3_businesses_branches_staff`; migration status reports 4 migrations and the database schema is up to date.
- Added transactional business onboarding that creates a business, active primary branch, protected owner membership, and all-branch owner access for eligible `BUSINESS_OWNER` users.
- Added business workspace APIs, business selector data, business profile/settings updates, suspended-business blocking, and safe current-user business listing.
- Added branch listing, details, creation, editing, primary-branch switching, activation, deactivation, branch-code uniqueness, primary-branch protection, and branch-access enforcement.
- Added business memberships with business-level roles `OWNER`, `ADMIN`, `MANAGER`, and `STAFF`; owner protection; admin assignment restricted to owner; membership suspension, reactivation, and removal without deleting user accounts.
- Added explicit branch assignment for manager/staff memberships through relational join rows; owner/admin memberships use all-branch access.
- Added staff invitations with normalized invited emails, single-use hashed tokens, optional branch access, SMTP email delivery, resend with token rotation, cancellation, expiration cleanup, preview, current-session acceptance, new password staff-account acceptance, and safe Google acceptance.
- Added platform administrator business oversight APIs and pages for listing, details, suspension, and reactivation without making admins tenant members.
- Added frontend Phase 3 routes for `/business`, `/business/setup`, business workspace, settings, branches, staff, invitations, `/invitations/accept`, `/admin/businesses`, and `/admin/businesses/:businessId`.
- Added responsive premium workspace UI using the Phase 3 references as visual direction while correcting tiny/cramped forms, weak hierarchy, unsupported actions, and mobile layout issues.
- Updated public website and legal-page truthfulness copy so business, branch, staff, and invitation foundations are no longer described as future work while feedback, customer, analytics, AI, reports, payments, and integrations remain clearly deferred.
- Preserved Phase 1 health routes, Phase 2 authentication/account routes, the public website, existing auth cookies/sessions, Google auth, email verification, password reset, theme persistence, and friendly 404 behavior.

### Phase 4 Standard Feedback Processing Service

- Added Prisma enums `FeedbackChannel` and `FeedbackIngestionStatus`.
- Added `FeedbackIngestion`, `Feedback`, and `FeedbackAttachment` models related to the existing Phase 3 `Business` and `Branch` records.
- Created and applied migration `20260722150908_phase_4_standard_feedback_processing`.
- Added the reusable backend module `backend/src/modules/feedback-processing` with a typed normalized input contract, Zod schemas, deterministic input normalization, safe metadata handling, canonical payload hashing, processing errors, the main processing service, and future source-adapter contracts.
- Implemented business and branch validation for feedback processing, including active-business enforcement, active-branch enforcement, cross-business branch rejection, and active primary-branch fallback when `branchId` is omitted.
- Implemented idempotency scoped by `businessId`, `channel`, and `idempotencyKey`, with duplicate replay results and conflict detection when the same key is reused for different payloads.
- Implemented external-source duplicate protection scoped by `businessId`, `channel`, and `externalId`, with duplicate results for compatible payloads and conflict errors for reused source IDs with different data.
- Implemented transactional creation of feedback and attachment metadata, with ingestion status moved from `PROCESSING` to `COMPLETED` only after feedback persistence succeeds.
- Implemented safe `FAILED` ingestion marking for failures after an ingestion row has been created, storing sanitized error codes/messages only.
- Added local-only CLI helper `backend/src/scripts/simulate-feedback-processing.ts` and npm script `npm run feedback:simulate -- ...`; it defaults to dry-run validation and requires `--commit` before writing.
- Confirmed no Phase 5 manual-entry connector, public feedback endpoint, QR endpoint, inbox, workflow, customer profile, AI, automation, notification, report, export, payment, or external integration was implemented.

### Local Platform Administrator Seed Alignment

- Updated the controlled Prisma seed to read `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, `PLATFORM_ADMIN_FIRST_NAME`, and `PLATFORM_ADMIN_LAST_NAME`.
- Preserved the exact global Prisma role `PLATFORM_ADMIN` and account status `ACTIVE`.
- Continued using the existing Argon2id password utility and the current 10-to-128-character password policy.
- Normalizes the administrator email to lowercase before lookup and creation.
- Marks the seeded platform administrator email verified through `emailVerifiedAt`.
- Keeps the platform administrator outside tenant membership by not creating a `Business`, `Branch`, or `BusinessMembership`.
- Makes repeat seed runs idempotent: an existing `PLATFORM_ADMIN` for the configured email is reconciled only when seed-managed fields differ.
- Stops with a clear safe error when the configured email already belongs to a non-admin user instead of promoting that user.
- Added root and backend `npm run prisma:seed` scripts that call the existing Prisma seed workflow.
- Updated `backend/.env.example` with safe placeholder `PLATFORM_ADMIN_*` values and did not overwrite the real `backend/.env`.
- Confirmed `/admin/businesses` route guarding was not changed during the seed alignment task.

### Phase 4 Feedback Simulation CLI Error Sanitization

- Moved feedback simulation argument parsing and input construction inside the CLI entry-point error guard.
- Added expected CLI validation failures that use safe Phase 4 `FEEDBACK_*` error codes instead of generic thrown errors.
- Changed expected validation and feedback-processing failures to print only `CODE: Safe message` and set `process.exitCode = 1`.
- Changed unexpected helper failures to print only `FEEDBACK_PROCESSING_FAILED: Feedback processing failed.`
- Preserved dry-run, commit, duplicate, and idempotency-conflict service behavior by continuing to use the real `feedbackProcessingService`.
- Adjusted the root `feedback:simulate` npm wrapper so the observed root command no longer appends nested workspace lifecycle paths after expected validation failures.
- Confirmed no database schema, migration, Phase 5, browser, or browser-automation work was introduced.

### Phase 4 Final Manual-Verification Support

- Added `--attachments=<JSON array>` support to the local feedback simulation helper.
- Kept attachment parsing limited to JSON-array shape checks, then passed attachment metadata through the existing Phase 4 normalized input schema, 10-attachment limit, normalization, hashing, persistence, and safe error handling.
- Preserved metadata-only attachment behavior: no file download, upload, external URL fetch, binary storage, file scanning, or attachment content logging was added.
- Added safe CLI handling for malformed, empty, or non-array attachment JSON: `FEEDBACK_INPUT_INVALID: --attachments must be a valid JSON array.`
- Added local-only `--simulateFailureAfterIngestion` support through a non-barrel-exported service helper used by the simulation script only.
- Kept normal `feedbackProcessingService.process(input)` unchanged for future connectors and did not add an HTTP API, production feature flag, public endpoint, or Phase 5 connector.
- The failure simulation requires the CLI `--commit` path, refuses `NODE_ENV=production`, creates a `FeedbackIngestion`, throws a controlled safe error inside the existing processing transaction before `Feedback` or `FeedbackAttachment` persistence, and reuses the existing failed-ingestion marking path.
- Expected simulated-failure CLI output is `FEEDBACK_PROCESSING_FAILED: Simulated local processing failure.`
- Updated README, API, architecture, security, deployment, status, next-steps, and changelog documentation for the new manual-verification support.
- Confirmed Phase 3 and Phase 4 remained unchanged by the helper support.

### Phase 5 Manual Entry Connector Backend

- Added backend module `backend/src/modules/manual-feedback` with request schemas, manual source enum, idempotency header validation, adapter, service, controller, route, and safe manual-feedback error constants.
- Added authenticated endpoint `POST /api/businesses/:businessId/feedback/manual` under the existing business router.
- Required `Idempotency-Key` for every manual submission, trimmed it, rejected empty/oversized/null-byte values, and kept body-supplied `idempotencyKey` rejected by the strict request schema.
- Implemented `ManualFeedbackSourceAdapter` as the first concrete Phase 4 adapter. It sets `channel=MANUAL`, maps the route business ID, required body branch ID, header idempotency key, feedback fields, customer snapshot, source URL, language code, and attachment metadata into `NormalizedFeedbackInput`.
- Reused `feedbackProcessingService.process(input)` for Phase 4 normalization, canonical payload hashing, idempotency duplicate handling, idempotency conflict handling, transactional persistence, attachment metadata persistence, and failed-ingestion safety.
- Enforced authenticated active users through the existing auth middleware and enforced active business membership through `BusinessMembership`.
- Allowed active `OWNER` and `ADMIN` memberships to submit to any active branch in their business.
- Allowed active `MANAGER` and `STAFF` memberships to submit only to all-branch or explicitly assigned active branches.
- Blocked users without membership, platform administrators without membership, suspended memberships, removed memberships, suspended businesses, inactive branches, cross-business branches, and inaccessible branches.
- Added a focused authenticated manual-feedback rate limiter of 120 submissions per 15 minutes scoped by route business and authenticated user.
- Supported JSON attachment metadata only, with no multipart upload, binary storage, download, remote URL fetching, or file scanning.
- Stored actor/source attribution only in bounded Phase 4 source metadata from trusted authenticated user and membership IDs, and did not return customer PII or actor IDs in the API response.
- Confirmed no Prisma schema change or migration was added.
- Confirmed no public feedback portal, QR flow, inbox, workflow, customer profiles, AI, notifications, reports, external integrations, file storage, browser, browser automation, or Phase 6 work was added.

### Phase 5 Manual Entry Connector Frontend

- Studied `frontend/references/phase5_manual_feedback_primary.png` as the authoritative structure reference and `frontend/references/phase5_manual_feedback_states.png` as the supporting states reference.
- Added the protected route `/business/:businessId/feedback/manual`.
- Added `ManualFeedbackPage` under the existing business workspace feature with the reference-led Add customer feedback layout, six numbered form sections, right-side submission summary, privacy/security panel, loading skeleton, empty active-branch state, validation errors, success alert, and duplicate alert handling.
- Added frontend Zod validation for branch, manual source type, message, optional title, rating, date received, language code, customer contact snapshot, source details, and metadata-only attachment references.
- Added the frontend API helper for `POST /api/businesses/:businessId/feedback/manual`, including client-generated `Idempotency-Key` headers and safe response parsing.
- Added a Feedback sidebar group with active Add Feedback navigation and a disabled All Feedback item because unified inbox/all-feedback listing remains deferred.
- Preserved existing workspace pages, public pages, authentication/account pages, backend APIs, Prisma schema, public feedback portal, QR flow, inbox, workflow, customer profiles, AI, notifications, reports, external integrations, file upload/storage, and Phase 6 scope.

### Phase 5 Manual Feedback Branch State Consistency

- Fixed the manual-feedback branch select and submission summary so both derive from the React Hook Form `branchId` value.
- Automatic branch selection now applies only when exactly one accessible active branch is available; when that happens, the select visibly displays that branch.
- When no branch is selected, the submission summary shows `—`.
- The workspace/current branch is not displayed as the submitted branch unless its branch ID is actually selected in the form.
- Preserved the approved layout, rating behavior, light/dark mode, responsive behavior, API contract, and idempotency behavior.

### Phase 5 Manual Feedback Message Binding

- Fixed the Message textarea binding so React Hook Form owns the displayed message value, change/blur handlers, field name, and textarea ref.
- Changed the Message character counter to read from the same React Hook Form `message` value used for validation and submission.
- Forwarded refs through the local manual-feedback textarea component so registered textarea fields attach RHF handlers to the real DOM textarea.
- Audited title, branch, source type, rating, date received, language, customer, source details, and attachment-reference fields for displayed-value-versus-form-state drift.
- Preserved the approved Phase 5 layout, styling, rating behavior, branch-state behavior, API contract, idempotency behavior, and backend code.

### Phase 6 Public Feedback Portal

- Added Business public portal settings: `publicFeedbackEnabled`, `publicFeedbackToken`, and `publicFeedbackWelcomeMessage`.
- Created and applied migration `20260724120000_phase_6_public_feedback_portal`.
- Added authenticated Owner/Admin management endpoints for viewing settings, enabling/disabling the portal, editing the welcome message, and regenerating the public link.
- Added unauthenticated public endpoints for loading safe portal configuration and submitting public feedback with a required `Idempotency-Key` header.
- Added `PublicFeedbackSourceAdapter` that maps public submissions to `FeedbackChannel.PUBLIC_FORM` and reuses the Phase 4 feedback-processing service for normalization, hashing, idempotency, duplicate detection, conflict detection, and persistence.
- Implemented active-business, active-branch, branch/business matching, disabled portal, no-active-branch, honeypot, public validation, and public rate-limit handling.
- Added the workspace Public Feedback Portal settings section with status, enable/disable, welcome message, copy-link, open-link, and confirmed link-regeneration controls.
- Added the public `/feedback/:portalToken` route with a standalone light/dark responsive form, active branch selection, required rating and message, optional contact fields, follow-up consent, stable frontend idempotency-key lifecycle, success state, duplicate state, and unavailable/error states.
- Confirmed no public attachments, Unified Inbox, feedback management workflow, categories, priorities, assignments, replies, notifications, analytics, reports, AI, customer accounts/profiles, or external integrations were implemented in Phase 6.

### Phase 7 QR-Code Feedback Submissions

- Added Prisma `PublicFeedbackQrCode` with secure unique `publicToken`, `portalTokenFingerprint`, optional branch scope, active flag, optional creator membership relation, timestamps, and no scan-count, feedback-count, or expiry fields.
- Created and applied migration `20260724130000_phase_7_qr_feedback_submissions`.
- Reused the existing Phase 4 `FeedbackChannel.QR_CODE` enum value; no Phase 7 feedback-channel enum migration was required.
- Added authenticated QR management endpoints under `/api/businesses/:businessId/public-feedback/qr-codes` for listing, creation, rename/disable updates, and individual token regeneration.
- Enforced QR management authorization through active `BusinessMembership`: Owner/Admin can view, create, rename, regenerate, and disable QR codes; Manager can view branch-scoped QR codes according to branch access; Staff and platform administrators without membership are blocked.
- Added public QR endpoints under `/api/public/feedback/qr/:qrToken` for safe configuration and anonymous submission without login.
- Added `QrFeedbackSourceAdapter`, mapping trusted QR context into the Phase 4 feedback-processing service with `FeedbackChannel.QR_CODE`, required `Idempotency-Key`, branch locking, honeypot handling, and bounded QR metadata.
- Implemented portal dependency behavior: QR creation/regeneration requires an enabled Phase 6 portal token; disabling the portal makes QR links unavailable; re-enabling with the same token restores matching active QR codes; portal-token regeneration marks old QR codes invalid until each one is regenerated.
- Added the protected workspace route `/business/:businessId/feedback/qr-codes`, Feedback navigation item, QR management page, create modal, rename/regenerate/disable confirmations, status messaging, QR previews, copy/open/download/print actions, and responsive light/dark UI.
- Fixed the QR management records layout so wide screens use a scrollable table with a sticky Actions column and tablet/mobile widths use stacked cards with reachable action controls.
- Added the anonymous public route `/feedback/qr/:qrToken`, reusing the Phase 6 public feedback form with QR endpoint selection and branch-specific read-only branch locking.
- Fixed the branch-specific QR public form so the frontend now treats `fixedBranchId` from the QR configuration as the locked branch source of truth, initializes React Hook Form after async configuration load, hides the editable branch selector, and submits the fixed branch ID internally.
- Added a safe public business-brand avatar for the direct public portal, QR form, success state, and duplicate state: real logos render only when they load successfully, while missing, blank, or failed logos fall back to initials.
- Added frontend QR PNG generation through the focused `qrcode` package and `@types/qrcode`; QR images are generated client-side from authorized public URLs and are not sent to the backend.
- Confirmed no attachments, file uploads, scan analytics, scan counters, feedback counters, expiry/scheduling, Unified Inbox, feedback workflow, customer profiles, AI, reports, notifications, or external integrations were implemented.

### Phase 10 Assignment, Categories, and Priorities

- Added Prisma `FeedbackPriority` enum with `LOW`, `NORMAL`, `HIGH`, and `URGENT`, defaulting existing and new feedback to `NORMAL`.
- Added `Feedback.assignedToMembershipId`, `Feedback.categoryId`, relations to `BusinessMembership` and `FeedbackCategory`, and indexes for assignment, category, and priority filtering.
- Added `FeedbackCategory` with business-scoped unique names, descriptions, color keys, active/inactive state, and feedback counts.
- Extended `FeedbackActivityType` with `ASSIGNMENT_CHANGED`, `CATEGORY_CHANGED`, and `PRIORITY_CHANGED`, plus generic `fromValue` and `toValue` snapshots.
- Created and applied migration `20260725162942_phase_10_assignment_categories_priorities`.
- Added backend `feedback-categories` module with tenant-aware list/get endpoints and owner/admin-only create, update, activation, and deactivation.
- Extended the Phase 8 inbox API with `assignedTo`, `categoryId`, and `priority` filters plus safe assignee/category/priority response fields.
- Extended the Phase 9 workflow API with assignment, eligible assignee, category, and priority endpoints using branch-aware authorization and transactional activity creation.
- Added frontend inbox filters for assignee, category, and priority, including specific active-member filtering.
- Added detail drawer controls for eligible assignee selection, unassignment, category assignment/unassignment, priority changes, stale mutation refresh, inactive historical category display, and unavailable historical assignee display.
- Added Business Settings category management for owners/admins with create, edit, activate, deactivate, validation, retry/error states, and read-only active category visibility for non-managers.
- Confirmed no customer profiles, AI, notifications, replies, reports, analytics dashboards, exports, external integrations, payment processing, or Phase 11 work was implemented.

### Phase 8 Feedback Details Drawer Layout Repair

- Repaired the All Feedback detail drawer so it mounts through a viewport-level React portal attached to `document.body` instead of being placed in the workspace/inbox document flow.
- Removed the desktop `static` layout path that caused the drawer to appear below the feedback table, inherit page constraints, and use a narrow grid column.
- Set the drawer as a right-edge fixed panel with full viewport height, responsive full-width mobile behavior, readable desktop widths, and no horizontal page scrolling.
- Split the drawer into a fixed header area and an internal vertical scroll body so long feedback details, Phase 9 workflow controls, and Phase 10 controls scroll inside the drawer rather than moving the underlying page.
- Balanced the backdrop opacity in light and dark mode and kept it behind the drawer in the same viewport-level stacking layer.
- Added body-scroll locking with previous body overflow and padding restoration on close/unmount.
- Preserved Escape close, backdrop close, query-parameter close/open behavior, read-only feedback data, workflow mutations, assignment/category/priority mutations, and TanStack Query refresh behavior.
- Improved accessible dialog labeling, close-button focus, focus return, basic tab containment, and long-text wrapping for customer/source/message/activity content.
- No backend API, Prisma schema, migration, package, database record, customer profile, AI, notification, report, external integration, Phase 11, or Phase 20 work was added.

### Phase 6 Manual Verification Evidence

- Public portal enabled successfully.
- Anonymous public link opened without login.
- Public feedback submission succeeded.
- Feedback was stored with channel `PUBLIC_FORM`.
- Related ingestion completed successfully.

### Phase 7 Manual Verification Evidence

- Business-wide QR creation succeeded.
- Public QR link opened without login.
- QR feedback submission succeeded.
- Feedback was stored with channel `QR_CODE`.
- Related ingestion completed successfully.
- Branch-specific QR branch locking was fixed and verified.
- QR management actions became accessible after the responsive layout fix.
- Missing or broken business logos now use the initials fallback.

## Incomplete

- Manual Phase 8 browser verification is still pending — the user has deferred Phase 8 testing until Phase 10 is implemented, so Phases 8, 9, and 10 will be tested together.
- Manual retesting of the repaired Phase 8 detail drawer is still pending at normal browser zoom and common zoom levels; Codex did not open a browser or run browser automation.
- Manual Phase 9 browser verification is still pending — deferred for combined Phase 8+9+10 testing.
- Manual Phase 10 browser verification is still pending; required as part of combined Phase 8+9+10 testing.
- Manual Platform Administrator seed execution and login/admin-page verification is still required by the user.
- Manual verification of the redesigned, visually refined, and proportion-corrected login page is still required by the user.
- Manual verification of the newly redesigned `/register`, `/verify-email-pending`, `/verify-email`, `/forgot-password`, `/reset-password`, `/password-reset-success`, `/account`, and `/account/sessions` pages is still required by the user.
- Setting a password for Google-only accounts is not implemented.
- Google unlinking is not implemented.
- Production deployment is not completed.
- Phase 11, Phase 12, Phase 13, Phase 14, and Phase 20 manual browser/functional verification is still required by the user.
- Phases 11, 12, 13, 14, and 20 are planned to be manually tested together where workflows overlap.
- Notifications, Business Owner analytics/reporting expansion, customer accounts, payments, remaining live provider synchronization, and Phase 26 integration monitoring/recovery are not implemented. Phase 25 Platform Administrator analytics and PDF/CSV reports are implemented.
- Phase 15 notifications/replies, Phase 21 implementation, and Phases 22 through 25 live integration work are not started.

## Known Issues

- Email delivery remains unavailable until SMTP variables are configured and `EMAIL_ENABLED=true`.
- With `EMAIL_ENABLED=false`, the backend starts and existing login/Google auth continue to work, but new password registration, verification resend, and forgot-password requests return `EMAIL_DELIVERY_NOT_CONFIGURED`.
- `npm install -w backend nodemailer` and `npm install -D -w backend @types/nodemailer` reported 0 npm audit vulnerabilities after Phase 2C.
- Prisma 6.19.3 prints a deprecation warning for `package.json#prisma` seed configuration. `npm run prisma:seed` still works under the installed Prisma version; migrate this to a Prisma config file before Prisma 7.
- The repository does not intentionally register a service worker or Workbox worker. Workbox console output during manual testing is likely from stale localhost browser state or a browser extension.
- Real `.env` files were not overwritten.
- Headless Chrome screenshot capture was intermittently affected when the local Vite server was not bound; the final verification still relies on user manual browser testing at `http://localhost:5173/login`.
- The public Contact page has no delivery backend by design for this task. It validates locally and explains that direct form delivery is not configured.
- Public pricing is preview/early-access copy only. There is no active billing, checkout, subscription model, or payment processing.
- Privacy Policy and Terms of Service content is a product draft grounded in current project documentation and requires professional legal review before production launch.
- `npm run build` passed after the public website implementation, with Vite warning that the generated frontend JS chunk is larger than 500 kB after minification. No code-splitting change was introduced in this task.
- Staff invitation email delivery requires SMTP configuration with `EMAIL_ENABLED=true`; otherwise invitation creation/resend returns `EMAIL_DELIVERY_NOT_CONFIGURED` before creating or rotating invitation tokens.
- Business logo upload storage is not implemented; Phase 3 supports an optional validated `logoUrl` and initials fallback only.
- Branch staff counts include active all-branch memberships plus explicit branch assignments. Full audit-log style activity is deferred; workspace activity is derived from current Phase 3 records.
- `npm run build` passed after Phase 3 with the Vite large-chunk warning still present for a 580.58 kB frontend JS chunk after minification.
- Phase 4 stores attachment metadata only. Binary upload, download, file scanning, and storage-provider integration are deferred.
- Phase 4 stores a customer contact snapshot on `Feedback`; full customer profiles and matching are deferred.
- Phase 4 itself does not expose a public or staff-facing feedback submission API. Phase 5 now exposes the authenticated manual-entry endpoint that calls the Phase 4 processing service.
- Phase 5 manual entry requires explicit `branchId`; it does not use Phase 4 primary-branch fallback for this endpoint.
- Phase 5 manual entry stores attachment metadata only and does not store files.
- Phase 6 public feedback requires explicit `branchId`, `rating`, `message`, and the `Idempotency-Key` header; it stores submissions through `FeedbackChannel.PUBLIC_FORM`.
- Phase 6 public feedback stores optional customer contact only as the existing Phase 4 feedback snapshot fields and stores follow-up consent only in bounded source metadata.
- Phase 7 QR feedback requires an enabled Phase 6 public portal and stores submissions through `FeedbackChannel.QR_CODE`.
- Phase 7 QR feedback stores optional customer contact only as the existing Phase 4 feedback snapshot fields and stores follow-up consent only in bounded QR source metadata.
- Phase 7 QR image generation is frontend-only through `qrcode`; QR image bytes are not sent to or stored by the backend.
- The Phase 7 QR management actions clipping defect was caused by a wide desktop grid inside an `overflow-hidden` wrapper; the frontend now avoids hidden clipping and keeps row actions reachable through desktop horizontal scrolling/sticky actions or stacked cards on narrower viewports.
- The Phase 7 branch-specific QR selector defect was frontend-side: the public form could fall through to the editable branch selector when the async QR configuration was not used as a strict locked-branch source. The backend QR service already returns `fixedBranchId`, returns only the fixed active branch for branch-scoped QR links, and rejects mismatched branch submissions with `QR_FEEDBACK_BRANCH_LOCKED`.
- Public feedback business logos are optional URLs and can still be externally unreachable; the frontend now hides missing, blank, or failed logo images and shows initials instead.
- Phase 6 and Phase 7 public feedback do not implement attachments, QR scan analytics, feedback listing, feedback details, assignment, categories, priorities, customer profiles, replies, notifications, analytics, reports, AI, or external integrations.
- The feedback simulation helper is local-only and must not be treated as manual verification by Codex.

## Static Verification Results

Passed during the 2026-07-26 Phase 11 Customer Profiles implementation:

- `npx prisma format --schema backend/prisma/schema.prisma` passed.
- `npm run prisma:validate` passed with the existing Prisma 7 seed-configuration deprecation warning.
- `npm run prisma:generate` passed with the existing Prisma 7 seed-configuration deprecation warning.
- `npx prisma migrate deploy` from the repository root with `--schema backend/prisma/schema.prisma` failed before touching the database because root execution did not load `backend/.env` and `DATABASE_URL` was missing.
- `npx prisma migrate deploy` from `backend/` passed.
- `npx prisma migrate status --schema prisma/schema.prisma` from `backend/` passed and reported 10 migrations with the database schema up to date.
- Direct Prisma database verification passed and confirmed migration `20260726110000_phase_11_customer_profiles`, `customers` table, `customer_activities` table, `customers=0`, existing `feedback=12`, and linked feedback rows `0`.
- `npm run typecheck -w backend` passed.
- `npm run typecheck -w frontend` passed before formatting.
- `npm run lint -w backend` initially failed on an unused `normalizeNameForSuggestion` import; the import was removed and lint passed on rerun.
- `npm run lint -w frontend` initially failed on an unused `useMutation` import and reported fast-refresh warnings caused by exporting helpers from `CustomersPage.tsx`; the modal/helper code was extracted and lint passed on rerun.
- `npm run format` passed.
- `npm run typecheck` initially failed because `FeedbackInboxPage.tsx` still imported `CustomerFormModal` from `CustomersPage.js`; the import was corrected and `npm run typecheck` passed on rerun.
- `npm run lint` passed.
- `npm run format:check` passed and reported that all matched files use Prettier code style.
- `npm run build` passed with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` passed with only normal LF-to-CRLF conversion warnings for changed files.

Phase 11 implementation verification notes:

- Migration `20260726110000_phase_11_customer_profiles` was applied locally.
- No database reset was run.
- No old migrations were edited.
- Existing `Feedback.customerName`, `Feedback.customerEmail`, and `Feedback.customerPhone` snapshot fields were preserved.
- No historical customer backfill was performed.
- No package was added.
- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- Phase 11 manual browser/functional verification remains pending with the user.
- Phases 8, 9, and 10 deferred multi-tenant/security/final regression verification remains pending until after Phase 20.
- At that point, Phase 12 and Phase 20 were not started.

Passed during the 2026-07-26 Phase 11 reference cleanup and final implementation audit:

- `npx prisma format` from `backend/` passed with the existing Prisma 7 seed-configuration deprecation warning.
- `npm run prisma:validate` passed with the existing Prisma 7 seed-configuration deprecation warning.
- `npm run prisma:generate` passed with the existing Prisma 7 seed-configuration deprecation warning.
- `npx prisma migrate status` from `backend/` passed.
- Direct Prisma database verification passed and confirmed migration `20260726110000_phase_11_customer_profiles`, `customers` table, `customer_activities` table, `customers=0`, existing `feedback=12`, and linked feedback rows `0`.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run format` passed with all matched files unchanged.
- `npm run format:check` passed and reported that all matched files use Prettier code style.
- `npm run build` passed with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` passed with only normal LF-to-CRLF conversion warnings for changed files.

Phase 11 reference cleanup and audit notes:

- `frontend/references/phase11-customer-profiles-primary-premium.png` was preserved as `frontend/references/phase11-customer-profiles-primary.png`.
- `frontend/references/phase11-customer-profiles-states-premium.png` was preserved as `frontend/references/phase11-customer-profiles-states.png`.
- `frontend/references/phase11-customer-profiles-alternative-premium.png` was removed as an extra Phase 11 reference.
- Exactly two Phase 11 reference images remain.
- Scope audit found no implementation mismatch requiring application behavior changes.
- Documentation drift was corrected for the final reference filenames and stale pre-implementation customer-model wording.
- No browser, browser automation, screenshots, manual verification, Phase 12 work, or Phase 20 work was performed.

Passed during the 2026-07-26 Phase 11 Customer Profiles discovery documentation update:

- `npm run format`
- `npm run format:check`
- `git diff --check`

Phase 11 discovery verification notes:

- `npm run format` completed successfully.
- `npm run format:check` completed successfully and reported that all matched files use Prettier code style.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for edited Markdown files.
- No Prisma schema validation, migration, generated client, typecheck, lint, build, browser, browser automation, screenshot, or manual verification was run because this task was documentation and discovery only.
- No application code changed.

Passed during the 2026-07-26 Phase 12 Full Search and Filters discovery documentation update:

- `npm run format` completed successfully and left all matched files unchanged.
- `npm run format:check` completed successfully and reported that all matched files use Prettier code style.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for edited Markdown files.

Phase 12 discovery verification notes:

- This task was documentation and discovery only.
- No backend application code, frontend application code, Prisma schema, migration, generated Prisma Client, package, reference image, browser test, browser automation, screenshot, or manual verification claim was added.
- Phase 11 manual browser/functional verification remains pending with the user.
- Phases 11 and 12 will be manually tested together after Phase 12 implementation.
- Phases 8, 9, and 10 deferred multi-tenant/security/final regression verification remains pending until after Phase 20.
- Phase 12 implementation has not started.
- At that point, Phase 13 and Phase 20 had not started.

Passed during the 2026-07-26 Phase 12 Full Search and Filters implementation:

- `npm run format`
- `npm run format:check`
- `npm run typecheck -w frontend`
- `npm run typecheck -w backend`
- `npm run lint -w frontend`
- `npm run lint -w backend`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npx prisma migrate status` from the backend workspace
- `git diff --check`

Phase 12 implementation verification notes:

- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- Prisma schema was not changed and no migration was created.
- No package was added.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `npm run prisma:validate`, `npm run prisma:generate`, and `npx prisma migrate status` completed successfully with the existing Prisma 7 deprecation warning for `package.json#prisma` seed configuration.
- `npx prisma migrate status` reports 10 migrations and the database schema is up to date.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for changed files.
- Phase 11 and Phase 12 manual verification remains pending with the user.

Passed during the 2026-08-02 customer list filter display and responsive repair:

- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run build`
- `npm run format:check`
- `git diff --check`

Customer list filter display and responsive repair verification notes:

- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- No backend code, Prisma schema, migration, package, API contract, tenant authorization, branch scoping, customer creation, customer linking, public feedback, QR, AI, or automation behavior was changed.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for changed files.

Passed during the 2026-08-02 automation builder responsive row repair:

- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run build`
- `npm run format:check`
- `git diff --check`

Automation builder responsive row repair verification notes:

- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- No backend code, Prisma schema, migration, package, API contract, automation rule validation, automation worker, tenant authorization, branch scoping, AI, customer, public feedback, or QR behavior was changed.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for changed files.

Passed during the 2026-08-02 automation draft target normalization repair:

- `npm run typecheck -w backend`
- `npm run typecheck -w frontend`
- `npm run test:automation`
- `npm run lint -w backend`
- `npm run lint -w frontend`
- `npm run build`
- `npm run format:check`
- `git diff --check`

Automation draft target normalization repair verification notes:

- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- Backend code changed only inside the Phase 14 automation module to normalize draft definitions before validation and persistence; no Prisma schema, migration, package, worker scheduling behavior, feedback ingestion behavior, AI behavior, public feedback, QR behavior, or external integration was changed.
- Frontend code changed only in the automation rule builder to reset stale condition/action target fields and submit a normalized rule definition.
- `npm run test:automation` passed with 88 tests.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for changed files.

Passed during the 2026-08-02 automation management UX and archive lifecycle repair:

- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run typecheck -w backend`
- `npm run lint -w backend`
- `npm run test:automation`
- `npm run build`
- `npm run format:check`
- `git diff --check`

Automation management UX and archive lifecycle repair verification notes:

- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- Frontend automation page now resets the builder after successful creation, keeps update behavior intact, displays success notices, asks for confirmation before duplicate/delete actions, and uses a feedback selector for Review and test.
- Backend automation routes now support `POST /api/businesses/:businessId/automation-rules/:ruleId/unarchive` and `DELETE /api/businesses/:businessId/automation-rules/:ruleId`; restore requires an archived rule and returns it as a draft, while permanent delete requires an archived rule.
- Existing Prisma relations support deletion without a schema change: rule-owned branches, conditions, and actions cascade; execution, activity, and field-state rule references are nullable and use `SetNull`.
- `npm run test:automation` passed with 88 tests.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for changed files.

Passed during the 2026-08-02 automation rule selection and feedback picker usability repair:

- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run build`
- `npm run format:check`
- `git diff --check`

Automation rule selection and feedback picker usability repair verification notes:

- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- Frontend code changed only in the automation page: rule rows/cards now have broader selection targets, actions remain excluded, and the Review and test feedback picker uses backend search and pagination through the existing feedback list endpoint.
- No backend code, Prisma schema, migration, package, automation worker behavior, automation API contract, feedback API contract, tenant authorization, branch scoping, AI, customer, public feedback, or QR behavior was changed.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for changed files.

Passed during the 2026-08-02 portal sidebar shared-scroll and logout repair:

- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run build`
- `npm run format:check`
- `git diff --check`

Portal sidebar shared-scroll and logout repair verification notes:

- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- Frontend shared shell code changed only for business workspaces, account portal pages, and the admin shell logout affordance.
- The fixed desktop sidebar scroll behavior and hidden internal sidebar scrollbar utility were reverted at the user's request. Business and account sidebars now scroll with the page content again.
- Business/account sidebar Sign out and admin header Sign out still reuse the existing `useLogoutAction` hook; no backend auth API, session model, cookie behavior, route guard, business switching, tenant authorization, public feedback, QR, customer, AI, automation, or database behavior was changed.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for changed files.

Passed during the 2026-08-02 branch form responsive required-field repair:

- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run build`
- `npm run format:check`
- `git diff --check`

Branch form responsive required-field repair verification notes:

- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- No backend code, Prisma schema, migration, package, API contract, branch validation schema, branch authorization, tenant enforcement, business setup behavior, feedback, customer, AI, automation, public feedback, or QR behavior was changed.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for changed files.

Passed during the 2026-08-02 business workspace header responsive alignment repair:

- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run build`
- `npm run format:check`
- `git diff --check`

Business workspace header responsive alignment repair verification notes:

- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- No backend code, Prisma schema, migration, package, API contract, business switching behavior, customer query behavior, customer mutation behavior, tenant authorization, branch scoping, feedback, AI, automation, public feedback, or QR behavior was changed.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for changed files.

Passed during the 2026-08-02 Phase 13 manual AI retry eligibility and review preservation repair:

- `npm run test:ai-analysis -w backend`
- `npm run typecheck -w backend`
- `npm run typecheck -w frontend`
- `npm run lint -w backend`
- `npm run lint -w frontend`
- `npm run build`
- `npm run format:check`
- `git diff --check`

Phase 13 manual AI retry repair verification notes:

- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- No Prisma schema, migration, provider credential, environment variable, public endpoint, feedback source adapter, feedback persistence, automation rule, customer profile, public feedback, or QR behavior was changed.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` completed successfully with only normal LF-to-CRLF conversion warnings for changed files.

Passed during the 2026-07-27 Phase 13 AI Sentiment Analysis, Categorization, and Summaries implementation:

- `npm install @google/genai -w backend`
- `npx prisma format` from the backend workspace
- `npm run prisma:validate -w backend`
- `npm run prisma:generate -w backend`
- `npx prisma migrate deploy` from the backend workspace
- `npx prisma migrate status` from the backend workspace
- Direct Prisma database verification for feedback count, AI-analysis count, and `_prisma_migrations`
- `npm run test:ai-analysis -w backend`
- `npm run format`
- `npm run format:check`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Phase 13 implementation verification notes:

- No browser, browser automation, screenshots, or manual verification was performed by Codex.
- Migration `20260727083000_phase_13_ai_feedback_analysis` was applied locally.
- Direct database verification confirmed 12 existing feedback rows, 0 AI analysis rows after migration, and the Phase 13 migration row present.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- Prisma commands completed successfully with the existing Prisma 7 deprecation warning for `package.json#prisma` seed configuration.
- Phase 11, Phase 12, Phase 13, and Phase 14 manual verification remains pending with the user.

Run during the Phase 8 feedback details drawer layout repair:

- `npm run typecheck -w frontend` initially failed with related strict TypeScript errors `TS18048` on focus-trap array indexing; the implementation was corrected and the command passed on rerun.
- `npm run lint -w frontend` passed.
- `npx prettier --write frontend/src/features/businesses/FeedbackInboxPage.tsx` completed.
- `npx prettier --write README.md ARCHITECTURE.md IMPLEMENTATION_STATUS.md NEXT_STEPS.md CHANGELOG.md frontend/src/features/businesses/FeedbackInboxPage.tsx` completed with all touched files unchanged.
- `npm run typecheck -w frontend` passed on final rerun.
- `npm run lint -w frontend` passed on final rerun.
- `npm run build -w frontend` passed with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run format:check` passed.
- `git diff --check` passed with normal CRLF conversion warnings for changed files.
- `npm run build` passed with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- Browser/manual verification was not run by Codex.
- No backend code changed; root workspace checks are still run for regression coverage.

Passed during the 2026-07-26 connector roadmap demo synchronization documentation update:

- `npm run format`
- `npm run format:check`
- `git diff --check`

Documentation update verification notes:

- This was a documentation-only roadmap and memory update.
- No backend application code, frontend application code, Prisma schema, migration, package, design reference, browser test, Phase 11 implementation, or Phase 20 implementation was added.
- Phase 8, Phase 9, and Phase 10 manual verification remains pending for the combined user test.

Passed during the Phase 10 assignment, categories, and priorities audit/repair/completion:

- `npx prisma format --schema prisma/schema.prisma`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npx prisma migrate status --schema prisma/schema.prisma`
- `npm run typecheck -w backend`
- `npm run lint -w backend`
- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run format`
- `npm run format:check`
- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `git diff --check`

Phase 10 verification notes:

- `npx prisma migrate status --schema prisma/schema.prisma` reported 9 migrations and the database schema is up to date.
- The first `npm run prisma:generate` attempt hit the known Windows `EPERM` query-engine DLL lock. Rerunning outside the sandbox still failed while local project Node/Vite/tsx processes were active. After stopping only those local project dev/watch processes, `npm run prisma:generate` passed.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` passed with normal CRLF conversion warnings for changed files.
- No browser, browser automation, screenshots, or manual verification was run by Codex.

Passed after Phase 2C changes:

- `npx prisma format`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npx prisma migrate dev --name phase_2c_email_verification_password_reset --create-only`
- `npx prisma migrate dev --skip-generate`
- `npx prisma migrate status`
- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run build`

Passed during the login-page redesign:

- `npm run typecheck -w frontend`
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run build`

Passed during the login-page visual refinement:

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run build`

Passed during the focused login form proportion correction:

- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run build`

Passed during the Phase 2 authentication and account premium redesign:

- `npm run typecheck -w frontend`
- `npm run format`
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run build`

Passed during the public website implementation:

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run build`

Passed during the Phase 3 implementation:

- `npx prisma format`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npx prisma migrate dev --name phase_3_businesses_branches_staff --create-only`
- `npx prisma migrate dev --skip-generate`
- `npx prisma migrate status`
- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run build`

Passed during the Phase 4 standard feedback-processing implementation:

- `npx prisma format`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npx prisma migrate dev --name phase_4_standard_feedback_processing --create-only`
- `npx prisma migrate dev --skip-generate`
- `npx prisma migrate status`
- `npm run typecheck -w backend`
- `npm run lint -w backend`
- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run build`

Build notes:

- `npm run build` completed successfully.
- Vite reported a non-blocking warning that the generated frontend JS chunk is larger than 500 kB after minification. Consider route-level code splitting in a later performance pass.

Passed during the Local Platform Administrator seed alignment:

- `npx prisma format`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run build`

Seed alignment notes:

- The first `npm run prisma:generate` hit a Windows `EPERM` while replacing Prisma's query-engine DLL because local workspace Node/Prisma Studio processes were holding the file. After stopping those local project processes, `npm run prisma:generate` passed.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- No browser or browser automation was opened.

Passed during the Phase 4 feedback simulation CLI error-sanitization fix:

- `npm run typecheck -w backend`
- `npm run lint -w backend`
- `npm run format:check`
- `npm run build`

Passed during the Phase 4 final manual-verification support:

- `npm run typecheck -w backend`
- `npm run lint -w backend`
- `npm run format:check`
- `npm run build`

Final manual-verification support notes:

- The first `npm run format:check` found a mechanical Prettier difference in `backend/src/scripts/simulate-feedback-processing.ts`; `npm run format` fixed it, and the final `npm run format:check` passed.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- Backend typecheck and backend lint were rerun after formatting and both passed.

Passed during the Phase 5 manual-entry backend implementation:

- `npx prisma format` from the backend workspace
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run typecheck -w backend`
- `npm run lint -w backend`
- `npm run format`
- `npm run format:check`
- `npm run build`
- `npm run typecheck`
- `npm run lint`

Phase 5 backend verification notes:

- No Prisma schema change or migration was added.
- The repository has no existing test script or backend test framework, so no focused automated tests were added for adapter mapping, idempotency, conflict, branch access, or source validation in this task.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `npx prisma format`, `npm run prisma:validate`, and `npm run prisma:generate` completed successfully with the existing Prisma 7 deprecation warning for `package.json#prisma` seed configuration.
- No browser, browser automation, or Phase 6 work was added.

Passed during the Phase 5 manual-entry frontend implementation:

- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run build`

Phase 5 frontend verification notes:

- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `npm run format:check` was rerun after formatting the touched frontend files and still reports only the pre-existing unrelated `.vscode/settings.json` formatting difference. That file was not modified in this task.
- Browser/manual functional verification is still required by the user.

Passed during the Phase 5 manual-feedback branch state consistency fix:

- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run build`
- `git diff --check`

Phase 5 branch state consistency verification notes:

- Browser/manual verification was not run because the user explicitly requested not to open a browser.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `npm run format:check` was run and still reports only the pre-existing unrelated `.vscode/settings.json` formatting difference. That file was not modified in this task.

Passed during the Phase 5 manual-feedback message binding fix:

- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run build`
- `git diff --check`

Phase 5 message binding verification notes:

- Browser/manual verification was not run because the user explicitly requested not to open a browser.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `npm run format:check` was run after formatting the touched frontend component and still reports only the pre-existing unrelated `.vscode/settings.json` formatting difference. That file was not modified in this task.

Passed during the Phase 6 public feedback portal implementation:

- `npx prisma format`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npx prisma migrate deploy`
- `npx prisma migrate status`
- `npm run typecheck -w backend`
- `npm run lint -w backend`
- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`

Phase 6 verification notes:

- Migration `20260724120000_phase_6_public_feedback_portal` was applied successfully and `npx prisma migrate status` reports 6 migrations with the database schema up to date.
- `npx prisma migrate dev --name phase_6_public_feedback_portal --create-only` was attempted first, but Prisma refused because the shell is non-interactive. The checked-in migration SQL is the minimal schema change for the formatted Prisma schema and was applied with `npx prisma migrate deploy`.
- The first `npm run prisma:generate` hit the known Windows `EPERM` query-engine DLL lock. After stopping local workspace Node/Prisma Studio processes, `npx prisma generate` passed; the final `npm run prisma:generate` also passed.
- `npm run format:check` still reports only the pre-existing unrelated `.vscode/settings.json` formatting issue. That file was restored and not modified by the final change set.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- No browser, browser automation, screenshots, or manual verification was run by Codex.

Passed during the Phase 7 QR-code feedback submissions implementation:

- `npx prisma format`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npx prisma migrate deploy`
- `npx prisma migrate status`
- `npm run typecheck -w backend`
- `npm run lint -w backend`
- `npm run typecheck -w frontend`
- `npm run lint -w frontend`
- `npm run format`
- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `git diff --check`

Phase 7 verification notes:

- Migration `20260724130000_phase_7_qr_feedback_submissions` was applied successfully and `npx prisma migrate status` reports 7 migrations with the database schema up to date.
- The first `npm run prisma:generate` hit the known Windows `EPERM` query-engine DLL lock. Rerunning with approval still failed while local workspace Node/Vite/tsx processes were active; after stopping those local project processes, `npm run prisma:generate` passed.
- `npm install qrcode @types/qrcode -w frontend` completed successfully and reported existing npm audit findings: 3 moderate and 1 high vulnerability.
- `npm run format:check` still reports only the pre-existing unrelated `.vscode/settings.json` formatting issue. That file was restored and is not part of the final change set.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `git diff --check` completed successfully with only normal CRLF conversion warnings for changed files.
- No browser, browser automation, screenshots, QR scanning, or manual feedback submission was run by Codex.

Run during the Phase 7 QR management actions accessibility fix:

- `npm run typecheck -w frontend` passed.
- `npm run lint -w frontend` passed.
- `npm run build` passed with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `npm run format:check` was run and still reports only the pre-existing unrelated `.vscode/settings.json` formatting difference; that file was not modified.
- `git diff --check` passed with the normal CRLF conversion warning for `frontend/src/features/businesses/QrCodesPage.tsx`.
- No browser, browser automation, screenshots, QR scanning, or manual verification was run by Codex.

Run during the Phase 6/7 public feedback branch-lock and logo-fallback defect fix:

- `npm run typecheck -w frontend` passed.
- `npm run lint -w frontend` passed.
- `npm run build` passed with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.
- `npm run format:check` was rerun after formatting the touched frontend files and still reports only the pre-existing unrelated `.vscode/settings.json` formatting difference; that file was not modified.
- `git diff --check` passed with normal CRLF conversion warnings for changed files.
- Backend checks were not run because no backend files changed and backend QR branch-lock enforcement was confirmed unchanged by code inspection.
- No browser, browser automation, screenshots, QR scanning, or manual verification was run by Codex.

Additional CLI inspection:

- The observed empty-message simulation command returned `FEEDBACK_INPUT_INVALID: Message is required.` without a CLI stack trace, source path, source line number, Prisma error, SQL error, payload hash, customer data, or raw serialized error.
- The first retest attempt under sandboxing failed before the project script ran because `tsx`/esbuild worker spawning was blocked with Windows `EPERM`; rerunning the same local npm script with approved execution reached the project CLI and produced the safe expected output.
- `npm run build` completed successfully with the existing non-blocking Vite warning that one generated frontend JS chunk is larger than 500 kB after minification.

Migration status:

- Created and applied `20260722135525_phase_3_businesses_branches_staff`.
- Created and applied `20260722150908_phase_4_standard_feedback_processing`.
- `npx prisma migrate status` reports 5 migrations and the database schema is up to date.

Lightweight route checks:

- `GET http://localhost:5000/api/health` returned 200.
- `GET http://localhost:5000/api/health/database` returned 200.
- `GET http://localhost:5173/register` returned 200 after starting the frontend dev server.
- `GET http://localhost:5173/login` returned 200.
- `GET http://localhost:5173/account` returned 200.
- `GET http://localhost:5173/system-status` returned 200.
- `GET http://localhost:5173/not-a-real-route` returned 200 and serves the SPA shell for the friendly 404 route.

Notes:

- The final `npm run prisma:generate` initially hit a Windows `EPERM` while replacing Prisma's query-engine DLL because workspace dev-server processes were holding the file. After stopping those local dev processes, `npm run prisma:generate` passed and the dev servers were restarted.
- During Phase 4, `npm run prisma:generate` initially hit the same Windows `EPERM` query-engine DLL lock. Stopping the local workspace Node dev-server processes allowed Prisma generation to pass. The dev servers were not restarted because Phase 4 requested no browser or UI testing.
- The first frontend dev-server start hit a Windows `EPERM` while Vite/esbuild spawned under sandboxing. The server started successfully after rerunning with approval.
- The first `npm run format:check` found mechanical Prettier differences in changed files; `npm run format` fixed them and the final format check passed.

## Manual Verification

Manual verification still required by the user:

- Manually test Phase 6 and Phase 7 together before approving either phase.
- Confirm `/business/:businessId/feedback/qr-codes`: Owner/Admin access, Manager branch-scoped viewing, Staff blocking, portal link card, portal disabled state, empty state, create business-wide QR, create branch-specific QR, rename, disable, regenerate, copy link, open link, PNG download, print modal, QR preview readability, light mode, dark mode, and mobile layout.
- Confirm `/feedback/qr/:qrToken`: anonymous access without login, safe business display, business-wide branch selection, one-branch auto-selection, branch-specific preselection and locked branch display, required rating, required message, optional customer fields, follow-up consent validation, success state, duplicate state, unavailable state, no-active-branches state, rate-limit state, idempotency conflict state, network error state, light mode, dark mode, and mobile layout.
- Confirm individual QR regeneration invalidates the old QR URL immediately and refreshes only that QR code.
- Confirm disabling one QR code blocks that QR public URL without disabling the Phase 6 portal or other QR codes.
- Confirm disabling the Phase 6 portal blocks existing QR URLs, and re-enabling without portal-token regeneration restores active QR codes with matching fingerprints.
- Confirm regenerating the Phase 6 portal token invalidates old QR codes until each QR code is regenerated.
- Confirm branch-specific QR submissions cannot submit to another branch by modifying the request payload.
- Confirm QR submissions persist through Phase 4 `FeedbackIngestion` and `Feedback` rows with `FeedbackChannel.QR_CODE` and bounded `sourceMetadata.sourceType=qr-code`.
- Confirm no public attachment upload, scan analytics, scan counts, feedback counts, expiration, Unified Inbox, feedback-management workflow, customer profile, AI, report, notification, or external integration was added.

- Confirm the Phase 6 workspace Public Feedback Portal settings section at `/business/:businessId/settings`: Owner/Admin access, Manager/Staff visibility, enable/disable, welcome message save, copy link, open link, regeneration confirmation, and old-link invalidation.
- Confirm the Phase 6 public route `/feedback/:portalToken`: anonymous access without login, safe business display, active branch options only, one-branch auto-selection, required rating, required message, optional contact fields, follow-up consent validation, success state, duplicate state, disabled/not-found state, no-active-branches state, rate-limit state, idempotency conflict state, network error state, light mode, dark mode, and mobile layout.
- Confirm Phase 6 records are persisted through Phase 4 `FeedbackIngestion` and `Feedback` rows with `FeedbackChannel.PUBLIC_FORM`, and that no direct `Feedback` insert, public attachment upload, Unified Inbox, QR generation, feedback-management workflow, customer profile, AI, report, notification, or external integration was added.

- Confirm `/business` redirects to setup for eligible business owners with no memberships, redirects to an active/first workspace when memberships exist, and shows no-access guidance for users without membership or owner eligibility.
- Confirm `/business/setup` creates the business, primary branch, owner membership, and all-branch access transactionally.
- Confirm `/business/:businessId`, `/settings`, `/branches`, `/branches/new`, branch details/edit, `/staff`, `/staff/invite`, staff details, branch assignment, `/invitations`, `/invitations/accept`, `/admin/businesses`, and admin business details render correctly in light/dark mode and mobile/tablet/desktop widths.
- Confirm owner/admin/manager/staff role behavior, owner protections, admin-assignment restriction, self-modification blocking, business suspension, membership suspension/removal, branch access, and cross-ID tenant isolation through manual API/UI attempts.
- Configure SMTP and confirm staff invitation creation, resend, cancellation, expiration, preview, current-session acceptance, new password-account acceptance, existing-user acceptance after login, and Google invitation acceptance.
- Confirm Phase 3 does not introduce feedback, customers, analytics, AI, connectors, reports, payments, business deletion, ownership transfer, or Phase 4 behavior.

- Confirm `/`, `/features`, `/how-it-works`, `/pricing`, `/about`, `/contact`, `/privacy-policy`, and `/terms-of-service` match the approved public references in overall layout, hierarchy, spacing, navigation, footer, and premium visual direction.
- Confirm all new public pages work in light mode and dark mode.
- Confirm the public theme toggle persists the selected mode and still follows system theme when no preference is stored.
- Confirm public navigation active states, logo link, Login link, Get Started link, footer links, and mobile menu behavior.
- Confirm mobile menu opens and closes with the button, closes after navigation, closes with Escape, keeps important actions visible, and prevents background scrolling while open.
- Confirm responsive behavior at 375px, 390px, 430px, tablet, laptop, and large desktop widths with no horizontal scroll, clipped cards, or overlapping text.
- Confirm Contact page validation errors are connected to fields and that valid submission clearly reports direct form delivery is not configured.
- Confirm Pricing page copy is acceptable as early-access/planned pricing and does not imply active billing.
- Confirm Privacy Policy and Terms of Service draft content is acceptable for product review and is sent for professional legal review before production launch.
- Confirm existing `/login`, `/register`, `/verify-email-pending`, `/verify-email`, `/forgot-password`, `/reset-password`, `/password-reset-success`, `/account`, `/account/sessions`, `/system-status`, and friendly 404 behavior still work.

- Confirm the redesigned `/login` page in light mode.
- Confirm the redesigned `/login` page in dark mode.
- Confirm the corrected `/login` form card feels prominent at desktop widths and remains comfortable at tablet and mobile widths.
- Confirm the theme toggle persists the selected mode.
- Confirm first visit respects the system theme when no preference is stored.
- Confirm desktop, tablet, and mobile login layouts, especially around 375px, 390px, and 430px widths.
- Confirm email/password login, Google login, forgot password, create account, validation errors, backend login errors, loading state, success messages, keyboard navigation, and responsive behavior still work.
- Confirm the redesigned `/register` page in light mode and dark mode against `frontend/references/01-register.png`.
- Confirm the redesigned `/verify-email-pending` page in light mode and dark mode against `frontend/references/02-email-verification-pending.png`.
- Confirm the redesigned `/verify-email` success, loading, expired, invalid, and missing-token states against `frontend/references/03-email-verification-success.png`.
- Confirm the redesigned `/forgot-password` form and generic success state against `frontend/references/04-forgot-password.png`.
- Confirm the redesigned `/reset-password` form, validation, token-error, and password guidance states against `frontend/references/05-reset-password.png`.
- Confirm the new `/password-reset-success` page against `frontend/references/06-password-reset-success.png`.
- Confirm the redesigned `/account` page against `frontend/references/07-account-page.png`.
- Confirm the new `/account/sessions` page against `frontend/references/08-active-sessions.png`.
- Confirm the new auth/account pages across desktop, tablet, and mobile widths with no horizontal scroll and no overlapping text.
- Confirm registration, Google registration, verification resend, email verification, forgot password, password reset, reset success routing, Google account linking, session listing, session revocation including current-session handling, logout, logout-all, route guards, auth state handling, and theme persistence still work.

- Configure SMTP settings with `EMAIL_ENABLED=true`.
- Confirm new password registration sends a verification email, redirects to `/verify-email-pending`, and does not create an authenticated session.
- Confirm verification resend works with cooldown UX and safe generic account responses.
- Confirm `/verify-email?token=...` verifies the account once and routes the user back to login.
- Confirm verified password users can log in and unverified password users receive safe resend guidance.
- Confirm forgot-password always shows a generic result and sends a reset email only where appropriate.
- Confirm `/reset-password?token=...` accepts a valid token, resets the password, clears cookies, revokes all active sessions, and requires login again.
- Confirm expired, used, missing, malformed, and wrong-purpose tokens fail safely.
- Confirm Google registration, Google login, explicit Google account linking, logout, logout-all, session listing, session revocation, refresh-token rotation, protected routes, public-only routes, `RoleGuard`, `/system-status`, health endpoints, and friendly 404 behavior still work.

## Later-Phase Features

Phase 6 public feedback portal and Phase 7 QR-code feedback submissions are implemented and manually verified by the user. Phase 8, Unified Feedback Inbox, is implemented but full manual verification is still pending. Phase 9, Feedback Details and Workflow, is implemented but full manual verification is still pending. Phase 10, Assignment, Categories, and Priorities, is implemented but full manual verification is still pending. Phase 11, Customer Profiles, is implemented but manual verification is pending. Phase 12, Full Search and Filters, is implemented but manual verification is pending. Phase 13, AI Sentiment Analysis, Categorization, and Summaries, is implemented but manual verification is pending. Phase 14 Automation Rules Engine is implemented but manual verification is pending. Phases 11, 12, 13, and 14 will be manually tested together. Phases 8, 9, and 10 must not be marked manually verified until deferred post-Phase-20 checks pass.

Phase 20 implementation is complete but exhaustive manual verification is pending. Phase 21 Live Email Integration implementation is complete for the Gmail-only OAuth MVP, with migration `20260805090000_phase_21_live_email_gmail_oauth` applied locally. The user reported the core real Gmail connection and synchronization workflow passed, while exhaustive security/regression verification remains pending. Phase 22 Live WhatsApp Cloud API Meta test-number inbound webhook MVP is implemented, with migration `20260810120000_phase_22_live_whatsapp_cloud_api` applied locally; manual Meta test-number/browser verification remains pending. Phase 23 Live Outlook / Microsoft Email inbound OAuth MVP is implemented, with migration `20260810170000_phase_23_live_outlook_email` applied locally; manual real Outlook OAuth/browser synchronization verification remains pending. Phase 24 Live Facebook and Instagram comment webhook MVP is implemented with no migration required; manual Meta/browser verification remains pending. Phase 25 Platform Administrator Dashboard & Reporting is implemented with no migration required; manual browser/report verification remains pending. Live Google Reviews, live X, broader social behavior, and Phase 26 monitoring/recovery remain future work.
