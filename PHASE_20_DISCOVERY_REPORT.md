# Phase 20 Connector Framework and Demo Synchronization Discovery

Date: 2026-08-03

This report is documentation-only discovery for Phase 20, Connector Framework and Demo Synchronization. No application code, Prisma schema, migration, package, reference image, browser session, browser automation, screenshot, provider API call, synchronization run, demo connection, or feedback import was added.

## 1. CURRENT PROJECT FINDINGS

Phases 1 through 7 are complete and manually verified. Phases 8 through 10 are implemented and core workflows have passed, but final cross-business, platform-administrator, concurrency, failure-handling, regression, and security verification remains deferred until after Phase 20. Phases 11 through 14 are implementation-complete but not fully manually verified. The user has reported core supervisor-facing Phase 11 customer creation/profile workflow, Phase 12 search/filter workflow, Phase 13 AI configuration readiness, and Phase 14 rule creation/activation checks have passed, but exhaustive verification remains pending.

At discovery time, Phase 15 through Phase 19 had not started, Phase 20 implementation had not started, and Phase 21 through Phase 25 live integration work had not started. See the implementation follow-up at the end of this report for the later Phase 20 completion status.

The current Git state before this discovery change was clean. Recent commits end at `3f3d420 Finished phase 14 and will test later`.

## 2. PHASE 4 INGESTION PIPELINE FINDINGS

The Phase 4 pipeline is the mandatory import path for Phase 20. External items should be converted into `NormalizedFeedbackInput` and passed to `feedbackProcessingService.process(input)`.

Current `NormalizedFeedbackInput` supports `businessId`, optional `branchId`, `channel`, optional `externalId`, required `idempotencyKey`, optional title, message, rating, occurred date, source URL, language code, customer snapshot, attachment metadata, and bounded source metadata.

The service validates with Zod, normalizes text/contact/metadata, strips sensitive metadata keys, validates active business and active branch, falls back to the active primary branch only when no branch is supplied, hashes a canonical payload, detects idempotency conflicts, detects external-ID conflicts, creates `FeedbackIngestion` first, writes `Feedback` and `FeedbackAttachment` rows transactionally, marks ingestion completed, then schedules customer auto-linking, AI analysis, and automation asynchronously.

Connector imports should always provide an explicit active branch, a provider-scoped external ID, and a stable idempotency key. They should not rely on primary-branch fallback except for deliberate future compatibility cases.

Small implementation gaps for later Phase 20:

- Existing `FeedbackSourceAdapter` is source-channel oriented, not integration-connection oriented.
- Existing adapter registry is lightweight and unused by current concrete adapters.
- Inbox query validation currently allows only `MANUAL`, `PUBLIC_FORM`, and `QR_CODE` channel filters.
- Inbox summary counts currently count only manual, public form, and QR code.
- Feedback detail source rendering has special cases only for manual, public form, and QR code.
- Metadata names are not yet standardized for demo provider imports.

## 3. CONNECTOR FRAMEWORK RISKS

Primary risks are tenant leakage, branch leakage, misleading demo/live claims, accidental provider credential capture, direct `Feedback` inserts, duplicate feedback on repeat sync, stale branch routing, unsafe raw provider payload storage, unsafe sync errors, long-running API requests, concurrent sync duplication, hidden branch inference, and confusing disconnect/reset behavior.

## 4. RECOMMENDED PHASE 20 MVP

Recommended MVP:

- Owner/Admin-only integration management.
- Demo Mode only, with `LIVE` reserved in enums for later phases.
- Providers: Google Reviews, WhatsApp, Email, X, Facebook, Instagram.
- One active Demo connection per provider per business.
- One default active branch per connection.
- Manual synchronization only.
- Bounded synchronous execution for the first MVP, with DB run and item records.
- Deterministic standard mixed demo dataset for all providers.
- Optional partial-failure scenario.
- 10 items per sync by default, maximum 20.
- Import through `FeedbackProcessingService` only.
- External-ID and idempotency-based deduplication.
- Sync run history and per-item results.
- No destructive reset; disconnect preserves imported feedback.

## 5. PROVIDERS

