# AI Agent Instructions

## Required Reading Order

Before creating or modifying implementation files, read these files in order:

1. `AGENTS.md`
2. `IMPLEMENTATION_STATUS.md`
3. `NEXT_STEPS.md`
4. `ARCHITECTURE.md`
5. `API_NOTES.md`
6. `DATABASE_NOTES.md`
7. `SECURITY_NOTES.md`
8. `DEPLOYMENT.md`
9. `CHANGELOG.md`
10. `README.md`

After reading the memory files, inspect the complete codebase and folder structure.

## Required Workflow

- Identify what has already been implemented.
- Identify what is partially implemented, incomplete, or failing.
- Identify the current implementation phase.
- Identify the exact next unfinished task.
- Do not reimplement completed work.
- Do not overwrite working code unnecessarily.
- Preserve established architecture, stack, naming conventions, and project decisions unless a clear technical reason requires a change.
- Update relevant project memory files after every task.
- Keep documentation aligned with the actual implementation.
- The user prefers to perform manual functional testing.

## Definition of Done

A task is done only when:

- Implementation changes are complete.
- Static checks relevant to the change have been run or a clear reason is documented.
- `IMPLEMENTATION_STATUS.md` records completed work, incomplete work, known issues, static verification results, and manual verification still required.
- `NEXT_STEPS.md` reflects the next unfinished phase or task.
- `CHANGELOG.md` includes a dated entry.
- Architecture, API, database, security, deployment, and README notes are updated when affected.

## Project Implementation Order

1. Project setup
2. Authentication and roles
3. Businesses, branches and staff
4. Standard feedback-processing service
5. Manual-entry connector
6. Public feedback portal
7. QR-code submissions
8. Unified inbox
9. Feedback details and workflow
10. Assignment, categories and priorities
11. Customer profiles
12. Search and filters
13. AI sentiment and categorization
14. Automation rules
15. Notifications and replies
16. Customer accounts
17. Dashboard and analytics
18. CSV, Excel and PDF reports
19. Audit logs and security hardening
20. Connector Framework and Demo Synchronization
21. Live Email Synchronization
22. Live WhatsApp Cloud API
23. Live Outlook Synchronization
24. Live Google Reviews and Social Media Synchronization
25. Platform Administrator Dashboard and Reporting
26. Integration Monitoring and Recovery

## Current Boundary

Phase 1 through Phase 7 are complete and manually verified by the user.

Phase 8, Unified Feedback Inbox, is implemented (backend and frontend). Core manual workflows, filters, details, responsive behavior, and dark-mode behavior have passed manual testing, but final multi-tenant/security/regression verification remains deferred.

Phase 9, Feedback Details and Workflow, is implemented (backend and frontend; migration applied). Core manual status, notes, workflow activity, role, and branch workflows have passed manual testing, but final multi-tenant/security/regression verification remains deferred.

Phase 10, Assignment, Categories, and Priorities, is implemented (backend and frontend; migration applied). Core manual assignment, category, priority, role, and branch workflows have passed manual testing, but final multi-tenant/security/regression verification remains deferred.

The user explicitly decided on 2026-07-26 to continue to Phase 11 discovery before the deferred cross-business tenant-isolation, platform-administrator, concurrency, failure-handling, and final regression/security checks. Phases 8, 9, and 10 must not be marked fully manually verified until those deferred checks pass after Phase 20.

Phase 11 Customer Profiles backend, frontend, database, security, and documentation implementation has been completed. The Phase 11 migration is applied locally. Manual browser/functional verification is still required by the user, and Phase 11 must not be marked manually verified until that passes.

The user explicitly decided on 2026-07-26 to defer standalone Phase 11 manual verification, complete Phase 12 discovery first, then implement Phase 12 after approval and manually test Phases 11 and 12 together. Phase 12 Full Search and Filters backend and frontend implementation is complete. Manual browser/functional verification is still required by the user, and Phase 12 must not be marked manually verified until that passes.

