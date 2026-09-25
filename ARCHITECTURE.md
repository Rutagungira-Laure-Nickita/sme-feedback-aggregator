# Architecture

## Simplified Reporting and Category Assignment Pipeline

Business Owner reporting intentionally has two consumers of the same authorized backend document. The Overview dashboard continues to consume the rich preview metrics. The Reports page filters that preview to `Detailed Feedback Records`, and the export controller applies `simplifyBusinessOwnerReportForExport` before the shared PDF/CSV renderer. This avoids duplicating report queries while guaranteeing that downloaded Owner reports contain only concise scope/filter metadata and the six requested detail columns.

The normal Platform Administrator Reporting Center exposes a single Platform Overview choice. Its builder uses the existing platform scope planners and active operational feedback predicate to assemble four summary cards plus Businesses, Users, Detailed Feedback Records, and supported Live Gmail/WhatsApp connections. The shared detail boundary puts Business and Branch first for administrator output. PDF and CSV are rendered from the same document; CSV keeps full messages and ISO timestamps, while PDF applies wrapped, page-safe detail-table projections.

Category assignment belongs to `FeedbackProcessingService`, after validation/deduplication and inside the feedback-create transaction. `NormalizedFeedbackInput.categoryId` is optional. A valid explicit Business category becomes `HUMAN`; otherwise the service upserts/uses the canonical Business-owned `Other` category and records `DEFAULT` in `FeedbackFieldState`. The feedback and its STATUS, PRIORITY, CATEGORY, and ASSIGNMENT provenance rows are created atomically.

After persistence, the existing AI scheduler remains asynchronous. Successful high-confidence analysis may replace null/default-Other/AI-owned category state and marks CATEGORY provenance `AI`. HUMAN and AUTOMATION provenance fail closed as conflicts, so delayed analysis cannot undo an explicit selection or later manual/automation correction. AI failure never rolls back feedback ingestion because a durable fallback category already exists. Manual Entry, Public Form, Gmail, and WhatsApp remain adapters into this one pipeline.

## Focused Platform Administrator Reporting Consistency

The shared `formatReportDisplayValue` boundary explicitly maps `MANUAL` to `Manual Entry`, so the single report document used by Preview, PDF, and CSV cannot drift by renderer. Stored `FeedbackChannel` values remain unchanged.

Executive `createExecutiveScopePlan` now assigns `supportedLiveIntegrationWhere()` to both the top-level Integration queries and each Business Adoption relation. Business Adoption counts the filtered connection rows directly, while Integration Adoption groups the same supported Live Gmail/WhatsApp population. Hidden, Demo, unsupported, historical, and dormant providers remain stored but are outside both aggregations.

Operations continues to derive synchronization imports from `SynchronizationRun.itemsImported`. `latestProviderActivityAt` calculates the maximum relevant persisted provider timestamp across webhook receipt, inbound message, successful/attempted synchronization, and connection test. The shared Operations document and PDF projection label that value `Last provider activity`; renderers do not calculate or substitute timestamps.

## Shared Owner/Admin Detailed Feedback Reporting

`feedback-report-records.ts` is the shared safe record-to-report boundary for Business Owner and Platform Administrator reporting. It accepts only customer snapshot identity fields, original `Feedback.message`, channel, `receivedAt`, category, status, and optional Business/Branch names. It returns the standardized `Detailed Feedback Records` section and applies one sender-resolution policy to both report families. It selects no Feedback/customer/provider IDs, source metadata, external IDs, notes, attachments, credentials, tokens, payloads, or AI summaries.

Every normal report builder queries detailed rows from the same canonical `FeedbackScopePlan` predicate used by its aggregates. Owner and Administrator Feedback reports include their full Branch/date/channel/status/sentiment scope; Executive includes its platform/Business/Branch/date scope; Operations includes its platform/Business/date feedback scope while the Provider filter remains integration-domain-specific. `Feedback in selected period` is derived from the resulting detail collection, preventing a second count path from drifting. Linked-customer counts remain separate data-model metrics and are explicitly named as linked profiles.

The shared PDF renderer recognizes the six-column Owner and eight-column Administrator shapes. Both export every row, repeat headers after page breaks, wrap text, format dates in UTC, and cap only PDF message display at 500 characters; CSV receives the complete shared document and full stored messages. Automation models and execution architecture remain intact, but normal report builders no longer query or place automation data in their documents.

## Business Owner Detailed Feedback Reporting

`buildBusinessOwnerReport` remains the single Business Owner report builder. Its canonical period `FeedbackScopePlan` now feeds both aggregate totals and an unbounded safe-projection query for `Detailed Feedback Records`; there is no parallel filter or frontend-only security path. The projection contains only submitted/imported customer snapshot fields needed for display, original `Feedback.message`, `Feedback.channel`, `Feedback.receivedAt`, category name, and workflow status. It selects no Feedback ID, source metadata, provider identifier, credential, attachment, note, or AI summary.

The same `AdminReportDocument` continues to drive browser Preview, PDF, and CSV. Browser Preview uses the established 12-row sample and a dedicated responsive table/card presentation. CSV retains all detail rows and full stored message text. The shared PDF renderer treats this as a full-export wrapped table, repeats its header after page breaks, formats the received timestamp for display, and caps only the PDF message excerpt at 500 characters so a row remains page-safe. Channel/status labels are resolved before shared display formatting, while sender, message, and category strings remain verbatim.

## Focused Operational Visibility Boundary

`activeOperationalFeedbackWhere()` is the canonical query root for normal feedback reads and aggregates. It composes `deletedAt: null` with the deny-by-default visible-source predicate and retains caller-provided Business, Branch, date, workflow, and sentiment filters. The visible source set is exactly Live Gmail, Live WhatsApp, Manual Entry, and Public Form. Historical/deleted rows and dormant QR/provider implementations stay relationally intact for audit, activity, provider deduplication, and direct backward-compatible routes, but normal list, dashboard, customer, category, analytics, and report consumers cannot count them.

The UI mirrors this boundary through one ordered four-channel option catalog. The Business Owner Channel distribution and Sentiment mix share a reusable donut-card presentation. QR and Automation route modules remain registered but have no normal workspace navigation or marketing entry point. The role presentation layer maps legacy tenant `ADMIN` data to Business Owner; API creation/update schemas prevent new duplicate admin personas while existing authorization logic remains compatible.

## Supported Product-Channel and Integration Boundary

`supported-integration-policy.ts` is the backend deny-by-default policy for operational feedback and connections. Native Manual Entry/Public Form feedback is operational; external feedback is operational only when source metadata identifies Live Gmail or Live WhatsApp. Normal inbox, customer, dashboard, Platform Administrator, and report queries compose that predicate with their existing tenant/role/deletion scope. The database enums, historical rows, QR records, and dormant connectors are intentionally retained for backward-compatible audit reads, but normal integration lifecycle APIs accept only Live Gmail and Live WhatsApp. The frontend mirrors labels/options in `supportedSources.ts`; it is a presentation aid, not the authorization boundary.

Gmail synchronization resolves the configured user label (default `Customer Feedback`) through the Gmail labels API and requires both that label and `INBOX`. Initial import uses a bounded dual-label message query; incremental history considers label/message additions and re-fetches each candidate to verify current labels. Standard automated/bulk/list headers and conservative sender patterns produce safe skipped synchronization items rather than Feedback. Eligible messages continue through the existing connector normalization and `FeedbackProcessingService` ingestion/deduplication path.

The integrations collection uses the shared persisted collection-view hook. Grid cards and the semantic desktop table/mobile stacked list consume the same connection/capability/action state. Gmail `Sync Now` invokes synchronization; WhatsApp `Sync Now` only re-fetches persisted connection/webhook activity because webhook ingestion is automatic.

All-matching feedback mutation selection is represented as validated filters plus `excludedFeedbackIds`. The backend rebuilds the authorized Business/Branch/soft-delete/supported-channel predicate and adds `id NOT IN` exclusions inside the same transaction. The frontend preserves exclusions across pages and derives every visible checkbox/count from that population, avoiding a client-only approximation.

## Final Product Hardening Architecture

Feedback management is layered onto the existing authenticated Business feedback router. `feedback-management.schemas.ts`, controller, and service define the Owner/Admin-only editable contract, transactional bulk operations, optimistic edit concurrency, status-transition reuse, human field-state ownership, and soft deletion. Selection can be explicit IDs or the existing validated inbox filter contract; every mutation still resolves the authenticated membership and fixes `businessId` server-side. Normal reads centralize `deletedAt: null`; physical Feedback, FeedbackIngestion, provider delivery/deduplication, activities, AI analysis, automation, and customer history remain intact.

`feedback-inbox.service.ts` is also the shared Branch-scope boundary for inbox lists/details, validated filters, summaries, and the real 30-day Staff dashboard. Owner/Admin/all-Branch memberships use all active Business Branches; restricted Manager/Staff memberships use only active assigned Branch IDs. The Business Overview switches between the existing owner report-backed model and this scoped dashboard without weakening backend authorization.

The customer workspace is a separate `/api/customer` and `/customer/*` vertical slice. Its backend derives ownership exclusively from the authenticated `CUSTOMER` user's email and linked Business Customer identities, selects a deliberately small safe projection, and never accepts a tenant/customer identity from the caller. Its frontend uses `CustomerShell`, the shared persisted collection-view hook, responsive dialogs, and existing public feedback routes rather than duplicating submission processing.

Existing integration adapters and synchronization/webhook pipelines are unchanged. The integrations UI maps provider capabilities to honest actions: Gmail retains synchronization, while webhook-driven WhatsApp refreshes persisted activity rather than calling a nonexistent sync operation. Desktop shell containers use a bounded viewport column with an independently scrolling navigation region; page content retains its own scroll context.

## Phase 29A Prisma ESM Runtime Boundary

The backend remains native ESM with TypeScript `NodeNext`. Prisma 6.19.3's `prisma-client-js` generator exposes a CommonJS runtime package even though its declarations describe named exports. Node's synthetic named-export inference is not a portable contract for generated enum names.

`backend/src/lib/prisma-runtime.ts` is the single runtime interoperability boundary. It default-imports the CommonJS package and destructures typed local ESM bindings for every generated enum, `Prisma`, and `PrismaClient`. Runtime consumers import those local bindings. Generated model/input/result/transaction types continue to use erased `import type` declarations from `@prisma/client`. Files that need both the Prisma type namespace and runtime helpers use `Prisma` for types and `PrismaRuntime` for values. This preserves strict generated typing while ensuring compiled modules never request generated named exports directly from the CommonJS package.

## Phase 28 Category and Responsive-Shell Architecture

- `DEFAULT_FEEDBACK_CATEGORIES` is the single backend catalog for the 13 initial Business-owned categories. Business Owner and Platform Administrator creation flows call the same transaction helper after creating the Business/primary Branch.
- `FeedbackCategory.businessId` remains the ownership boundary. Existing category services, workflow mutation, AI validation, automation definition validation, inbox filters, and report queries continue to scope category IDs to the Business; category names are not free-form AI output.
- Ingestion remains channel-normalized through `FeedbackProcessingService`. Category is nullable at creation; AI or human workflow may assign an existing active Business category afterward, and low-confidence/no-match feedback remains Uncategorized.
- All Feedback presentation uses a shared category badge projection in List/Grid; URL filtering maps the single visible `Uncategorized` choice to the existing `categoryState=uncategorized` query contract.
- The canonical showcase tenant retains ID `dev_seed_business_kigali_harvest`. Seed/reconciliation changes only known `dev_seed_*` rows and preserve relationship IDs, Live connections, credentials, and non-seed feedback.
- Authenticated shells use a fixed overlay plus `100dvh` flex column: header/footer are non-scrolling, navigation is the bounded scrolling region, and document scrolling is locked only while open. Public navigation continues through the shared `PublicLayout` used by Login/Register.

## Phase 27 UI Exposure and Reporting Boundaries

The Business Owner integration surface now has a single frontend exposure policy in `businessOwnerIntegrations.ts`. It permits only `LIVE` WhatsApp and `LIVE` Email with `GMAIL`; connection lists, provider cards, filters, histories, and create flows consume that policy. This is a presentation/tenant-product boundary, not a connector-registry deletion: Demo connectors, Outlook, Meta social providers, future provider adapters, stored connections, and Platform Administrator oversight remain available to their existing backend/internal consumers.

