# Deployment

## Supported-Channel Correction Deployment Notes

This correction adds no package, Prisma schema change, migration, environment variable, OAuth scope, provider credential, webhook secret, queue, or storage requirement. Deploy backend and frontend together so the server-side supported-provider policy and client options/actions remain aligned. The separate pending migration `20260821120000_final_product_hardening` must still be applied through the normal migration workflow before serving that hardening release; do not reset, db-push, reseed, or delete historical integration rows.

Before Gmail smoke testing, create the configured label (default `Customer Feedback`) in the connected Gmail mailbox and apply it only to intended customer feedback. Verify labeled genuine mail imports, unlabeled/automated mail does not, a missing label returns a safe configuration error, and an incremental rerun remains duplicate-safe. Verify signed WhatsApp webhook ingestion still works and that its visible `Sync Now` action only refreshes stored activity. After rollout, spot-check owner/admin/customer views and downloaded reports for the five supported channels only. No Meta social or Outlook webhook/OAuth configuration should be enabled for normal product use.

## Final Product Hardening Deployment Notes

Deploy the migration before starting the updated backend, then deploy backend and frontend together:

```text
npm install --include=dev
npx prisma generate --schema=backend/prisma/schema.prisma
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
npm run build
npm run start -w backend
```

Required migration: `20260821120000_final_product_hardening`. Do not use `prisma migrate reset`, `prisma db push`, reseeding, or feedback cleanup. The migration is additive except for extending the existing MySQL feedback-activity enum; it preserves Feedback, ingestion/provider identifiers, deduplication, and related history. Take the normal database backup and verify migration status before rollout. Older backend instances should not remain serving against workflows that depend on the new soft-delete fields during a staggered rollout.

No new package, environment variable, provider credential/permission, worker, queue, storage volume, Vercel/Railway setting, or webhook configuration is required. Existing Gmail OAuth and WhatsApp Cloud API settings are unchanged. Clear stale frontend assets after deployment and execute the hardening checklist in `NEXT_STEPS.md`, including role/tenant checks and a duplicate-safe Gmail/WhatsApp ingestion spot-check.

## Phase 29A Railway Prisma ESM Compatibility

The backend remains native ESM and is compatible with Railway's Node 20/24 runtime without relying on synthetic named exports from Prisma's CommonJS package. Prisma runtime values flow through `backend/src/lib/prisma-runtime.ts`; generated types remain erased direct type imports.

The production sequence must generate Prisma Client before compiling and start the compiled server:

```text
npm install --include=dev
npx prisma generate --schema=backend/prisma/schema.prisma
npm run build -w backend
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
npm run start -w backend
```

`npm run start -w backend` executes `node dist/server.js`. The TypeScript `tsx src/server.ts` path remains valid for development/smoke testing but is not required as the Railway production Start Command. Phase 29A adds no environment variable, schema migration, provider configuration, storage requirement, or database mutation.

## Phase 28 Deployment Notes

Phase 28 requires no dependency, Prisma schema, migration, environment variable, worker, queue, storage volume, provider permission, or new Live integration. Deploy backend and frontend together because new-Business default category provisioning, report labels, inbox filters/presentation, and drawer behavior change in tandem. Existing Gmail OAuth and WhatsApp webhook configuration remains unchanged; Outlook/Facebook/Instagram are not enabled by this phase.

The development-only reconciliation command defaults to a read-only plan:

```powershell
npm run phase28:reconcile
```

Only for the confirmed local deterministic `dev_seed_business_kigali_harvest` fixture, commit with `npm run phase28:reconcile -- --commit`. The script rejects production and non-seed targets, validates ownership, and does not create credentials or Live connections. It is not a production migration and must not be run against real tenant data. Clear cached frontend assets after deployment so the category column/filter, mobile drawers, and public navigation order are current.

## Phase 27 Deployment Notes

Phase 27 requires no migration, Prisma generation, environment variable, provider permission, worker, queue, storage volume, or new package. Deploy backend and frontend together because the owner report Live-only predicates and owner/public UI exposure policy change in tandem. Clear stale frontend assets so removed Pricing and Demo owner surfaces are not retained by cached bundles. Existing Gmail OAuth, WhatsApp webhook, future connector, and Platform Administrator deployment configuration remains unchanged.

## Phase 26 Business Owner Reporting Deployment Notes

Phase 26 requires no migration, Prisma generation, environment variable, queue, worker, storage volume, external provider permission, or new package. It reuses the existing reporting dependencies (`pdfkit`) and the in-memory PDF/CSV export pattern. Deploy the backend and frontend together because the new owner report endpoints (`POST /api/businesses/:businessId/reports/preview` and `POST /api/businesses/:businessId/reports/export`), the `/business/:businessId/reports` route, and the Reports navigation item change in tandem. Existing Platform Administrator reporting endpoints remain unchanged.

The new endpoints are mounted under the existing authenticated business router, so the standard cookie/CORS/`trust proxy` configuration applies unchanged. Owner report exports are generated in memory per authenticated request and returned with `Cache-Control: no-store`; capacity planning should account for concurrent report requests just as for Platform Administrator reports. Clear cached frontend assets after deployment so the new owner route/navigation is picked up.

## Phase 25.4 Deployment Notes

Phase 25.4 requires no migration, Prisma generation, environment variable, queue, worker, storage volume, external provider permission, or new package. Deploy backend and frontend together because the accepted report identifiers, preview document shape, report-aware filters, and Reporting Center choices changed in tandem. Existing in-memory PDF/CSV capacity guidance and the 366-day request limit remain applicable. Clear cached frontend assets so administrators do not submit obsolete report identifiers from a stale bundle.