Phase 13 AI Sentiment Analysis, Categorization, and Summaries backend, frontend, database, security, and documentation implementation has been completed. The Phase 13 migration is applied locally and must not be edited. The 2026-07-27 completion audit/test-coverage pass is complete. Manual browser/functional verification is still required by the user, and Phase 13 must not be marked manually verified until that passes.

Phase 14 Automation Rules Engine backend, frontend, database, worker, security, tests, and documentation implementation has been completed. The Phase 14 base migration `20260727091241_phase_14_automation_rules` and follow-up migration `20260727143000_phase_14_field_source_backfill` are applied locally. The follow-up migration adds `FeedbackFieldStateSource.DEFAULT` and backfills one `FeedbackFieldState` row for each `STATUS`, `PRIORITY`, `CATEGORY`, and `ASSIGNMENT` field on every existing feedback row without mutating feedback values or executing automation. Manual browser/functional verification is still required by the user, and Phase 14 must not be marked manually verified until that passes.

The user reported during Phase 20 discovery that the Phase 11 core supervisor-facing Customer creation/profile workflow passed, the Phase 12 core supervisor-facing search/branch/status/priority/refresh-persistence/clear-filter workflow passed, Phase 13 AI configuration readiness passed, and Phase 14 rule creation/activation passed. Exhaustive manual verification remains pending; do not mark Phases 11 through 14 fully manually verified.

Phase 20 Connector Framework and Demo Synchronization backend, frontend, database, worker hook, tests, and documentation implementation has been completed. Migration `20260803090000_phase_20_connector_framework_demo_sync` is applied locally. Phase 20 is Demo Mode-only with simulated provider datasets for Google Reviews, WhatsApp, Email, X, Facebook, and Instagram; no live provider credentials, OAuth, webhooks, scheduled provider polling, public simulator routes, provider API calls, or direct `Feedback` inserts were added. The Phase 20 frontend integrations route-not-found blocker has been repaired; the canonical route is `/business/:businessId/integrations`, and planned detail/history URLs redirect to that route. Manual browser/functional verification is still required by the user, and Phase 20 must not be marked manually verified until that passes.

Phase 21 Live Email Integration discovery is complete in `PHASE_21_DISCOVERY_REPORT.md`, and the Gmail-only Live Email implementation has been recovered and completed after an interrupted coding session. Migration `20260805090000_phase_21_live_email_gmail_oauth` is applied locally. Phase 21 adds Gmail API OAuth initiation/callback handling with PKCE state storage, encrypted backend-only credential storage, one Live Email connection per Business, one required default active Branch, Demo/Live Email coexistence by `IntegrationMode`, Inbox-only manual synchronization, latest-20 initial import, Gmail history-ID incremental cursor, metadata-only attachments, plain-text-only stored email bodies, safe inbox source metadata, frontend Live Gmail connection/reauthorization states, and reuse of the Phase 20 connector framework plus Phase 4 `FeedbackProcessingService`. The user reported that real Gmail OAuth configuration, real Gmail connection, first real Gmail synchronization, imported Gmail feedback visibility in Unified Inbox, and a duplicate-safe incremental second sync have passed core manual verification. Exhaustive Phase 21 security/regression verification remains pending.

Phase 22 Live WhatsApp Cloud API Meta test-number inbound webhook MVP is implemented. Migration `20260810120000_phase_22_live_whatsapp_cloud_api` is applied locally. Phase 22 adds a Live WhatsApp connector registered through the Phase 20 framework, Owner/Admin-only Live WhatsApp connection setup on the existing integrations page, encrypted backend-only Meta access-token storage, one Live WhatsApp connection per Business, one required active default Branch, GET webhook verification, pre-parse `X-Hub-Signature-256` raw-body HMAC validation with the Meta App Secret, phone-number-ID connection resolution, inbound text-message-only processing, provider-message-ID delivery deduplication, safe webhook activity persistence, Unified Inbox source labeling, and mandatory Phase 4 `FeedbackProcessingService` reuse. No outbound WhatsApp replies, templates, media download, polling, scheduled sync, Redis queue, production phone-number onboarding, WhatsApp Web/Twilio integration, browser/browser automation, screenshot/reference image, Outlook, live Google Reviews, or social media implementation was added. Manual Meta test-number/browser verification is still required by the user, and Phase 22 must not be marked manually verified until that passes.

