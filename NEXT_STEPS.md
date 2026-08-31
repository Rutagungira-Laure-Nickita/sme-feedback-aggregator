# Next Steps

## Owner/Admin Reporting Quality Pass — Manual Verification Gate

Implementation and automated verification are complete. The next task is the user-owned browser/download pass:

1. Preview the Business Owner report and each Platform Administrator report. Confirm `Detailed Feedback Records` appears last, Owner columns are Customer / Sender, Feedback, Channel, Date, Category, Status, and Admin adds Business and Branch.
2. Confirm Gmail prefers display name then email, WhatsApp prefers profile/customer name then phone, Manual Entry/Public Form prefer name then email then phone, and missing identity displays `Unknown customer` without internal IDs or source metadata.
3. Apply every available Business, Branch, date, Channel, Workflow Status, and Sentiment filter individually and in combinations. Confirm every detail row matches and `Feedback in selected period` equals the full detail count; for Operations, Provider continues to scope integration sections while feedback details use the documented Business/date operational-feedback scope.
4. Confirm only Gmail, WhatsApp, Manual Entry, and Public Form appear. Soft-deleted, QR, Demo, Outlook, Facebook, Instagram, X, Google Reviews, and unsupported records must not appear or contribute to totals.
5. Confirm `Linked customer profiles represented by feedback (period)` is used consistently and is understood as persisted linked profiles, not all named senders.
6. Confirm no Automation highlights, comparisons, summaries, sections, or CSV/PDF rows appear, while the retained Automation routes/services continue to pass regression checks.
7. At desktop/tablet/mobile widths, confirm the Preview table/card layouts wrap long names/messages/categories and Admin Business/Branch values without page-level horizontal overflow. Preview may show 12 rows and must state that exports contain the full dataset.
8. Download Owner and Admin PDF/CSV files. Confirm all matching rows are present; CSV retains full original messages and ISO dates; PDF uses readable wrapped excerpts, clear dates, repeated headers, clean page breaks, and no clipped columns.
9. Repeat with another Owner and foreign Business/Branch attempts. Confirm Owner tenant isolation and existing Platform Administrator-only report authorization remain enforced.

No migration, reset, db push, reseed, provider reconfiguration, or deployment-setting change belongs to this pass. Do not mark it manually verified until this checklist passes.

## Business Owner Detailed Feedback Records — Manual Verification Gate

Implementation and focused automated verification are complete. The next task for this report improvement is the user-owned browser/download pass:

1. Preview an unfiltered Business Owner report and confirm `Feedback in selected period` equals the total record count shown on `Detailed Feedback Records`; verify Customer / Sender, original Feedback, Channel, Date, Category, and Status.
2. Verify Gmail prefers a sender display name and otherwise shows sender email; WhatsApp prefers the profile name and otherwise shows the phone; Manual Entry/Public Form prefer submitted name then email/phone; missing identity shows `Unknown customer` and no internal ID.
3. Apply Branch, date, Channel, Workflow Status, and Sentiment filters individually and together. Confirm every detail row matches the filter and the detail count continues to equal the report total.
4. Confirm deleted, QR, Demo, Outlook, Facebook, Instagram, X, Google Reviews, and other hidden records do not appear or contribute to totals.
5. At desktop/tablet/mobile widths, confirm the desktop table and mobile cards wrap long sender/message/category values without page-level horizontal scrolling; Preview may show 12 rows and must state that exports contain the full dataset.
6. Download PDF and CSV. Confirm both contain the detailed section and every matching record; CSV retains full original messages/ISO received timestamps, while PDF uses readable wrapped message excerpts, clear dates, repeated headers, and clean page breaks.
7. Repeat with another Business Owner and a foreign Business/Branch ID attempt to confirm existing tenant and Branch authorization remains enforced.

No migration, reset, db push, reseed, provider reconfiguration, or deployment-setting change belongs to this task. Do not mark it manually verified until this checklist passes.

## Focused Correction — Manual Verification Gate

Implementation and automated verification are complete. After applying the already-pending Final Product Hardening migration through the normal workflow, perform this user-owned browser pass:

1. Delete disposable feedback individually, in bulk, and with exact-confirmed Remove all. After each action, confirm the inbox list and Total/Gmail/WhatsApp/Manual Entry/Public Form cards refresh immediately and agree; then confirm Business Owner Overview, Staff Overview, customer totals, Platform Administrator dashboards, analytics, and Preview/PDF/CSV reports exclude the removed rows.
2. Re-submit or synchronize a previously deleted provider item in a disposable environment and confirm provider deduplication still prevents a duplicate even though the row remains hidden. Do not physically delete ingestion, provider, activity, AI, or automation history.
3. Confirm every normal source filter, legend, summary, and report exposes exactly Gmail, WhatsApp, Manual Entry, and Public Form. Confirm QR, Demo, Outlook, social, Google Reviews, X, and Other do not contribute even when historical rows exist.
4. Confirm the Business Owner Overview Channel distribution donut matches the active business/date scope, uses the same visual treatment as Sentiment mix, shows all four legend counts, handles zero data cleanly, and responds at phone/tablet/desktop widths.
5. Confirm visible roles read Platform Administrator, Business Owner, Manager, Staff, and Customer. Existing legacy `ADMIN` data must display as Business Owner; new invitations and role changes must offer only Manager and Staff; assignment controls must not show a duplicate Business Admin persona.
6. Confirm QR Codes and Automations are absent from normal navigation, dashboard quick actions, marketing, filters, and reports. Direct retained routes may still load for backward compatibility, and backend services/data must remain intact.
7. Regression/security: repeat cross-Business and restricted-Staff checks, Gmail labeled incremental synchronization/deduplication, WhatsApp signed webhook ingestion/activity refresh, customer-owned feedback access, and edit/delete/bulk authorization.

No migration, reset, db push, reseed, historical cleanup, credential change, or provider reconfiguration belongs to this correction. Do not mark it manually verified until this checklist passes.

## Supported-Channel Correction — Manual Verification Gate

Implementation and automated verification are complete. After applying the already-pending Final Product Hardening migration described below, run this user-owned browser/provider pass:

1. Integrations cards: at desktop widths confirm Gmail and WhatsApp metrics/actions align vertically and both primary buttons say `Sync Now`. Confirm Gmail creates a real synchronization run; confirm WhatsApp only refreshes connection/webhook activity, creates no synchronization run, and explains that inbound webhook delivery is automatic.
2. Integrations views: switch Grid/Table, refresh and sign back in to confirm the Business-specific preference persists. Verify the semantic desktop table and stacked mobile rows remain usable without page-level horizontal overflow and preserve all applicable actions.
3. Supported-provider boundary: this earlier five-channel expectation is superseded by the focused four-channel gate above; QR is now hidden from normal product presentation while its data and routes remain preserved.
4. Gmail label gate: create the configured label (default `Customer Feedback`) in the connected mailbox. Verify a genuine labeled Inbox message imports, an unlabeled Inbox message does not, and a labeled newsletter/automated message is recorded as skipped without feedback creation. Rename/remove the configured label to confirm the safe missing-label error, restore it, and verify a second incremental sync is duplicate-safe.
5. All-matching selection: apply filters, select all matching results, deselect records on multiple pages, navigate away/back, and confirm checkbox styling/counts retain the exclusions. Run bulk status/category/delete against disposable data and verify only the selected population changes; confirm Remove all uses the same scope and exact confirmation protection.
6. Assignment labels: verify feedback assignment options and the selected assignee display `Name — Business Owner`, `Name — Manager`, or `Name — Staff`; no separate Business Admin label should appear.
7. Regression/security: confirm another Business cannot influence filters, selections, integrations, Gmail labels, synchronization, or assignments; repeat core Gmail deduplication and signed WhatsApp webhook ingestion checks.

No new migration is associated with this correction. Do not reset, push, reseed, or delete historical provider rows to test it.

## Final Product Hardening — Migration and Manual Verification Gate

The exact next unfinished task is to apply migration `20260821120000_final_product_hardening` through the normal Prisma migration workflow, then perform the user-run browser/security pass below. Do not use `migrate reset`, `db push`, or reseeding. Deploy backend and frontend together only after the migration is ready for the target database.