## Phase 25.3 Deployment Notes

Phase 25.3 creates no new migration and adds no environment variable, worker, queue, provider permission, or external dependency. Deploy backend and frontend together because the backend normalizes compatibility color fields while the frontend stops consuming them. The user confirmed migration `20260817120000_phase_25_2_admin_hardening` is already applied locally; Phase 25.3 leaves that immutable migration untouched. Clear old frontend asset caches during deployment. Legacy `sme-feedback-theme` browser values are removed automatically, while `sme-platform-appearance` is only a first-paint cache and is refreshed from the server.

## Phase 25.2 Deployment Notes

Migration `20260817120000_phase_25_2_admin_hardening` must exist in a target environment's applied history before deploying the Phase 25.2 backend because generated queries expect the expanded business enum, platform settings columns, and admin activity table. The user confirmed the local database already contains the successfully applied migration.

```powershell
cd backend
npx prisma migrate deploy
npm run prisma:generate
npx prisma migrate status
```

Back up the target database first and use the normal deployment migration process. Existing businesses keep their stored status; new businesses created after deployment default to `PENDING`. No new environment variable, background worker, queue, scheduled job, public webhook, or provider credential is introduced. After deployment, verify one pending-to-active flow before inviting normal tenant use and confirm global support/branding settings are appropriate for the environment.

## Phase 25.1 Deployment Notes

Deploy the backend migration, regenerated Prisma Client, backend, and frontend together. Run the normal non-destructive production migration command so `20260816120000_phase_25_1_platform_settings` creates and seeds the singleton before the new backend handles settings requests. No new environment variable, queue, worker, provider credential, storage bucket, or scheduled task is required.

An optional logo is referenced by URL rather than uploaded or stored by this application. Production operators should use a stable HTTPS asset with appropriate availability, dimensions, caching, and cross-origin policy. Invalid or unreachable images do not grant script execution, but manual verification should confirm the chosen host and visual fallback behavior.

## Phase 25 Deployment Notes

Phase 25 adds no environment variables, database migration, scheduled job, queue, external provider call, report-storage directory, or object-storage dependency. Deploy the backend and frontend together because Platform Administrator routing and the `/api/admin/*` contracts change in tandem.

Runtime dependencies added:

- frontend `recharts` for responsive Platform Administrator charts;
- backend `pdfkit` for server-generated PDFs (`@types/pdfkit` is development-only).

PDF and CSV exports are generated in memory per authenticated request and returned with `Cache-Control: no-store`; capacity planning should account for concurrent report requests. The API restricts report ranges to 366 days and uses aggregated/tabular database queries. No writable persistent report volume is required.

The 2026-08-16 Prisma Client regeneration attempt was blocked on Windows because the generated query-engine DLL was already open. There is no Phase 25 schema change, and validation/typecheck/build use the existing client successfully. On a clean deployment/install, the normal dependency install/Prisma generation pipeline should run before starting the backend.

## Intended Targets

- Frontend: Vercel
- Backend: Railway
- Production database: Railway MySQL

## Current Status

Production deployment is not completed.

The current implementation is configured for local development:

- Frontend runs with Vite on `http://localhost:5173`.
- Backend runs with Express on `http://localhost:5000`.
- Database runs locally through XAMPP MySQL/MariaDB.

The Express backend also serves public legal pages directly on port 5000:

```text
http://localhost:5000/privacy
http://localhost:5000/terms
http://localhost:5000/data-deletion
```

Because the current Cloudflare Quick Tunnel points to `http://localhost:5000`, the same paths are available at `https://<current-tunnel>.trycloudflare.com/privacy`, `/terms`, and `/data-deletion` while the backend and tunnel are running. These URLs support Meta Privacy Policy, Terms of Service, and User Data Deletion Instructions configuration. They do not depend on the Vite frontend, authentication, or database availability.

After changing `backend/.env` or `frontend/.env`, restart the affected dev
server so Vite and Express reload the environment values.

The broader public-facing website is implemented as frontend SPA routes:

```text
/
/features
/how-it-works
/pricing
/about
/contact
/privacy-policy
/terms-of-service
```

Production frontend hosting must serve the SPA fallback for these public routes as well as the existing authentication, account, system-status, and wildcard routes.

Production backend hosting must preserve direct HTTP `200` routing for `/privacy`, `/terms`, and `/data-deletion`. A reverse proxy must not rewrite those paths to the frontend or place them behind authentication.

Phase 3 also adds authenticated workspace and administrator SPA routes:

```text
/business
/business/setup
/business/:businessId
/business/:businessId/feedback/manual
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
/admin/businesses
/admin/businesses/:businessId
```

Phase 4 adds an internal backend feedback-processing service and database tables only. It does not add frontend routes, public feedback endpoints, manual-entry endpoints, webhooks, queues, file storage, or external provider services.

Phase 5 backend adds the authenticated manual-entry API endpoint:

```text
POST /api/businesses/:businessId/feedback/manual
```

It reuses the Phase 4 processing service and tables. Phase 5 frontend adds the protected SPA route `/business/:businessId/feedback/manual`. Phase 5 does not add public feedback endpoints, webhooks, queues, file storage, external provider services, environment variables, or Docker.

Phase 6 backend adds public feedback portal APIs:

```text
GET  /api/businesses/:businessId/public-feedback
PATCH /api/businesses/:businessId/public-feedback
POST /api/businesses/:businessId/public-feedback/regenerate
GET  /api/public/feedback/:portalToken
POST /api/public/feedback/:portalToken
```

Phase 6 frontend adds the public SPA route:

```text
/feedback/:portalToken
```

Production frontend hosting must serve the SPA fallback for `/feedback/:portalToken`. The backend constructs public links from `APP_FRONTEND_URL`, so production must set `APP_FRONTEND_URL` to the HTTPS frontend origin. Local documentation and testing should use `http://localhost:5173`.

Phase 7 backend adds QR-code feedback APIs:

```text
GET   /api/businesses/:businessId/public-feedback/qr-codes
POST  /api/businesses/:businessId/public-feedback/qr-codes
POST  /api/businesses/:businessId/public-feedback/qr-codes/:qrCodeId/regenerate
PATCH /api/businesses/:businessId/public-feedback/qr-codes/:qrCodeId
GET   /api/public/feedback/qr/:qrToken
POST  /api/public/feedback/qr/:qrToken
```

Phase 7 frontend adds the protected management route and public QR route:

```text
/business/:businessId/feedback/qr-codes
/feedback/qr/:qrToken
```

Production frontend hosting must serve the SPA fallback for `/feedback/qr/:qrToken`. QR URLs are built from the same `APP_FRONTEND_URL` origin as the Phase 6 public portal. Local QR URLs should use `http://localhost:5173`.

## Environment Files

Create local environment files from the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Adjust values locally as needed. Real `.env` files must remain ignored by Git.

## Backend Environment Variables

Production backend deployments now require:

```env
NODE_ENV=production
PORT=
FRONTEND_URL=
DATABASE_URL=
LOG_LEVEL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=
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
APP_FRONTEND_URL=
EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_MINUTES=1440
PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES=30
STAFF_INVITATION_EXPIRES_IN_HOURS=48
```