Business Owner reporting enforces the parallel boundary at query time. `IntegrationConnection`, `SynchronizationRun`, and related `IntegrationWebhookDelivery.connection` predicates require `IntegrationMode.LIVE`, combined with the existing authorized Business and optional default-Branch routing. Owner report documents therefore never receive Demo operational rows. No Platform Administrator report builder changed.

The owner overview consumes the existing tenant-authorized Business Report preview document for real 30-day metrics/charts rather than maintaining a second analytics contract. Public informational routing keeps `/` available after auth bootstrap and uses session-aware calls to the appropriate dashboard. Login/Register remain protected by `PublicOnlyRoute` but render inside the shared public shell. Pricing has no route or exported page.

## Phase 26A Context-Aware Export Branding and Provider Adoption

The shared Phase 25.4 report renderer remains the only PDF/CSV renderer. `AdminReportDocument.branding.reportSubtitle` is an optional constrained context field: Business Owner reports explicitly set `BUSINESS REPORTING`, while documents without an override retain the established `PLATFORM ADMINISTRATION` renderer default. The same context controls the visible PDF subtitle and safe PDF subject metadata. CSV emits the context row only when a document explicitly supplies it, preserving existing Platform Administrator CSV structure.

Business Owner Integration Adoption is a projection of the already authorized `IntegrationConnection` collection returned for the report's Business and optional `defaultBranchId` scope. `buildIntegrationAdoptionRows` counts connections by `IntegrationProvider` only and feeds the single shared report section used by Preview, PDF tables, PDF visual summary, and CSV. Connection mode is intentionally excluded from this summary key but remains present on each row in the independently constructed Integration Connections detail section. Platform Administrator adoption continues to use its established Provider + Mode semantics and was not changed.

## Phase 26 Business Owner Comprehensive Reporting

Business Owner reporting is a tenant-scoped consumer of the shared Phase 25.4 reporting pipeline, not a separate engine. The new `business-reports` module exposes `POST /api/businesses/:businessId/reports/preview` and `POST /api/businesses/:businessId/reports/export` under the existing authenticated `businessRouter`. Authorization is resolved per request from the route business plus the authenticated session: the caller must be a platform `BUSINESS_OWNER` with an active membership in an active Business. `resolveOwnerReportAccess` never trusts a body `businessId` (the strict schema rejects one), and `resolveOwnerReportBranch` only accepts branches that belong to the authorized Business.

The builder reuses `createFeedbackScopePlan` from `platform-admin.reports.ts` to produce one canonical feedback scope for lifetime, current-period, and previous-period windows. The authorized Business is always fixed; Branch, Channel, Workflow Status, and Sentiment flow through the same plan consumed by every feedback KPI, distribution, trend query, assignment/status grouping, important-feedback selection, and previous-period comparison. Open/Completed derive from the scoped workflow distribution and Assigned/Unassigned from the scoped assignee distribution, so partition totals reconcile against the filtered feedback count.

Shared helpers exported from the Platform Administrator reporting module power the owner document: `queryFeedbackTimeSeries` (parameterized database-side trend buckets), `sentimentDistributionRows`, `percentage`, `countMap`/`countValues`, `summarizeFeedbackWorkflow`/`summarizeFeedbackAssignment`, `selectImportantFeedbackText`, `classifyIntegrationHealth`, `createReportComparison`, `providerLabel`, the human-readable integration/run/webhook summaries, and the `integrationHealthSelect` projection. The owner report reuses the exact section titles and column shapes the shared PDF renderer projects (Important customer experience feedback, Integration connections, Recent integration activity, Recent webhook activity, Recent automation execution state), so the measured wrapping/projection behavior applies unchanged. CSV retains full columns and ISO timestamps.

Scope semantics follow persisted relations. Under a Branch filter, feedback/trend/distributions and branch-scoped users respect `Feedback.branchId`, integrations and their synchronization/webhook activity respect `IntegrationConnection.defaultBranchId`, and AI/automation activity respects the feedback branch relation. Customer profiles and branch inventory have no branch ownership relation and remain explicitly labeled business-wide. The document's `scope.metrics` classification marks each domain accordingly. The Management Summary is a deterministic pure function of the built metrics with unique/tied/empty channel handling; no external AI is called. Platform-level API/database health, approval workload, CPU/RAM/uptime, and other-tenant data are intentionally absent from the owner report.

## Phase 25.4D Operations Report Presentation Pipeline

The Operations builder remains the single owner of persisted queries, derived metrics, health classification, comparison math, and the full safe report document. Browser Preview reads the document's existing comparison array into a dedicated five-column table; no frontend comparison query or recalculation exists. Shared display normalization now includes the single-token `DRAFT` enum while preserving known initialisms and opaque non-enum strings.

The PDF renderer adds a presentation-plan boundary for tables. Default sections retain their established layout, while the four wide Operations detail sections project the same safe source rows into narrower PDF-only column sets with explicit proportions, measured wrapping, section-aware semantic columns, bounded excerpts, and concise UTC timestamps. CSV bypasses those presentation plans and serializes the complete shared document, preserving every original column and ISO timestamp. PDF page preflight, repeated headers, footer counting, and the no-footer-only-page invariant remain shared renderer responsibilities. No renderer calculates or mutates report metrics.

## Phase 25.4C Canonical Feedback Report Scope

The Feedback & Customer Experience builder creates `FeedbackScopePlan` once for each lifetime, current-period, and previous-period window. Each plan owns the exact Business, Branch, Channel, Workflow Status, Sentiment, and optional date filters in both its Prisma predicate and parameterized trend-query values. The current document's KPIs, customer representation, trends, business/branch/channel/workflow/category/priority/sentiment/rating distributions, assignment workload, important-feedback selection, summary, and comparison therefore originate from one canonical scoped population. Derived predicates use explicit `AND` intersections instead of object spreads that can replace a selected filter.

Open and Completed are projections of the canonical workflow distribution (`NEW`/`IN_REVIEW` and `RESOLVED`/`CLOSED`), and Assigned/Unassigned are projections of the canonical assignee distribution. This makes their partition totals auditable against the filtered feedback count and prevents a Workflow Status filter from being overwritten. Management Summary is a pure function of the built document metrics and deterministically handles all maximum-count channel ties without querying separately.

The shared document carries the full safe normalized important-feedback message and complete trend rows. Presentation layers differ only deliberately: browser Preview samples the most recent 12 chronological trend rows and bounds long message display; PDF retains every supported trend row and applies a 220-character safe excerpt with measured multi-line row geometry; CSV retains full trend rows and the full safe normalized message. No renderer recalculates report metrics.

## Phase 25.4B PDF Flow and Display Formatting

The shared PDFKit renderer defines one canonical content rectangle per A4 page: `contentLeft`, `contentRight`, `contentWidth`, `contentTop`, and `contentBottom`. Normal text helpers never inherit `doc.x` or an implicit prior width. Section headings/descriptions, tables, KPI cards, comparison rows, and visual summaries use explicit geometry, and each helper restores the flow cursor to `contentLeft` with a known Y value before returning. Layout diagnostics exercise the same renderer and record section origins, helper exits, comparison columns, and section/content page grouping.

Every major section measures its heading, complete optional description, and meaningful initial content before drawing. If that block does not fit above `contentBottom`, the renderer adds a page first. Tables repeat their header after an internal page break. Previous-period comparison is a dedicated five-column grid with fixed proportional columns and measured row height rather than continued inline text.

`platform-admin.report-format.ts` remains the single backend report display formatter used by the report builder, Preview document, PDF renderer, and CSV renderer. Generated summaries/filters/provider labels call it before document construction, while section table values are normalized at the shared document boundary. Initialism-aware token formatting preserves QR, AI, API, CSV, PDF, SMS, URL, IP, and OAuth without changing stored enums or opaque identifiers.

## Phase 25.4A Report Export and Scope Consistency

`AdminReportDocument.scope` is the single presentation contract for report level, natural scope label, explanatory notes, and per-domain classification (`PLATFORM_WIDE`, `BUSINESS_SCOPED`, `BRANCH_SCOPED`, or `BUSINESS_ONLY_NOT_BRANCH_SCOPABLE`). Preview, PDF, and CSV consume the same built document; renderers do not recalculate query scope. Explicit display normalization is also shared so safe report enums render consistently in all formats.

Executive scope follows persisted relations: Feedback owns `branchId`; BusinessMembership reaches Branch through `allBranchesAccess` or `MembershipBranchAccess`; IntegrationConnection has business ownership plus required `defaultBranchId` routing; Customer belongs only to Business; and Business lifecycle has no Branch relation. Consequently a Branch-filtered Executive report branch-scopes feedback, trends/distributions, branch counts, membership-access users, and routed integrations, while labeling Customer profiles and lifecycle/approval context as business-wide. Business adoption uses the same filtered relations rather than a separate whole-business aggregate.

The PDF renderer buffers pages, records the content-page range, and writes fixed-position footers into those existing pages. Because PDFKit normally treats the reserved bottom margin as a text-flow boundary, footer drawing temporarily sets only the current page's bottom margin to zero, then restores margin and cursor state. A postcondition rejects any physical page-count change. Tests parse the produced PDF object graph and content streams rather than relying on byte length.

## Phase 25.4 Supervisor-Focused Reporting Consolidation

Phase 25.4 retains the protected `/api/admin/reports/preview` and `/api/admin/reports/export` request/response architecture while replacing the nine fragmented report contracts with exactly three report types: `EXECUTIVE_PLATFORM`, `FEEDBACK_CUSTOMER_EXPERIENCE`, and `OPERATIONS_SYSTEM_HEALTH`. `platform-admin.reports.ts` owns the report catalog, common context/entity validation, UTC period/previous-period windows, filter labels, scoped feedback predicates, parameterized database-side time buckets, comparison math, deterministic summaries, and three dedicated builders. The existing PDF/CSV renderer remains shared.

Executive combines adoption, user access, feedback/channel/workflow/sentiment, and integration information at management level. Feedback & Customer Experience combines feedback intelligence, channel, workflow, category/priority/assignment, ratings, AI completion, sentiment, and bounded important-feedback detail. Operations & System Health combines the existing real database/API probe with connection health, synchronization, webhook, AI, automation, and business-approval state. It explicitly does not claim CPU, RAM, server uptime, or worker heartbeat telemetry.

The report document now carries a deterministic Management Summary, richer previous-period items (`current`, `previous`, absolute change, nullable percentage, and `No prior baseline` display), explicit empty-section messages, and optional sentiment/health semantics. Preview, PDF, and CSV consume the same document. PDF keeps fixed Indigo branding and adds semantic state colors; CSV keeps safe escaping and a UTF-8 BOM. Reports remain on-demand, non-persisted, maximum-366-day, `PLATFORM_ADMIN`-only artifacts. No Prisma model, migration, seed, provider call, or separate report-storage system is introduced.

## Phase 25.3 UI and Theme Correction

Phase 25.3 retains the Phase 25.2 backend governance architecture and corrects presentation architecture. Fixed Indigo CSS variables in `frontend/src/styles.css` are the only core UI color source; persisted `primaryColor` and `accentColor` fields are deprecated compatibility data and are normalized to Indigo by the settings service. `PlatformSettingsProvider` owns fetched/saved settings, exposes a monotonically increasing revision for every fetch/save, and wraps the single `ThemeProvider`. The theme provider uses cached platform appearance only for first paint, then the server setting is authoritative; it applies the root `dark` class/color scheme, follows `prefers-color-scheme` for System, removes the legacy personal-theme key, and clears any visible session-only toggle override on every settings revision.

Reusable `AdminDetailModal`, detail section/field/stat/technical components, `DangerZone`, and `ConfirmActionModal` build on Radix Dialog. User, feedback, and integration cards remain independent summaries while modal portals own details and actions. Business Details uses a profile header, action popover, confirmation modal, compact KPIs and collections. Reporting uses a responsive four-column desktop configuration and compact pre-preview summary. `/admin/platform-health` is canonical; `/admin/system-health` remains a guarded compatibility redirect while the existing backend endpoint is unchanged.

## Phase 25.2 administration, approval, and design architecture