1. Business Owner/Admin feedback management: edit title/message/customer/Branch/category/status/priority; refresh a stale edit to confirm conflict handling; verify List and Grid menus; select visible/all matching; bulk status/category/delete; verify filtered selection semantics and error recovery; type exact `DELETE` in Remove all and cancel once before confirming in a disposable tenant.
2. Soft-delete integrity: confirm removed rows disappear from inbox, customer dashboard, owner/admin dashboards, search, AI/automation candidates, and report Preview/PDF/CSV while ingestion/provider deduplication remains effective for a repeated Gmail/WhatsApp provider item.
3. Tenant and role security: confirm Owner/Admin actions cannot target another Business; Manager/Staff cannot call edit/delete/bulk endpoints; restricted Staff see only assigned Branch feedback/customers/dashboard totals, cannot force a foreign Branch/filter ID in the URL/API, and do not see owner/admin navigation.
4. Customer workspace: sign in as `CUSTOMER`; confirm `/account` redirects to `/customer`; verify real totals/recent feedback, My Feedback search/status/channel/List/Grid persistence, safe detail, submission destinations, Profile, sessions link, responsive layout, keyboard focus, Escape, and empty/error states. Confirm a second customer cannot retrieve the first customer's feedback ID.
5. Integrations: verify Gmail Connect/Reconnect, Sync now, and View Activity remain operational. Verify connected WhatsApp Refresh Activity performs read-only refetch, View Activity and Test Connection work, and no WhatsApp manual-sync action appears.
6. Responsive/accessibility: verify independent desktop sidebar scrolling and mobile drawer scrolling at short phone/tablet heights; no page-level horizontal overflow; List/Grid automatic defaults and explicit overrides at 0/1/2+ results; dialogs trap focus, close by Escape/button/backdrop as intended, restore body scrolling, and remain usable in Light/Dark/System.
7. Regression: spot-check Platform Administrator feedback/business dashboards and all three reports, owner reporting, public portal/QR submission, Gmail/WhatsApp ingestion, categories, AI, automation, and active-business routing after the migration.

Do not mark the hardening pass manually verified until this checklist and the deferred cross-business/security regression checks pass. Phase 29A's Railway deployment observation remains pending separately.

## Phase 29A - Railway Deployment Verification Gate

The Prisma ESM runtime repair and local automated/runtime verification are complete. After the committed `main` revision auto-deploys, confirm Railway runs Prisma generation before the backend build, completes `prisma migrate deploy` without schema changes, starts the compiled backend through `npm run start -w backend` (`node dist/server.js`), and serves the health endpoint without any missing Prisma named-export error. The temporary Railway `tsx` Start Command is no longer required for this compatibility repair.

No Railway configuration change, Prisma upgrade, schema migration, database mutation, or manual product workflow retest is required specifically for Phase 29A. Existing deferred Phase 28 and earlier manual verification gates remain unchanged.

## Phase 28 — User Manual Verification

Implementation, targeted development-data reconciliation, and automated verification are complete. The next unfinished task is the user's manual browser/device pass:

- Categories: confirm all 13 active defaults and descriptions; create/edit/recolor/deactivate/reactivate a custom category as Owner/Admin; confirm Staff cannot manage them; verify another Business cannot see or assign them; verify AI leaves low-confidence items unassigned and never invents a category.
- All Feedback: verify List and Grid show Category/Uncategorized, the combined category filter persists through refresh, View opens the complete modal, List/Grid preference persists, and mobile cards remain uncluttered.
- Kigali Waffle Cuisine: verify owner Overview, branches, staff, customers, feedback, categories, QR, automations, settings, and report Preview/PDF/CSV use the new name and professional fixture copy.
- WhatsApp/Gmail: verify the connected Live WhatsApp card still routes to Remera and receives/deduplicates test messages; confirm Gmail remains in the canonical Business context (Connect state locally because no Live Gmail row exists) without fabricated credentials.
- Public portal: open the canonical token/QR routes and verify Kigali Waffle Cuisine, its welcome message, branch routing, and submission-to-inbox flow.
- Business Owner and Staff mobile/tablet: test iPhone SE-height, tablet portrait, and tablet landscape; scroll to Settings/workspace context/Sign out; close by link, backdrop, button, and Escape; confirm background lock restoration and no horizontal overflow.
- Platform Administrator and Account mobile/tablet: repeat drawer reachability/dismissal checks, including Platform Health and Settings.
- Public navigation: verify Home, About, How It Works, Features, Contact in that order on desktop/mobile/Home/Login/Register; confirm the mobile menu scrolls on short screens, session-aware actions work, and Pricing is absent.

Do not mark Phase 28 manually verified until this checklist passes. Deferred exhaustive multi-tenant/security/regression work from earlier phases remains deferred as previously documented.

## Phase 27 — Manual Browser and Responsive Verification Gate

Phase 27 implementation and automated verification are complete. The exact next unfinished task is user-run functional/browser verification; do not mark Phase 27 manually verified until it passes.

1. Business Owner: verify the real-data Overview, feedback List/Grid and full modal, QR creation/actions/disabled states, customer List/Grid/detail, automation Draft/Active/Pause/ALL/ANY/history/test workflows, Branch/Staff back navigation, settings tabs/categories, Live-only Gmail/WhatsApp integrations, reports excluding Demo activity, and the closer sidebar Sign out.
2. Platform Administrator: verify Users, Feedback, and Integrations List/Grid cards, filters, detail modals, existing actions/confirmations, reporting, authorization, and the closer Sign out placement.
3. Public/auth: verify Home, Features, How It Works, About, Contact, Privacy, Terms, consistent header/footer, authenticated public Home access, session-aware dashboard links, missing `/pricing`, and unchanged Login/Register form behavior inside the public shell.
4. Responsive/theme/accessibility: inspect approximately 300px phone, tablet, laptop, and wide desktop layouts in Light, Dark, and System modes; check wrapping, menus, filters, modals, keyboard focus, Escape/close behavior, scroll locking, tables, action reachability, and lack of page-level horizontal overflow.

No migration, seed cleanup, or browser automation is required. Demo rows must remain preserved even though they are hidden from the Business Owner integration and reporting surfaces.

## Phase 26A — Business Owner Report Export Polish Manual Retest Gate

Phase 26A export branding remains implemented, while Phase 27 supersedes its owner Integration Adoption/detail-mode expectations with Live-only semantics. Do not mark the combined owner reporting experience manually verified until these checks pass:

1. Regenerate the Business Owner PDF and confirm the header says `BUSINESS REPORTING`, never `PLATFORM ADMINISTRATION`.
2. Regenerate the Business Owner CSV and confirm its report context says `BUSINESS REPORTING`, with no Platform Administration claim.
3. In Preview, PDF, CSV, and the PDF visual summary, confirm Integration Adoption counts only Live connections for the authorized Business/optional Branch.
4. Confirm the detailed Integration Connections, synchronization, and webhook sections contain no Demo rows or Demo metrics.
5. Regenerate one Platform Administrator PDF and confirm its header still says `PLATFORM ADMINISTRATION`, never `BUSINESS REPORTING`.
6. Spot-check that the previously verified Business Owner totals, tenant isolation, safe normalized feedback, PDF pagination/footer behavior, and CSV BOM/escaping/formula protection remain unchanged.

No schema, migration, seed, development-data, browser-automation, or report redesign action is required.

## Phase 26 — Business Owner Comprehensive Reporting Manual Verification Gate

Phase 26 implementation is complete and static verification passes. The next unfinished task is user-run browser/PDF/CSV verification. Do not mark Phase 26 manually verified until this focused checklist passes:

1. Log in as a Business Owner and open the workspace. Confirm a `Reports` navigation item appears and `/business/:businessId/reports` opens a page titled `Business Performance & Customer Experience` with the compact report heading, description, and no report-type selector.
2. Confirm there is NO Business selector anywhere on the page. Filters are Date From, Date To, Branch, Channel, Workflow Status, Sentiment, and Compare Previous Period with natural `All Branches` / `All Channels` / `All Statuses` / `All Sentiments` labels. The Branch dropdown contains only this Business's branches.
3. Generate a Preview. Confirm the KPI overview, Management Summary, previous-period comparison (when enabled), and sections render; confirm lifetime labels (`Total feedback (lifetime, matching filters)`, `Branches (lifetime)`, `Customer profiles (lifetime)`) are distinct from period labels (`Feedback in selected period`, `Open feedback (period)`).
4. Select a Branch and re-Preview. Confirm feedback metrics, workload by branch, and routed integration metrics respect the branch; confirm customer profiles and branch inventory stay labeled `business-wide`; confirm `Integrations routed to branch` wording appears.
5. Apply Channel, Workflow Status, and Sentiment filters together and confirm every KPI/distribution is tied to the same filtered feedback count; confirm Open + Completed and Assigned + Unassigned equal the filtered count and no workflow filter leaks completed feedback.
6. Test a zero-result combination: all period values are safe zeros, no NaN/Infinity/undefined, and Management Summary is exactly `No feedback matched the selected period and filters.`
7. Confirm Management Summary matches report metrics: unique leading channel uses `records`, ties name all channels (`... were tied as the leading channels with N feedback records each`), and singular/plural grammar is correct.
8. Confirm Important customer experience feedback shows high/urgent or negative items ordered Urgent, High, then other Negative, newest first; the normalized customer message is preferred over the title; no customer email/phone appears in Preview, PDF, or CSV.
9. Download the PDF: confirm business name, report title, period, filters, generated timestamp, Management Summary, KPI cards, comparison grid, page numbers, one footer per page, no footer-only pages, readable wrapped important-feedback and operational tables, and Indigo branding.
10. Download the CSV: confirm UTF-8 BOM, proper escaping, formula protection, precise ISO timestamps, full trend dataset, full safe important-feedback message, and totals agreeing with Preview/PDF.
11. Confirm the report contains NO platform-only content: no API/database health, CPU/RAM/uptime, pending-business approval workload, other-tenant data, or Platform Admin reporting links. Confirm Platform Admin `/admin/reports` still shows exactly the three supervisor reports.
12. Confirm role denial: a platform `STAFF` or `CUSTOMER` account cannot open the owner report page or call the preview/export endpoints; a `PLATFORM_ADMIN` can still use `/admin/reports`.
13. Resize to approximately 300px: no horizontal page overflow, filters collapse, KPI grid adapts, tables scroll, and PDF/CSV controls remain usable. Verify Light, Dark, and System appearance.
14. Re-run `npm run test:phase26` (18 backend + 13 frontend) plus the Phase 25.4, Phase 25.3, integrations, AI, and automation regression commands if the environment allows.

## Phase 25.4D — Operations Report Consistency & PDF Readability Correction Gate

Phase 25.4D implementation is complete. The exact next unfinished static task is to rerun `npm run test:phase25.4 -w frontend` and `npm run test:phase25.4 -w backend` (or the root Phase 25.4 command) in an environment that permits the Node test runner to spawn its test processes. The current sandbox stopped both commands before test discovery with `spawn EPERM`, and its approval quota prevented the required elevated rerun. After those tests pass, the user should perform only this focused manual retest before Phase 25.4D is marked manually verified:

1. Preview the canonical Operations report with comparison enabled. Confirm `Previous-period comparison` appears directly after Management Summary with the exact columns Metric, Current, Previous, Change, and Comparison; confirm the displayed values agree with PDF/CSV and zero baselines say `No prior baseline`.
2. Disable comparison and generate a new Preview. Confirm the comparison section is absent and no second frontend request is made for comparison data.
3. Confirm Automation rule state displays `Draft`, while QR/AI/API/CSV/PDF/SMS/URL/IP/OAuth and established report labels remain correctly capitalized.
4. Download the canonical Operations PDF and confirm it remains exactly five physical pages with true `Page X of 5` footers and no footer-only page. Inspect Integration Connections, Recent Integration Activity, Recent Webhook Activity, and Recent Automation Execution State for readable wrapped rows, repeated headers after page breaks, no overlap/clipping, concise timestamps, useful notes/summaries, and retained operational meaning.
5. Download CSV and confirm all original detail columns remain present, timestamps remain ISO values, and Preview/PDF/CSV totals and comparisons agree.
6. Reconfirm the established Operations baseline: 7 total integrations (1 Live, 6 Demo), 4 Connected, 1 Paused, 1 Disconnected, 1 Error, 3 attention; synchronization 5 Completed plus 1 Completed with errors and item outcomes 6 imported/1 failed; 5 webhooks; AI 9 Completed/1 Skipped/10 total; automation 1 Success/5 Not matched/6 total; 1 Active and 1 Draft rule; 2 Active and 0 Pending businesses. Confirm API/database wording remains evidence-based and no CPU, RAM, uptime, or worker-heartbeat claim appears.

No schema, migration, seed, development-data, or browser-automation action is required.

## Phase 25.4C — Feedback & Customer Experience Report Functional Correction Manual Retest Gate

Phase 25.4C implementation and automated verification are complete. The next unfinished task is user-run Preview/PDF/CSV retesting. Do not mark Phase 25.4C or the Feedback & Customer Experience report manually verified until this focused checklist passes:

1. Recreate Kigali Harvest Cafe / Kiyovu Downtown Branch / All Channels / Workflow Status New / All Sentiments. Confirm exactly 2 matching records, Open 2, Completed 0, Assignment 0/2, completion workload 2 Open and 0 Completed, Workflow New 2, and no current or previous comparison row claims completed New feedback.
2. Recheck the platform baseline (19 Jul–17 Aug), Kiyovu branch, Kiyovu + QR Code, Kiyovu + Positive, and Kiyovu + Instagram + New + Positive values from the Phase 25.4C request. Confirm every KPI/distribution total remains tied to the same filtered feedback count.
3. Recheck the 8–11 Aug previous-period case and another Workflow-filtered comparison. Confirm current/previous Open and Completed use the identical Business/Branch/Channel/Workflow/Sentiment filters with only the date window changed.
4. Recheck a zero-result combination. Confirm all period values and percentages are safe zeros, no NaN/Infinity/undefined appears, and Management Summary is exactly the no-feedback behavior with no channel leader.
5. At Kiyovu's four-way 1/1/1/1 channel tie and the 8–11 Aug four-way tie, confirm Management Summary names all tied channels, uses `1 feedback record each`, and never selects the first returned group arbitrarily. Also verify a unique leader and a two-way tie if convenient.
6. Preview the 30-day Feedback trend and confirm it shows the most recent 12 dates in ascending chronological order. Download PDF and CSV and confirm the full supported trend dataset remains present.
7. In Important customer experience feedback, confirm the real negative WhatsApp item displays its normalized customer message instead of `WhatsApp message`; confirm title is used only when message content is genuinely unavailable.
8. Confirm Important feedback remains High/Urgent OR Negative, orders Urgent before High and lower-priority Negative items, then newest-first within equivalent severity, and remains bounded to a sensible set.
9. Inspect the Feedback PDF Important Feedback table. Confirm useful multi-line excerpts, growing row heights, no overlap/clipping, repeated headers after page breaks where needed, no footer-only page, and true `Page X of Y` numbering.
10. Inspect CSV Important Feedback and confirm the full safe normalized message is retained where practical, UTF-8 BOM/escaping/formula protection remain valid, and Preview/PDF/CSV KPIs and Management Summary agree.
11. Confirm Channel Distribution and Visual Summary display `Other`, applicable role values display `Customer`, and QR/AI/API/CSV/PDF/SMS/URL/IP/OAuth capitalization remains correct.
12. Repeat reversed-date and over-366-day checks for top Preview, lower Preview Report, PDF, and CSV. Confirm all remain blocked with the established messages.
13. Inspect Preview/PDF/CSV for absence of customer email/phone, passwords/hashes, tokens, OAuth/provider credentials, raw webhook/source payloads/signatures, encryption material, protected attachment URLs, and internal secret-bearing metadata.
14. Reconfirm the Phase 25.4B Executive PDF layout/comparison/footer checks and the Phase 25.4A selected-branch/integration-attention/CSV checks. Executive calculations and Operations-specific behavior were not changed by Phase 25.4C.

No browser or manual testing was performed by Codex. No schema, migration, seed, or development-data action is required.

## Phase 25.4B — PDF Section Flow, Layout & Report Humanization Correction Manual Retest Gate

Phase 25.4B PDF Section Flow, Layout & Report Humanization Correction is implementation-complete and automated checks pass. Do not mark it manually verified until the user completes this focused retest:

1. Recreate the confirmed Executive configuration for Kigali Harvest Cafe / Kiyovu Downtown Branch / Jul 19-Aug 17 / comparison enabled. Confirm the PDF still has exactly 6 physical content pages, one correct footer per page, true `Page X of Y` numbering, and no footer-only page.
2. On pages 3-6, confirm Feedback by business, Priority distribution, Sentiment distribution, User roles with selected-branch access, Business adoption overview, Integration adoption, Integration health, and Business-wide approval workload all start at the same normal left margin.
3. Confirm every section description stays directly under its heading at the same left margin and that Integration Adoption's full description remains with its table; no orphan `feedback is routed.` fragment may start page 6.
4. Confirm the previous-period comparison is a readable `Metric | Current | Previous | Change | Comparison` grid. Long metric labels must wrap only inside the Metric cell, values must stay aligned, and `No prior baseline` must remain fully readable.
5. Confirm the Executive Preview Management Summary says `QR Code was the leading source.`, never `Qr Code`.
6. Download the identical Executive PDF and CSV and confirm both Management Summaries also say `QR Code`; confirm QR, AI, API, CSV, PDF, SMS, URL, IP, and OAuth capitalization remains natural wherever present.
7. Repeat PDF pagination/layout inspection for Feedback & Customer Experience and Operations & System Health: no clipped/overlapping/narrow-column text, no orphan section introductions, no footer-only pages, and one correct footer on every physical page.
8. Reconfirm the Phase 25.4A selected-branch values remain 1 branch, 4 users, 6 explicitly business-wide customers, 4 feedback, 3 routed integrations, and 2 needing attention. Reconfirm whole-business integration attention remains 3 of 7.
9. Reconfirm CSV remains UTF-8 BOM output with valid comma/quote/newline escaping, formula-leading-cell protection, Scope/Scope notes, Management Summary, KPIs, comparison, explicit empty messages, and Preview-equivalent values.

No browser or manual testing was performed by Codex. No schema or migration action is required.

## Phase 25.4A Manual Retest Gate

Phase 25.4A Report Export & Scope Consistency Correction is implementation-complete and automated checks pass. Do not mark it manually verified until the user completes this focused retest:

1. Recreate the confirmed Executive configuration for Kigali Harvest Cafe / Kiyovu Downtown Branch / Jul 19–Aug 17 / comparison enabled. Confirm Preview shows 1 Branch, 4 branch-access Users, 6 clearly labeled business-wide Customer profiles, 4 Feedback, 3 Integration connections routed to the branch, and 2 routed connections needing attention.
2. Confirm Business adoption reports 1 Branch, 4 Users with branch access, 6 Customer profiles explicitly labeled business-wide, 4 Feedback in scope, and 2 connected providers routed to Kiyovu; it must not show the former silent 3-branch/15-feedback whole-business aggregate.
3. Confirm platform Executive uses `Total platform users (lifetime)` and `New platform users`; business/branch Executive uses `Users in scope (lifetime)` and `New users in scope`, including comparison rows.
4. Download Executive PDF and confirm the physical file has exactly the content-page count shown by `Page X of Y`, one footer per page, and no footer-only/blank/duplicated trailing pages.
5. Repeat the physical pagination/footer check for Feedback & Customer Experience and Operations & System Health PDFs.
6. Download CSV for the same Executive configuration and confirm its Scope/Scope notes, KPIs, comparisons, adoption, integration, and business-wide customer semantics match Preview/PDF.
7. Confirm CSV opens as UTF-8, retains commas/quotes/newlines safely, and shows QR Code, Google Reviews, Not analyzed, Business Owner, and Platform Administrator rather than raw enum tokens.
8. At whole-business Executive scope, confirm the current seven connections classify as 3 needing attention: Disconnected X, Paused Email, and Error Facebook. Confirm connected records with successful `PASSED` tests, including Live WhatsApp, are not flagged.
9. Recheck the three report choices, Executive default, validation/366-day limit, No prior baseline, Management Summary, empty states, Indigo branding, authorization, and absence of secrets.

No browser or manual testing was performed by Codex. No schema or migration action is required.

## Current Gate

Phase 25.4 Supervisor-Focused Reporting Consolidation implementation and automated verification are complete. The next unfinished work is user-run browser and downloaded-file verification. Do not mark Phase 25.4 manually verified until the checklist below passes. No schema change or migration exists for Phase 25.4.

Phase 25.4 manual checklist:

1. Sign in as a Platform Administrator and confirm `/admin/reports` selects Executive Platform Report by default and offers exactly Executive Platform Report, Feedback & Customer Experience Report, and Operations & System Health Report.
2. Confirm the eight former fragmented report choices are absent and cannot be submitted directly to either report API.
3. Preview Executive with all businesses, then one business, then one branch. Confirm lifetime labels are distinct from selected-period values and the dashboard-equivalent all-scope business/user/feedback totals agree with `/admin`.
4. Confirm Executive contains business lifecycle/adoption, branch, user/role/account, customer, feedback today/week/month/open/completed, channel/business/workflow/priority/sentiment/AI, integration, approval-workload, trend, and deterministic Management Summary information.
5. Preview Feedback & Customer Experience and independently exercise Business, Branch, Channel, Workflow Status, and Sentiment filters. Confirm each refreshed preview changes consistently without stale prior data.
6. Confirm Feedback includes lifetime versus period feedback, assigned/unassigned, open/completed, high/urgent, AI analyzed/not analyzed, represented customers, business/branch/channel/status/category/priority/rating/sentiment distributions, and recent high-priority/negative feedback without customer contact details.
7. Preview Operations & System Health with All Providers and each available provider. Confirm only Date, Business, Provider, and meaningful comparison controls appear, and no sentiment/channel/status/branch filter is shown.
8. Confirm Operations contains API/database health, integration connection/health/activity, imports/duplicates/skips/failures, webhook activity, AI processing/staleness, automation rules/executions, and business approval workload. Confirm it makes no CPU, RAM, server-uptime, or worker-heartbeat claim.
9. Enable Compare Previous Period on all three reports. Confirm current, previous, absolute change, and percentage change display; create or select a zero-baseline case and confirm `No prior baseline` appears instead of infinity/NaN.
10. Use a zero-result date/filter scope for all three reports. Confirm the preview remains professional, shows explicit empty guidance, and has no undefined/NaN values or malformed visual summaries.
11. Try missing, invalid, reversed, and over-366-day dates. Confirm understandable validation messages and no export.
12. Download PDF and CSV for each report. Confirm title, platform branding, period, filters, generated timestamp, Management Summary, KPIs, comparisons, sections, fixed Indigo visuals, semantic sentiment/health colors, footer/page numbers, UTF-8 CSV content, and safe escaping.
13. Change filters after a preview and preview/download again. Confirm the new files and preview reflect the current request rather than cached values.
14. Confirm Business Owner, Staff, Customer, and unauthenticated accounts cannot call preview/export APIs or open the admin Reporting Center.
15. Inspect preview/PDF/CSV for absence of passwords/hashes, OAuth/access/refresh tokens, provider/App Secrets, encryption material, raw webhook payloads/signatures, provider cursors, protected attachment URLs/checksums, and customer contact details.
16. Regression-check `/admin`, `/admin/platform-health`, business lifecycle, Phase 25.3 appearance/modals, Phase 25.1 List/Grid behavior, integrations, AI, and automation after reporting verification.

Phase 25.3 implementation and focused/regression verification are complete. The user confirmed the Phase 25.2 migration is already applied and Prisma reports the database schema up to date. The next unfinished work is manual browser, responsive, appearance, modal, authorization, and integration regression verification. Do not mark Phase 25.3 manually verified until the checklist below passes. No new Phase 25.3 migration exists.

Phase 25.3 manual browser checklist:

1. On `/admin/settings`, choose Light and Save; confirm the current page switches immediately. Repeat with Dark and System, including saving the already-selected value after using the visible session theme toggle.
2. Navigate among public, login/register, Platform Admin, Business Owner, Staff, and Customer pages; refresh and logout/login. Confirm the selected platform appearance remains coherent and System follows browser/OS preference.
3. Confirm the application uses Indigo for primary actions/navigation/focus/chart series everywhere, with green only for success/healthy, red for destructive/error, amber for warning/pending, and neutral for inactive/unknown. Confirm role badges are Indigo/neutral rather than green.
4. Confirm `/admin/settings` has organized General, Branding, Public Website, Appearance, and Reports sections; no primary/accent color inputs exist; each saved real setting updates its consuming surface.
5. In `/admin/users` Grid and List views, open Manage User and verify the centered modal, account/membership/session details, `Platform-wide access` wording, supported actions, danger zone, confirmations, errors, focus return, Escape behavior, and no card/neighbor height change.
6. In `/admin/feedback`, open View Details and verify full message/customer/business/workflow/AI/ingestion/activity sections. Confirm Technical Details is collapsed, long IDs wrap/copy safely, and no editing or secret fields exist.
7. In `/admin/integrations`, open Manage Connection and verify ownership/connection/activity/issues/actions, human-readable `Connection test failed` copy, raw codes only in collapsed Technical Details, supported pause/resume, Demo disconnect confirmation, and Live disconnect restriction.
8. On `/admin/businesses/:id`, verify the compact profile header, Edit Business modal, More Actions menu, confirmation flow, KPI row, business information, branches/memberships/recent feedback/integrations, compact empty states, and business-filtered View All links.
9. Exercise only valid Pending/Active/Suspended/Rejected/Archived transitions and confirm tenant operations remain blocked outside Active exactly as in Phase 25.2.
10. On `/admin/reports`, verify the compact desktop configuration grid and mobile single column, contextual All labels, compact pre-preview summary, preview refresh after filters change, and PDF/CSV downloads with Indigo report branding.
11. Confirm `/admin/platform-health` displays Core Services, AI Processing, Automation Processing, Integration Processing, and Webhook Activity using real persisted data; confirm `/admin/system-health` redirects safely.
12. At approximately 300, 320, 360, 375, 390, and 414px plus tablet/laptop/desktop/large desktop, verify every corrected modal, report form, business page, settings tabs, cards, drawers, actions, long IDs, tables, and charts without page-level horizontal overflow or one-character-per-line text.
13. Reconfirm every Phase 25.1 List/Grid default and route-specific preference; opening details must never stretch neighboring cards.
14. Reconfirm role-aware root/auth redirects, public session-aware navigation, tenant isolation, safe admin authorization, and absence of credentials/tokens/hashes/provider cursors in modal/API responses.
15. Regression-test Gmail, Outlook, WhatsApp, Facebook, Instagram, Demo Google Reviews/X, AI analysis, automation, QR, feedback inbox/workflow, customers, reports, and admin activity audit behavior.

The Phase 25.1 and Phase 25.2 migrations are already applied locally. The user reported `npx prisma migrate status` returns `Database schema is up to date!`; do not reapply, edit, reset, roll back, or otherwise mutate migration history for Phase 25.3.

Phase 25.2 manual checklist:

1. Confirm a newly owner-created business and a newly Platform Administrator-created business both persist as `PENDING`, appear in `/admin` action-required/KPI areas, and cannot use tenant operational routes before approval.
2. As Platform Administrator, review `/admin/businesses`, create a business for an active Business Owner, edit safe profile fields, then exercise only valid approval/reject/suspend/reactivate/archive/return-to-review transitions. Confirm invalid direct transitions fail safely and confirmation prompts appear for destructive actions.
3. As the pending/rejected/suspended/archived business owner or staff member, confirm the clear restricted-state experience appears and branches, staff, feedback, customers, automations, integrations, public forms, QR operations, and ingestion remain blocked until `ACTIVE`.
4. On `/admin/users`, expand user details and verify memberships/session counts, email verification toggles, session revocation, suspend/reactivate, disable, error states, and self-lockout prevention. Confirm passwords, refresh-token hashes, verification/reset tokens, and external credentials never appear.
5. On `/admin/feedback`, verify filtering, List/Grid persistence, expandable read-only source/ingestion/AI/activity context, long text/metadata wrapping, and that no platform feedback edit action exists.
6. On `/admin/integrations`, verify safe history details and pause/resume. Confirm Demo disconnect works only after confirmation and Live disconnect directs the tenant administrator through the established provider-revocation path. Confirm no token, secret, credential hash, or provider cursor is exposed.
7. Save every Platform Settings section and verify public hero description/labels, support details, BrandMark/title/footer, fixed Indigo tokens, default report range, PDF/CSV report branding, and reload persistence.
8. Verify platform Light/Dark/System behavior and the visible session-only theme toggle using the Phase 25.3 precedence and same-value-save checks above.
9. While signed out, confirm `/` remains public and Login/Register appear. While signed in as each role, confirm `/` redirects to the correct workspace, Login/Register redirect away, public informational routes stay directly accessible, and the public navbar shows Open dashboard.
10. At approximately 300px, 375px, tablet, laptop, and large desktop, verify public/auth/account/business/admin/report/detail/modal surfaces have no body-level overflow, clipped actions, unreadable metadata, or broken mobile drawers. Reconfirm the exact Phase 25.1 List/Grid defaults and per-page persistence are unchanged.
11. Confirm significant admin mutations appear once in recent platform activity with safe summaries and no secret/content payloads. Regression-test PDF/CSV downloads, business inbox/workflow, customer, automation, QR, Gmail/Outlook/WhatsApp/Facebook/Instagram flows, and tenant isolation.

Phase 25.1 manual checklist:

1. At widths near 300px, 375px, tablet, laptop, and large desktop, verify public, auth/account, business, and admin shells have no body-level horizontal overflow and their mobile navigation drawers open, close, scroll, and restore body scrolling.
2. On each supported collection in `PHASE_25_1_RESPONSIVE_COLLECTION_AUDIT.md`, verify the toggle is visible with zero, one, and multiple results where practical; confirm unsaved defaults are Grid except large desktop plus exactly one item, which defaults to List.
3. Select List and Grid on multiple pages, reload and navigate away/back, and confirm each page restores only its own local preference without a network request when toggled.
4. On `/admin/feedback` and `/admin/integrations`, verify filter disclosure, active count, clear action, business-dependent options, loading/error/empty states, both views, and previous/next pagination. Confirm filters and pagination still reach the existing APIs correctly.
5. Sign in as a Platform Administrator, open `/admin/settings`, save identity/headline/footer, a valid HTTP(S) logo, and default appearance. Reload and confirm persistence plus global BrandMark, homepage headline, footer, document title, fixed Indigo buttons/focus tokens, and light/dark contrast.
6. Confirm editable color controls remain absent. Try unsafe/non-HTTP logo URLs, raw HTML/control text, and empty required values; confirm safe validation errors and no persisted change.
7. As Business Owner, Staff, Customer, and unauthenticated user, confirm `/admin/settings` is frontend guarded and `GET/PATCH /api/admin/settings` is rejected. Confirm unauthenticated `GET /api/platform-settings` exposes branding only and no updater identity or secret.
8. Regression-test feedback detail/workflow actions, customer links, automation selection/actions, QR actions, integration actions/history, report preview/download, account sessions, date pickers, selects, dialogs, and dark mode after the responsive changes.

Phase 25 Platform Administrator Dashboard & Reporting is implementation-complete and awaits user manual browser verification. Platform Administrator authentication now lands on `/admin`, and functional admin routes cover Businesses, Users, Feedback, Integrations, Reports, and System Health. Phase 25.4 now exposes exactly three supervisor-focused reports on demand as PDF or CSV; report history/files are intentionally not persisted. No migration is required.

The comprehensive local development seed and clean-rebuild runbook are ready. The user must manually drop and recreate only the local `sme_feedback_aggregator` database, apply the committed migrations with `prisma migrate deploy`, regenerate Prisma Client, run the seed, and verify migration status. Codex did not execute any destructive database command or claim runtime/manual verification.

Phase 1 through Phase 7 are complete and manually verified.

- Phase 1 - Project Foundation - complete and manually verified
- Phase 2A - Core Email/Password Authentication, Roles, and Sessions - complete and manually verified
- Phase 2B - Google Registration, Google Login, and Secure Account Linking - complete and manually verified
- Phase 2C - Email Verification, Forgot Password, Password Reset, and Final Authentication Hardening - complete and manually verified
- Phase 2 Login page redesign, visual refinement, proportion correction, and authentication/account premium redesign - implemented and accepted
- Public-facing marketing website - implemented and manually approved
- Phase 3 - Businesses, Branches, and Staff - implemented and manually verified
- Phase 4 - Standard Feedback Processing Service - implemented and manually verified
- Phase 5 - Manual Entry Connector backend and frontend - implemented and manually verified
- Phase 6 - Public Feedback Portal - implemented and manually verified
- Phase 7 - QR-Code Feedback Submissions - implemented and manually verified

Phase 8 backend and frontend are implemented. A Phase 8 feedback-details drawer layout and responsiveness repair has also been implemented. Phase 9 backend and frontend are implemented and the Phase 9 migration is applied. Phase 10 backend and frontend are implemented and the Phase 10 migration is applied.

Core manual workflow, role, branch, responsive, and dark-mode testing for Phases 8, 9, and 10 has passed. Full verification is still pending because cross-business tenant-isolation, Business A/Business B access attempts, platform-administrator access without `BusinessMembership`, remaining concurrency/failure-handling checks, and final regression/security checks are explicitly deferred until after Phase 20.