Primary demo providers should be Google Reviews, WhatsApp, and Email. Secondary lighter demo providers should be X, Facebook, and Instagram. Every provider should implement the same connector interface and expose capabilities so the frontend can avoid six unrelated flows.

## 6. DEMO MODE CONTRACT

Demo Mode means simulated external data generated inside the application. It must be labeled as Demo Mode, simulated external data, and not connected to the real provider. No provider login, OAuth, webhook, mailbox, API key, token, or live provider endpoint is used. Demo source metadata may prove architecture but must not claim provider approval or production connectivity.

## 7. CONNECTOR INTERFACE

Recommended MVP interface:

```ts
type ExternalFeedbackConnector = {
  provider: IntegrationProvider;
  mode: IntegrationMode;
  getCapabilities(): IntegrationProviderCapabilities;
  testConnection(connection: IntegrationConnectionContext): Promise<ConnectorHealth>;
  sync(input: ConnectorSyncInput): Promise<ConnectorSyncResult>;
  normalizeExternalItem(
    item: ExternalFeedbackItem,
    context: IntegrationConnectionContext
  ): NormalizedFeedbackInput;
  redactProviderData(item: ExternalFeedbackItem): SafeExternalItemPreview;
};
```

Defer `connectLive`, OAuth token refresh, webhooks, provider polling, and credential validation to future live phases.

## 8. CONNECTOR REGISTRY

Add a backend registry in implementation. It should map provider and mode to connector implementation, expose capabilities, reject unknown or disabled providers safely, and allow test substitution. Keep it explicit, for example `registerDemoConnector(provider, connector)`, rather than dynamic loading.

## 9. CONNECTION CARDINALITY

For Phase 20, allow one active Demo connection per provider per business. This is simple, credible, and avoids duplicate demo cards. The schema should still allow historical disconnected connections and can be extended later for multiple live accounts or branch/location mappings.

## 10. CONNECTION LIFECYCLE

Use `DISCONNECTED`, `CONNECTED`, `PAUSED`, and `ERROR`. A new connection can be created as connected after the Demo disclosure is accepted. Paused connections cannot sync. Disconnected connections keep run history and imported feedback. Error status reflects connection-level safe failures, not item-level partial failures.

## 11. BRANCH ROUTING

Every Demo connection requires one default active branch. All demo items for that connection route to that branch. The backend must validate the branch belongs to the business and is active on create/update and again at sync time. Managers and staff should not configure integrations in the MVP. Future live Google Reviews can map provider locations to branches later.

## 12. DEMO DATASETS

Datasets should be deterministic, provider-specific, and free of real personal data. External IDs should be stable, for example `demo-google-reviews-standard-001`.

Google Reviews: reviewer display name, star rating, review text, review date, external review ID, optional owner reply preview excluded from feedback message.

WhatsApp: contact display name, simulated masked phone identifier, inbound message body, timestamp, external message ID, optional media metadata only.

Email: sender display name, simulated email, subject, body, timestamp, message ID, safe attachment metadata.

X: simulated username, mention or reply text, timestamp, post ID, source label.

Facebook: page comment or recommendation, simulated user, timestamp, external ID.

Instagram: comment or direct-message-style item, simulated user, timestamp, external ID.

## 13. DEMO SCENARIOS

Include `STANDARD` in the MVP. Include `PARTIAL_FAILURE` if time permits because it demonstrates safe error isolation. Defer high-volume and many thematic scenarios until the core path is verified.

## 14. SYNCHRONIZATION TRIGGERS

Phase 20 should support manual sync only. Initial and repeat synchronization are enough to demonstrate ingestion and deduplication. Scheduled sync, webhooks, polling, cron, and provider event delivery belong to Phases 21 through 25.

## 15. SYNCHRONIZATION EXECUTION MODEL

Recommended first implementation: bounded synchronous processing inside the sync API request, backed by persisted `SynchronizationRun` and `SynchronizationItem` rows. Demo datasets are small and deterministic, so a separate worker adds avoidable complexity. The service should still write `RUNNING` then final status so a worker can be introduced later without changing the UI contract.

## 16. WORKER DECISION