Local frontend deployments should point `VITE_API_BASE_URL` at the backend API
origin. The current local development value is:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=
```

Seed-only variables for controlled platform administrator creation:

```env
PLATFORM_ADMIN_EMAIL=
PLATFORM_ADMIN_PASSWORD=
PLATFORM_ADMIN_FIRST_NAME=
PLATFORM_ADMIN_LAST_NAME=
DEVELOPMENT_SEED_ENABLED=true
DEVELOPMENT_SEED_PASSWORD=DevOnlyPass123!
```

Run the controlled seed with `npm run prisma:seed` after the database migrations and environment values are configured. It always creates or reconciles only the dedicated `PLATFORM_ADMIN` for the global administrator layer. In non-production environments, it also reconciles the deterministic comprehensive development dataset unless `DEVELOPMENT_SEED_ENABLED=false`. `NODE_ENV=production` always skips that development dataset. Do not commit real production values; store them in the deployment platform's secret manager.

The clean-database drop/recreate procedure is a local XAMPP recovery operation, not a deployment step. Never run it in production or on a shared database. Deployments must use `prisma migrate deploy` with the committed migration history; they must not use `prisma migrate reset` or `prisma migrate dev`.

The public website implementation did not add new environment variables. Phase 3 adds `STAFF_INVITATION_EXPIRES_IN_HOURS` and reuses the existing SMTP and `APP_FRONTEND_URL` configuration for staff invitation links. Phase 4 and Phase 5 manual entry do not add new environment variables. Phase 6 reuses `APP_FRONTEND_URL` for public portal link construction and adds no new environment variable. Phase 7 also reuses `APP_FRONTEND_URL` for QR feedback links and adds no new environment variable. No payment, billing, contact-submission, analytics, queue, file-storage, CAPTCHA, external storage, QR provider, or tracking provider configuration has been added.

## Google Authentication Configuration

Phase 2B uses a Google OAuth 2.0 Client ID of type Web application. A client secret is not required for this ID-token verification and rendered-button flow.

Manual setup:

1. Create or select a Google Cloud project.
2. Configure Google authentication branding and consent information.
3. Create an OAuth 2.0 Client ID of type Web application.
4. Add the local authorized JavaScript origin:

```text
http://localhost:5173
```

5. Add production frontend origins later when deployment begins.
6. Copy the Web client ID into backend and frontend environment configuration:

```env
# backend/.env
GOOGLE_AUTH_ENABLED=true
GOOGLE_CLIENT_ID=your-google-web-client-id
```

```env
# frontend/.env
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id
```

7. Restart the frontend and backend after changing environment variables.

Use `localhost` consistently for local Google origins and CORS. Do not switch local setup between `localhost` and `127.0.0.1`.

Do not commit real Google credentials. Store production values in Railway, Vercel, or the selected deployment platform's secret manager.

## SMTP Email Configuration

Phase 2C uses Nodemailer with provider-independent SMTP settings. No Gmail, Mailtrap, Brevo, SendGrid, or other provider-specific code is required.

Email delivery is disabled by default:

```env
EMAIL_ENABLED=false
```

With email disabled, the backend still starts and existing login plus Google authentication continue working. New password registration, verification resend, forgot-password, staff invitation creation, and staff invitation resend return `EMAIL_DELIVERY_NOT_CONFIGURED` until SMTP is enabled.

To enable email delivery, configure:

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

For production, `APP_FRONTEND_URL` must be the HTTPS frontend origin so verification, reset, and staff invitation links point to the deployed app. Store SMTP usernames and passwords in the deployment platform secret manager. Do not commit credentials.

## Phase 3 Workspace Production Notes

- Business, branch, membership, branch-assignment, invitation, and platform-administrator oversight APIs are tenant-scoped by backend authorization checks.
- Suspended businesses and suspended or removed memberships are blocked from normal workspace operations.
- Staff invitation tokens are stored as hashes only. Production logs should be reviewed so raw invitation tokens are not added to request logging.
- Business logo upload storage is not implemented. Use only validated `logoUrl` values until a later asset-storage task is approved.
- The later Branch form responsive required-field repair changes only client-side labels, placeholders, and layout; it adds no backend environment variables, backend services, migrations, workers, provider credentials, or deployment infrastructure.
- Do not expose Phase 4 feedback, customer, analytics, connector, report, payment, business-deletion, or ownership-transfer UI in production before those phases are implemented and reviewed.

## Production Auth Cookie Requirements

- Use HTTPS.
- Set `COOKIE_SECURE=true`.
- Keep `COOKIE_SAME_SITE=lax` unless a cross-site frontend/backend deployment requires another setting.
- If `COOKIE_SAME_SITE=none` is required, the cookie must also be secure.
- Set `COOKIE_DOMAIN` only when the frontend and backend need to share cookies across approved subdomains.
- Ensure backend CORS `FRONTEND_URL` exactly matches the deployed frontend origin.
- Keep frontend Axios configured with `withCredentials: true`.

## Public Website Production Notes

- Public pages are accessible to logged-in and logged-out visitors.
- Pricing content is early-access/planned-pricing copy only. Do not treat it as active commercial billing until a real subscription and payment flow is designed, implemented, documented, and legally reviewed.
- The Contact page validates locally and reports that direct form delivery is not configured. Before production contact submissions can work, add a scoped backend endpoint or a documented public inbox in a separate task.
- Privacy Policy and Terms of Service pages are product drafts grounded in the current architecture. They require professional legal review before production launch.
- Do not add public claims about uptime, compliance certifications, company offices, legal jurisdiction, customer counts, partners, or support response guarantees unless they are documented and approved.

## Database Migration Deployment

Phase 2A added migration:

```text
backend/prisma/migrations/20260720120942_phase_2a_auth_foundation/migration.sql
```

Apply migrations in production through the chosen deployment workflow before serving authenticated traffic. Do not run destructive reset commands in production.

Phase 2B added migration:

```text
backend/prisma/migrations/20260721061424_phase_2b_google_auth/migration.sql
```

Apply it after Phase 2A and before enabling Google authentication in production.

Phase 2C added migration:

```text
backend/prisma/migrations/20260721074742_phase_2c_email_verification_password_reset/migration.sql
```

Apply it after Phase 2B and before enabling password registration with required email verification. The migration creates `account_tokens` and marks existing password users verified so pre-Phase-2C accounts remain able to log in.

Phase 3 added migration:

```text
backend/prisma/migrations/20260722135525_phase_3_businesses_branches_staff/migration.sql
```

Apply it after Phase 2C and before enabling the authenticated business workspace. The migration creates businesses, branches, business memberships, membership branch access, staff invitations, staff invitation branch access, and related enum/status/index constraints.

Phase 4 added migration:

```text
backend/prisma/migrations/20260722150908_phase_4_standard_feedback_processing/migration.sql
```

Apply it after Phase 3 and before enabling any future connector or manual-entry workflow that calls the feedback-processing service. The migration creates feedback ingestion tracking, feedback records, attachment metadata records, feedback channel/status enum columns, idempotency uniqueness, external-source uniqueness, feedback lookup indexes, failed-processing inspection indexes, and foreign keys to existing businesses and branches.

No additional deployment services are required for Phase 4:

- No Docker.
- No Redis, BullMQ, RabbitMQ, Kafka, or worker queue.
- No file storage bucket.
- No attachment binary storage.
- No external connector credentials.
- No public webhook exposure.

No additional deployment services are required for the Phase 5 manual-entry backend. No migration is expected because the endpoint stores data through the existing Phase 4 feedback tables. Production operators should account for the endpoint's focused rate limit of 120 manual submissions per 15 minutes per authenticated user and business. Production CORS and cookie behavior remain unchanged: the frontend must send credentials to the configured backend API origin.

Phase 6 added migration:

```text
backend/prisma/migrations/20260724120000_phase_6_public_feedback_portal/migration.sql
```

Apply it after Phase 4 and before enabling public feedback portals. Existing businesses remain disabled by default and do not require token backfilling.

Phase 6 deployment notes:

- Set `APP_FRONTEND_URL` to the public frontend origin so copied links point to the deployed `/feedback/:portalToken` route.
- Keep backend CORS `FRONTEND_URL` aligned with the frontend origin for authenticated portal-management calls.
- Public configuration/submission endpoints do not require cookies, but authenticated settings endpoints still rely on existing cookie/CORS behavior.
- If the backend is behind a proxy, keep `trust proxy` and proxy IP handling configured correctly because public feedback rate limiting uses client IP plus a portal-token prefix.
- No Docker, Redis, queue, worker, file storage, CAPTCHA provider, QR provider, email provider change, or external connector credential is required for Phase 6.

Phase 7 added migration:

```text
backend/prisma/migrations/20260724130000_phase_7_qr_feedback_submissions/migration.sql
```

Apply it after Phase 6 and before creating QR feedback codes. QR code management requires the Phase 6 public portal to be enabled. Existing businesses do not receive QR records automatically.

Phase 7 deployment notes:

- Keep `APP_FRONTEND_URL` set to the public frontend origin so QR URLs point to the deployed `/feedback/qr/:qrToken` route.
- Public QR configuration/submission endpoints do not require cookies, but authenticated QR-management endpoints still rely on existing cookie/CORS behavior.
- If the backend is behind a proxy, keep `trust proxy` and proxy IP handling configured correctly because QR submission rate limiting uses client IP plus a QR-token prefix.
- QR preview, PNG download, and print sheets are generated in the browser from the public QR URL; no QR image storage, QR provider, scan analytics service, file storage, CAPTCHA provider, queue, worker, or external connector credential is required for Phase 7.

## Phase 9 — Feedback Workflow Deployment

Migration: `20260725141331_phase_9_feedback_workflow`

Apply this migration after Phase 8 and before enabling feedback workflow features in production. The migration adds the `Feedback.status` column, creates the `FeedbackActivity` table, and backfills existing feedback to `NEW` status.

### Deployment Order

1. Run Prisma migration: `prisma migrate deploy`
2. Regenerate Prisma Client: `prisma generate`
3. Deploy the updated backend with Phase 9 workflow endpoints.
4. Deploy the updated frontend with the WorkflowPanel component.

### Environment Variables

Phase 9 requires no new environment variables.

### External Services

Phase 9 requires no external services, no Docker changes, no queues, no file storage, and no additional infrastructure.

### Rollback Considerations

If a rollback is required:

- The `status` column on `feedback` has a default value of `NEW`, so downgrading to pre-Phase 9 backend code will leave the column in place but unused.
- The `feedback_activities` table will remain in the database if the migration is not reversed.
- To fully revert, create a down migration that drops the `feedback_activities` table, removes the `FeedbackActivity` and `FeedbackActivityType` references, and drops the `status` column from `feedback`.
- Reverting the migration will lose all existing activity data and status values.

Local manual verification helper:

```bash
npm run feedback:simulate -- --businessId=<id> --channel=MANUAL --idempotencyKey=<key> --message="Great service"
```

## Phase 10 - Assignment, Categories, and Priorities Deployment

Migration: `20260725162942_phase_10_assignment_categories_priorities`

Apply this migration after Phase 9 and before enabling assignment/category/priority workflow features in production. The migration adds feedback priority, nullable assignment/category references, feedback categories, and activity snapshot fields.

### Deployment Order

1. Run Prisma migration: `prisma migrate deploy`
2. Regenerate Prisma Client: `prisma generate`
3. Deploy the updated backend with category and workflow endpoints.
4. Deploy the updated frontend with inbox filters, detail workflow controls, and Business Settings category management.

### Environment Variables

Phase 10 requires no new environment variables.

### External Services

Phase 10 requires no external services, no Docker changes, no queues, no file storage, and no additional infrastructure.

### Rollback Considerations

If a rollback is required:

- The `priority` column on `feedback` has a default value of `NORMAL`, so pre-Phase 10 code will leave it unused.
- Nullable `assigned_to_membership_id` and `category_id` references may remain unused by older code.
- The `feedback_categories` table will remain unless explicitly dropped by a down migration.
- Removing the Phase 10 migration will lose category configuration and assignment/category/priority activity snapshots.

## Phase 11 Customer Profiles Deployment

Migration: `20260726110000_phase_11_customer_profiles`

Apply this migration after Phase 10 and before enabling Customer Profiles in production. The migration adds business-scoped customers, customer activity records, and nullable feedback-to-customer profile links. Existing feedback customer snapshot fields remain in place and are not backfilled destructively.

### Deployment Order

1. Run Prisma migration: `prisma migrate deploy`
2. Regenerate Prisma Client: `prisma generate`
3. Deploy the updated backend with customer profile and feedback-link endpoints.
4. Deploy the updated frontend with Customers navigation, customer list/detail routes, and feedback drawer customer integration.

### Environment Variables

Phase 11 requires no new environment variables.

### External Services

Phase 11 requires no external services, no Docker changes, no queues, no file storage, no browser automation service, and no additional credentials.

### Rollback Considerations

If a rollback is required, the `customers` and `customer_activities` tables and nullable `feedback.customer_id` link can be left unused by older application code. Fully removing the migration would lose customer profiles, customer activity, and feedback profile links, but it must leave original feedback snapshot fields intact.

Phase 20 is now implemented separately as Demo Mode connector synchronization. Phase 11 must still not introduce live provider credentials, provider webhooks, external CRM synchronization, or Phase 21 through Phase 25 behavior.

## Phase 12 Search and Filters Deployment

Phase 12 Full Search and Filters is implemented.

Phase 12 deployment impact:

- No new environment variables.
- No new external services.
- Phase 12 originally required no new packages. The later Feedback Inbox filter display repair adds frontend-only Radix Select/Popover dependencies for styled dropdowns and popovers.
- The later workspace dropdown/date-picker standardization reuses those frontend primitives and adds no backend environment variables, backend services, migrations, workers, provider credentials, or deployment infrastructure.
- The later Customer list filter display and responsive repair reuses the same frontend primitives and changes only client-side presentation/breakpoints; it adds no backend environment variables, backend services, migrations, workers, provider credentials, or deployment infrastructure.
- The later Business workspace header responsive alignment repair changes only shared workspace header flex widths and customer action wrapping; it adds no backend environment variables, backend services, migrations, workers, provider credentials, or deployment infrastructure.
- No background workers, queues, browser automation services, provider credentials, or webhooks.
- No database migration.
- Feedback Inbox date filtering and sorting now use user-facing `Feedback.receivedAt`.
- Customer `latestFeedback` sorting uses branch-safe linked feedback aggregate dates and should be measured before large production rollout.

The helper defaults to dry run. Add `--commit` only when intentionally writing local test data:

```bash
npm run feedback:simulate -- --businessId=<id> --branchId=<id> --channel=MANUAL --idempotencyKey=<key> --message="Great service" --commit
```

Attachment metadata can be supplied with `--attachments=<JSON array>` and is validated/stored as metadata only. For PowerShell, prefer `npm --%` so JSON punctuation is forwarded unchanged:

```powershell
npm --% run feedback:simulate -- --businessId=<id> --branchId=<id> --channel=MANUAL --idempotencyKey=<unique-key> --message="Great service" --attachments=[{"filename":"receipt.jpg","mimeType":"image/jpeg","sizeBytes":245000,"externalUrl":"https://example.com/receipt.jpg","checksum":"sha256-test-checksum","metadata":{"source":"manual-test"}}] --commit
```

Development/manual-verification failure simulation is local-only, requires `--commit`, and refuses production:

```powershell
npm --% run feedback:simulate -- --businessId=<id> --branchId=<id> --channel=MANUAL --idempotencyKey=<unique-failure-key> --message="Trigger local failure" --commit --simulateFailureAfterIngestion
```

Production connectors will call the internal service later. Phase 4 does not expose this helper or a public processing endpoint in production.

## Phase 13 AI Analysis Deployment

Phase 13 AI analysis is implemented and disabled by default. Production operators must explicitly enable it and provide backend-only provider credentials.

Environment variables:

- `AI_ANALYSIS_ENABLED=false`
- `AI_PROVIDER=gemini`
- `AI_MODEL=gemini-3.5-flash`
- `GEMINI_API_KEY=`
- `AI_AUTO_APPLY_CATEGORY=false`
- `AI_CATEGORY_CONFIDENCE_THRESHOLD=0.85`
- `AI_DAILY_BUSINESS_LIMIT=100`
- `AI_MAX_RETRIES=3`
- `AI_REQUEST_TIMEOUT_MS=30000`
- `AI_WORKER_POLL_INTERVAL_MS=5000`
- `AI_WORKER_BATCH_SIZE=5`
- `AI_MAX_INPUT_CHARS=8000`

Deployment notes:

- Provider secrets must be stored in deployment secret managers and must not be committed.
- When AI is disabled, no provider calls are made. When AI is enabled without `GEMINI_API_KEY`, the service reports `NOT_CONFIGURED` and does not call the provider.
- Valid feedback ingestion does not depend on provider availability; analysis is scheduled after feedback persistence and processed by the backend worker.
- Migration `20260727083000_phase_13_ai_feedback_analysis` must be applied with the normal Prisma migration workflow.
- No migration-time AI backfill runs in production. Existing feedback analysis is triggered only by the owner/admin backfill endpoint and is capped at 20 per request plus the configured daily business limit.
- Daily usage is counted from the UTC start of day using `lastAttemptAt`; production monitoring and cost expectations should use the same UTC boundary.
- Manual retry uses the existing worker and schema. No new environment variable, migration, queue service, provider credential, or deployment infrastructure is required for the retry eligibility and previous-review preservation repair.
- Business AI status/backfill is owner/admin-only. The frontend hides the Business Settings AI panel for other tenant roles, and the backend enforces the same restriction.
- Operators should review privacy, cost, rate, retry, and retention policy before enabling analysis for multiple businesses or historical feedback.

## Phase 14 Automation Rules Engine Deployment

Phase 14 Automation Rules Engine deployment implementation is complete. Migration `20260727091241_phase_14_automation_rules` and follow-up migration `20260727143000_phase_14_field_source_backfill` are applied locally.

Current deployment impact:

- New environment variables:
  - `AUTOMATION_WORKER_ENABLED` defaults to `true`.
  - `AUTOMATION_WORKER_POLL_INTERVAL_MS` defaults to `5000`.
  - `AUTOMATION_WORKER_BATCH_SIZE` defaults to `10`.
  - `AUTOMATION_MAX_RETRIES` defaults to `3`.
- No new external services.
- No new packages.
- Prisma schema and migrations were added.
- A database-backed automation worker starts and stops with the backend server when enabled.
- The later Automation builder responsive row repair changes only client-side layout and select-value truncation; it adds no backend environment variables, backend services, migrations, automation workers, provider credentials, or deployment infrastructure.
- The later Automation draft target normalization repair changes only frontend submit normalization and backend automation-definition validation/persistence normalization; it adds no backend environment variables, backend services, migrations, automation workers, provider credentials, or deployment infrastructure.
- The later Automation management UX and archive lifecycle repair adds the local Radix Dialog frontend package and owner/admin automation restore/delete endpoints. It adds no backend environment variables, migrations, automation workers, provider credentials, external services, or deployment infrastructure.
- The later portal sidebar logout repair changes only shared frontend shell logout affordance placement. The fixed-scroll sidebar experiment was reverted at the user's request. It adds no backend environment variables, backend services, migrations, automation workers, provider credentials, external services, packages, or deployment infrastructure.
- No browser automation or screenshot tooling was added by Codex. The two Phase 14 reference assets remain in `frontend/references/`.

Operational behavior:

- The worker uses a database-backed queue with polling interval, batch size, claim token, stale recovery, bounded retries, safe logs, and graceful startup/shutdown.
- Automation failures do not roll back valid feedback persistence or AI analysis completion.
- No migration-time rule execution runs automatically.
- The Phase 14 follow-up migration idempotently backfills field-source rows using existing feedback, activity, and AI-analysis records. It does not execute rules or enqueue automation events during deployment.
- Production operators can disable the worker with `AUTOMATION_WORKER_ENABLED=false` while keeping rule-management APIs available.

## Phase 20 Connector Framework and Demo Synchronization Deployment

Phase 20 Connector Framework and Demo Synchronization deployment implementation is complete for the Demo Mode MVP. Migration `20260803090000_phase_20_connector_framework_demo_sync` is applied locally.

Current deployment impact:

- New environment variables:
  - `INTEGRATION_SYNC_WORKER_ENABLED` defaults to `false`.
  - `INTEGRATION_SYNC_WORKER_POLL_INTERVAL_MS` defaults to `5000`.
  - `INTEGRATION_SYNC_WORKER_BATCH_SIZE` defaults to `5`.
  - `INTEGRATION_SYNC_MAX_RETRIES` defaults to `3`.
- Requires no real provider credentials.
- Requires no provider approval, OAuth callback URLs, webhook registration, live provider secrets, or public backend callback URLs.
- Demo sources are labeled Demo Mode, simulated external data, and not connected to the real provider.
- Manual synchronization uses the real Phase 4 processing service and the existing Phase 8 unified inbox display path.
- Phase 20 frontend SPA routes are `/business/:businessId/integrations`, `/business/:businessId/integrations/:connectionId`, `/business/:businessId/integrations/:connectionId/history`, and `/business/:businessId/integration-runs/:runId`. The first route is canonical; the detail/history routes redirect to the canonical workspace.
- Production frontend hosting must serve the SPA fallback for the Phase 20 protected workspace routes.
- A disabled-by-default integration sync worker hook starts and stops with the backend server only when enabled.
- No new external service, queue, storage bucket, webhook receiver, provider SDK, or provider account configuration is required.
- Production operators should keep `INTEGRATION_SYNC_WORKER_ENABLED=false` unless they intentionally want persisted pending Demo runs processed by the background worker.

## Phase 21 Live Email Deployment

Phase 21 Gmail-only Live Email implementation is complete locally. Migration `20260805090000_phase_21_live_email_gmail_oauth` is applied locally.

Required deployment configuration before enabling Live Email:

- `LIVE_EMAIL_ENABLED=true`.
- `GMAIL_OAUTH_CLIENT_ID`.
- `GMAIL_OAUTH_CLIENT_SECRET`.
- `GMAIL_OAUTH_REDIRECT_URI`, matching the Google OAuth client redirect URI and the backend route `/api/integrations/email/oauth/gmail/callback`.
- `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY`, generated as 32 random bytes encoded with base64 and stored in deployment secret management.

Operational boundaries:

- Live Email starts with manual Inbox-only synchronization, latest-20 initial import, Gmail history-ID incremental cursor, no read-state mutation, metadata-only attachments, no outbound email, and no scheduled sync/webhooks.
- Broad production rollout may require Google OAuth consent verification and any security review required for Gmail scopes.
- Do not commit Gmail OAuth client secrets, mailbox tokens, encrypted credential envelopes, OAuth state values, or test mailbox data.

## Phase 22 Live WhatsApp Cloud API Deployment

Phase 22 Live WhatsApp Cloud API Meta test-number inbound webhook MVP is implemented locally. Migration `20260810120000_phase_22_live_whatsapp_cloud_api` is applied locally.

Required backend environment variables before enabling Live WhatsApp:

```env
LIVE_WHATSAPP_ENABLED=true
META_WHATSAPP_APP_ID=
META_WHATSAPP_APP_SECRET=
META_WHATSAPP_VERIFY_TOKEN=
META_WHATSAPP_GRAPH_API_VERSION=v26.0
INTEGRATION_CREDENTIALS_ENCRYPTION_KEY=
```

Same-day local testing approach:

- Keep backend local at `http://localhost:5000`.
- Install `cloudflared` on Windows from Cloudflare's official downloads.
- Start a temporary Quick Tunnel with:

```powershell
cloudflared tunnel --url http://localhost:5000
```

- Use the generated `https://*.trycloudflare.com` URL only for the webhook callback:

```text
https://<generated-host>/api/integrations/whatsapp/webhook
```

Do not deploy the whole application publicly for the same-day WhatsApp test. Do not use Docker. Do not expose XAMPP. Stop the tunnel after manual testing.

Per-connection Meta access tokens are stored encrypted backend-side after Owner/Admin setup. The Meta App Secret and verify token are backend environment secrets and must not be exposed through frontend `VITE_` variables.

Production Live WhatsApp later may require a stable public backend URL, Meta app configuration, production phone-number onboarding, billing/payment setup, business verification or App Review where Meta requires it, long-lived system-user token strategy, webhook monitoring, and retry/recovery handling.

## Phase 23 Live Outlook / Microsoft Email Deployment

Phase 23 Live Outlook / Microsoft Email inbound OAuth implementation is complete locally. Migration `20260810170000_phase_23_live_outlook_email` is applied locally.

Required backend environment variables before enabling Live Outlook:

```env
LIVE_OUTLOOK_ENABLED=true
MICROSOFT_OAUTH_CLIENT_ID=
MICROSOFT_OAUTH_CLIENT_SECRET=
MICROSOFT_OAUTH_REDIRECT_URI=http://localhost:5000/api/integrations/email/oauth/outlook/callback
MICROSOFT_OAUTH_TENANT=common
MICROSOFT_GRAPH_BASE_URL=https://graph.microsoft.com/v1.0
INTEGRATION_CREDENTIALS_ENCRYPTION_KEY=
```