Phase 23 Live Outlook / Microsoft Email inbound OAuth MVP is implemented. Migration `20260810170000_phase_23_live_outlook_email` is applied locally. Phase 23 keeps the existing Email Live surface, allows one Gmail Live and one Outlook Live connection per Business, adds Microsoft Graph OAuth initiation/callback handling with PKCE state, encrypted backend-only credential storage, delegated `offline_access User.Read Mail.Read` scopes, Inbox-only manual synchronization, latest-20 initial import, Graph delta cursor follow-up runs, metadata-only attachments, safe Outlook source metadata, and mandatory Phase 4 `FeedbackProcessingService` reuse. No Mail.Send, SMTP/IMAP sync, outbound email/replies, Graph beta, full mailbox scan, scheduled sync/webhooks, provider polling, attachment binary download, browser/browser automation, screenshot/reference image, live Google Reviews, or social media implementation was added. Manual real Outlook OAuth/browser verification is still required by the user, and Phase 23 must not be marked manually verified until that passes.

Phase 24 Live Facebook + Instagram Meta Social Feedback Webhook Integration MVP is implemented. No Prisma migration was required; the implementation reuses existing Phase 20/22/23 integration tables and enums. Phase 24 adds Live Facebook Page and Live Instagram professional-account connectors through the Phase 20 registry, Owner/Admin setup on the existing Facebook and Instagram provider cards, encrypted backend-only developer/test token storage, one Live Facebook connection and one Live Instagram connection per Business enforced in service logic, one required active default Branch, shared Meta GET webhook verification, shared pre-parse `X-Hub-Signature-256` raw-body HMAC validation with the Meta App Secret, Facebook Page ID / Instagram account ID connection resolution, inbound comment-only processing, provider comment ID delivery deduplication, safe webhook activity persistence, Unified Inbox source labeling, and mandatory Phase 4 `FeedbackProcessingService` reuse. Instagram mentions are deferred. No replies, DMs, Messenger, publishing, moderation, media downloads, polling, scheduled sync, production OAuth onboarding, multiple social accounts per provider, browser/browser automation, screenshot/reference image, live Google Reviews, X, or Phase 25 monitoring behavior was added. Manual Meta/browser verification is still required by the user, and Phase 24 must not be marked manually verified until that passes.

Phase 25 Platform Administrator Dashboard & Reporting backend, frontend, security, tests, and documentation implementation is complete. `/admin` is the Platform Administrator landing page and provides real database-backed KPIs, feedback/business trends, channel/sentiment/integration visualizations, derived action-required items, recent safe platform activity, and business comparison. Functional oversight pages exist at `/admin/businesses`, `/admin/users`, `/admin/feedback`, `/admin/integrations`, `/admin/reports`, and `/admin/system-health`. Nine on-demand report types generate PDF or CSV without persisting report files/history. All new `/api/admin/*` endpoints require `PLATFORM_ADMIN`; ordinary tenant APIs and Business Owner workflows remain unchanged. No Prisma schema change or migration was required. Manual browser/functional/report-download verification is still required by the user, and Phase 25 must not be marked manually verified until that passes. Integration monitoring/recovery is deferred to Phase 26.

Phase 25.1 System-Wide Responsive UI Refinement, persisted List/Grid collection views, `/admin/feedback` and `/admin/integrations` density refinements, and global Platform Settings are implemented. Migration `20260816120000_phase_25_1_platform_settings` was applied locally by the user. `/admin/settings` plus `GET/PATCH /api/admin/settings` require `PLATFORM_ADMIN`; `GET /api/platform-settings` exposes only safe global branding. The exact default collection-view policy, supported routes, and justified exceptions are recorded in `PHASE_25_1_RESPONSIVE_COLLECTION_AUDIT.md`. Static checks pass, but manual browser/responsive/authorization verification remains with the user; Phase 25.1 must not be marked manually verified until those checks pass.