The user explicitly decided on 2026-07-26 to implement Phase 11 before those deferred tests. Phases 8, 9, and 10 must not be marked fully manually verified until the deferred checks pass after Phase 20.

Phase 11 Customer Profiles backend, frontend, database, security, and documentation implementation is complete. Migration `20260726110000_phase_11_customer_profiles` is applied locally. Manual browser/functional verification is still pending.

The user explicitly decided on 2026-07-26 to skip standalone Phase 11 manual testing for now, complete Phase 12 discovery, implement Phase 12 after approval, and then manually test Phases 11 and 12 together.

Phase 12 Full Search and Filters backend and frontend implementation is complete. Manual browser/functional verification is still pending. Phase 11 and Phase 12 will be manually tested together.

Phase 13 AI Sentiment Analysis, Categorization, and Summaries backend, frontend, database, security, and documentation implementation is complete. Migration `20260727083000_phase_13_ai_feedback_analysis` is applied locally. The completion audit added focused AI policy/validation/prompt tests, explicit AI suggestion-state filtering, owner/admin-only business AI controls, UTC daily-limit handling, and expanded backfill reporting. Manual browser/functional verification is still pending.

Phase 14 Automation Rules Engine backend, frontend, database, worker, security, tests, and documentation implementation is complete. Migration `20260727091241_phase_14_automation_rules` and follow-up migration `20260727143000_phase_14_field_source_backfill` are applied locally. The completion audit fixed historical field-source rows and expanded automated backend coverage. Manual browser/functional verification is still pending. Phases 11, 12, 13, and 14 are planned to be manually tested together.

Phase 20 Connector Framework and Demo Synchronization backend, frontend, database, worker hook, tests, and documentation implementation is complete. Migration `20260803090000_phase_20_connector_framework_demo_sync` is applied locally. The implemented MVP is Demo Mode-only, Owner/Admin-managed, provider-registry based, branch-routed through one default active Branch per connection, manually synchronized, deterministic, duplicate-safe, and calls the Phase 4 `FeedbackProcessingService` instead of inserting directly into `Feedback`. The frontend integrations route-not-found blocker has been repaired, and manual browser/functional verification is still pending.

The Phase 20 integrations premium UI redesign is implemented. `/business/:businessId/integrations` now uses the approved reference hierarchy: prominent Demo Mode disclosure, responsive filters, polished provider connection cards for all six Demo providers, friendly labels, summary/activity panels, redesigned run history, stepped Connect Demo flow, run details, and progress/result states. Manual visual/browser verification is still pending.

The user reported core supervisor-facing checks have passed for Phase 11 Customer creation/profile, Phase 12 search/filter persistence, Phase 13 AI configuration readiness, and Phase 14 rule creation/activation. Exhaustive manual verification remains pending, and Phases 11 through 14 must not be marked fully manually verified.

The role-based authenticated landing repair is implemented. Default authenticated entry now sends platform administrators to `/admin`, business owners and staff through `/business`, and customers to `/account`, while preserving protected-route return redirects. Root/error fallback links use the same destination map. Manual browser verification is still pending.

The business setup required-field and placeholder repair is implemented. `/business/setup` now marks required fields, shows placeholders on every setup field, and catches invalid optional branch email/phone plus invalid branch code before backend submission. Manual browser verification is still pending.

The customer form ref and placeholder repair is implemented. Customer create/edit modal inputs now forward React Hook Form refs correctly and show placeholders on every field. Manual browser verification is still pending.

The Feedback Inbox filter display repair is implemented. `/business/:businessId/feedback` now uses a compact primary filter toolbar plus an advanced filter popover with shadcn-style Radix dropdowns, while preserving all Phase 12 filter behavior and URL state. Manual browser verification is still pending.

The Phase 13 manual AI retry repair is implemented. Manual Retry now resets automatic retry eligibility, does not count repeated queued clicks as failed attempts, preserves the last generated AI review while a replacement attempt is pending or if the latest retry fails, and disables Retry while analysis is queued or processing. Manual browser verification is still pending.

The workspace dropdown and date-picker standardization is implemented. Remaining native frontend selects and date/datetime-local inputs now use shared shadcn-style controls while preserving submitted values and URL state. Manual browser verification is still pending.

The Customer list filter display and responsive repair is implemented. `/business/:businessId/customers` now uses a compact primary toolbar plus advanced filter popover and keeps customer cards available on zoomed or narrower layouts. Manual browser verification is still pending.

The Automation builder responsive row repair is implemented. `/business/:businessId/automations` now keeps condition/action controls and row buttons from squeezing or wrapping badly at zoomed and narrower widths. Manual browser verification is still pending.

The Automation draft target normalization repair is implemented. `/business/:businessId/automations` now clears stale condition/action target fields on the frontend and the backend normalizes submitted rule definitions before validation and persistence, preventing empty target IDs from causing Prisma foreign-key 500s. Manual browser verification is still pending.

The Automation management UX and archive lifecycle repair is implemented. `/business/:businessId/automations` now clears the builder after successful new-rule creation, shows success notices, confirms duplicate/delete actions with a shadcn-style dialog, restores archived rules as drafts, permanently deletes only archived rules, and uses an accessible feedback picker for Review and test. Manual browser verification is still pending.

The Automation rule selection and feedback picker usability repair is implemented. `/business/:businessId/automations` now selects rules from the whole desktop row except the actions column, selects mobile cards from the card body, and searches/paginates Review and test feedback through the backend feedback-list query. Manual browser verification is still pending.

The portal sidebar fixed-scroll behavior was reverted at the user's request. Business workspace and account portal sidebars now scroll together with the page content again, while business/account sidebars keep bottom Sign out actions, account mobile navigation opens a real drawer with logout, and the admin shell keeps a header Sign out action because it has no sidebar. Manual browser verification is still pending.

The Branch form responsive required-field repair is implemented. `/business/:businessId/branches/new` now has required-field markers, placeholders, and improved responsive form/action alignment. Manual browser verification is still pending.

The Business workspace header responsive alignment repair is implemented. Shared workspace header controls now stay side-by-side on tablet/desktop where space allows, the active-business selector uses a tighter width, and customer-page action buttons remain in a row outside mobile layouts. Manual browser verification is still pending.

Phase 22 Live WhatsApp Cloud API Meta test-number inbound webhook MVP is implemented. Migration `20260810120000_phase_22_live_whatsapp_cloud_api` is applied locally. The MVP is inbound text webhook-only, Owner/Admin-managed from the existing integrations page, branch-routed through one required active default Branch, signature-verified with raw `X-Hub-Signature-256`, resolved by Meta phone-number ID, duplicate-safe by provider message ID, persisted through safe webhook activity records, and imported only through the Phase 4 `FeedbackProcessingService`. Manual Meta test-number/browser verification is still pending.

Phase 23 Live Outlook / Microsoft Email inbound OAuth MVP is implemented. Migration `20260810170000_phase_23_live_outlook_email` is applied locally. The MVP uses Microsoft Graph OAuth with PKCE state, encrypted backend-only credentials, delegated read-only `offline_access User.Read Mail.Read` scopes, one Outlook Live Email connection per Business alongside one Gmail Live Email connection, Inbox-only manual synchronization, latest-20 initial import, delta cursor support, metadata-only attachments, and the existing Phase 4 `FeedbackProcessingService`. Manual real Outlook OAuth/browser synchronization verification is still pending.

Phase 24 Live Facebook + Instagram Meta Social Feedback Webhook Integration MVP is implemented. No Prisma migration was required. The MVP uses existing Phase 20/22/23 integration storage, Owner/Admin setup on the existing Facebook and Instagram cards, encrypted backend-only developer/test token storage, one Live Facebook Page and one Live Instagram professional-account connection per Business, one required active default Branch, shared Meta webhook GET verification and signed POST delivery, inbound comment-only processing, provider comment ID deduplication, safe webhook activity, and the existing Phase 4 `FeedbackProcessingService`. Manual Meta/browser verification is still pending.

The Phase 24 Meta publishing support fix is implemented. Public backend pages now exist at `/privacy`, `/terms`, and `/data-deletion`; they require no authentication and are served directly by Express on port 5000 so the current Cloudflare tunnel can expose them. Automated HTTP verification passed. Manual tunnel/public URL verification and entry of those URLs in Meta remain pending with the user.