Microsoft app registration notes:

- Use the Microsoft identity platform authorization-code flow with the backend callback `/api/integrations/email/oauth/outlook/callback`.
- Use delegated permissions only: `offline_access`, `User.Read`, and `Mail.Read`.
- `MICROSOFT_OAUTH_TENANT=common` supports organizational and personal Microsoft accounts where the app registration allows both.

Operational boundaries:

- Live Outlook starts with manual Inbox-only synchronization, latest-20 initial import, Microsoft Graph delta cursor follow-up runs, no read-state mutation, metadata-only attachments, no outbound email, and no scheduled sync/webhooks.
- Do not commit Microsoft OAuth client secrets, mailbox tokens, encrypted credential envelopes, OAuth state values, or test mailbox data.
- Broad production rollout may require Microsoft publisher verification, tenant admin consent depending on organization policy, and provider-specific security review.

## Phase 24 Live Facebook + Instagram Meta Social Deployment

Phase 24 Live Facebook + Instagram Meta Social Feedback Webhook Integration MVP is implemented locally. No Prisma migration was required.

Required backend environment variables before enabling Live Facebook/Instagram social webhooks:

```env
LIVE_META_SOCIAL_ENABLED=true
META_WHATSAPP_APP_SECRET=
META_WHATSAPP_VERIFY_TOKEN=
META_WHATSAPP_GRAPH_API_VERSION=v26.0
INTEGRATION_CREDENTIALS_ENCRYPTION_KEY=
```