- Business lifecycle is modeled on `Business.status`: new businesses default to `PENDING`, and Platform Administrator-only transition logic permits only explicit state edges among `PENDING`, `ACTIVE`, `SUSPENDED`, `REJECTED`, and `ARCHIVED`.
- Tenant base context may be read for a non-active business solely to render its restricted-state experience. All operational module boundaries require `BusinessStatus.ACTIVE`; public ingestion and connector processing keep their existing active-business requirements.
- Platform Administrator mutations use dedicated protected routes and append safe `PlatformAdminActivity` records. Feedback oversight is read-only. Integration oversight never selects credentials; Live disconnect remains on the tenant connector lifecycle because that path performs provider authorization revocation and credential cleanup.
- Global design derives from fixed Indigo semantic Tailwind/CSS tokens. `PlatformSettingsProvider` supplies safe identity/content settings and the authoritative Light/Dark/System appearance; deprecated stored colors cannot recolor the UI or reports. Hardcoded state colors are reserved for semantic success/warning/error/channel distinctions.
- Effective appearance resolves in one pure precedence function: personal explicit Light/Dark, platform default, then OS preference when the platform default is System. The platform settings provider remains above the theme provider.
- Root routing waits for authentication bootstrap, redirects authenticated users by role, and otherwise renders the public homepage. Public informational routes remain outside authentication guards, while Login/Register retain `PublicOnlyRoute`.
- Phase 25.1 collection-view route coverage, defaults, exceptions, and per-route local persistence remain unchanged.

## Phase 25.1 UI and platform-branding architecture

The frontend has one shared collection-view layer under `src/components/collection-view`. Pure policy decides the unsaved default from the large-screen media query and item count; the hook stores only a validated `list` or `grid` value under a page-specific local-storage key; the accessible toggle is presentation-only and never calls the API. Supported routes compose their existing row/card renderers around this layer. Chronological, dashboard, report-document, security-control, and fixed-provider surfaces remain deliberately specialized as recorded in `PHASE_25_1_RESPONSIVE_COLLECTION_AUDIT.md`.

Global branding uses one `PlatformSettingsProvider` above `ThemeProvider`. It reads the public safe settings once, exposes current values through React context, and supplies the authoritative platform appearance. The theme provider removes the obsolete personal preference, uses only a platform-appearance cache for first paint, follows the OS only in System mode, and reapplies every fetched or saved revision immediately. The administrator settings page updates the protected API and then the same context, avoiding duplicated per-page state. Shared light/dark CSS tokens remain fixed to the Indigo design system.

The backend persists a singleton `PlatformSettings` row with fixed ID `platform`. Public reads select only branding fields. Administrator reads/updates share that safe projection, while updates record the authenticated updater ID internally. The protected routes reuse the Phase 25 `platform-admin` module and its global `PLATFORM_ADMIN` middleware boundary.

## Phase 25 Platform Administrator Dashboard & Reporting

Phase 25 introduces a dedicated `platform-admin` backend module mounted at `/api/admin` behind the existing authentication middleware and `requirePlatformAdmin`. It aggregates directly with Prisma counts/grouping and bounded MySQL date-bucket queries rather than returning full feedback datasets to the frontend. Integration health is derived from `IntegrationConnection` status, reauthorization, webhook, connection-test, and safe error fields; system health uses a database probe plus persisted AI, automation, synchronization, and webhook states. It does not invent CPU, memory, uptime, or worker heartbeat telemetry.

The frontend keeps the Business Owner workspace unchanged and uses a Platform Administrator-only shell for `/admin`, `/admin/businesses`, `/admin/users`, `/admin/feedback`, `/admin/integrations`, `/admin/reports`, and `/admin/system-health`. Recharts provides responsive line, bar, stacked-bar, donut, legends, and tooltips with accessible text summaries. PDFKit generates server-side branded PDF documents; CSV is generated server-side from the same report document model.

Reports are on-demand request/response artifacts. No report-history table, file-storage model, blob storage, scheduled report worker, or migration was added. All report queries remain platform-admin authorized, accept a maximum 366-day window, and apply supported business/branch/channel/status/sentiment filters before aggregation.

## Overview

The SME Multi-Channel Customer Feedback Aggregator is organized as a two-application npm workspace:

- `backend`: Node.js, Express, TypeScript, Prisma, and MySQL.
- `frontend`: React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, and Axios.

The repository keeps backend and frontend concerns separate while sharing root-level quality tooling.

## Frontend Architecture

The frontend is a React single-page application. It uses a feature-based structure under `frontend/src/features`, with shared application setup under `frontend/src/app`.

Current Phase 1 frontend areas:

- `src/app/providers`: application-wide providers such as TanStack Query.
- `src/app/theme`: global class-based light/dark theme provider, theme toggle support, and persisted theme state.
- `src/app/router`: React Router configuration.
- `src/api`: reusable Axios client.
- `src/features/health`: real API and database health checks.
- `src/features/auth`: Phase 2A login, registration, account, route guards, hooks, schemas, and auth API calls.
- `src/features/public`: public marketing and legal website pages, shared public layout/navigation/footer, metadata helper, public cards, previews, calls to action, contact form UI, and legal-page UI.
- `src/features/businesses`: business workspace, branches, staff, invitations, platform-admin business oversight, and the Phase 5 authenticated manual-feedback page.
- `src/store/authStore.ts`: stores only the safe authenticated user and initial auth-check state.
- `src/components`: reserved for future shared layout, shared, and UI components.

Future features should keep API calls, hooks, components, pages, types, and validation close to the feature that owns them.

## Backend Architecture

The backend is an Express REST API with application creation separated from server startup:

- `src/app.ts` creates and configures the Express app.
- `src/server.ts` starts the HTTP server and manages shutdown.

Backend modules are feature-based. Each future module should keep its own:

- Routes
- Controllers
- Services
- Validation schemas
- Types
- Constants
- Repositories when persistence logic becomes complex

Current Phase 1 backend module:

- `src/modules/health`: API and database health routes, controller, and service.

Current public legal backend module:

- `src/modules/legal/legal-pages.ts`: static, responsive, dependency-free HTML documents for the Privacy Policy, Terms of Service, and User Data Deletion Instructions.
- `src/modules/legal/legal.routes.ts`: unauthenticated root-level `GET /privacy`, `GET /terms`, and `GET /data-deletion` routes mounted by `src/app.ts` before authenticated API routers and the final not-found handler.
- The legal module imports no Prisma client or integration service, performs no database query, and does not depend on the frontend SPA. This allows the existing port-5000 Cloudflare tunnel to expose the required Meta application URLs directly.

Current Phase 2A backend module:

- `src/modules/auth`: email/password registration, login, refresh, logout, current user, session listing, and session revocation.
- `src/middleware/auth.middleware.ts`: verifies the HttpOnly access-token cookie and confirms the database session and user are still active.
- `src/middleware/role.middleware.ts`: reusable server-side role authorization for future protected modules.

Current frontend authenticated landing behavior:

- `frontend/src/features/auth/authRedirects.ts` owns the default authenticated destination map.
- Default login, Google login, Google registration, public-only route fallback, root/error redirect fallback, and unauthorized role-guard fallback send platform administrators to `/admin/businesses`, business owners and staff through `/business`, and customers to `/account`.
- Protected-route `from` redirects are preserved so a user who is asked to sign in before opening a protected URL returns to that original URL after login.
- `/business` remains the business-membership-aware frontend entry point; it chooses the stored or first accessible business, redirects business owners without a business to setup, and otherwise shows the no-access state.

Current Phase 2B backend auth additions:

- `src/modules/auth/google-auth.service.ts`: verifies Google ID credentials with Google's official Node.js library and implements Google registration, Google login, and explicit account linking.
- `src/modules/auth/google-auth.types.ts`: keeps the verified Google identity shape narrow and safe.
- Google auth uses the same auth controller, route, service, cookie, token, session, response, and error patterns as Phase 2A.

Current Phase 2C backend auth additions:

- `src/lib/email.service.ts`: provider-independent SMTP email delivery through Nodemailer.
- `src/modules/auth/account-token.service.ts`: cryptographically random account-token generation, SHA-256 hashing, expiry calculation, and same-purpose invalidation.
- `src/modules/auth/auth-email.templates.ts`: professional HTML and plain-text email verification and password-reset templates.
- `src/modules/auth/auth-cleanup.service.ts`: reusable cleanup for expired account tokens and old expired/revoked sessions.
- Phase 2C endpoints are implemented in the existing auth controller, route, validation, and service modules.

Current Phase 4 backend module:

- `src/modules/feedback-processing`: internal domain service for receiving normalized feedback input, validating existing business/branch records, normalizing content/contact data, hashing the canonical payload, enforcing idempotency/external-source uniqueness, storing feedback transactionally, storing attachment metadata, and returning a stable processing result.
- `src/scripts/simulate-feedback-processing.ts`: local manual-verification helper that reuses the real service and defaults to dry-run validation unless `--commit` is supplied. It can pass attachment metadata through the same normalized input schema and has a local-only failed-ingestion simulation path for manual verification.

Phase 4 intentionally adds no public route, staff manual-entry route, webhook route, controller, inbox UI, public form, QR flow, customer profile, AI, report, notification, or external connector.

Current Phase 5 backend module:

- `src/modules/manual-feedback`: first real connector for authenticated staff-entered feedback. It owns the manual-entry request schema, `ManualFeedbackSourceAdapter`, service orchestration, controller, and route for `POST /api/businesses/:businessId/feedback/manual`.
- The route is mounted under the existing authenticated business router and applies a focused manual-feedback rate limiter before processing.
- The module validates a required `Idempotency-Key` header, rejects conflicting body-controlled internal fields through a strict request schema, enforces active business membership and branch access, maps trusted actor IDs into limited source metadata, and calls the real Phase 4 `feedbackProcessingService.process(input)`.
- Phase 5 backend does not add inbox pages, workflow updates, customer profiles, AI, reports, notifications, external-provider calls, file storage, or a database migration.

Current Phase 5 frontend page:

- `frontend/src/features/businesses/ManualFeedbackPage.tsx`: protected business-workspace page for `/business/:businessId/feedback/manual`.
- The page uses the existing `WorkspaceShell`, workspace panels, theme tokens, TanStack Query, React Hook Form, Zod, and Axios client. It does not create a second workspace shell or theme system.
- The layout follows the approved Phase 5 references: six numbered form sections, a right-side submission summary, a privacy/security panel, loading/empty/validation/success/duplicate states, and mobile stacking.
- The frontend generates the required `Idempotency-Key` header per submission and posts to the existing Phase 5 backend endpoint. It does not store JWTs, upload files, create customers, expose inbox/workflow screens, or bypass backend tenant checks.

Current business setup frontend behavior:

- `/business/setup` uses React Hook Form and the local business setup Zod schema before calling `POST /api/businesses`.
- Required setup labels display visible `*` markers, every setup field has a placeholder, and frontend validation mirrors backend requirements for primary branch code, optional primary branch phone, and optional primary branch email.
- The backend remains authoritative for request validation and owner/business creation.

Current branch form frontend behavior:

- `/business/:businessId/branches/new` and `/business/:businessId/branches/:branchId/edit` use the shared branch form with React Hook Form and the local branch Zod schema before calling the existing branch create/update APIs.
- Required branch labels display visible `*` markers, every branch field has a placeholder, and the form/action layout stays responsive at mobile, zoomed, and wider workspace widths.
- Backend branch validation, owner/admin authorization, and tenant checks remain authoritative.

Current customer form frontend behavior:

- `frontend/src/features/businesses/CustomerFormModal.tsx` is shared by customer creation, customer editing, and inbox create-from-feedback workflows.
- The modal uses React Hook Form with ref-forwarding field inputs, placeholders on every field, and a minimum-identity validation requiring at least one of display name, first name, last name, email, or phone.
- Backend customer validation and tenant/branch access checks remain authoritative.

Current shared frontend UI primitives:

- `frontend/src/components/ui/select.tsx` and `frontend/src/components/ui/popover.tsx` provide local shadcn-style wrappers around Radix UI primitives using the existing Tailwind theme tokens.
- `frontend/src/components/ui/select-field.tsx` provides the shared app-level select field used in place of native `<select>/<option>` controls while preserving string values for forms, URL filters, and mutation inputs.
- `frontend/src/components/ui/date-picker.tsx` provides the shared app-level popover calendar/date-time field used in place of native date and datetime-local inputs while preserving `YYYY-MM-DD` filter values and `YYYY-MM-DDTHH:mm` feedback occurrence values.
- The Feedback Inbox uses these primitives for its compact primary filter toolbar and advanced filter popover while preserving URL-backed Phase 12 filter state and backend query contracts.
- The Customer list uses the same primitives for a compact primary filter toolbar and advanced filter popover while preserving URL-backed Phase 12 customer query contracts.
- Shared select values are constrained to a single truncated line so long enum labels do not force cramped controls to grow vertically on responsive workspace pages.
- The shared business `WorkspaceShell` keeps header tools and page actions in a flex row on tablet/desktop where space allows, uses a tighter active-business selector width, and stacks controls cleanly on mobile without changing route or query behavior.
- The shared business `WorkspaceShell` and account `AccountShell` use normal page-level desktop scrolling so sidebars and content move together. Sidebar Sign out actions reuse the existing logout mutation and redirect behavior.
- The account portal mobile menu opens a fixed drawer with the same account navigation and Sign out action. The Phase 25 platform admin shell has its own responsive/collapsible sidebar with a bottom Sign out action.

Current Phase 6 backend module:

- `src/modules/public-feedback`: public feedback portal management and anonymous submission connector.
- Authenticated settings routes are mounted under `/api/businesses/:businessId/public-feedback` and require active Owner/Admin `BusinessMembership`; platform administrators do not bypass membership rules.
- Public routes are mounted under `/api/public/feedback/:portalToken` and never require login or business cookies.
- The module owns secure portal token generation, enable/disable behavior, link regeneration, safe public configuration, public request validation, honeypot handling, public rate limiting, branch validation, and `PublicFeedbackSourceAdapter`.
- `PublicFeedbackSourceAdapter` maps public submissions into the Phase 4 `NormalizedFeedbackInput` contract with `FeedbackChannel.PUBLIC_FORM`. It does not directly insert feedback rows and does not add attachment, customer-profile, QR, inbox, workflow, notification, report, AI, or external-integration behavior.

Current Phase 7 backend additions:

- QR management is implemented inside `src/modules/public-feedback` through `public-feedback-qr.*` files.
- Authenticated QR routes are mounted under `/api/businesses/:businessId/public-feedback/qr-codes` and use active `BusinessMembership` as the authority. Owner/Admin members can create, rename, regenerate, and disable QR codes. Managers can view QR codes scoped to assigned branches; all-branch managers can also view business-wide QR codes. Staff and platform administrators without membership are blocked.
- Public QR routes are mounted under `/api/public/feedback/qr/:qrToken` and never require login.
- `PublicFeedbackQrCode.publicToken` is a cryptographically random server-issued token used only for customer QR URLs. The backend does not trust business IDs, branch IDs, or QR IDs from public query parameters.
- `PublicFeedbackQrCode.portalTokenFingerprint` stores the SHA-256 fingerprint of the current Phase 6 public portal token. Regenerating the Phase 6 portal token invalidates existing QR codes until each QR code is regenerated. Disabling and re-enabling the portal without token regeneration preserves matching active QR codes.
- `QrFeedbackSourceAdapter` maps trusted QR context into the Phase 4 normalized contract with `FeedbackChannel.QR_CODE`, bounded `sourceType=qr-code` metadata, required `Idempotency-Key`, and server-enforced branch locking for branch-specific QR codes.
- Phase 7 reuses the Phase 4 processing service for normalization, hashing, database-backed idempotency, duplicate detection, conflict detection, transactional persistence, and failed-ingestion safety.

Current Phase 6 frontend pages:

- `frontend/src/features/businesses/PublicFeedbackSettingsPanel.tsx`: workspace settings section for Owner/Admin portal management.
- `frontend/src/features/public-feedback/PublicFeedbackPage.tsx`: anonymous public route at `/feedback/:portalToken`.
- The public page uses a separate unauthenticated Axios client with `withCredentials=false`, React Hook Form, Zod, the existing theme system, and a stable per-submission idempotency key that is regenerated only for a new intended submission or after the form changes following a failed attempt.
- Public feedback headers use a safe business-brand avatar component: a real business logo is shown only when a non-empty URL loads successfully, otherwise an initials fallback is displayed across form, success, and duplicate states.
- The public route is outside protected workspace guards and shows safe loading, unavailable, validation, success, duplicate, rate-limit, conflict, processing, and network states.

Current Phase 7 frontend pages:

- `frontend/src/features/businesses/QrCodesPage.tsx`: protected workspace page at `/business/:businessId/feedback/qr-codes`.
- The page uses the existing `WorkspaceShell`, business context queries, branch queries, TanStack Query, React Hook Form, Zod, theme tokens, and workspace components. It adds the Feedback navigation item `QR Codes` without redesigning the sidebar.
- The QR records list uses a horizontally scrollable desktop table with a sticky right-side Actions column, then switches to stacked QR cards below the desktop breakpoint so copy/open/download/print/regenerate/disable controls remain reachable without page overflow.
- QR images are generated in the browser with `qrcode` from authorized backend-provided public URLs. Preview, PNG download, and print presentation are frontend-only; QR image bytes are not uploaded to the backend.
- `/feedback/qr/:qrToken` reuses `PublicFeedbackPage` and the Phase 6 public form behavior. QR mode selects the QR public endpoints and uses `fixedBranchId` from the QR configuration to initialize React Hook Form, hide the editable branch selector, show a read-only locked branch field, and submit the fixed branch ID internally for branch-specific QR codes.

## Phase 9 Feedback Workflow Module

Phase 9 adds feedback status tracking, internal notes, and an activity timeline to the existing Phase 8 unified inbox.

### Backend Module

- `backend/src/modules/feedback-workflow/`: dedicated module with types, schemas, service, controller, routes, and errors.
- Routes are mounted under `/api/businesses/:businessId/feedback` after the Phase 8 inbox router.

### Status Model

- `Feedback.status`: a `FeedbackStatus` enum field on the existing `Feedback` model.
- Four status values: `NEW`, `IN_REVIEW`, `RESOLVED`, `CLOSED`.
- All existing feedback is backfilled to `NEW` via the Phase 9 migration.
- Status is displayed as a color-coded badge in the inbox list and detail drawer.

### Controlled Status Transitions

The system enforces an explicit allowlist of valid transitions:

- `NEW` → `IN_REVIEW`, `RESOLVED`
- `IN_REVIEW` → `NEW`, `RESOLVED`
- `RESOLVED` → `IN_REVIEW`, `CLOSED`
- `CLOSED` → `IN_REVIEW`

Rejected transitions:

- Same-status updates (HTTP 400)
- `NEW` → `CLOSED`, `IN_REVIEW` → `CLOSED`, `RESOLVED` → `NEW`, `CLOSED` → `NEW`, `CLOSED` → `RESOLVED`

### Atomic Conditional Status Updates

Status updates use optimistic concurrency inside a Prisma transaction:

1. Re-read feedback inside the transaction.
2. Validate the requested transition against the current status.
3. Call `feedback.updateMany` with both `id` and `status = currentStatus` in the WHERE clause.
4. If `count === 0`, throw HTTP 409 conflict.
5. Read back the updated feedback with `findUniqueOrThrow`.
6. Create a `STATUS_CHANGED` `FeedbackActivity` in the same transaction.
7. Return the updated feedback and activity.

### Internal Notes

- Append-only private notes stored as `FeedbackActivity` records with `type: NOTE_ADDED`.
- Visible only to authorized business members.
- Plain text, maximum 2000 characters, required after trimming.
- Cannot be edited or deleted.
- Never exposed through public APIs or logged in full.

### Activity Timeline

- Stored activities: `STATUS_CHANGED`, `NOTE_ADDED`.
- Synthetic `FEEDBACK_RECEIVED` item derived from `Feedback.createdAt`, always included in activity responses.
- Actor derived from authenticated `BusinessMembership`.
- Ordered newest-first, max 200 items.
- Tenant-safe and branch-aware.

### Frontend Integration

- `WorkflowPanel` component inside the existing `DetailContent` in the feedback detail drawer.
- `ActivityRow` component for rendering individual timeline items.
- Status mutation with `useMutation` and TanStack Query cache invalidation.
- Note form with `useMutation`, character counter, and append-only enforcement.
- Activity query with `useQuery` and synthetic item display.
- Available transitions computed from the current status and refreshed after mutation via `queryClient.refetchQueries`.
- The feedback detail drawer is rendered from `FeedbackInboxPage` through a React portal mounted on `document.body`. This keeps the drawer and backdrop in a viewport-level stacking context outside the workspace shell, table, max-width wrapper, and overflow-hidden workspace card. The drawer is a fixed right-side panel with full viewport height, a non-scrolling header, an internal scrolling body, body-scroll locking while open, and the existing `feedbackId` URL query state for refresh/back/forward behavior.

## Phase 10 Assignment, Categories, and Priorities

Phase 10 extends the Phase 8 inbox and Phase 9 workflow without introducing customer profiles, replies, AI, reports, analytics dashboards, or external integrations.

### Backend Modules

- `backend/src/modules/feedback-categories/`: business-scoped category CRUD, activation/deactivation, Zod validation, tenant membership checks, and owner/admin management enforcement.
- `backend/src/modules/feedback-workflow/`: extended with assignment, eligible-assignee, category, and priority workflow routes mounted under `/api/businesses/:businessId/feedback`.
- `backend/src/modules/feedback-inbox/`: extended list/detail responses and filters for assignee, category, and priority.

### Data Model

- `Feedback.priority` stores `LOW`, `NORMAL`, `HIGH`, or `URGENT`, defaulting to `NORMAL`.
- `Feedback.assignedToMembershipId` points to a `BusinessMembership` with `onDelete: SetNull`.
- `Feedback.categoryId` points to a `FeedbackCategory` with `onDelete: SetNull`.
- `FeedbackCategory` belongs to one business, has a business-scoped unique name, stores optional description/color key, and supports active/inactive state.
- `FeedbackActivity` now stores assignment/category/priority audit snapshots through `fromValue` and `toValue`.

### Workflow Rules

- Owner/admin/manager can assign accessible feedback to any active member eligible for that feedback branch.
- Staff can self-assign unassigned feedback they can access, unassign themselves, and update their own assigned feedback within existing branch scope.
- Inactive or branch-ineligible historical assignees/categories can remain visible on existing feedback but are not offered as new selectable targets.
- Category management is owner/admin-only; category read endpoints are still membership-protected and non-managers see active categories only.

### Frontend Integration

- `FeedbackInboxPage` adds assignee, category, and priority filters to URL state and TanStack Query keys.
- Inbox table/cards render assignee, category, and priority badges.
- Detail workflow controls mutate assignee, category, and priority, then refresh inbox/detail/activity queries to avoid stale UI.
- Assignment, category, and priority controls remain inside the portal-mounted feedback detail drawer and use the drawer's internal scroll region rather than page/body scrolling.
- Business Settings includes category management using existing workspace components, with read-only active category visibility for non-managers.

## Phase 11 Customer Profiles

Phase 11 Customer Profiles is implemented as a business-scoped profile layer linked to feedback history while preserving immutable submitted customer snapshots.

### Existing Customer Data Boundary

The system still stores submitted customer data on each feedback record as immutable feedback snapshots:

- `Feedback.customerName`
- `Feedback.customerEmail`
- `Feedback.customerPhone`

These fields represent what a source submitted at the time feedback was created. `Customer` profile edits do not replace, overwrite, hide, or mutate those fields.

Public form and QR follow-up consent remains bounded source metadata, not a durable customer-level preference. Phase 11 does not add profile-level follow-up consent or preferred contact method fields.

### Implemented Phase 11 Architecture

Phase 11 introduces `CustomerStatus`, a business-scoped `Customer` model, `CustomerActivityType`, `CustomerActivity`, and an optional `Feedback.customerId` relation while preserving the Phase 4 processing architecture:

```text
source adapter
-> NormalizedFeedbackInput
-> FeedbackProcessingService
-> Feedback persistence with immutable snapshot fields
-> optional customer matching/linking service
-> nullable Feedback.customerId
```

Customer matching and linking is owned by `backend/src/modules/customers`. Adapters do not insert customers or update `Feedback.customerId` directly.

Implemented high-level behavior:

- Customer belongs to a `Business`, not a branch.
- Feedback remains branch-scoped and can link to one customer.
- Owners/admins can view business-wide customer profile history.
- Managers/staff can view only feedback history and aggregates from branches they can access.
- Profile-level counts, latest feedback dates, ratings, branch distributions, and channel distributions must be branch-filtered for restricted users.
- Existing unlinked feedback remains valid and no historical backfill was performed.
- Anonymous feedback remains unlinked unless a member manually links it later.
- Profile edits never update old feedback customer snapshots.
- Ingestion customer matching is non-blocking; feedback persistence still succeeds if customer matching fails.

### Implemented Phase 11 Frontend Shape

Use the existing business workspace conventions:

- Added a `Customers` workspace navigation item.
- Added `/business/:businessId/customers` for customer list.
- Added `/business/:businessId/customers/:customerId` for full profile detail.
- Kept inbox detail drawer snapshot customer fields visible as historical submission data.
- Added linked-customer state, `View Customer`, `Find / Link Customer`, `Create Customer from Feedback`, change, unlink, and possible-match indicators in the existing feedback drawer.

### Matching Boundary

Safe automatic linking should be limited to deterministic identity signals:

- One active customer in the same business with matching normalized email.
- One active customer in the same business with matching normalized phone.
- Matching email and phone on the same customer.

Human review should be required for multiple matches, conflicting email/phone matches, exact-name-only matches, provider-specific identity hints, and duplicate-looking records. Fuzzy name matching and irreversible profile merge should not be automatic in Phase 11.

## Phase 12 Search and Filters

Phase 12 Full Search and Filters is implemented across the Unified Feedback Inbox, Customer list, and Customer feedback history.

The implementation keeps the existing business workspace shape and avoids a new search service. Each affected route remains owned by its current module:

- `backend/src/modules/feedback-inbox` owns inbox search, inbox filters, summary behavior, and feedback detail URL state.
- `backend/src/modules/customers` owns customer list search/filters and customer feedback-history search/filters.
- Existing branch, membership, and feedback-category endpoints continue to provide filter options, with assignee membership option loading tightened for branch-restricted users.
- Frontend pages keep search/filter state in URL query parameters and include that state in TanStack Query keys.
- The Feedback Inbox presents the dense Phase 12 filter set as a compact toolbar plus advanced popover; no filter parameter or backend behavior is removed.
- The Customer list presents common filters in a compact toolbar and secondary filters in an advanced popover; its desktop table is reserved for wider viewports and stacked cards remain available on narrower or zoomed layouts.

Implemented query behavior:

- Search text is normalized through `backend/src/utils/search-normalization.ts` by trimming, collapsing whitespace, removing null bytes, capping length, lowercasing email-like input, and deriving phone-normalized candidates when possible.
- Inbox date filters and newest/oldest sorting use user-facing `receivedAt` semantics, not `createdAt`.
- Customer list `latestFeedback` sort uses branch-safe linked feedback aggregates rather than Customer `updatedAt`.
- Customer feedback history has URL-backed pagination, search, filtering, and sort rather than loading a fixed first page only.
- Frontend active-filter chips are derived from URL state and remove only their own filters.

Phase 12 should not introduce global search, full-text search infrastructure, AI ranking, fuzzy matching, saved views, exports, analytics, notification workflows, customer accounts, external provider synchronization, or Phase 20 connector/simulator architecture.

## Theme Architecture

The frontend uses Tailwind's class-based dark mode with shared CSS variable tokens defined in `frontend/src/styles.css` and exposed through Tailwind `app.*` color utilities. The app sets the initial light/dark class in `frontend/index.html` before React loads to reduce theme flashing.

`ThemeProvider` stores explicit light/dark choices in `localStorage` under `sme-feedback-theme`. When no preference is stored, the provider follows the user's system color scheme and listens for system-theme changes.

The Phase 2 login redesign currently exposes the visible `ThemeToggle`. Other pages can adopt the same tokens and toggle without changing authentication/session behavior.

## Login Page UI Architecture

The `/login` page has a login-specific split authentication composition while preserving the existing auth hooks, validation schema, Google login component, route-state redirect handling, query-parameter success messages, and unverified-email resend flow.

Reusable auth UI components added for the redesign:

- `Alert`
- `AuthCard`
- `BrandMark`
- `Button`
- `LoginIllustration`
- `PasswordField`
- `SecurityNote`
- `PremiumAuthShell`
- `AccountShell`
- `AccountPanel`
- `StatusBadge`

The left-side analytics/customer-feedback composition is built from React, Tailwind, and Lucide icons. The approved reference image is not embedded as a live background or screenshot.

The 2026-07-22 visual refinement pass aligned the login surface more closely with `frontend/references/login-page-design.png` by using a centered rounded outer stage, explicit desktop headline line breaks, floating analytics/review cards, refined state colors, and a phone-like mobile single-column layout. A later focused correction rebalanced the desktop stage so the login form column is roughly two-fifths of the composition, restored the card to a comfortable 440-460px desktop width band, added login-only comfortable field/button sizing, widened the responsive Google credential control, and kept authentication behavior owned by the existing auth hooks and API module.

The Phase 2 authentication/account premium redesign extends the same visual language across:

- `/register`
- `/verify-email-pending`
- `/verify-email`
- `/forgot-password`
- `/reset-password`
- `/password-reset-success`
- `/account`
- `/account/sessions`

`PremiumAuthShell` owns the reference-style split public auth stage, mobile stacking, theme toggle placement, brand treatment, and reusable native React/Tailwind visual panels. `AccountShell` owns the protected account/settings frame, desktop sidebar, mobile header, account identity area, and shared account panels and status badges.

The approved reference boards used for this pass are `frontend/references/01-register.png`, `02-email-verification-pending.png`, `03-email-verification-success.png`, `04-forgot-password.png`, `05-reset-password.png`, `06-password-reset-success.png`, `07-account-page.png`, and `08-active-sessions.png`. These references are translated into native React, Tailwind, and Lucide UI rather than embedded as page backgrounds.

## Public Website UI Architecture

The public-facing website is implemented under `frontend/src/features/public` and uses the eight approved public references:

- `frontend/references/01-home.png`
- `frontend/references/02-features.png`
- `frontend/references/03-how-it-works.png`
- `frontend/references/04-pricing.png`
- `frontend/references/05-about.png`
- `frontend/references/06-contact.png`
- `frontend/references/07-privacy-policy.png`
- `frontend/references/08-terms-of-service.png`

The public site is built as native React, Tailwind, and Lucide UI. The reference PNGs are not embedded in the live app.

Reusable public components include:

- `PublicLayout`: shared public page wrapper, sticky public navbar, keyboard-accessible mobile navigation, scroll locking while the mobile menu is open, and shared footer.
- `MarketingButton`: route-aware public call-to-action buttons.
- `SectionHeading`: shared public section heading pattern.
- `FeatureCard`, `IconCard`, `InfoList`, and `SurfacePanel`: reusable public content surfaces.
- `DemoDashboard`, `ChannelStrip`, `TrustStrip`, and `CallToActionSection`: reusable product-preview and CTA sections.
- `LegalPageLayout`: desktop sticky section navigation, mobile table-of-contents pattern, and legal-section card layout.
- `PublicSeo`: lightweight document title and meta description updates without a new dependency.

The public website reuses the existing global theme architecture through `ThemeProvider`, `ThemeToggle`, CSS variables in `frontend/src/styles.css`, and Tailwind `app.*` tokens. There is no second theme implementation.

The public website follows a product-truthfulness strategy: implemented authentication, business workspace, feedback, workflow, customer, search/filter, and AI-analysis capabilities may be described as available in the authenticated app, while connectors, automation, analytics, reports, and external integrations remain planned, future phase, coming soon, or roadmap work. Demo dashboard values are visually identified as illustrative demo data.

The Pricing page is early-access/planned-pricing content only. No checkout, subscription billing, payment API, or binding commercial pricing behavior exists. The Contact page validates form input in the browser with React Hook Form and Zod, but it does not submit because no backend contact endpoint or documented public inbox exists.

The Privacy Policy and Terms of Service pages are product drafts grounded in current authentication, cookie, token, Google-auth, SMTP, database, deployment, and roadmap documentation. They require professional legal review before production launch and do not claim unsupported certifications, jurisdictions, guarantees, or compliance status.

## Service Boundaries

Shared infrastructure belongs in `src/lib`, `src/config`, `src/middleware`, and `src/utils`. Module-specific business logic belongs inside the owning module.

Shared services should be used for cross-cutting infrastructure only. Domain services should remain module-specific unless multiple modules need the same behavior.

## Data Layer

Prisma ORM is the database access layer. The local development database is a MySQL-compatible server provided by XAMPP. The Prisma datasource uses `env("DATABASE_URL")`.

Phase 2A defines only authentication models:

- `User`
- `Session`
- `UserRole`
- `AccountStatus`

Phase 2B adds external identity models:

- `ExternalAuthProvider`
- `ExternalAccount`

Phase 2C adds reusable account-token models:

- `AccountTokenType`
- `AccountToken`

`AccountToken` stores only SHA-256 token hashes and never stores raw verification or reset tokens. Tokens are scoped to one user and one purpose, expire, are single-use, and are invalidated when a replacement token of the same type is created.

`ExternalAccount` stores reusable external-auth identities. For Google, `providerAccountId` stores Google's stable `sub`. Email is stored only as verified provider metadata, not as the permanent external identity key.

Customer, feedback, connector, notification, report, analytics, and automation models are intentionally not present yet.

Phase 3 adds the multi-tenant business foundation:

- `Business`: tenant record with profile, contact, address, timezone, logo URL, status, and creator.
- `Branch`: tenant-scoped location with a unique `[businessId, code]`, primary-branch flag, active/inactive status, and contact/address details.
- `BusinessMembership`: user-to-business membership with business-level role, status, all-branch access flag, inviter, and joined timestamp.
- `MembershipBranchAccess`: relational join table for explicit manager/staff branch assignments.
- `StaffInvitation`: pending/accepted/cancelled/expired staff invitations with normalized invited email, business role, branch-access mode, hashed token, expiry, sender, accepter, and send/accept/cancel timestamps.
- `StaffInvitationBranch`: relational join table for invitation branch assignments.

The existing platform `User.role` remains a global account role. Business authorization is based on `BusinessMembership.role`, not the platform role alone.

Phase 4 adds the standard feedback-processing data foundation:

- `FeedbackChannel`: source channel enum for `MANUAL`, `PUBLIC_FORM`, `QR_CODE`, `WHATSAPP`, `INSTAGRAM`, `X`, `GOOGLE_REVIEW`, `EMAIL`, and `OTHER`.
- `FeedbackIngestionStatus`: operational status enum for `PROCESSING`, `COMPLETED`, and `FAILED`.
- `FeedbackIngestion`: business/branch-scoped intake record with channel, optional external source ID, required idempotency key, deterministic payload hash, processing version, status, safe failure code/message, and timestamps.
- `Feedback`: stored customer feedback tied one-to-one to an ingestion record, one business, and one branch.
- `FeedbackAttachment`: metadata-only attachment rows tied to feedback. Phase 4 does not upload, download, scan, or store binary files.

Feedback stores a limited customer snapshot directly on the feedback row: `customerName`, `customerEmail`, and `customerPhone`. Full customer profiles, matching, and migrations are deferred to the customer-profile phase.

Phase 5 backend reuses the same Phase 4 tables. Manual-entry submissions are stored as `FeedbackChannel.MANUAL` feedback and ingestion rows. Actor/source details are stored only in bounded `Feedback.sourceMetadata`; no new manual feedback table exists.

Phase 6 reuses the same Phase 4 feedback tables. Public feedback submissions are stored as `FeedbackChannel.PUBLIC_FORM` feedback and ingestion rows. Public source metadata stores only bounded public-portal context such as follow-up consent and a short portal-token fingerprint. No public submission table, customer table, attachment table change, or QR table is added.

Phase 7 adds `PublicFeedbackQrCode`:

- `branchId = null` means business-wide QR code.
- Non-null `branchId` means branch-specific QR code.
- `publicToken` is unique and cryptographically random.
- `portalTokenFingerprint` is the SHA-256 fingerprint of the current Phase 6 public portal token when the QR code is created or individually regenerated.
- `isActive=false` disables only that QR code.
- The model relates to `Business`, optional `Branch`, and optional creator `BusinessMembership`.
- The model intentionally has no scan analytics, scan counters, feedback counters, expiration dates, or scheduling fields.