The blocking Phase 24 Meta webhook GET verification defect is repaired. The GET handshake now returns the exact challenge without requiring a database write, raw body, or `X-Hub-Signature-256`; missing or invalid verification input returns controlled 4xx responses. Signed POST validation and the existing Phase 22 WhatsApp route remain intact. Focused automated verification is complete; manual localhost and Meta callback retesting remain pending with the user.

The shared Meta POST WhatsApp dispatch defect is repaired. `whatsapp_business_account` payloads accepted at `/api/integrations/meta/webhook` now dispatch to the Phase 22 WhatsApp processor after strict signature validation; Facebook and Instagram payloads remain on the Phase 24 social processor. WhatsApp resolution matches the signed WABA ID when present plus the phone-number ID. Automated import, replay-duplicate, media-skip, signature, GET-challenge, and social regression coverage passes. Manual real/local signed diagnostic confirmation remains pending with the user.

## Immediate Next Steps

First, the user manually verifies Phase 25: Platform Administrator login lands on `/admin`; dashboard presets and real metrics/charts load; empty/error/loading states remain intentional; Businesses, Users, Feedback, Integrations, Reports, and System Health navigation works; Business Owner, Staff, and Customer accounts cannot access the admin UI or APIs; business sorting/details/suspend/reactivate work; PDF and CSV files download and reflect chosen filters; light/dark and desktop/tablet/mobile layouts are usable; and no credential, token, secret, raw webhook payload, or cross-tenant data appears outside legitimate Platform Administrator oversight.

Before continuing browser verification, the user performs the documented local-only clean database rebuild one command at a time, confirms the seed summary reports 7 development users, 2 businesses, 4 branches, 6 memberships, 6 customers, 11 feedback records, 6 Demo connections, and 0 Live connections, and then signs in with the documented development accounts. This clean rebuild is intentionally not automated by a repository script.

Immediate support action: after restarting the backend, the user reruns the signed WhatsApp diagnostic against `POST http://localhost:5000/api/integrations/meta/webhook` with the configured WABA ID and phone-number ID, confirms the first unique message returns `received: 1` and `imported: 1`, then confirms the Live WhatsApp card/activity and Unified Inbox reflect the import. This is manual verification and must not be marked complete until the user confirms it.

1. User manually verifies Phase 24 Meta setup once Meta Developer access is available: configure `LIVE_META_SOCIAL_ENABLED=true`, `META_WHATSAPP_APP_SECRET`, `META_WHATSAPP_VERIFY_TOKEN`, `META_WHATSAPP_GRAPH_API_VERSION=v26.0`, and `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY`; start backend/frontend; start a temporary HTTPS tunnel to the backend; configure Facebook and Instagram webhook callbacks to `/api/integrations/meta/webhook`; connect Live Facebook and Live Instagram from the existing provider cards with developer/test token input.
2. User manually verifies Phase 24 inbound comments: trigger one Facebook Page comment and one Instagram professional-account comment, confirm each appears in Unified Inbox with Live Facebook/Instagram source details, then repeat the same provider comment IDs or equivalent replay to confirm duplicate-safe webhook delivery.
3. User manually verifies Phase 24 security behavior through preferred UI/API checks: invalid verify token fails, missing/invalid/mutated `X-Hub-Signature-256` fails before parsing, cross-business connection/activity IDs are blocked, inactive default Branch/business is rejected safely, paused/disconnected Live Facebook/Instagram connections do not import, unsupported Instagram mentions/non-comment events are skipped, tokens/raw webhook payloads/signatures are never returned, and imports use `FeedbackProcessingService` rather than direct `Feedback` inserts.
4. User manually verifies Phase 23 real Outlook setup: configure `LIVE_OUTLOOK_ENABLED=true`, Microsoft OAuth client ID/secret/redirect URI/tenant, and the shared integration encryption key; start backend/frontend; connect Outlook from the existing Email Live card; complete Microsoft OAuth; confirm the connected mailbox is masked and the connection can be tested.
5. User manually verifies Phase 23 synchronization: run a first Outlook Inbox sync, confirm up to 20 latest Inbox messages import to Unified Inbox as Email feedback with Outlook source details, confirm attachment metadata appears without binary download, and run a second sync to confirm duplicate-safe delta behavior.
6. User manually verifies Phase 23 security behavior through preferred UI/API checks: duplicate Outlook connection is blocked while Gmail and Outlook coexist, cross-business connection/run/item IDs are blocked, inactive branches cannot be used, tokens/PKCE verifiers/raw Graph payloads/raw message bodies are never returned, mailbox read state is not mutated, and imports use `FeedbackProcessingService` rather than direct `Feedback` inserts.
7. User performs same-day manual WhatsApp test: configure Meta test number, set backend Live WhatsApp environment variables, start backend, start temporary HTTPS tunnel, configure Meta webhook callback to `/api/integrations/whatsapp/webhook`, connect Live WhatsApp to Remera/Gisementi Branch, send a real WhatsApp text message, and confirm it appears in Unified Inbox with Live WhatsApp source details.
8. User manually verifies Phase 22 security behavior through preferred UI/API checks: invalid verify token fails, missing/invalid/mutated `X-Hub-Signature-256` fails before parsing, cross-business connection/activity IDs are blocked, inactive default Branch/business is rejected safely, paused/disconnected Live WhatsApp connections do not import, non-text messages are skipped without media download, repeat provider message IDs deduplicate, tokens/raw webhook payloads/signatures are never returned, and imports use `FeedbackProcessingService` rather than direct `Feedback` inserts.
9. User manually verifies the existing integrations page Live WhatsApp/Facebook/Instagram states: one provider surface per channel with Demo and Live modes, Live setup/edit fields, safe account identifiers, webhook status, Test Connection, no Sync Now for webhook-driven Live connections, webhook activity table, light/dark mode, and responsive layouts.
10. User manually verifies Phase 21 security behavior through preferred UI/API checks: cross-business connection/run/item IDs are blocked, platform administrators without tenant `BusinessMembership` are blocked, inactive branches cannot be used, credentials/tokens/PKCE verifiers/raw MIME/raw headers are never returned, mailbox read state is not mutated, and Live Email imports use `FeedbackProcessingService` rather than direct `Feedback` inserts.
11. User visually retests Phase 20, Phase 21, Phase 22, Phase 23, and Phase 24 `/business/:businessId/integrations` against the existing Phase 20/21 reference direction, including desktop, tablet, mobile, light mode, dark mode, Demo/Live badges, provider cards, Email Live Gmail/Outlook rows, Meta webhook rows, OAuth notices, filters, connection dialogs, progress/result states, summary/activity panels, run history, and webhook activity.
12. User manually verifies Phase 20 `/business/:businessId/integrations`: Owner/Admin access, Manager/Staff blocking, Demo Mode disclosure, provider list, connect/edit Demo connection, active-branch selection, standard and partial-failure scenarios, test connection, pause/resume, disconnect/reconnect, manual sync, run history, item results, duplicate repeat sync, failed-item retry, and imported feedback appearing in `/business/:businessId/feedback`. Also confirm planned integration detail/history URLs redirect to the canonical integrations workspace instead of showing Not Found.
13. User manually verifies Phase 20 tenant/security behavior through preferred UI/API checks: cross-business connection/run/item IDs are blocked, platform administrators without tenant `BusinessMembership` are blocked, inactive branches cannot be used, paused/disconnected connections cannot sync, no raw provider payloads are exposed, no provider credentials are requested for Demo Mode, and imported feedback source details are labeled as simulated Demo Mode data.
14. User manually verifies the shared workspace header on `/business/:businessId/customers` across desktop, tablet, 125% zoom, and mobile widths, confirming the search, active-business selector, theme/notification controls, Refresh, and New Customer actions align side-by-side where space allows and stack cleanly on mobile.
15. User manually verifies shared shadcn-style dropdowns and popover date/date-time controls across public feedback, manual feedback, QR creation, workspace switching, customers, customer detail history, inbox, automation, settings, staff, invitations, light/dark mode, and mobile widths.
16. User manually verifies `/business/:businessId/feedback` compact filter toolbar, advanced filter popover, shadcn-style dropdown behavior, active filter chips, URL state, light/dark mode, and mobile layout.
17. User manually verifies `/business/:businessId/customers` compact filter toolbar, advanced filter popover, URL state, 125% zoom behavior, mobile layout, customer cards, table/card breakpoint, and row actions.
18. User manually verifies business workspace, account portal, account mobile drawer, and admin shell logout affordances, confirming desktop sidebars and content scroll together with the page again, mobile navigation opens/closes correctly, and Sign out returns to `/login`.
19. User manually verifies `/business/:businessId/automations` successful new-rule save resets the builder, update save keeps the selected rule editable, success notices appear, duplicate/delete confirmations block accidental actions, archived rules can be restored as drafts, only archived rules can be permanently deleted, rule rows/cards select the saved rule from the broad clickable area except action buttons, and Review and test searches/paginates feedback through the picker.
20. User manually verifies `/business/:businessId/automations` draft creation after switching action types, especially Set Category to Set Priority/Set Status/Unassign, and confirms invalid or missing category/member/branch targets show safe validation instead of backend 500 errors.
21. User manually verifies `/business/:businessId/automations` rule-builder condition/action rows at normal zoom, 125% zoom, narrower desktop widths, mobile widths, light mode, dark mode, and with long operator/action labels.
22. User manually verifies `/business/:businessId/branches/new` required markers, placeholders, save/back action alignment, normal zoom, 125% zoom, mobile widths, light mode, dark mode, and successful valid branch creation.
23. User manually verifies customer creation from `/business/:businessId/customers`, customer editing from customer detail, and create-from-feedback customer modal behavior.
24. User manually verifies `/business/setup` required markers, placeholders, invalid optional branch email/phone handling, invalid branch code handling, and successful valid business creation.
25. User manually verifies role-based default landing after email login, Google login, already-authenticated `/login` access, and unauthorized role fallback.
26. User manually verifies Phases 11, 12, 13, and 14 together in the browser and through any preferred API/database checks.
27. Confirm Phase 14 owner/admin rule management, URL-backed automation filters, rule lifecycle actions, preview, manual run, automatic feedback-created execution, automatic AI-analysis-completed execution, execution history, human override protection, branch/tenant isolation, and activity timeline system attribution.
28. Confirm Phase 13 AI enabled, disabled, and not-configured states with environment settings before any real provider usage.
29. Confirm AI manual Retry on failed and completed analyses, including exhausted retry-count rows, queued/processing disabled state, preserved previous review display, safe failed-retry message, and successful replacement result.
30. Confirm AI sentiment/status/suggestion filters, feedback drawer AI panel lifecycle messages, suggested-category apply/dismiss/conflict behavior, owner/admin-only settings status, and existing-feedback backfill behavior.
31. Fix any defects found during combined Phase 11, Phase 12, Phase 13, Phase 14, Phase 20, Phase 21, Phase 22, Phase 23, and Phase 24 manual verification.
32. Keep Phase 8, Phase 9, and Phase 10 marked as not fully verified until deferred post-Phase-20 checks pass.