The social MVP reuses the existing central Meta App Secret, verify token, and Graph API version environment names introduced for Live WhatsApp. Do not expose these values through frontend `VITE_` variables.

Same-day local testing approach:

- Keep backend local at `http://localhost:5000`.
- Install `cloudflared` on Windows from Cloudflare's official downloads if it is not already available.
- Start a temporary Quick Tunnel with:

```powershell
cloudflared tunnel --url http://localhost:5000
```

- Use the generated `https://*.trycloudflare.com` URL for Facebook and Instagram webhook callbacks:

```text
https://<generated-host>/api/integrations/meta/webhook
```

Before tunnel testing, verify the GET handshake directly against localhost with the existing backend verify-token value:

```powershell
curl.exe --get "http://localhost:5000/api/integrations/meta/webhook" --data-urlencode "hub.mode=subscribe" --data-urlencode "hub.verify_token=<existing META_WHATSAPP_VERIFY_TOKEN value>" --data-urlencode "hub.challenge=12345"
```

The expected response is HTTP `200`, `Content-Type: text/plain`, and the exact body `12345`. GET verification does not need `X-Hub-Signature-256`; signed POST delivery still requires it.

The Live WhatsApp callback remains separate:

```text
https://<generated-host>/api/integrations/whatsapp/webhook
```