QR submissions reuse Phase 4 tables with `FeedbackChannel.QR_CODE`. Customer contact remains only a feedback snapshot. QR source metadata is bounded and does not store raw QR tokens, portal tokens, customer contact duplicates, user IDs, cookies, authorization headers, or full IP addresses.

## Authentication Architecture

Phase 2A uses cookie-based JWT authentication with database-backed refresh sessions:

- Access tokens are short-lived JWTs stored in an HttpOnly cookie.
- Refresh tokens are longer-lived JWTs stored in a separate HttpOnly cookie scoped to `/api/auth`.
- Access and refresh tokens use separate secrets and include issuer, audience, token type, subject, and session ID checks.
- Raw refresh tokens are never stored in the database. `Session.refreshTokenHash` stores a SHA-256 hash of the refresh token.
- Refresh-token rotation replaces the stored refresh hash and cookies on every successful refresh.
- Reuse of an old refresh token revokes the affected session and rejects the refresh.
- Logout revokes the current session using a valid access or refresh cookie and clears cookies.
- Logout-all revokes all active sessions for the current user and clears cookies.

Frontend auth state stores only the safe user object and startup loading state. The frontend never reads, stores, or transmits tokens outside the HttpOnly cookies.

Startup auth first asks `/api/auth/me` for the safe current user. A missing access cookie settles as a normal logged-out state; an invalid or expired access cookie can still recover through `/api/auth/refresh`.

The shared Axios client keeps `withCredentials: true`. On eligible non-auth-control 401 responses, it performs one `/api/auth/refresh` request, shares one in-flight refresh promise across concurrent requests, and retries the original request once. Login, registration, plain logout, refresh, and startup `/auth/me` responses do not trigger the global refresh interceptor.

## Google Authentication Architecture

Phase 2B uses Google Identity Services through `@react-oauth/google` on the frontend and `google-auth-library` on the backend.

The frontend receives a Google ID credential from the official rendered Google button and sends only that credential to the backend. The backend is the authority that verifies the credential signature, audience, issuer, expiration, stable `sub`, email presence, and `email_verified=true` result through the official library.

Google registration, Google login, and Google linking are separate behaviors:

- Google registration creates a user only when the Google `sub` is not linked and the verified Google email does not already belong to an existing user.
- Google login only signs in an already-linked Google `sub`; it never creates users and never links by email.
- Google linking requires an existing application session and links only when the verified Google email matches the current user's normalized email.

The system never automatically links accounts solely because emails match. It does not merge users, delete duplicate users, store Google credentials, store Google access tokens, or store Google refresh tokens.

After successful Google registration or login, the backend creates the same application `Session` row, access JWT, refresh JWT, refresh-token hash, and HttpOnly cookies used by email/password auth.

## Email Verification and Password Reset Architecture

New email/password registrations create an active but unverified password user with `emailVerifiedAt = null`. They do not create a `Session`, access token, refresh token, or auth cookies. The backend creates an `EMAIL_VERIFICATION` account token, sends the raw token only inside the email link, and stores only its SHA-256 hash.

Verification links use:

```text
APP_FRONTEND_URL/verify-email?token=<raw-token>
```

The confirmation endpoint hashes the submitted token, confirms it is unused, unexpired, and purpose-scoped to `EMAIL_VERIFICATION`, marks it used, sets `User.emailVerifiedAt`, and invalidates remaining active verification tokens for that user. It does not automatically create a session.

Forgot-password requests always return a generic accepted response when email delivery is configured. For active users with a password hash, the backend invalidates prior active reset tokens, creates a new `PASSWORD_RESET` token, and sends a reset link. Missing, disabled, suspended, and Google-only accounts do not receive inappropriate reset emails and are not disclosed.

Reset links use:

```text
APP_FRONTEND_URL/reset-password?token=<raw-token>
```

Password reset hashes the submitted token, confirms the token is unused, unexpired, and purpose-scoped to `PASSWORD_RESET`, hashes the new password with the existing Argon2id utility, marks the token used, invalidates remaining reset tokens, and revokes all active application sessions for the user in one transaction. The user must sign in again after reset.

The Phase 2C migration marks existing password users verified by setting `email_verified_at` to their existing value or `created_at`. This preserves manually verified Phase 2A development accounts. Future email/password registrations are not auto-verified.

SMTP email delivery is disabled by default through `EMAIL_ENABLED=false`. The backend still starts in this mode. Existing login and Google authentication continue working, while new password registration, verification resend, and forgot-password return a safe `EMAIL_DELIVERY_NOT_CONFIGURED` error until SMTP is configured.

Expired `AccountToken` records and old expired/revoked `Session` records are cleaned opportunistically during token-creation workflows. The cleanup is worker-ready and does not delete active sessions.

## Frontend Routes

Current routes:

- `/`: public Home page available to logged-in and logged-out visitors.
- `/features`: public Features page.
- `/how-it-works`: public How It Works page.
- `/pricing`: public Pricing page.
- `/about`: public About page.
- `/contact`: public Contact page.
- `/privacy-policy`: public Privacy Policy page.
- `/terms-of-service`: public Terms of Service page.
- `/login`: public-only email/password login.
- `/register`: public-only account registration for Business Owner or Customer.
- `/verify-email-pending`: verification resend and pending guidance.
- `/verify-email`: email-verification token confirmation.
- `/forgot-password`: generic forgot-password request.
- `/reset-password`: password-reset token completion.
- `/password-reset-success`: password-reset completion confirmation before returning to sign in.
- `/account`: protected authenticated account and session management page.
- `/account/sessions`: protected active-session management page.
- `/business`: protected business workspace resolver.
- `/business/setup`: protected business onboarding page.
- `/business/:businessId`: protected business overview.
- `/business/:businessId/feedback/manual`: protected Phase 5 manual-feedback entry page.
- `/feedback/:portalToken`: public Phase 6 feedback portal available without authentication.
- `/business/:businessId/feedback/qr-codes`: protected Phase 7 QR-code management page.
- `/feedback/qr/:qrToken`: public Phase 7 QR feedback route available without authentication.
- `/business/:businessId/integrations`: protected Phase 20 canonical integrations workspace.
- `/business/:businessId/integrations/:connectionId`: protected Phase 20 compatibility route redirecting to the canonical integrations workspace.
- `/business/:businessId/integrations/:connectionId/history`: protected Phase 20 compatibility route redirecting to the canonical integrations workspace.
- `/business/:businessId/integration-runs/:runId`: protected Phase 20 compatibility route redirecting to the canonical integrations workspace.
- `/business/:businessId/settings`: protected business settings.
- `/business/:businessId/branches`: protected branch list.
- `/business/:businessId/branches/new`: protected branch creation.
- `/business/:businessId/branches/:branchId`: protected branch details.
- `/business/:businessId/branches/:branchId/edit`: protected branch editing.
- `/business/:businessId/staff`: protected staff list.
- `/business/:businessId/staff/invite`: protected staff invitation form.
- `/business/:businessId/staff/:membershipId`: protected staff details.
- `/business/:businessId/staff/:membershipId/branches`: protected branch assignment.
- `/business/:businessId/invitations`: protected pending invitations.
- `/invitations/accept`: public/session-aware staff invitation acceptance.
- `/admin/businesses`: platform-administrator business list.
- `/admin/businesses/:businessId`: platform-administrator business details.
- `/system-status`: Phase 1 health status page.
- `*`: friendly frontend 404 page with a link back to login or account.

Route guards wait for the startup auth check before redirecting. Protected routes preserve the originally requested path, search, and hash for post-login restoration.

Public marketing and legal pages do not redirect authenticated users away from the public website. Auth redirects remain scoped to auth-only and protected-account routes.

## Future Multi-Tenant Design

The system is now multi-tenant for Phase 3 business, branch, staff, and invitation behavior. Tenant boundaries are enforced in backend services and persistence queries, not only in the frontend.

Business workspace access is resolved from the authenticated user and active `BusinessMembership`. Suspended or removed memberships are blocked on backend requests. Suspended businesses can be viewed in a limited state but normal workspace operations are blocked until a platform administrator reactivates the business.

Business-level roles:

- `OWNER`: full Phase 3 authority and protected original owner; ownership transfer is out of scope.
- `ADMIN`: manages business settings, branches, manager/staff memberships, invitations, and branch access, but cannot assign/administer owners or other admins.
- `MANAGER`: reads the business and assigned/all branches.
- `STAFF`: limited read access to assigned/all branches.

Owner/admin memberships use `allBranchesAccess=true`. Manager/staff memberships can use all-branch access or explicit `MembershipBranchAccess` rows. Branch IDs, membership IDs, and invitation IDs are always checked against the business ID to prevent IDOR.

The frontend business workspace feature lives under `frontend/src/features/businesses`. It uses route-level lazy loading, TanStack Query, React Hook Form, Zod, the existing Axios client, and the existing theme system. The workspace shell provides the business selector, sidebar/mobile drawer, top controls, status surfaces, empty/loading/error states, role-aware actions, and the Phase 5 Feedback navigation group. The active business ID may be stored in local storage only as a UX preference; backend membership checks remain authoritative.

Staff invitations reuse the existing SMTP email service. Raw invitation tokens are sent only in email links and accepted from the URL/form flow. The database stores only SHA-256 token hashes. Invitation acceptance is transactional for current-session, new password-account, and safe Google flows.

Platform administrators use separate `/api/admin/businesses` endpoints and `/admin/businesses` frontend routes. They are not automatically business members and cannot use normal workspace endpoints unless they also have a business membership.

The Prisma seed workflow has two explicit layers. `backend/prisma/seed.ts` first creates or reconciles the dedicated global `PLATFORM_ADMIN` from `PLATFORM_ADMIN_*`, keeps that account active and verified, refuses to promote a non-admin account, and never grants it a tenant membership. In non-production environments, `backend/src/scripts/development-seed.ts` then reconciles a deterministic `dev_seed_*` dataset when `DEVELOPMENT_SEED_ENABLED` is not `false`.

The development layer uses stable IDs, reserved `.test` identities, fixed timestamps, Argon2id password hashing, and record-level upserts. It owns only its named fixtures and does not delete or bulk-rewrite unrelated local data. Its secondary business and owner provide a deliberate tenant-isolation boundary. Feedback fixtures are inserted as already-processed deterministic state, with matching ingestion, workflow, field-source, AI, and automation history rows, so running the seed never invokes an AI provider or schedules automation work. Demo integrations are stored only with `IntegrationMode.DEMO`; no Live connection, credential, OAuth state, webhook delivery, or provider call belongs to this seed architecture.

## Future Connector Architecture

External source integrations such as manual entry, public forms, QR codes, email, Google Reviews, WhatsApp, Instagram, and X should be implemented as connector modules that normalize incoming data into the standard feedback-processing service. Connectors should not bypass tenant checks, validation, or audit requirements.

Phase 20 Connector Framework and Demo Synchronization is implemented as a Demo Mode-only connector MVP. It uses a shared `ExternalFeedbackConnector` contract, an explicit backend connector registry, one default active Branch per connection, Owner/Admin-only management, manual synchronization, deterministic provider datasets, run history, per-item safe results, and mandatory Phase 4 `FeedbackProcessingService` reuse.

The approved later-phase strategy separates demo synchronization from live provider synchronization. Phase 20 is planned as a Demo Mode connector framework that proves synchronization architecture with simulated provider data. It must be clearly labeled as Demo Mode, simulated external data, and not connected to the real provider. Phases 21 through 25 are planned live-integration phases that depend on real provider approval, OAuth or credentials, token refresh, webhooks or polling, rate limits, provider permissions, and provider availability.

Phase 20 implemented flow:

```text
Provider simulator
-> simulated provider source item
-> demo connector
-> provider adapter
-> NormalizedFeedbackInput
-> FeedbackProcessingService
-> FeedbackIngestion and Feedback persistence
-> Phase 8 unified inbox display
```

The external-provider call is simulated in Phase 20, but internal normalization, deduplication, processing, persistence, and inbox display are real. Demo connectors call the Phase 4 `FeedbackProcessingService` through `NormalizedFeedbackInput`; they do not insert directly into `Feedback`.

Implemented Phase 20 backend modules:

- `src/modules/integrations/demo-connectors.ts`: deterministic Demo provider datasets and normalizers.
- `src/modules/integrations/integration-registry.ts`: provider/mode connector lookup.
- `src/modules/integrations/integration.service.ts`: owner/admin connection lifecycle, sync processing, duplicate/item result persistence, retry, and safe serialization.
- `src/modules/integrations/integration.routes.ts`: authenticated tenant routes mounted under business routes.
- `src/modules/integrations/integration.worker.ts`: disabled-by-default worker hook for persisted pending runs and stale-run recovery.

Implemented Phase 20 frontend modules:

- `frontend/src/features/businesses/IntegrationsPage.tsx`: owner/admin integration workspace with a reference-aligned premium Demo Mode UI, responsive provider connection cards, friendly labels, search/provider/status/branch filters, summary/activity panels, stepped Connect Demo dialog, synchronization progress/result states, run history, and item results.
- `frontend/src/features/businesses/integrationApi.ts`: typed frontend API wrapper.
- `frontend/src/app/router/router.tsx`: canonical `/business/:businessId/integrations` route plus protected redirects from planned detail/history URLs back to the canonical workspace.
- The Phase 8 inbox accepts and labels demo-imported provider channels, including `FACEBOOK`, and shows safe simulated-source details without raw provider payloads.

The planned shared connector contract is equivalent to:

- `connect`
- `disconnect`
- `testConnection`
- `sync`

Future connector implementations should keep demo and live adapters separate while producing the same normalized input shape for the Phase 4 processing engine. Planned examples include:

- `MockGoogleReviewsConnector` and `GoogleReviewsConnector`
- `MockWhatsAppConnector` and `WhatsAppBusinessConnector`
- `MockEmailConnector` and `EmailConnector`
- `MockXConnector` and `XConnector`
- future mock/live Facebook and Instagram connectors for the Phase 24 social-media scope

Planned Phase 20 source simulators should allow a user to act as an external customer and create source items:

- Google Reviews simulator: reviewer name, star rating, review text, business location, and publish review.
- WhatsApp simulator: customer name, customer phone, business branch, conversation or message, and send message.
- Email simulator: sender name, sender email, subject, message body, optional attachment metadata, and send email.
- X simulator: display name, handle, post text, mention or reply type, and publish post.
- Facebook and Instagram simulator: commenter name, page/post/media context, comment or direct-message text, and publish item.

The Phase 20 deadline-oriented build should prioritize Google Reviews, WhatsApp, and Email. X, Facebook, and Instagram may start as lighter simulators or source previews if time is limited.

Each integration should have a provider-inspired source preview inside the application's own design system, not a pixel-for-pixel copy of provider interfaces. Planned previews should show provider-specific fields such as reviewer or sender, rating or post type, original text, location or branch, posted/received date, attachment indicator where relevant, import status, and Demo Mode labeling.

Planned synchronization workspace behavior includes connecting and disconnecting a demo source, syncing now, optional simulated automatic synchronization, viewing provider source items, importing one item, importing selected items, importing all new items, showing last synchronization time, connection health, imported item count, synchronization history, retrying failed imports, and opening imported feedback in the unified inbox. Planned source item states are Not imported, Pending, Imported, Duplicate, Skipped, Failed, and Retrying.

Imported feedback should preserve safe tenant-scoped source metadata where relevant: provider, Demo Mode, original author, original rating, original post/message date, external source item ID, imported date, source location or branch, connection name, source type, and original preview. Public routes must not expose internal synchronization details.

Future integration persistence concepts are planned only and are not implemented in the current schema:

- `IntegrationConnection`, including a mode equivalent to `DEMO` or `LIVE`.
- `SynchronizationRun`.
- `SynchronizationCursor`.
- `SynchronizationError`.

Phase 20 implementation adds `IntegrationConnection`, `SynchronizationRun`, and `SynchronizationItem`. Cursor/error tables remain deferred. Raw provider payload bodies are not stored.

## Phase 21 Live Email Integration

Phase 21 Live Email Integration is implemented for the Gmail-only MVP described in `PHASE_21_DISCOVERY_REPORT.md`. IMAP remains deferred.

Implemented Phase 21 architecture:

```text
Gmail API OAuth grant
-> encrypted backend-only IntegrationCredential
-> Live Email connector
-> Gmail Inbox message listing or history cursor
-> parsed message payload
-> NormalizedFeedbackInput
-> FeedbackProcessingService
-> FeedbackIngestion and Feedback persistence
-> Customer exact-email matching
-> AI scheduling
-> FEEDBACK_CREATED automation scheduling
-> Unified Inbox display
```

The implementation reuses the Phase 20 connector registry, `IntegrationConnection`, `SynchronizationRun`, `SynchronizationItem`, integration worker hook, connection lifecycle, Owner/Admin-only management boundary, and `/business/:businessId/integrations` frontend route. It does not create a parallel email-specific synchronization system.

Migration `20260805090000_phase_21_live_email_gmail_oauth` makes demo-only fields nullable for Live Mode, adds live email provider/account/cursor/test metadata to `IntegrationConnection`, adds encrypted `IntegrationCredential` storage, and adds one-time `IntegrationOAuthState` storage for Gmail OAuth PKCE flow state.

Security boundaries:

- Existing Google application-login ID credentials are not mailbox OAuth grants and must not be reused for Gmail access.
- Provider secrets remain backend-only and encrypted with `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY`.
- Live Email stores plain text extracted from email bodies as Feedback content; raw MIME and sanitized HTML are not stored in Phase 21.
- Attachments are metadata-only; no downloads, binary storage, remote attachment URLs, or antivirus/content analysis are added in the MVP.
- Synchronization is manual only, Inbox-only, capped to latest 20 messages initially, cursor-based after initial sync, and must not alter mailbox read/unread state.
- Demo Email and Live Email may coexist because they are separated by `IntegrationMode`.
- Platform administrators without tenant Owner/Admin `BusinessMembership` remain blocked from tenant integration APIs.

## Phase 23 Live Outlook / Microsoft Email Architecture

Phase 23 extends Live Email through the existing Phase 20 connector framework and Phase 21 encrypted credential/OAuth-state architecture. It keeps one Email Live provider surface while `EmailLiveConnector` dispatches to Gmail or Outlook by `IntegrationConnection.liveProviderType`.

Implemented Phase 23 architecture:

```text
Microsoft Graph OAuth grant
-> encrypted backend-only IntegrationCredential
-> EmailLiveConnector dispatch by liveProviderType=MICROSOFT
-> OutlookLiveConnector
-> Microsoft Graph v1.0 Inbox messages or delta cursor
-> plain text body and metadata-only attachment mapping
-> NormalizedFeedbackInput
-> FeedbackProcessingService
-> FeedbackIngestion and Feedback persistence
-> Customer exact-email matching
-> AI scheduling
-> FEEDBACK_CREATED automation scheduling
-> Unified Inbox display
```

Migration `20260810170000_phase_23_live_outlook_email` changes integration connection uniqueness to include `liveProviderType`, allowing one Gmail Live connection and one Outlook Live connection per Business. Demo singleton and Live WhatsApp singleton behavior remain enforced in service logic.

Frontend architecture:

- `/business/:businessId/integrations` keeps a single Email Live card.
- The Email card renders separate Gmail and Outlook rows using existing connection lifecycle actions.
- The connection dialog includes an Email provider selector for Live Email setup and uses provider-specific OAuth text, notices, and run detail descriptions.

Security boundaries:

- Microsoft Graph uses delegated `offline_access`, `User.Read`, and `Mail.Read` only.
- Graph reads use v1.0, Inbox-only routes, immutable ID preference, and text-body preference.
- Synchronization remains manual, latest-20 bounded initially, and delta-cursor based after first sync.
- Attachments are metadata-only; no `$value` download, `contentBytes` storage, or binary attachment table is added.
- No Mail.Send, outbound email, SMTP/IMAP sync, Graph beta, scheduled sync, webhooks, provider polling, or direct `Feedback` insertion is part of Phase 23.

## Phase 22 Live WhatsApp Cloud API Discovery

Phase 22 Live WhatsApp Cloud API discovery is complete in `PHASE_22_DISCOVERY_REPORT.md`, and the implementation is complete as documented in the Phase 22 architecture section below.

Recommended architecture:

```text
Meta WhatsApp Cloud API webhook
-> public HTTPS webhook endpoint
-> GET verification or POST raw-body signature validation
-> phone-number-ID connection lookup
-> Live WhatsApp connector/adapter
-> NormalizedFeedbackInput
-> FeedbackProcessingService
-> FeedbackIngestion and Feedback persistence
-> exact phone Customer matching
-> AI scheduling
-> FEEDBACK_CREATED automation scheduling
-> Unified Inbox display
```

Phase 22 should reuse the Phase 20 connector registry, `IntegrationConnection`, integration-management permissions, safe serialization, Demo/Live mode separation, and Phase 21 encrypted credential storage. Unlike Gmail, WhatsApp inbound messages are webhook-driven; Live WhatsApp should not expose a misleading manual `Sync Now` action. The integrations UI should show inbound activity, webhook health, last inbound message, imported count, duplicates prevented, skipped unsupported messages, and safe failures.

The current Express app mounts global JSON parsing before routes. Phase 22 implementation must preserve the raw POST body for `X-Hub-Signature-256` validation by mounting a webhook-specific raw parser before global JSON parsing or by capturing raw bodies with a JSON parser `verify` hook without breaking existing APIs.

Same-day MVP boundaries:

- Meta-provided test number first.
- One Live WhatsApp connection per Business.
- One required active default Branch.
- Inbound text messages only for Feedback import.
- Non-text messages skipped or recorded as unsupported activity without media download.
- No outbound replies, templates, production phone-number onboarding, polling, scheduled sync, Redis, public simulator route, or Outlook behavior.

Phase 4 provides the adapter foundation through `FeedbackSourceAdapter<TPayload>`. Future adapters validate source-specific payloads, produce `NormalizedFeedbackInput`, provide the source channel, external ID where available, idempotency key, and safe metadata. No real adapters are implemented in Phase 4.

Phase 5 implements `ManualFeedbackSourceAdapter`, the first concrete adapter. It receives a validated manual payload plus trusted route/auth/membership context and maps:

- `businessId` from the route.
- `branchId` from the required request body.
- `channel` to `MANUAL`.
- `idempotencyKey` from the `Idempotency-Key` header.
- `title`, `message`, `rating`, `occurredAt`, `sourceUrl`, `languageCode`, customer snapshot, and attachment metadata into `NormalizedFeedbackInput`.
- Safe source metadata with `sourceType=manual-entry`, the selected manual source type, optional note/reference, and trusted internal actor IDs.

It deliberately does not set `externalId` from the manual reference field, insert feedback through Prisma, recreate payload hashing, or recreate duplicate/conflict handling.

Phase 7 implements `QrFeedbackSourceAdapter`. It receives a validated public QR payload plus trusted QR-token context resolved server-side and maps:

- `businessId` from the QR record.
- `branchId` from the fixed QR branch or validated active branch selection.
- `channel` to `QR_CODE`.
- `idempotencyKey` from the `Idempotency-Key` header.
- `message`, `rating`, `occurredAt`, and customer snapshot into `NormalizedFeedbackInput`.
- Safe source metadata with `sourceType=qr-code`, internal `qrCodeId`, `qrScope`, and follow-up consent.

It does not insert feedback through Prisma, call the manual adapter, trust body-supplied business/branch/QR identifiers, store raw QR tokens, upload files, or add scan tracking.

The Phase 5 frontend page is a client for this manual connector only. It generates the required idempotency key, validates the staff-entered form, submits metadata-only attachment references, and displays safe processing results. It does not list feedback, expose feedback details, add assignment/status/category/priority workflow, create customer profiles, or implement public/QR/external-provider sources.

## Feedback Processing Architecture

The standard processing pipeline is:

```text
Receive normalized source input
-> validate and normalize input
-> validate active business and active branch
-> fall back to the active primary branch when branchId is omitted
-> canonicalize and hash the normalized payload
-> check idempotency and external-source duplicates
-> create a PROCESSING ingestion row
-> transactionally re-check business/branch status, create Feedback, create FeedbackAttachment metadata, and mark ingestion COMPLETED
-> return a stable processing result
```