## Deferred Manual Test Scope

- Confirm `/business/:businessId/feedback` list filters, search, pagination, summary cards, URL state, desktop table, and mobile cards.
- Confirm detail drawer viewport positioning, right-edge placement, readable width, full-height layout, moderated backdrop, internal drawer scrolling, body-scroll lock, normal 100% zoom behavior, common zoom behavior, loading, error, close/back-forward behavior, customer/source/attachment display, status transitions, notes, activity timeline, stale-update refresh, and branch access.
- Confirm assignee display, assignee filtering (`me`, `unassigned`, and specific active members), eligible assignee selection, unassignment, inactive/unavailable historical assignee display, and branch-scoped assignment enforcement.
- Confirm category creation/editing/activation/deactivation in Business Settings, category filtering, category assignment/unassignment, inactive historical category display, and tenant-safe category isolation.
- Confirm priority filtering and priority updates for `LOW`, `NORMAL`, `HIGH`, and `URGENT`.
- Confirm owner/admin/manager/staff role behavior, suspended memberships/businesses, and cross-business ID tampering attempts.
- Confirm light mode, dark mode, responsive layouts, loading states, empty states, validation states, conflict states, and error retry states.

## Not Yet In Scope

- Phase 11 and Phase 12 manual verification. Implementation is complete, but the user has not manually verified them yet.
- Phase 13 manual verification. Implementation is complete, but the user has not manually verified it yet.
- Phase 14 manual verification. Implementation, migration, backend, frontend, worker, and tests are complete, but the user has not manually verified it yet.
- Notifications and replies (Phase 15).
- Customer accounts (Phase 16).
- Business Owner dashboard/analytics expansion beyond the existing workspace remains outside this Platform Administrator-only phase.
- Excel export is not implemented; Phase 25 provides PDF and CSV Platform Administrator reports.
- Audit logs and security hardening (Phase 19).
- Phase 20 manual verification. Implementation is complete, but the user has not manually verified it yet.
- Exhaustive Phase 21 Live Gmail security/regression verification. The user reported the core real Gmail connection and synchronization path passed.
- Phase 22 Live WhatsApp Cloud API manual Meta test-number/browser verification. Implementation is complete, but the user has not manually verified it yet.
- Phase 23 Live Outlook / Microsoft Email manual real OAuth/browser synchronization verification. Implementation is complete, but the user has not manually verified it yet.
- Phase 24 Live Facebook + Instagram Meta comment webhook manual Meta/browser verification. Implementation is complete, but the user has not manually verified it yet.
- Live Google Reviews, live X, broader social replies/DMs/publishing/media/moderation, and production social OAuth onboarding.
- Integration Monitoring and Recovery beyond the persisted-state Phase 25 oversight views (future Phase 26).
- Payment processing or subscriptions.
- Business deletion or ownership transfer.

## Later Roadmap

Phase 11 Customer Profiles is implemented and awaits manual verification.

Implemented Phase 11 MVP:

- Business-scoped `Customer` model.
- Nullable `Feedback.customerId`.
- Immutable feedback customer snapshots preserved.
- Customer list and details with branch-safe accessible counts/history.
- Manual customer creation/editing with optimistic concurrency.
- Manual link/unlink feedback.
- Deterministic email/phone matching and human-reviewed possible matches.
- Archive/reactivate instead of hard deletion.
- Minimal audit/activity for profile and link changes.
- Inbox integration that shows customer link state without hiding snapshot data.
- Non-blocking ingestion-service integration through `FeedbackProcessingService`.

Do not include customer accounts, marketing, messaging, AI/fuzzy merging, irreversible merge, exports, external CRM sync, Phase 20 demo connectors, live credentials, notifications, reports, or analytics/search overhauls in the Phase 11 MVP.

Phase 20 is implemented as the deadline-oriented synchronization demonstration phase. It proves the connector architecture with clearly labeled Demo Mode providers, simulated external data, provider-inspired source previews, manual synchronization, synchronization history, connection health, retry behavior, and real Phase 4 ingestion into the Phase 8 unified inbox.

Phase 20 must not claim live provider approval or production connectivity. Demo connectors must convert simulated provider source items into `NormalizedFeedbackInput` and call the existing Phase 4 `FeedbackProcessingService`; they must not insert directly into `Feedback`.

Phase 21 Live Email Integration is implemented for the Gmail-only, OAuth-based, inbound-only MVP. It is manually synchronized, capped to latest 20 Inbox messages initially, cursor-based through Gmail history ID after initial sync, metadata-only for attachments, backed by encrypted backend-only credential storage, and routed through the Phase 20 connector framework plus Phase 4 feedback-processing service. The user reported the core real Gmail connection and synchronization workflow passed; exhaustive security/regression verification and production OAuth review remain pending.

Phases 21 through 24 are live-integration work. Phase 25 is Platform Administrator Dashboard & Reporting:

- Phase 21 - Live Email Synchronization: Gmail-only OAuth MVP implemented; core real Gmail connection and synchronization reported passed by the user, with exhaustive security/regression verification pending. IMAP remains deferred.
- Phase 22 - Live WhatsApp Cloud API: Meta test-number inbound text webhook MVP implemented; manual Meta test-number verification pending.
- Phase 23 - Live Outlook Synchronization: Microsoft Graph OAuth inbound-only MVP implemented; manual real Outlook OAuth/synchronization verification pending. IMAP remains deferred.
- Phase 24 - Live Google Reviews and Social Media Synchronization: Live Facebook and Instagram comment webhook MVP implemented; manual Meta/browser verification pending. Live Google Business Profile, X, replies, DMs, publishing, media download, moderation, multiple social accounts, and production OAuth onboarding remain deferred.
- Phase 25 - Platform Administrator Dashboard & Reporting: implemented; manual browser/report verification pending.
- Phase 26 - Integration Monitoring and Recovery: connector health monitoring, expired token handling, retry queues, provider outage recovery, webhook health, rate-limit handling, synchronization alerts, failed-run recovery, and long-term integration reliability.