Phase 25.2 Platform Administration Hardening, Global Design System, and Business Approval Workflow implementation is complete. New businesses default to `PENDING`; Platform Administrators have guarded create/edit/approve/reject/suspend/reactivate/archive actions, safe user/session and integration governance, read-only feedback detail oversight, pending-business dashboard alerts, and safe admin mutation auditing. Non-active businesses receive a limited review-state experience and are blocked from tenant operations. Global settings drive public hero/support and report configuration, and public/root/auth routing is session-aware. Phase 25.3 supersedes Phase 25.2's rejected pink/dynamic-color and personal-local-storage theme behavior. The user confirmed migration `20260817120000_phase_25_2_admin_hardening` was applied successfully on 2026-08-17 at 09:44:10.207 with no rollback and that Prisma reports the schema up to date. The applied migration is immutable and must not be edited. Static/regression checks pass; manual browser/responsive/authorization/regression verification remains with the user. Phase 25.2 must not be marked manually verified until those checks pass.

Phase 25.3 Strict UI/UX Correction, Indigo Design System, and Professional Detail Modals implementation is complete. It preserves the Phase 25.2 lifecycle, security, settings persistence, reports, routing, and List/Grid behavior while superseding the rejected pink/dynamic-color and inline-card-detail presentation. The application now uses fixed Indigo tokens; deprecated color columns remain compatibility-only and cannot recolor UI or reports. A single reactive platform-appearance pipeline clears stale legacy theme storage and reapplies every successful settings save immediately. Platform admin user, feedback, and integration details use reusable accessible centered modals plus separate destructive confirmations. Business Details, Reporting Center, organized Settings, and Platform Health are redesigned. No Phase 25.3 migration was created because runtime read/write normalization and fixed report/UI tokens make database color normalization unnecessary. The applied Phase 25.2 migration remains exactly as created. Static/regression verification passes, but user-run browser/responsive/manual verification remains required, so Phase 25.3 must not be marked manually verified.

Phase 25.4 Supervisor-Focused Reporting Consolidation implementation is complete. `/admin/reports` and the report API accept exactly Executive Platform, Feedback & Customer Experience, and Operations & System Health reports, with Executive selected by default. Important supported metrics from the former eight fragmented choices are consolidated into these three reports. Lifetime/period labels, deterministic summaries, report-aware filters, scoped database trends, richer previous-period comparisons, empty states, fixed Indigo PDF/CSV rendering, and existing Platform Administrator security are implemented. No schema change or migration was created. Automated checks pass, but user-run browser/PDF/CSV verification remains required; Phase 25.4 must not be marked manually verified until that passes.

Phase 26 Business Owner Comprehensive Reporting implementation is complete. The Business Owner has exactly one report type, Business Performance & Customer Experience Report, at `/business/:businessId/reports` with no report-type or Business selector. `POST /api/businesses/:businessId/reports/preview` and `POST /api/businesses/:businessId/reports/export` require an authenticated platform `BUSINESS_OWNER` with an active membership in an active Business; platform STAFF/CUSTOMER/PLATFORM_ADMIN callers, foreign Businesses, foreign branches, and non-active businesses are denied, and the Business is always resolved from authenticated membership. The report reuses the shared Phase 25.4 document/formatter/PDF/CSV infrastructure and combines Business Performance, Customer Experience, Workflow & Response Performance, and Channel & Operational Health with explicit lifetime/period and business-wide/branch-scoped labels, deterministic tie-aware Management Summary, previous-period comparison, important high/urgent-or-negative feedback with normalized safe content, and no platform-level API/database health, approval workload, or other-tenant data. No Prisma schema change, migration, seed, or development-data mutation was made. Static/regression verification passes; user-run browser/PDF/CSV/responsive verification remains required, so Phase 26 must not be marked manually verified until that passes. The originally listed Phase 26 "Integration Monitoring and Recovery" scope remains unstarted and is a separate future phase.

