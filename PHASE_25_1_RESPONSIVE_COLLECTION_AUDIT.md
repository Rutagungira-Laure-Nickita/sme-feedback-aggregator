# Phase 25.1 Responsive Collection Audit

Phase 25.2 preservation note (2026-08-17): the supported routes, default policy, per-page local persistence, and justified exceptions below were not changed. New business creation/detail forms and expandable admin record details are authored/detail surfaces, not new repeated-record collection routes.

Phase 25.3 correction note (2026-08-17): user, feedback, and integration summary cards no longer expand inline. Their List/Grid collections, route-specific local-storage keys, default policy, filters, pagination, and compact card summaries are unchanged; details now open in accessible centered modals, so one item can never stretch neighboring Grid cards. Business-detail subsections remain intentionally compact embedded summaries rather than independent collection routes.

## Shared policy

Collections use the reusable `CollectionViewToggle` and `useCollectionView` system. With no saved preference, Grid is selected on small and tablet screens, Grid is selected whenever a collection has zero or at least two items, and List is selected only on a large screen with exactly one item. A manual List/Grid choice is saved under a distinct `sme-collection-view:<page-key>` local-storage key and does not make a server request. The toggle remains visible for supported collections even when the current result contains zero or one item.

## List/Grid collections

- Platform Administrator: Businesses, Users, Feedback, and Integrations.
- Tenant workspace: Unified Feedback, Customers, Branches, Staff, Invitations, Automation Rules, and QR Codes.
- Dense desktop tables remain available as the List representation where they materially improve scanning. Narrow screens use a one-column card list so selecting List cannot create body-level horizontal overflow. Grid uses responsive cards.

## Explicit exceptions

- Admin Dashboard, Business Overview, and System Health are aggregate/diagnostic dashboards, not independently paginated management collections. Their repeated elements are metric or chart widgets whose layout is part of the dashboard hierarchy.
- Admin Reports is an on-demand report builder. The report-type control is a fixed choice set, while preview section tables are the generated report document itself; neither is a persisted report collection or report history.
- Tenant Integrations is a fixed six-provider configuration dashboard with coupled connection actions, summaries, activity, and chronological synchronization results. Provider cards remain the canonical configuration presentation. Run and item histories remain chronological responsive records rather than interchangeable gallery content.
- Customer feedback/activity, feedback workflow activity, automation execution history, and integration run activity are chronological detail timelines. Grid would weaken sequence and audit readability.
- Business Settings categories are an inline reference-data editor inside a settings form, not a standalone collection route. Compact rows preserve activation and edit context.
- Active Sessions is a security control where chronological device rows and the revoke action must remain directly comparable; a gallery view would reduce safety and scanability.
- Public feature/pricing/marketing cards and tables are authored content, not application record collections.
- Notifications, saved exports, report history, and audit-log collection pages do not exist in the current product boundary.

## Responsive audit outcome

- Removed the global 320px body floor and made the root/body min-width safe at approximately 300px.
- Preserved the existing business, account, public, and administrator mobile navigation drawers.
- Reduced base shell gutters at very narrow widths, allowed primary actions to wrap, constrained dialogs to the dynamic viewport with internal scrolling, and kept wide data tables inside explicit horizontal-scroll regions.
- Platform colors flow through shared CSS variables, including primary foreground, hover/soft variants, accent, and focus ring. Phase 25.3 fixes those light/dark tokens to the Indigo design system; saved legacy color columns no longer drive them.
- Manual browser and device verification remains required; Codex did not run browser automation.