Do not add a dedicated integration worker in the Phase 20 MVP unless sync size grows beyond the planned 10 to 20 items. Do not reuse AI or automation workers. If later needed, add an integration worker with claim token, stale recovery, retry limits, and polling, modeled after AI/automation but separate.

## 17. ITEM PROCESSING FLOW

Flow:

```text
Demo connector source item
-> Safe item preview and stable external ID
-> Provider adapter normalization
-> NormalizedFeedbackInput
-> feedbackProcessingService.process(input)
-> FeedbackIngestion and Feedback persistence
-> customer auto-link, AI scheduling, automation scheduling
-> sync item status and run counters
```

One item failure should not stop the run unless the connection itself is invalid.

## 18. CHANNEL MAPPING

Map providers to existing `FeedbackChannel` values:

- Google Reviews -> `GOOGLE_REVIEW`
- WhatsApp -> `WHATSAPP`
- Email -> `EMAIL`
- X -> `X`
- Facebook -> `OTHER` for MVP unless a new enum value is approved
- Instagram -> `INSTAGRAM`

Open decision: whether to add `FACEBOOK` to `FeedbackChannel` during the Phase 20 migration. The current enum has `INSTAGRAM` and `X` but not `FACEBOOK`.

## 19. CUSTOMER MATCHING

Imported feedback should use existing customer snapshot fields only. The existing Phase 11 auto-linking after feedback persistence should run naturally. Email can provide simulated email snapshots; WhatsApp can provide a simulated phone snapshot; Google Reviews, X, Facebook, and Instagram should usually provide display names only.

## 20. AI INTEGRATION

No connector should call AI directly. Since `FeedbackProcessingService` schedules analysis after persistence, imported feedback participates automatically when AI is enabled/configured. AI failure must not affect synchronization success except through existing non-blocking analysis status.

## 21. AUTOMATION INTEGRATION

No connector should call automation actions directly. Since `FeedbackProcessingService` schedules the `FEEDBACK_CREATED` automation event after persistence, imported feedback participates automatically in Phase 14 rules. Later AI completion may trigger `AI_ANALYSIS_COMPLETED` rules independently.

## 22. ATTACHMENT SCOPE

Phase 20 may include metadata-only attachment indicators for Email and WhatsApp. Do not download files, proxy media, store binaries, scan attachments, or expose storage paths. Use the existing 10-attachment metadata limit and safe metadata schema.

## 23. DEDUPLICATION

Use stable external IDs and idempotency keys. Recommended idempotency key: `demo:{connectionId}:{externalId}`. Set `externalId` to a provider-stable simulated ID. Repeat sync with unchanged demo data should produce duplicates, not new feedback. If a demo item changes under the same external ID, the pipeline should return `FEEDBACK_EXTERNAL_ID_CONFLICT`; record the item as failed with a safe conflict code.

## 24. CURSOR STRATEGY

For Demo Mode, cursors are optional. Store a simple `SynchronizationCursor` only if the UI needs "last synced through" later. MVP can derive repeat-safe behavior from deterministic source items and external IDs. Reserve cursor design for live incremental sync.

## 25. PARTIAL FAILURE BEHAVIOR

The run should finish as `COMPLETED_WITH_ERRORS` when at least one item fails and at least one item processes or duplicates successfully. Item rows should hold safe codes/messages. Do not store raw source payloads. Retrying a failed item should re-run only that source item through the same connector and Phase 4 pipeline.

## 26. ERROR HANDLING

Use integration-specific safe codes such as `INTEGRATION_ACCESS_DENIED`, `INTEGRATION_CONNECTION_NOT_FOUND`, `INTEGRATION_PROVIDER_UNSUPPORTED`, `INTEGRATION_BRANCH_INACTIVE`, `INTEGRATION_CONNECTION_PAUSED`, `INTEGRATION_SYNC_ALREADY_RUNNING`, `INTEGRATION_ITEM_IMPORT_FAILED`, `INTEGRATION_ITEM_DUPLICATE`, `INTEGRATION_EXTERNAL_ID_CONFLICT`, and `INTEGRATION_LIMIT_REACHED`. Never expose Prisma errors, SQL, stack traces, raw payloads, tokens, credentials, or customer PII in errors.