Phase 27 Full Product UI/UX Overhaul implementation is complete. Business Owner, Platform Administrator, public, legal, and auth-wrapper presentation uses the fixed Indigo Light/Dark/System design system with stronger responsive hierarchy. The owner Overview consumes real tenant report data; feedback/customers/QR/automations/details/settings are redesigned; owner integrations use a centralized allowlist exposing only Live WhatsApp and Gmail; and owner report integration, synchronization, and webhook queries exclude Demo records. Demo seed/data, future connector/provider backend architecture, Gmail/WhatsApp behavior, Platform Administrator functionality/reporting, tenant authorization, and applied migrations are preserved. Pricing and `/pricing` are removed, informational public pages remain available to authenticated sessions, and Login/Register retain their main contents inside the shared public header/footer. No dependency, schema, migration, seed, or stored-data mutation was made. Automated/static checks pass, and the user confirmed the Phase 27 browser/UI review was satisfactory on 2026-08-18.

Phase 28 Feedback Category System + Kigali Waffle Cuisine Demo Tenant + Mobile Nav Polish implementation is complete. The exact 13 active default Business-owned categories are centralized and provisioned for new Businesses; custom Owner/Admin category management, tenant isolation, active-category-only AI suggestions, category automations, and report architecture are preserved. All Feedback List/Grid directly shows Category or Uncategorized and the single Category filter exposes All Categories, Uncategorized, and active Business categories. The deterministic `dev_seed_business_kigali_harvest` tenant was safely rebranded in place as Kigali Waffle Cuisine; stable category IDs were reconciled, eight missing deterministic categories were created, and professional seed fixtures were updated without touching five non-seed feedback rows, the connected Live WhatsApp record, credentials, other integration records, or the tenant-isolation Business. No Live Gmail row existed, so the canonical Gmail Connect context remains unchanged. Business/Admin/Staff/Account drawers and the public mobile menu received bounded dynamic-viewport scrolling and dismissal polish; public navigation order is Home, About, How It Works, Features, Contact and Pricing remains absent. No schema or migration changed. Automated/static checks pass; user-run Phase 28 browser, responsive, portal, connection-context, and downloaded-report verification remains required, so Phase 28 must not be marked manually verified until that passes.

The Final Product Hardening + UI/UX Pass implementation is complete. It adds Owner/Admin feedback edit and audited soft-delete, transactional bulk status/category/delete, exact-confirmed Remove all, strict tenant/Branch filter validation, a Branch-scoped Staff Overview, a session-owned Customer dashboard/history/detail/submission/profile workspace, honest Gmail/WhatsApp action presentation, and independently scrolling desktop navigation while preserving provider ingestion/deduplication and existing responsive collection behavior. Migration `20260821120000_final_product_hardening` was created but not applied by Codex and must not be edited; apply it through the normal migration workflow without reset or reseeding. Automated checks pass, but migration application and user-run browser/authorization/tenant/responsive/regression verification remain required. Do not mark this hardening pass manually verified until those checks pass.

## Approved Future Synchronization Strategy

Phase 20 is the deadline-oriented demonstration phase for the connector architecture. It must prove the multi-channel synchronization flow without claiming live provider approval or production connectivity.

Phase 20 must use clearly labeled Demo Mode provider simulators and mock connectors for sources such as Google Reviews, WhatsApp, Email, X, Facebook, and Instagram. Simulated source data must be labeled as simulated external data and not connected to the real provider.

Demo connectors must still use the real Phase 4 feedback-processing pipeline:

```text
provider simulator
-> demo connector
-> provider adapter
-> NormalizedFeedbackInput
-> FeedbackProcessingService
-> FeedbackIngestion and Feedback persistence
-> Phase 8 unified inbox display
```

Demo connectors must not insert directly into the `Feedback` table.

Future live integrations beyond Gmail Live Email, Phase 22 Live WhatsApp test-number MVP, Phase 23 Live Outlook inbound OAuth MVP, and the Phase 24 Live Facebook/Instagram comment webhook MVP depend on provider approval, OAuth or provider credentials, token refresh, webhooks or polling, rate limits, provider-specific permissions, and external provider availability. Do not add IMAP, WhatsApp outbound replies/templates/media handling/production onboarding, live Google Reviews, X, social publishing/replies/DMs/media handling, scheduled synchronization, provider simulator page, or Phase 25 implementation behavior until the relevant implementation phase is explicitly started.