The shared signed Meta callback also accepts `whatsapp_business_account` deliveries and dispatches them to the same Phase 22 WhatsApp processor after raw-body signature validation. The dedicated WhatsApp callback remains supported for existing Meta configuration.

Do not deploy the whole application publicly for same-day Meta social testing. Do not use Docker. Do not expose XAMPP. Stop the tunnel after manual testing.

Manual Meta app setup notes:

- Live Facebook MVP expects a developer/test Page access token and a Facebook Page ID for comment webhook testing.
- Live Instagram MVP expects a developer/test token for an Instagram professional account, an Instagram professional account ID, and account type `BUSINESS` or `CREATOR`.
- Subscribe only to the comment webhook fields needed for the MVP. Replies, DMs, Messenger, publishing, moderation, media downloads, production OAuth onboarding, and multiple same-provider social accounts are out of scope.

Production rollout later may require a stable public backend URL, Meta app configuration, business verification or App Review where Meta requires it, a proper OAuth onboarding/token-refresh strategy, webhook monitoring, retry/recovery handling, and provider-specific rate-limit/error handling.

## Future Integration Deployment Considerations

Remaining live synchronization scope and Phase 26 monitoring/recovery:

- Will require provider-specific credentials, OAuth applications, callback URLs, webhook endpoints, webhook secrets, and production secret management.
- Will require deployed public backend URLs for OAuth redirects and webhook delivery where providers require callbacks.
- Will require provider approval or business verification where providers require it, especially for Google Business Profile and WhatsApp Business Platform.
- Will require secure token storage or encrypted credential persistence, token refresh handling, expired-token recovery, provider permission failure handling, and disconnect/reconnect flows.
- Will require rate-limit handling, retry queues or equivalent retry orchestration, provider outage recovery, synchronization alerts, failed-run recovery, and long-term monitoring.
- Must not be enabled in production until the relevant live-provider security, API, database, and operational documentation is completed.

## Docker

Docker is not used in the current project setup. There is no Docker Compose file and no Docker-related script.

## Service Workers

The project does not intentionally deploy a service worker or PWA asset during
Phase 1 or Phase 2A. If Workbox messages appear while testing localhost, remove
stale browser service workers and clear localhost site data before retesting.