## 27. SECURITY

All integration APIs require active business membership and active business status. Platform administrators without tenant membership remain blocked. Owner/Admin manage only in the MVP. Demo Mode stores no secrets and makes no provider network calls. Source metadata must be bounded and scrubbed by the existing normalizer. Public routes must not expose integration records or sync history.

## 28. ROLE PERMISSIONS

MVP permissions:

- Owner/Admin: list providers, create/connect Demo, configure branch/scenario, sync, test, pause/resume, disconnect, view history and item results.
- Manager: no integration management in MVP.
- Staff: no integration management.
- Platform administrator without `BusinessMembership`: blocked from tenant integration APIs.

Manager read-only visibility can be reconsidered after the supervisor demo.

## 29. DATABASE DESIGN

Phase 20 likely requires a migration. Recommended minimum models:

- `IntegrationConnection`
- `SynchronizationRun`
- `SynchronizationItem`

Defer `SynchronizationError` as a separate table; keep safe error fields on item and run rows for MVP. Defer `SynchronizationCursor` unless implementation chooses a worker/incremental structure.

Do not store raw provider payloads. Store safe preview fields and safe metadata only where needed for the UI.

## 30. ENUM DESIGN

Recommended enum values:

- `IntegrationProvider`: `GOOGLE_REVIEWS`, `WHATSAPP`, `EMAIL`, `X`, `FACEBOOK`, `INSTAGRAM`
- `IntegrationMode`: `DEMO`, `LIVE`
- `IntegrationConnectionStatus`: `CONNECTED`, `PAUSED`, `DISCONNECTED`, `ERROR`
- `SynchronizationRunStatus`: `PENDING`, `RUNNING`, `COMPLETED`, `COMPLETED_WITH_ERRORS`, `FAILED`, `CANCELLED`
- `SynchronizationRunTrigger`: `MANUAL`
- `SynchronizationItemStatus`: `NOT_IMPORTED`, `PROCESSING`, `IMPORTED`, `DUPLICATE`, `SKIPPED`, `FAILED`, `RETRYING`
- `DemoScenario`: `STANDARD`, `PARTIAL_FAILURE`

## 31. INDEXES AND UNIQUENESS

Recommended indexes:

- `IntegrationConnection`: business/provider/mode/status, defaultBranchId, createdByMembershipId.
- Unique active Demo connection per business/provider/mode. Because MySQL partial indexes are limited, enforce active-cardinality in service logic and use a practical composite where possible.
- `SynchronizationRun`: connection/status/createdAt, business/createdAt, provider/mode.
- `SynchronizationItem`: run/status, connection/externalId, feedbackId, ingestionId.
- Unique item per connection/externalId.

Delete behavior: business cascade; branch restrict or set null depending on desired branch history; actor membership set null; feedback/ingestion references set null to preserve sync history.

## 32. API DESIGN

Recommended endpoints:

- `GET /api/businesses/:businessId/integration-providers`
- `GET /api/businesses/:businessId/integrations`
- `POST /api/businesses/:businessId/integrations`
- `GET /api/businesses/:businessId/integrations/:connectionId`
- `PATCH /api/businesses/:businessId/integrations/:connectionId`
- `POST /api/businesses/:businessId/integrations/:connectionId/test`
- `POST /api/businesses/:businessId/integrations/:connectionId/sync`
- `POST /api/businesses/:businessId/integrations/:connectionId/pause`
- `POST /api/businesses/:businessId/integrations/:connectionId/resume`
- `POST /api/businesses/:businessId/integrations/:connectionId/disconnect`
- `GET /api/businesses/:businessId/integrations/:connectionId/runs`
- `GET /api/businesses/:businessId/integration-runs/:runId`
- `GET /api/businesses/:businessId/integration-runs/:runId/items`
- `POST /api/businesses/:businessId/integration-runs/:runId/items/:itemId/retry`

All are Owner/Admin-only in MVP, paginated where list-like, and branch-safe.

## 33. FRONTEND ROUTES

Recommended routes:

- `/business/:businessId/integrations`
- `/business/:businessId/integrations/:connectionId`
- `/business/:businessId/integration-runs/:runId`

Use a full page for the integrations dashboard and connection detail. Use a modal or short inline stepper for Connect Demo. Avoid a landing page.

## 34. INTEGRATIONS PAGE DESIGN

The main page should be a dense workspace tool with provider cards, not marketing content. Cards show provider, Demo Mode badge, connection status, branch, scenario, last successful sync, last result, imported count, and primary action. Include recent runs below or in a side panel.

## 35. CONNECT DEMO FLOW

Flow: select provider, confirm Demo Mode disclosure, enter display name, select active branch, choose scenario, review "imported feedback appears in Inbox", connect, then optionally sync now. Do not ask for provider credentials.

## 36. SYNCHRONIZATION UI

Use Sync Now, current run status, result summary, imported/duplicate/failed counts, recent runs, safe item errors, and links to imported feedback. TanStack Query polling or manual refresh is sufficient. No WebSockets.

## 37. INBOX INTEGRATION

Update inbox channel filter allowlist and channel labels for external channels. Existing feedback list and detail can show imported rows naturally once channel support is widened. Summary cards may need a generalized channel count or a separate "External" count.

## 38. FEEDBACK DETAILS INTEGRATION

Add source display for demo provider imports: source provider, connection name, external received date, Demo Mode badge, safe external reference, and source URL only when safe and simulated. Do not display raw provider payloads.

## 39. AUDIT LOGGING

Do not use `FeedbackActivity` for connection management. For MVP, `SynchronizationRun` and connection timestamps/history can serve as audit. A later Phase 19 audit log can add events for connection created, branch changed, sync started/completed, paused/resumed, and disconnected.

## 40. LIMITS

Recommended limits:

- One active Demo connection per provider per business.
- Maximum 6 Demo connections per business.
- 10 items per standard sync, max 20.
- One active run per connection.
- Run history page size 10, max 50.
- Item history page size 20, max 100.
- Display name 120 chars.
- Safe preview 500 chars.
- Source metadata remains within existing 8 KB limit.
- Cooldown 10 seconds per connection.
- Retry attempts 3 per item.

## 41. PERFORMANCE

Bound datasets, pre-load connection and branch, process items sequentially for clearer counters, and rely on Phase 4 uniqueness for final duplicate protection. Paginate run and item history. Avoid provider network calls and N+1 source preview lookups by keeping safe item previews in item rows.

## 42. RESPONSIVE AND DARK MODE

Use the existing workspace shell, panels, badges, shadcn-style selects/popovers/dialogs, and Tailwind theme tokens. Provider cards should wrap cleanly. Tables need mobile card equivalents. Long connection names and safe error text must wrap without horizontal overflow. Avoid white native inputs in dark mode.

## 43. ACCESSIBILITY

Provider cards need clear headings, non-color status text, Demo Mode text, accessible action labels, focus-managed dialogs, form errors associated to fields, progress announcements for sync results, keyboard-accessible history rows, and mobile-equivalent item cards.

## 44. AUTOMATED TEST STRATEGY

Add tests during implementation for provider registry, Demo connector outputs, deterministic external IDs, connection authorization, branch routing, inactive branch blocking, sync counters, duplicate repeat sync, partial failure, no raw payload leakage, no provider network calls, safe metadata, item retry, concurrent sync prevention, and `FeedbackProcessingService` reuse.

## 45. SUPERVISOR-FOCUSED MANUAL TEST

Future short manual test:

1. Open Integrations.
2. Connect Google Reviews in Demo Mode to Remera Branch.
3. Run synchronization.
4. Confirm imported reviews appear in Sync summary.
5. Open Unified Inbox and filter Channel = Google Reviews.
6. Open a negative review and confirm provider source, rating, review text, branch, AI panel, and automation effects where configured.
7. Run synchronization again and confirm duplicates are counted without new feedback.
8. Open synchronization history and confirm imported/duplicate counts.
9. Repeat quickly with WhatsApp.

## 46. MIGRATION REQUIREMENT