Idempotency is scoped to `[businessId, channel, idempotencyKey]`. Replaying the same key with the same payload returns the original feedback ID with `duplicate=true`; replaying the key with a different payload returns `FEEDBACK_IDEMPOTENCY_CONFLICT`.

External source IDs are scoped to `[businessId, channel, externalId]` where `externalId` exists. Reusing an external ID with compatible payload data returns the existing feedback as a duplicate; incompatible data returns `FEEDBACK_EXTERNAL_ID_CONFLICT`.

Payload hashing uses a deterministic canonical JSON representation with sorted object keys and SHA-256. Attachment metadata and safe source metadata are included in the hash. Runtime-only timestamps such as `receivedAt` and transport controls such as `idempotencyKey` are not included, so the same external source feedback can be recognized as compatible when replayed under a different idempotency key.

Source metadata must be JSON-compatible, size-limited, and sanitized before storage. Sensitive-looking metadata keys such as authorization, cookie, password, secret, token, access-token, refresh-token, API key, and similar variants are removed during normalization.

Failed ingestion rows are retained only when a `PROCESSING` row was created before the failure. They store a safe error code and sanitized summary, never raw Prisma errors, SQL messages, stack traces, provider payloads, customer contact details, or customer messages.

The local simulation CLI uses a non-barrel-exported service helper for `--simulateFailureAfterIngestion`. That helper refuses `NODE_ENV=production`, requires the CLI's `--commit` path, creates the ingestion through the real service flow, throws a controlled safe error inside the transaction before feedback or attachment persistence, and then relies on the normal failed-ingestion handling. This is a manual-verification support path only and is not part of the future connector adapter contract.

## Phase 13 AI Analysis Architecture

Phase 13 AI Sentiment Analysis, Categorization, and Summaries is implemented as derived, tenant-scoped feedback metadata.

Implemented architecture:

```text
Feedback persisted through Phase 4
-> non-blocking analysis scheduling
-> centralized AI analysis service and database-backed worker
-> provider abstraction
-> strict structured response validation
-> tenant-scoped FeedbackAIAnalysis persistence
-> optional safe category suggestion/application
-> Phase 8 inbox and feedback drawer display
```

Architectural boundaries:

- Original `Feedback` title, message, rating, customer snapshots, source metadata, notes, activity, category, priority, status, and assignments remain authoritative and immutable unless changed by existing human workflow controls.
- AI output is stored as derived metadata in `FeedbackAIAnalysis`, clearly labeled AI-generated in frontend surfaces, and never treated as certain.
- Feedback source adapters do not call AI providers or write AI analysis records directly; the Phase 4 processing service schedules analysis after valid persistence.
- Valid feedback persistence completes even if AI analysis is disabled, not configured, slow, unavailable, invalid, failed, or retry-limited.
- Provider-specific code stays behind a replaceable backend provider interface. Gemini is the first provider, configured only through backend environment variables.
- Human-selected categories win over AI suggestions, retries, and delayed worker results. Suggestion state is serialized as `NONE`, `AVAILABLE`, `AUTO_APPLIED`, `MANUALLY_APPLIED`, `DISMISSED`, or `CONFLICTED`.
- Manual AI retry resets the automatic retry counter so user-triggered retries remain eligible for the worker after automatic retries are exhausted. The existing analysis row may keep the last generated sentiment, language, and summary visible while the replacement attempt is pending or after the latest retry fails.
- Business-wide AI status and backfill controls are owner/admin-only; managers may act on individual feedback suggestions within their accessible feedback scope, and staff remain read-only.
- Daily AI usage is counted from the UTC start of day using backend `lastAttemptAt` timestamps.
- Tenant membership and branch access rules must govern every AI result. Platform administrators without `BusinessMembership` must remain blocked from tenant AI data.
- Phase 13 does not implement Phase 14 automation, Phase 20 connectors, notifications/replies, customer accounts, reports, attachment AI, translation, embeddings, semantic search, or analytics summaries.

## Phase 14 Automation Rules Engine

Phase 14 Automation Rules Engine is implemented as a post-persistence workflow layer. It does not act as a feedback source adapter, and it does not bypass the Phase 4 feedback-processing service.

Implemented Phase 14 architecture:

```text
Feedback persisted or AI analysis completed
-> Automation event queued outside the source transaction
-> Automation worker claims queued event
-> Active business-scoped rules for the trigger are loaded
-> Conditions evaluate against a fresh tenant-scoped feedback snapshot
-> Approved system workflow actions run through automation-specific validated behavior
-> FeedbackActivity and automation execution history record system attribution
```

Manual entry, public forms, QR submissions, and future connectors continue to create feedback only through `NormalizedFeedbackInput` and `FeedbackProcessingService`.

Automation does not impersonate a human `BusinessMembership`. System actions write `FeedbackActivity` rows with `actorType=SYSTEM`, nullable human actor membership, `automationRuleId`, and `automationRuleName`. The feedback drawer renders these entries as automation/system activity.

Implemented MVP boundaries:

- Owner/admin-only rule management.
- Business-scoped rules with no cross-business execution.
- Triggers limited to `FEEDBACK_CREATED` and `AI_ANALYSIS_COMPLETED`; manual run is an owner/admin action and is recorded as an execution trigger value.
- Flat `ALL` or `ANY` condition lists, maximum 10 conditions.
- Actions limited to `SET_PRIORITY`, `SET_CATEGORY`, `ASSIGN_TO_MEMBERSHIP`, `UNASSIGN`, and `SET_STATUS`, maximum 5 actions.
- Deterministic rule order with optional stop-processing-after-match.
- Database-backed event queue, idempotency fingerprints, loop-prevention event-chain data, rule version integer, stale recovery, retries, execution history, and per-action audit rows.
- Human values are protected from automated overwrites through `FeedbackFieldState` tracking for status, priority, category, and assignment. Initial feedback field ownership is `STATUS -> SYSTEM`, `PRIORITY -> DEFAULT`, `CATEGORY -> DEFAULT`, and `ASSIGNMENT -> DEFAULT`; AI category auto-apply marks category as AI-owned; automation actions mark changed fields as automation-owned; manual workflow changes and removals mark fields as human-owned.
- A Phase 14 follow-up migration backfills historical field ownership idempotently without mutating feedback values or executing automation. Historical actor IDs are left null when reliable membership attribution cannot be proven.
- The frontend rule builder uses container-aware condition/action rows and a wider split-layout breakpoint so long operator labels and row move/delete controls remain usable on zoomed or narrower workspace widths.
- Automation rule definitions are normalized on both the frontend builder submit path and the backend service boundary before validation and persistence. Irrelevant or blank target IDs, such as stale category or membership fields left after switching action types, are cleared before Prisma writes while valid branch/category/member targets remain backend-authoritative.
- Archived automation rules can be restored only as drafts, and permanent deletion is exposed only for already archived rules. Deleting a rule removes the editable rule definition and its owned branch/condition/action children while preserving execution, activity, and field-source history through nullable rule references.
- The Review and test workspace selects an accessible feedback record from the business feedback list instead of asking owners/admins to paste a raw feedback ID; backend preview/manual-run authorization remains authoritative.
- Automation rule selection is row/card based in the frontend: clicking a rule row or card body loads the saved rule into the builder, while action controls are excluded from selection. The Review and test feedback picker uses the existing backend feedback search and pagination query rather than a static client-only option list.

Out of scope for Phase 14 MVP: notifications, customer messages, external emails, WhatsApp, webhooks, arbitrary code, scheduled recurring rules, nested condition groups, bulk historical execution, Phase 15 behavior, and Phase 20 connector behavior.

## Phase 22 Live WhatsApp Cloud API Architecture

Phase 22 implements a narrow Meta test-number Live WhatsApp inbound webhook MVP through the existing Phase 20 connector framework.

Implemented architecture:

```text
Meta WhatsApp webhook
-> public raw-body webhook route
-> X-Hub-Signature-256 HMAC validation before JSON parsing
-> phone-number-ID Live WhatsApp connection lookup
-> text-message-only ExternalFeedbackItem normalization
-> WhatsAppLiveConnector.normalizeItem
-> FeedbackProcessingService.process
-> FeedbackIngestion and Feedback persistence
-> Unified Inbox Live WhatsApp source display
```

Architectural boundaries:

- Live WhatsApp is registered as `IntegrationProvider.WHATSAPP` with `IntegrationMode.LIVE`, allowing Demo WhatsApp and Live WhatsApp to coexist without a duplicate provider card.
- Owner/Admin management reuses the existing integrations route and service boundary. Managers and Staff only see imported feedback through existing branch-aware Inbox permissions.
- The public webhook route is unauthenticated for Meta delivery but authenticates provider origin through `X-Hub-Signature-256` over exact raw bytes before parsing.
- Tenant resolution uses Meta `metadata.phone_number_id`; the webhook body cannot choose arbitrary business or branch IDs.
- Only inbound `text` messages are imported. Non-text messages are recorded/skipped safely without media download.
- Live WhatsApp has no `Sync Now`; it exposes connection test and webhook activity.
- Imports do not insert directly into `Feedback`; all persistence flows through Phase 4 feedback processing.
- No outbound replies, templates, production phone-number onboarding, polling, scheduled synchronization, Redis queue, WhatsApp Web/Twilio integration, Outlook, live Google Reviews, or social media behavior is part of Phase 22.

## Phase 24 Live Facebook + Instagram Meta Social Webhook Architecture

Phase 24 implements a narrow Live Facebook Page and Live Instagram professional-account inbound comment webhook MVP through the existing Phase 20 connector framework and the Phase 22 Meta webhook security pattern.

Implemented architecture:

```text
Meta GET verification
-> required hub.mode / hub.verify_token / hub.challenge validation
-> timing-safe comparison with the existing backend verify token
-> exact plain-text challenge response (no database dependency)

Meta Facebook/Instagram POST webhook
-> shared public raw-body Meta webhook route
-> X-Hub-Signature-256 HMAC validation before JSON parsing
-> signed Meta object-type dispatch
-> Facebook Page ID or Instagram professional-account ID connection lookup
-> comment-only ExternalFeedbackItem normalization
-> MetaSocialLiveConnector.normalizeItem
-> FeedbackProcessingService.process
-> FeedbackIngestion and Feedback persistence
-> Unified Inbox Live Facebook / Live Instagram source display
```

Architectural boundaries:

- Live Facebook is registered as `IntegrationProvider.FACEBOOK` with `IntegrationMode.LIVE`; Live Instagram is registered as `IntegrationProvider.INSTAGRAM` with `IntegrationMode.LIVE`. Existing Demo Facebook and Demo Instagram providers remain on the same provider surfaces rather than duplicate cards.
- Owner/Admin management reuses `/business/:businessId/integrations` and the existing integration service boundary. Managers and Staff only see imported feedback through existing branch-aware Inbox permissions.
- The public GET verification handshake is transport-only and does not query or mutate integration records. Webhook connection health is updated by authenticated signed POST processing, where provider/tenant context is available.
- The shared public route `/api/integrations/meta/webhook` is unauthenticated for Meta delivery but authenticates provider origin through `X-Hub-Signature-256` over exact raw bytes before parsing.
- After signature validation, the shared route dispatches `object=whatsapp_business_account` to the existing Phase 22 WhatsApp processor and keeps `object=page` / `object=instagram` on the Phase 24 social processor. Provider dispatch never occurs before signature validation.
- WhatsApp deliveries resolved through the shared route match the signed `entry[].id` WABA identifier when present together with `metadata.phone_number_id`; the webhook still cannot select a tenant business or Branch directly.
- Tenant resolution uses the Facebook Page ID or Instagram professional-account ID from the signed webhook delivery; webhook bodies cannot choose arbitrary business or branch IDs.
- Only Facebook Page comment-add webhook events and Instagram comment webhook events are imported. Instagram mentions, non-comment events, reactions, DMs, Messenger events, publishing, moderation, and media downloads are skipped or remain out of scope.
- Live Facebook and Live Instagram have no `Sync Now`; they expose connection test and webhook activity.
- Imports do not insert directly into `Feedback`; all persistence flows through Phase 4 feedback processing.
- No live Google Reviews, X, production OAuth onboarding, multiple same-provider social accounts per Business, polling, scheduled synchronization, or Phase 25 monitoring behavior is part of the Phase 24 MVP.