Phase 20 implementation likely requires a migration for integration connections, synchronization runs, and synchronization items. No sync should run during migration, no demo connections should be created during migration, and no feedback should be inserted by migration.

## 47. EXPLICIT OUT-OF-SCOPE ITEMS

Out of scope: live Google Business Profile, live WhatsApp Cloud API, live IMAP/SMTP/Gmail/Microsoft email sync, live X/Facebook/Instagram APIs, webhooks, scheduled sync, cron jobs, provider credentials, OAuth, token refresh, replies, attachment downloads, media proxying, live rate-limit recovery, production provider monitoring, destructive demo reset, direct feedback insertion, and fake live-connectivity claims.

## 48. OPEN DECISIONS REQUIRING APPROVAL

Open decisions:

- Add `FACEBOOK` to `FeedbackChannel` or map Facebook demo items to `OTHER`.
- Keep synchronous MVP or approve a dedicated integration worker from the start.
- Include `PARTIAL_FAILURE` scenario in MVP or defer.
- Store safe item previews on `SynchronizationItem` or compute previews from deterministic datasets.
- Add `SynchronizationCursor` in MVP or defer.
- Allow manager read-only visibility or keep Owner/Admin-only.
- Exact sync cooldown and history retention.

## 49. REFERENCE DESIGN PLAN

After discovery approval, create exactly two references:

- `frontend/references/phase20-integrations-sync-primary.png`
- `frontend/references/phase20-integrations-sync-states.png`

No reference images were created during discovery.

## 50. DOCUMENTATION FILES UPDATED

This discovery updates project memory and planning documentation to record Phase 20 discovery, Demo Mode truthfulness, mandatory Phase 4 pipeline use, no direct feedback insertion, current manual-verification state, and later live-provider boundaries.

## 51. STATIC CHECK RESULTS

- `npm run format` passed and made no content changes.
- `npm run format:check` passed.
- `git diff --check` passed with only Git line-ending warnings that LF will be replaced by CRLF the next time Git touches the modified Markdown files.

## 52. EXACT FILES CHANGED

Documentation-only files changed:

- `PHASE_20_DISCOVERY_REPORT.md`
- `AGENTS.md`
- `IMPLEMENTATION_STATUS.md`
- `NEXT_STEPS.md`
- `ARCHITECTURE.md`
- `API_NOTES.md`
- `DATABASE_NOTES.md`
- `SECURITY_NOTES.md`
- `DEPLOYMENT.md`
- `CHANGELOG.md`
- `README.md`

## 53. DISCOVERY-TIME CONFIRMATIONS

- No application code changed.
- Prisma schema unchanged.
- No migration created.
- No package added.
- No connector implemented.
- No demo connection created.
- No synchronization run created.
- No Feedback inserted.
- No provider API called.
- No provider credential used.
- No browser opened.
- No browser automation used.
- No screenshots taken.
- No manual verification claimed.
- Phase 20 implementation not started at discovery time.
- Phase 21 not started.
- Phase 22 not started.
- Phase 23 not started.
- Phase 24 not started.
- Phase 25 not started.

## 54. IMPLEMENTATION FOLLOW-UP - 2026-08-03

Phase 20 implementation was completed after this discovery report. Migration `20260803090000_phase_20_connector_framework_demo_sync` is applied locally.

Implemented follow-up scope:

- Demo Mode-only connectors for Google Reviews, WhatsApp, Email, X, Facebook, and Instagram.
- Shared connector contract and explicit registry.
- Owner/Admin-only integration APIs and `/business/:businessId/integrations` workspace page.
- Deterministic manual sync through `FeedbackProcessingService.process`.
- `IntegrationConnection`, `SynchronizationRun`, and `SynchronizationItem` persistence.
- Safe run/item result serialization and failed-item retry.
- Feedback Inbox channel/source updates for demo-imported provider feedback, including `FACEBOOK`.
- Disabled-by-default integration sync worker hook.
- Focused integration tests.

Still not implemented:

- Live provider credentials, OAuth, webhooks, public simulator routes, scheduled provider polling, provider API calls, provider approval claims, and Phases 21 through 25 behavior.

Manual browser/functional verification remains pending with the user.
