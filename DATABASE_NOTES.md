# Database Notes

## Supported-Channel Correction Database Impact

No Prisma schema, migration, enum, column, index, or stored production/development row was changed. Historical Demo, Outlook, Google Reviews, X, Facebook, and Instagram connections, synchronization runs, webhook deliveries, and feedback remain physically retained for audit and compatibility; operational queries exclude them through application predicates. Do not delete or rewrite these rows as part of rollout.

The existing nullable `IntegrationConnection.synchronizationFolder` field stores the configured Gmail label, defaulting in service behavior to `Customer Feedback`; this is non-secret configuration and requires no migration. Changing it clears the Gmail cursor through existing fields. Fresh development seed now creates no integration fixtures and only native Manual Entry/Public Form/QR Code feedback fixtures; existing historical rows are not cleaned up when seed logic is inspected or rerun. The previously created `20260821120000_final_product_hardening` migration remains pending and immutable; this correction neither applies nor edits it.

## Final Product Hardening Database Impact

Migration `20260821120000_final_product_hardening` is created and intentionally not applied by Codex. It must be applied with the normal deployment migration workflow before this backend version serves traffic. It does not rewrite or remove existing feedback/provider data.

- `Feedback.deletedAt` is a nullable removal timestamp.
- `Feedback.deletedByMembershipId` is a nullable audited actor relation with `ON DELETE SET NULL`.
- `BusinessMembership.deletedFeedbacks` is the inverse relation.
- `FeedbackActivityType` adds `FEEDBACK_EDITED` and `FEEDBACK_DELETED`.
- Indexes cover `(businessId, deletedAt, receivedAt)` and the deletion actor foreign key.

Deletion is application-level soft deletion. Existing Feedback IDs, FeedbackIngestion rows, unique external/provider identifiers, synchronization/webhook history, attachments, workflow activity, field state, AI analysis, automation records, and Customer activity remain stored. Ordinary product queries explicitly require `deletedAt: null`; this preserves provider deduplication and audit history. No applied migration was edited, and no reset, db push, seed, reconciliation, or development/production row mutation was run.

## Phase 29A Database Impact

No Prisma schema, datasource, model, enum, column, index, migration, seed behavior, or stored row changed. Prisma Client 6.19.3 was regenerated from the existing `prisma-client-js` generator solely to verify the ESM runtime adapter. No migrate reset, db push, data reconciliation, or database mutation was run.

## Phase 28 Deterministic Data Reconciliation

- No Prisma schema or migration change was required. Applied migrations were not edited and neither `prisma db push` nor any reset was run.
- Fresh development seed uses the exact 13 active Kigali Waffle Cuisine categories. Stable IDs were retained for Service Quality, Billing & Payments, Praise / Compliment, Product / Feature Request, and the repurposed deterministic Legacy row (`Other`); eight missing `dev_seed_category_*` rows were added.
- The local canonical Business was renamed in place. Committed reconciliation counts across the two guarded commits: Business 1 updated; Branch 3 updated; Category 8 created/5 updated; Customer 2 updated; deterministic Feedback 10 updated; deterministic FeedbackActivity 11 updated; deterministic FeedbackAIAnalysis 2 updated; QR 2 updated/1 unchanged; AutomationRule 2 updated.
- Final canonical counts are 3 branches, 13 active categories, 6 customers, 15 feedback, 3 QR codes, 2 automation rules, and 7 integration connections.
- Protected counts remained 5 non-seed feedback and 1 Live connection (connected WhatsApp on `dev_seed_branch_remera`); Live Email count was 0. The second dry run reported zero pending mutations.
- The tenant-isolation seed Business remains unchanged. The reconciliation refuses production, rejects non-`dev_seed_*` targets, validates Business ownership, defaults to dry-run, and never creates credentials or Live connections.

## Phase 27 Database Impact

No Prisma model, enum, column, index, migration, seed, or stored row changed. Applied migrations remain untouched. Existing deterministic Demo connections and QR fixtures were not deleted or renamed; Business Owner UI/report queries now exclude Demo integrations through application/query predicates. No report or dashboard cache is persisted.

## Phase 26A Database Impact

No Prisma schema, migration, seed, database row, report persistence, or development-data change was made. Provider adoption is aggregated in memory from the existing tenant-scoped `IntegrationConnection` query, and export branding is report-document metadata only. Applied migration history remains untouched.

## Phase 26 Business Owner Reporting Database Impact

No Prisma schema, model, column, enum, index, seed, or migration change was required. The Business Owner report reads the same persisted Business, Branch, BusinessMembership, Customer, Feedback, FeedbackAIAnalysis, IntegrationConnection, SynchronizationRun, IntegrationWebhookDelivery, AutomationRule, and AutomationExecution truth used by Platform Administrator reporting, always scoped by the authenticated authorized Business. Branch filtering uses the existing `Feedback.branchId` and `IntegrationConnection.defaultBranchId` relations; Customer profiles and branch inventory are explicitly business-wide because those records have no branch ownership relation. Report files and history remain unpersisted.

## Phase 25.4A Database Impact

No Prisma schema, migration, seed, stored enum, or database row changed. Scope corrections use existing relations: `Feedback.branchId`, `MembershipBranchAccess`/`BusinessMembership.allBranchesAccess`, and `IntegrationConnection.defaultBranchId`. `Customer.businessId` and Business lifecycle state have no Branch ownership relation, so their Branch-filtered Executive values remain explicitly business-wide. The applied migration history remains untouched.

## Phase 25.4 Database Impact

No Prisma schema, model, column, enum, index, seed, or migration change was required. The three consolidated reports read existing Business, Branch, User, BusinessMembership, Customer, Feedback, FeedbackCategory, FeedbackAIAnalysis, IntegrationConnection, SynchronizationRun, IntegrationWebhookDelivery, AutomationRule, and AutomationExecution truth. Filtered feedback trends use parameterized database-side MySQL date buckets so business/branch/channel/status/sentiment scopes agree with the corresponding KPI/distribution queries. Report files and history remain unpersisted.

## Phase 25.3 Database Impact

No new Prisma model, column, enum, table, or migration was created. Existing `PlatformSettings.primaryColor` and `accentColor` columns remain for compatibility but are no longer design-system inputs. The already-applied migration `20260817120000_phase_25_2_admin_hardening` remains byte-for-byte identical to its original Phase 25.2 creation text. The settings service normalizes reads and create/update writes, and frontend/report rendering uses fixed Indigo, so older stored arbitrary values cannot recolor UI or reports and no database-level normalization migration is required. The Phase 25.2 business lifecycle and safe `PlatformAdminActivity` schema are unchanged.

## Phase 25.2 Administration Hardening

Migration `20260817120000_phase_25_2_admin_hardening` was not applied by Codex. The user confirmed it was applied successfully on 2026-08-17 at 09:44:10.207, `rolled_back_at` is `NULL`, and Prisma reports the schema up to date. It is immutable migration history.

- Extends `BusinessStatus` with `PENDING`, `REJECTED`, and `ARCHIVED`, and changes the default for newly inserted businesses from `ACTIVE` to `PENDING`. Existing stored `ACTIVE`/`SUSPENDED` values are not rewritten.
- Extends singleton `PlatformSettings` with `platformDescription`, `heroSupportingText`, `primaryCtaLabel`, `secondaryCtaLabel`, `supportEmail`, optional `supportPhone`, `defaultReportRangeDays`, and `reportFooterText`.
- Updates only untouched Phase 25.1 default colors from indigo/green to pink; administrator-customized colors remain unchanged. This records the immutable Phase 25.2 history; Phase 25.3 runtime normalization prevents those stored values from driving UI or report colors.
- Adds `PlatformAdminActivity` with actor, bounded action/target identifiers, safe summary, optional safe JSON metadata, timestamp, and lookup indexes. It intentionally stores no feedback message, password/token material, provider credentials, or raw secret values.

The Phase 25.1 migration `20260816120000_phase_25_1_platform_settings` was reported applied locally by the user before this implementation.

## Phase 25.1 Platform Settings

Migration `20260816120000_phase_25_1_platform_settings` creates a singleton `platform_settings` table and seeds ID `platform`. It stores bounded branding text, optional logo URL, two seven-character hexadecimal colors, a MySQL enum-backed `PlatformAppearance` (`SYSTEM`, `LIGHT`, `DARK`), an internal updater user ID, and timestamps. No tenant relation or business-owned settings row is added because these values apply globally. The application service also supplies safe compiled defaults if the singleton record is absent after the table exists and uses an upsert for administrator updates.

The migration was created and schema/client validation passed, but Codex did not apply it to the local database. Apply it during the user-owned clean rebuild/migration workflow before runtime settings verification.

## Phase 25 Platform Administrator Dashboard & Reporting

No Prisma schema change or migration was required. Phase 25 reads existing indexed business, user, membership, branch, customer, feedback, AI-analysis, automation, integration-connection, synchronization-run/item, and webhook-delivery records. Dashboard time series use database-side date buckets, while distributions use Prisma `count`/`groupBy`; the frontend does not download all feedback to compute aggregates.

Report history and generated files are not persisted. On-demand browser download meets the current requirement without a report table, blob column, filesystem path, object storage, or cleanup lifecycle. A future history feature should be introduced only with explicit retention/storage requirements.

## Database Choice

The application uses a MySQL-compatible database with Prisma ORM.

Local development uses the MySQL/MariaDB server provided by XAMPP. Docker is not required and is not part of the Phase 1 setup.

## Local Database

Recommended database name:

```text
sme_feedback_aggregator
```

Recommended phpMyAdmin address:

```text
http://localhost/phpmyadmin
```

Default local development connection example:

```env
DATABASE_URL="mysql://root:@localhost:3306/sme_feedback_aggregator"
```

This assumes:

- Username: `root`
- Password: empty
- Port: `3306`

These values must stay in environment files only. They must not be hardcoded in application code.

## Prisma Setup

The Prisma schema is located at:

```text
backend/prisma/schema.prisma
```

The datasource uses:

```prisma
url = env("DATABASE_URL")
```

The reusable Prisma client is located at:

```text
backend/src/lib/prisma.ts
```

## Local Clean Rebuild and Development Seed

The 2026-08-16 recovery audit confirmed that the current Prisma schema is represented by the 17 committed migration directories through `20260810170000_phase_23_live_outlook_email`; Phase 24 required no migration. No schema or migration file was changed for the development seed.

For a disposable corrupted local database, the approved recovery path is user-run and local-only: drop and recreate exactly `sme_feedback_aggregator`, run `prisma migrate deploy` from `backend/`, regenerate Prisma Client, run `prisma db seed`, and finish with `prisma migrate status`. Do not use `prisma migrate reset`, do not edit previously applied migrations, and do not run the drop command against any shared or production server.

PowerShell runbook for the default passwordless XAMPP `root` account, executed one command at a time:

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' --host=127.0.0.1 --port=3306 --user=root --execute='SELECT @@hostname AS server_name, @@port AS server_port;'
```

After confirming this is the disposable local server, this is the only destructive step:

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' --host=127.0.0.1 --port=3306 --user=root --execute='DROP DATABASE IF EXISTS `sme_feedback_aggregator`; CREATE DATABASE `sme_feedback_aggregator` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
```

```powershell
Set-Location 'C:\Users\HP\Videos\sme-feedback-aggregator\backend'
```

```powershell
npx prisma migrate deploy
```

```powershell
npx prisma generate
```

```powershell
npx prisma db seed
```

```powershell
npx prisma migrate status
```

If the local MySQL account has a password, add `--password` to each `mysql.exe` command so the client prompts securely; do not place the password in the command history.

`backend/prisma/seed.ts` still reconciles the environment-configured platform administrator. Outside production, it also invokes the stable `dev_seed_*` fixture module. The module uses record-level upserts and deterministic IDs, owns no arbitrary user data, and produces 7 login users, 2 businesses, 4 branches, 6 memberships, 6 customers, 11 feedback records, and 6 Demo integration connections. It also creates categories, branch access, public portal/QR fixtures, ingestion and workflow history, AI result states, automation definitions/history, synchronization runs/items, and one metadata-only attachment. It does not create Live connections, credential/OAuth/webhook records, sessions, tokens, invitations, notifications, or external jobs.

## Current Schema

Phase 4 defines authentication models, external account linking, account tokens, businesses, branches, business memberships, branch access, staff invitations, and the standard feedback-processing foundation.

Enums:

- `UserRole`
  - `PLATFORM_ADMIN`
  - `BUSINESS_OWNER`
  - `STAFF`
  - `CUSTOMER`
- `AccountStatus`
  - `ACTIVE`
  - `SUSPENDED`
  - `DISABLED`
- `ExternalAuthProvider`
  - `GOOGLE`
- `AccountTokenType`
  - `EMAIL_VERIFICATION`
  - `PASSWORD_RESET`
- `BusinessStatus`
  - `ACTIVE`
  - `SUSPENDED`
- `BranchStatus`
  - `ACTIVE`
  - `INACTIVE`
- `BusinessMemberRole`
  - `OWNER`
  - `ADMIN`
  - `MANAGER`
  - `STAFF`
- `BusinessMembershipStatus`
  - `ACTIVE`
  - `SUSPENDED`
  - `REMOVED`
- `StaffInvitationStatus`
  - `PENDING`
  - `ACCEPTED`
  - `CANCELLED`
  - `EXPIRED`
- `FeedbackChannel`
  - `MANUAL`
  - `PUBLIC_FORM`
  - `QR_CODE`
  - `WHATSAPP`
  - `INSTAGRAM`
  - `X`
  - `GOOGLE_REVIEW`
  - `EMAIL`
  - `OTHER`
- `FeedbackIngestionStatus`
  - `PROCESSING`
  - `COMPLETED`
  - `FAILED`

Models:

- `User`
  - String `id`
  - Unique lowercase `email`
  - Nullable `passwordHash` for future Google-only account support
  - `firstName`
  - `lastName`
  - `role`
  - `status`
  - Nullable `emailVerifiedAt`
  - `lastLoginAt`
  - `createdAt`
  - `updatedAt`
- `Session`
  - String `id`
  - `userId`
  - `refreshTokenHash`
  - `expiresAt`
  - `lastUsedAt`
  - `revokedAt`
  - Optional `ipAddress`
  - Optional `userAgent`
  - `createdAt`
  - `updatedAt`
- `ExternalAccount`
  - String `id`
  - `userId`
  - `provider`
  - `providerAccountId`
  - Optional `providerEmail`
  - Optional `displayName`
  - Optional `avatarUrl`
  - `createdAt`
  - `updatedAt`
  - Optional `lastUsedAt`
- `AccountToken`
  - String `id`
  - String `userId`
  - `type`
  - Unique `tokenHash`
  - `expiresAt`
  - Optional `usedAt`
  - Optional `requestedIp`
  - `createdAt`
- `Business`
  - String `id`
  - Profile, contact, address, timezone, optional `website`, optional `logoUrl`
  - Public feedback portal fields: `publicFeedbackEnabled`, nullable unique `publicFeedbackToken`, and nullable `publicFeedbackWelcomeMessage`
- `PublicFeedbackQrCode`
  - String `id`
  - `businessId`
  - Optional `branchId`
  - `name`
  - Unique `publicToken`
  - `portalTokenFingerprint`
  - `isActive`
  - Optional `createdByMembershipId`
  - `createdAt`
  - `updatedAt`
  - `status`
  - `createdByUserId`
  - timestamps
- `Branch`
  - String `id`
  - `businessId`
  - name, unique business-scoped code, address/contact fields
  - `isPrimary`
  - `status`
  - timestamps
- `BusinessMembership`
  - String `id`
  - `businessId`
  - `userId`
  - business-level `role`
  - membership `status`
  - `allBranchesAccess`
  - optional `invitedByUserId`
  - optional `joinedAt`
  - timestamps
- `MembershipBranchAccess`
  - Composite primary key `[membershipId, branchId]`
  - `createdAt`
- `StaffInvitation`
  - String `id`
  - `businessId`
  - normalized `invitedEmail`
  - invited business role, status, branch-access mode
  - unique `tokenHash`
  - expiry and send/accept/cancel timestamps
  - inviter and optional accepter
- `StaffInvitationBranch`
  - Composite primary key `[invitationId, branchId]`
- `FeedbackIngestion`
  - String `id`
  - String `businessId`
  - String `branchId`
  - `channel`
  - Optional `externalId`
  - Required `idempotencyKey`
  - SHA-256 `payloadHash`
  - `status`
  - `processingVersion`
  - Optional safe `errorCode`
  - Optional sanitized `errorMessage`
  - `startedAt`
  - Optional `completedAt`
  - timestamps
- `Feedback`
  - String `id`
  - String `businessId`
  - String `branchId`
  - Unique `ingestionId`
  - `channel`
  - Optional `externalId`
  - Optional `title`
  - Required `message`
  - Optional integer `rating`
  - Optional customer snapshot fields: `customerName`, `customerEmail`, `customerPhone`
  - Optional `sourceUrl`, `languageCode`, and `occurredAt`
  - `receivedAt`
  - Optional JSON `sourceMetadata`
  - timestamps
- `FeedbackAttachment`
  - String `id`
  - String `feedbackId`
  - `filename`
  - `mimeType`
  - Optional `sizeBytes`
  - Optional `externalUrl`
  - Optional `checksum`
  - Optional JSON `metadata`
  - `createdAt`

Relations and indexes:

- `User.sessions` relation.
- `User.externalAccounts` relation.
- `Session.user` relation with cascade delete on user deletion.
- `ExternalAccount.user` relation with cascade delete on user deletion.
- `AccountToken.user` relation with cascade delete on user deletion.
- Unique index on `User.email`.
- Unique index on `[ExternalAccount.provider, ExternalAccount.providerAccountId]`.
- Unique index on `[ExternalAccount.userId, ExternalAccount.provider]`.
- Unique index on `AccountToken.tokenHash`.
- Indexes on `User.role`, `User.status`, `Session.expiresAt`, and `Session.userId` plus `Session.revokedAt`.
- Index on `ExternalAccount.userId`.
- Indexes on `[AccountToken.userId, AccountToken.type]` and `AccountToken.expiresAt`.
- Unique index on `[Branch.businessId, Branch.code]`.
- Unique index on `[BusinessMembership.businessId, BusinessMembership.userId]`.
- Unique index on `StaffInvitation.tokenHash`.
- Indexes on business, branch, membership, and invitation status/expiry fields.
- Foreign keys enforce business-to-branch, business-to-membership, membership-to-branch-access, business-to-invitation, and invitation-to-branch-access relationships.
- Foreign keys enforce feedback-ingestion-to-business, feedback-ingestion-to-branch, feedback-to-business, feedback-to-branch, feedback-to-ingestion, and attachment-to-feedback relationships.
- Unique index on `[FeedbackIngestion.businessId, FeedbackIngestion.channel, FeedbackIngestion.idempotencyKey]`.
- Unique index on `[FeedbackIngestion.businessId, FeedbackIngestion.channel, FeedbackIngestion.externalId]`. MySQL permits multiple `NULL` external IDs while still preventing duplicate non-null external IDs in this scope.
- Unique index on `Feedback.ingestionId`.
- Unique index on `[Feedback.businessId, Feedback.channel, Feedback.externalId]`, also allowing multiple `NULL` external IDs under MySQL semantics.
- Indexes on `Feedback.businessId + receivedAt`, `Feedback.branchId + receivedAt`, and `Feedback.channel`.
- Indexes on `FeedbackIngestion.status`, `FeedbackIngestion.businessId + createdAt`, and `FeedbackIngestion.status + createdAt` for processing and failed-record inspection.
- Index on `FeedbackAttachment.feedbackId`.

No connector, notification, reply, report, analytics, payment, AI, automation, customer-account, or external-integration models exist yet.

The public website implementation did not change the Prisma schema, add migrations, or introduce contact, payment, marketing, legal, analytics, feedback, business, branch, staff, or connector tables.

## Current Migrations

Phase 2A migration:

```text
backend/prisma/migrations/20260720120942_phase_2a_auth_foundation/migration.sql
```

This migration was applied successfully to the local XAMPP MySQL/MariaDB database with:

```bash
npx prisma migrate dev --name phase_2a_auth_foundation --skip-generate
```

The 2026-07-21 stabilization pass confirmed `npx prisma migrate status` reports the database schema is up to date. No destructive migration, reset, drop, or Phase 3 model was introduced.

Phase 2B migration:

```text
backend/prisma/migrations/20260721061424_phase_2b_google_auth/migration.sql
```

This migration was created and applied successfully to the local XAMPP MySQL/MariaDB database with:

```bash
npx prisma migrate dev --name phase_2b_google_auth --skip-generate
```

The Phase 2B migration:

- Adds nullable `users.email_verified_at`.
- Creates `external_accounts`.
- Creates the `GOOGLE` provider enum value.
- Adds unique provider/account and user/provider constraints.
- Adds cascade delete from `external_accounts.user_id` to `users.id`.

`npx prisma migrate status` reports 2 migrations and the database schema is up to date.

Phase 2C migration:

```text
backend/prisma/migrations/20260721074742_phase_2c_email_verification_password_reset/migration.sql
```

This migration was created with:

```bash
npx prisma migrate dev --name phase_2c_email_verification_password_reset --create-only
```

It was then safely edited to include the controlled legacy-user verification update and applied with:

```bash
npx prisma migrate dev --skip-generate
```

The Phase 2C migration:

- Creates `account_tokens`.
- Adds `AccountTokenType` values through the MySQL enum column.
- Adds cascade delete from `account_tokens.user_id` to `users.id`.
- Adds token hash, user/type, and expiry indexes.
- Sets `email_verified_at = COALESCE(email_verified_at, created_at)` for existing users where `password_hash IS NOT NULL` and `email_verified_at IS NULL`.

This legacy update preserves pre-Phase-2C password users so manually verified development accounts are not locked out. It does not mark future password registrations verified automatically.

`npx prisma migrate status` reports 3 migrations and the database schema is up to date.

Phase 3 migration:

```text
backend/prisma/migrations/20260722135525_phase_3_businesses_branches_staff/migration.sql
```

This migration was created with:

```bash
npx prisma migrate dev --name phase_3_businesses_branches_staff --create-only
```

It was applied with:

```bash
npx prisma migrate dev --skip-generate
```

The Phase 3 migration:

- Creates `businesses`.
- Creates `branches`.
- Creates `business_memberships`.
- Creates `membership_branch_access`.
- Creates `staff_invitations`.
- Creates `staff_invitation_branches`.
- Adds MySQL enum columns for business status, branch status, membership role/status, and invitation status.
- Adds unique constraints for branch codes within a business, memberships per business/user, and invitation token hashes.
- Adds status, expiry, owner/creator, and relation indexes.
- Adds foreign keys with cascade behavior for tenant-owned child records and restrict/set-null behavior for user creator/inviter/accepter references.

`npx prisma migrate status` reports 4 migrations and the database schema is up to date.

Phase 4 migration:

```text
backend/prisma/migrations/20260722150908_phase_4_standard_feedback_processing/migration.sql
```

This migration was created with:

```bash
npx prisma migrate dev --name phase_4_standard_feedback_processing --create-only
```

It was applied with:

```bash
npx prisma migrate dev --skip-generate
```

The Phase 4 migration:

- Creates `feedback_ingestions`.
- Creates `feedback`.
- Creates `feedback_attachments`.
- Adds MySQL enum columns for feedback channel and ingestion status.
- Adds idempotency uniqueness on `business_id`, `channel`, and `idempotency_key`.
- Adds external-source uniqueness on `business_id`, `channel`, and `external_id` for ingestion and feedback rows.
- Adds one-to-one uniqueness between `feedback.ingestion_id` and `feedback_ingestions.id`.
- Adds feedback lookup indexes by business/received time, branch/received time, and channel.
- Adds ingestion status and failed-processing inspection indexes.
- Adds attachment lookup index by `feedback_id`.
- Adds foreign keys to existing Phase 3 `businesses` and `branches` records.

`npx prisma migrate status` was run after applying the migration and exited successfully. Phase 3 and Phase 4 have since been manually verified by the user.

Phase 5 backend did not add a Prisma migration or schema change. The manual-entry connector reuses the existing Phase 4 `FeedbackIngestion`, `Feedback`, and `FeedbackAttachment` models.

Phase 5 frontend did not add a Prisma migration or schema change. The Add customer feedback page submits to the Phase 5 backend endpoint, which persists through the existing Phase 4 feedback tables.

Phase 6 migration:

```text
backend/prisma/migrations/20260724120000_phase_6_public_feedback_portal/migration.sql
```

The Phase 6 migration:

- Adds `businesses.public_feedback_enabled` with default `false`.
- Adds nullable unique `businesses.public_feedback_token`.
- Adds nullable `businesses.public_feedback_welcome_message`.
- Adds indexes for the public feedback token and enabled flag.
- Does not backfill tokens, enable existing businesses, create a public submission table, create a customer table, or change feedback/attachment tables.

Phase 6 was applied locally with:

```bash
npx prisma migrate deploy
```

`npx prisma migrate dev --name phase_6_public_feedback_portal --create-only` was attempted first, but Prisma refused because the shell is non-interactive. The checked-in migration SQL is the minimal schema change produced from the formatted Prisma schema.

Phase 7 migration:

```text
backend/prisma/migrations/20260724130000_phase_7_qr_feedback_submissions/migration.sql
```

The Phase 7 migration:

- Adds `public_feedback_qr_codes` for managed public QR-code links.
- Stores each QR code's generated public token separately from the Phase 6 portal token.
- Stores a SHA-256 fingerprint of the current Phase 6 portal token, allowing old QR links to become unavailable after public portal token regeneration.
- Supports business-wide QR codes through nullable `branch_id` and branch-specific QR codes through a restricted branch foreign key.
- Tracks active/inactive QR state without deleting historical feedback.
- Links QR creation to `business_memberships` when available and preserves QR rows if that membership is removed.
- Adds lookup indexes by business/active state, business/branch, branch, and creator.
- Does not add scan analytics, QR image blobs, public attachment tables, customer profiles, inbox/workflow tables, notifications, reports, or external integrations.

Phase 7 was applied locally with:

```bash
npx prisma migrate deploy
```

## Phase 4 Feedback Idempotency Strategy

Every processing request requires an idempotency key. The service resolves the branch, normalizes input, and computes a canonical SHA-256 payload hash before creating rows.

- Reusing the same `[businessId, channel, idempotencyKey]` with the same payload hash returns the existing feedback as a duplicate.
- Reusing the same idempotency key with a different hash returns `FEEDBACK_IDEMPOTENCY_CONFLICT`.
- Reusing the same non-null `[businessId, channel, externalId]` with compatible payload data returns the existing feedback as a duplicate.
- Reusing the same external ID with incompatible payload data returns `FEEDBACK_EXTERNAL_ID_CONFLICT`.
- Database unique constraints protect concurrent requests; the service catches uniqueness races and re-reads the existing processing result.
- Attachment rows are created only inside the transaction that creates the feedback row, so repeated duplicate submissions do not create additional attachments.

## Phase 4 Customer Snapshot Limitation

Phase 4 intentionally does not create a `Customer` model. Feedback stores only optional normalized contact snapshots:

- `customerName`
- `customerEmail`
- `customerPhone`

Customer profile matching and migration remain deferred to the customer-profile phase.

## Phase 5 Manual Entry Persistence

Manual-entry submissions are persisted through the Phase 4 processing service only:

- `FeedbackIngestion.channel` and `Feedback.channel` are set to `MANUAL`.
- `FeedbackIngestion.idempotencyKey` stores the trimmed `Idempotency-Key` header.
- `FeedbackAttachment` stores metadata-only attachment rows when supplied.
- `Feedback.sourceMetadata` stores a limited source object with `sourceType=manual-entry`, the selected manual source type, optional note/reference, and trusted internal actor IDs.
- No `ManualFeedback`, `Customer`, category, priority, assignment, reply, sentiment, file-storage, or connector-specific table was added.
- Manual entry stores customer contact only as the existing Phase 4 feedback snapshot fields; it does not create customer profiles or perform customer matching.

## Phase 6 Public Feedback Persistence

Public portal settings live on `Business`:

- `publicFeedbackEnabled` defaults to `false`, so existing businesses remain private after migration.
- `publicFeedbackToken` is nullable and unique. It is generated lazily when the portal is first enabled or explicitly regenerated.
- `publicFeedbackWelcomeMessage` is nullable and limited to 500 characters.

Public submissions reuse existing Phase 4 tables:

- `FeedbackIngestion.channel` and `Feedback.channel` are set to `PUBLIC_FORM`.
- `FeedbackIngestion.idempotencyKey` stores the trimmed `Idempotency-Key` header.
- `Feedback.sourceMetadata` stores only bounded public portal metadata such as `sourceType=public-feedback-portal`, follow-up consent, and a short token fingerprint.
- Customer contact is stored only as existing feedback snapshot fields.
- No `PublicFeedbackSubmission`, `Customer`, public attachment, category, priority, assignment, reply, sentiment, notification, report, or external-integration table was added.

## Phase 7 QR Feedback Persistence

QR-code management records live in `PublicFeedbackQrCode`:

- `publicToken` is the only value exposed in QR URLs.
- `portalTokenFingerprint` stores a SHA-256 fingerprint of the Phase 6 portal token at creation/regeneration time.
- `branchId` is nullable for business-wide QR codes and required for branch-specific QR codes.
- `isActive=false` disables a QR code without deleting the record.
- `createdByMembershipId` records the creating membership when available and is nullable if the membership is later removed.

QR submissions reuse existing Phase 4 tables:

- `FeedbackIngestion.channel` and `Feedback.channel` are set to `QR_CODE`.
- `FeedbackIngestion.idempotencyKey` stores the trimmed `Idempotency-Key` header.
- `Feedback.branchId` resolves from the locked QR branch or from the selected active branch for business-wide QR codes.
- `Feedback.sourceMetadata` stores bounded QR metadata such as `sourceType=qr-code`, QR code ID, QR scope, and follow-up consent.
- Customer contact is stored only as existing feedback snapshot fields.
- No QR-code scan analytics, generated QR image storage, public attachment upload, customer profile, inbox/workflow, AI, notification, report, or external-integration table was added.

## Google External Account Strategy

Google `sub` is stored as `ExternalAccount.providerAccountId` with `provider=GOOGLE`.

The system does not use email as the permanent Google identifier because a Google account email can change. `providerEmail` is optional verified metadata for display and account-status responses only.

The system does not store:

- Google ID credentials.
- Google access tokens.
- Google refresh tokens.
- Frontend-decoded Google JWT payloads.

One Google identity cannot belong to two users because `[provider, providerAccountId]` is unique. One user cannot accidentally have multiple Google identities because `[userId, provider]` is unique.

## Session Strategy

Refresh sessions are database-backed:

- Login and registration create a `Session` row.
- Refresh tokens include the session ID.
- The database stores only a SHA-256 hash of the refresh token.
- Each successful refresh rotates the refresh token and replaces `Session.refreshTokenHash`.
- Reused or invalidated refresh tokens revoke the affected session.
- Logout sets `Session.revokedAt` for the current session.
- Logout-all sets `Session.revokedAt` for all active sessions belonging to the current user.
- Password reset sets `Session.revokedAt` for all active sessions belonging to the reset user.

## Account Token Strategy

Email verification and password reset use `AccountToken` records.

- Raw tokens are generated with Node.js cryptographic randomness.
- Raw tokens are sent only in frontend email links.
- `AccountToken.tokenHash` stores a SHA-256 hash of the raw token.
- Tokens are scoped by `AccountTokenType`, so verification tokens cannot reset passwords and reset tokens cannot verify emails.
- Tokens are single-use through `usedAt`.
- Replacement token creation invalidates previous active tokens of the same type for the same user.
- Verification tokens default to 1440 minutes.
- Password-reset tokens default to 30 minutes.

Expired account tokens are deleted opportunistically during token creation. Used tokens are also eligible for cleanup after a short retention period. Old expired or revoked sessions are deleted after the documented retention window, and active sessions are not deleted.

## Staff Invitation Token Strategy

Staff invitations use random raw tokens and SHA-256 hashes.

- Raw tokens are generated with Node.js cryptographic randomness.
- Raw tokens are sent only in invitation email links.
- `StaffInvitation.tokenHash` stores only the SHA-256 hash.
- Tokens expire according to `STAFF_INVITATION_EXPIRES_IN_HOURS`, defaulting to 48 hours.
- Resend rotates the token hash and sends a new raw-token link.
- Acceptance marks the invitation accepted transactionally and prevents reuse.
- Opportunistic cleanup marks expired pending invitations as `EXPIRED`; it does not delete businesses, branches, memberships, or active invitations.

## Tenant Isolation Strategy

Every Phase 3 relation is scoped through `businessId`. Service-layer queries verify:

- Business membership exists and is active.
- Business is active for normal workspace operations.
- Branches belong to the requested business.
- Memberships belong to the requested business.
- Invitations belong to the requested business for management actions.
- Explicit branch assignments use join rows, not JSON arrays.

Frontend local storage may remember an active business ID for convenience, but database membership checks remain the source of authorization.

## Admin Seed Process

The controlled platform administrator seed is located at:

```text
backend/prisma/seed.ts
```

It reads:

```env
PLATFORM_ADMIN_EMAIL=
PLATFORM_ADMIN_PASSWORD=
PLATFORM_ADMIN_FIRST_NAME=
PLATFORM_ADMIN_LAST_NAME=
```

The seed:

- Normalizes the email to lowercase.
- Requires a password between 10 and 128 characters.
- Hashes the password with Argon2id.
- Creates only a `PLATFORM_ADMIN` user.
- Sets the account status to `ACTIVE`.
- Sets `emailVerifiedAt` for the administrator account.
- Does not create a `Business`, `Branch`, or `BusinessMembership`.
- Reconciles only seed-managed fields when the configured email already belongs to a `PLATFORM_ADMIN`.
- Fails safely if the configured email belongs to a non-admin account.
- Does not promote existing `BUSINESS_OWNER`, `STAFF`, or `CUSTOMER` users.
- Does not log the plaintext password.

Run it manually after the migration and environment setup from the repository root:

```bash
npm run prisma:seed
```

Prisma 6.19.3 currently warns that `package.json#prisma` seed configuration is deprecated and will be removed in Prisma 7. The existing seed command still works under the installed Prisma version; migrate seed configuration to a Prisma config file before upgrading to Prisma 7.

## Phase 9 — Feedback Workflow

Migration: `20260725141331_phase_9_feedback_workflow`

### New Enum: `FeedbackStatus`

Four values:

- `NEW`
- `IN_REVIEW`
- `RESOLVED`
- `CLOSED`

### Existing Model Changes

`Feedback` model gains:

- `status` column with `FeedbackStatus` type, default `NEW`.
- `@@index([status])` for status-based queries.
- `activities` relation to `FeedbackActivity[]`.
- Existing feedback rows are backfilled to `'NEW'` in the migration.

### New Model: `FeedbackActivity`

Maps to `feedback_activities` table.

| Field               | Type                          | Notes                                               |
| ------------------- | ----------------------------- | --------------------------------------------------- |
| `id`                | `String @id @default(cuid())` | Primary key                                         |
| `businessId`        | `String`                      | Foreign key to `Business`                           |
| `feedbackId`        | `String`                      | Foreign key to `Feedback`                           |
| `actorMembershipId` | `String?`                     | Optional actor, foreign key to `BusinessMembership` |
| `type`              | `FeedbackActivityType`        | `STATUS_CHANGED` or `NOTE_ADDED`                    |
| `fromStatus`        | `FeedbackStatus?`             | Previous status (null for notes)                    |
| `toStatus`          | `FeedbackStatus?`             | New status (null for notes)                         |
| `note`              | `String?`                     | Internal note text (for NOTE_ADDED)                 |
| `createdAt`         | `DateTime @default(now())`    | Timestamp                                           |

### New Enum: `FeedbackActivityType`

Two values:

- `STATUS_CHANGED`
- `NOTE_ADDED`

### Relations

- `feedbackActivity.business` → `Business` (required, cascade delete)
- `feedbackActivity.feedback` → `Feedback` (required, cascade delete)
- `feedbackActivity.actor` → `BusinessMembership` (optional, set null on delete)
- `Feedback.activities` → `FeedbackActivity[]` (cascade delete)
- `Business.feedbackActivities` → `FeedbackActivity[]` (cascade delete)
- `BusinessMembership.feedbackActivities` → `FeedbackActivity[]` (set null on delete)

### Indexes

- `@@index([feedbackId, createdAt])` on `feedback_activities` — for timeline queries.
- `@@index([businessId, createdAt])` on `feedback_activities` — for potential business-wide activity queries.
- `@@index([status])` on `feedback` — for status-based inbox filtering.

### Foreign-Key Deletion Behavior

- Deleting a `Feedback` cascades to its `FeedbackActivity` records.
- Deleting a `Business` cascades to its `FeedbackActivity` records.
- Deleting a `BusinessMembership` sets `actorMembershipId` to `null` on affected activities, preserving the timeline record.

### Data Migration

- The migration SQL backfills all existing `Feedback` rows: `UPDATE feedback SET status = 'NEW' WHERE status IS NULL;`
- Existing feedback created before Phase 9 automatically receives `NEW` status.

### No New Packages

Phase 9 introduces no new npm packages. The enum and model are part of the existing Prisma schema.

## Phase 10 - Assignment, Categories, and Priorities

Migration: `20260725162942_phase_10_assignment_categories_priorities`

### New Enum: `FeedbackPriority`

Four values:

- `LOW`
- `NORMAL`
- `HIGH`
- `URGENT`

`Feedback.priority` is non-null and defaults to `NORMAL`, so existing feedback is backfilled by the database default during migration.

### Existing Model Changes

`Feedback` model gains:

- `priority` column with `FeedbackPriority` type, default `NORMAL`.
- `assignedToMembershipId` nullable foreign key to `BusinessMembership`.
- `categoryId` nullable foreign key to `FeedbackCategory`.
- Indexes on `priority`, `assignedToMembershipId`, and `categoryId`.

`FeedbackActivityType` gains:

- `ASSIGNMENT_CHANGED`
- `CATEGORY_CHANGED`
- `PRIORITY_CHANGED`

`FeedbackActivity` gains:

- `fromValue String?`
- `toValue String?`

These fields store safe before/after snapshots for non-status workflow changes.

### New Model: `FeedbackCategory`

Maps to `feedback_categories` table.

| Field         | Type                          | Notes                               |
| ------------- | ----------------------------- | ----------------------------------- |
| `id`          | `String @id @default(cuid())` | Primary key                         |
| `businessId`  | `String`                      | Required business foreign key       |
| `name`        | `String`                      | Unique per business                 |
| `description` | `String?`                     | Optional label description          |
| `colorKey`    | `String @default("indigo")`   | Frontend color token key            |
| `isActive`    | `Boolean @default(true)`      | Hides category from new assignments |
| `createdAt`   | `DateTime @default(now())`    | Creation timestamp                  |
| `updatedAt`   | `DateTime @updatedAt`         | Last update timestamp               |

### Relations and Deletion Behavior

- `Feedback.assignedTo` points to `BusinessMembership.assignedFeedbacks` with `onDelete: SetNull`.
- `Feedback.category` points to `FeedbackCategory.feedback` with `onDelete: SetNull`.
- `FeedbackCategory.business` points to `Business.feedbackCategories` with `onDelete: Cascade`.
- Deleting or removing a membership/category preserves existing feedback by nulling the assignment/category reference.

### Indexes and Constraints

- `feedback.priority_idx`
- `feedback.assigned_to_membership_id_idx`
- `feedback.category_id_idx`
- `feedback_categories.business_id_is_active_idx`
- Unique `feedback_categories.business_id_name_key`

### No New Packages

Phase 10 introduces no new npm packages. The enum, nullable relations, and category model are part of the existing Prisma schema.

## Phase 11 Customer Profiles

Migration: `20260726110000_phase_11_customer_profiles`

Phase 11 Customer Profiles is implemented. Prisma schema changes were formatted, validated, generated, and applied locally. No package change was required.

### Current Customer Snapshot State

The current schema includes the Phase 11 `Customer` model, while submitted customer data still remains on `Feedback` as historical snapshot fields:

- `customerName String? @map("customer_name") @db.VarChar(160)`
- `customerEmail String? @map("customer_email") @db.VarChar(255)`
- `customerPhone String? @map("customer_phone") @db.VarChar(40)`

These fields must remain immutable historical snapshots. Customer profile edits must not rewrite existing feedback snapshot values.

### Implemented Models

- `Customer`
  - `id String @id @default(cuid())`
  - `businessId String`
  - `displayName String? @db.VarChar(160)`
  - `firstName String? @db.VarChar(100)`
  - `lastName String? @db.VarChar(100)`
  - `email String? @db.VarChar(255)`
  - `normalizedEmail String? @db.VarChar(255)`
  - `phone String? @db.VarChar(40)`
  - `normalizedPhone String? @db.VarChar(40)`
  - `status CustomerStatus @default(ACTIVE)`
  - `createdByMembershipId String?`
  - `updatedByMembershipId String?`
  - `archivedAt DateTime?`
  - `createdAt DateTime @default(now())`
  - `updatedAt DateTime @updatedAt`
- `CustomerActivity`
  - records profile created/updated, archived/reactivated, and feedback linked/unlinked events.
  - actor references `BusinessMembership` with `onDelete: SetNull`.
  - customer/business relations cascade with the tenant, while actor references are preserved.
- Existing `Feedback`
  - added nullable `customerId String?`
  - added relation to `Customer` with `onDelete: SetNull`
  - added `@@index([customerId, receivedAt])` for history lookups.

Implemented enums:

- `CustomerStatus`: `ACTIVE`, `ARCHIVED`
- `CustomerActivityType`: `CREATED`, `UPDATED`, `ARCHIVED`, `REACTIVATED`, `FEEDBACK_LINKED`, `FEEDBACK_UNLINKED`

Phase 11 does not add customer notes, follow-up consent, preferred contact method, merge fields, marketing fields, messaging fields, CRM fields, strict normalized email/phone uniqueness, or hard deletion.

### Recommended Indexes and Constraints

- `Customer.businessId, Customer.status`
- `Customer.businessId, Customer.normalizedEmail`
- `Customer.businessId, Customer.normalizedPhone`
- `Customer.businessId, Customer.updatedAt`
- `Feedback.customerId, Feedback.receivedAt`
- `CustomerActivity.customerId, CustomerActivity.createdAt`
- `CustomerActivity.businessId, CustomerActivity.createdAt`

Avoid strict unique constraints on nullable normalized email or phone in the first MVP unless duplicate handling is explicitly designed. Shared emails, family numbers, business phone numbers, and recycled phone numbers make uniqueness risky. If uniqueness is later required, prefer reviewed duplicate-resolution flows first.

### Backfill Result

Existing feedback remains unlinked initially. No historical customer rows were created and no historical feedback was backfilled during the Phase 11 migration. A direct Prisma verification after migration reported `customers: 0`, existing `feedback: 12`, and `linked: 0`.

Rollback concerns: dropping future customer tables or `Feedback.customerId` would remove profile links and customer audit history but must leave original feedback snapshot values intact.

## Phase 12 Search and Filters Database Notes

Phase 12 Full Search and Filters is implemented without a Prisma schema change, migration, database reset, or data backfill.

Current index coverage is used for the Phase 12 MVP:

- `Feedback.businessId, receivedAt`
- `Feedback.branchId, receivedAt`
- `Feedback.customerId, receivedAt`
- `Feedback.channel`, `Feedback.status`, `Feedback.priority`, `Feedback.assignedToMembershipId`, and `Feedback.categoryId`
- `Customer.businessId, status`
- `Customer.businessId, normalizedEmail`
- `Customer.businessId, normalizedPhone`
- `Customer.businessId, updatedAt`
- `Customer.businessId, displayName`

No migration was created. If later benchmarking shows slow combined filters on realistic data, candidate indexes should be driven by measured query plans and may include composite feedback indexes for common tenant/date/status/channel/branch combinations.

Customer `latestFeedback` sorting is computed from branch-safe feedback aggregates in application code for the migration-free MVP. Measure this path with realistic production-like customer counts before relying on it for large datasets.

Full-text search infrastructure, denormalized search tables, materialized aggregate tables, saved-search tables, export tables, and analytics/reporting tables are out of scope for Phase 12.

## Phase 13 AI Analysis Database

Phase 13 migration `20260727083000_phase_13_ai_feedback_analysis` is applied locally. The Phase 13 completion audit did not edit this applied migration and did not require a follow-up schema migration.

Implemented schema:

- Added `FeedbackAIAnalysisStatus` with `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, and `SKIPPED`.
- Added `FeedbackAISentiment` with `POSITIVE`, `NEUTRAL`, `NEGATIVE`, and `MIXED`.
- Added `FeedbackAIAnalysis`, mapped to `feedback_ai_analyses`, scoped by `businessId` and unique `feedbackId`.
- Added derived metadata fields for status, sentiment, confidence, summary, detected language, suggested category, category confidence, provider/model, prompt/schema versions, input fingerprint/truncation/analyzed character count, safe error code/message, retry controls, daily usage timestamps, lock token/locked timestamp, processing timestamps, processing duration, and standard timestamps.
- Added relation links from `Business`, `Feedback`, and `FeedbackCategory`.
- Added activity enum values `AI_RETRY_REQUESTED`, `AI_CATEGORY_APPLIED`, and `AI_CATEGORY_DISMISSED`.
- Added indexes for tenant/status queues, tenant/feedback lookup, suggested category lookup, daily usage, retry scheduling, and stale processing recovery.
- Category suggestion lifecycle is represented through existing nullable fields and serialized as `NONE`, `AVAILABLE`, `AUTO_APPLIED`, `MANUALLY_APPLIED`, `DISMISSED`, or `CONFLICTED`; no lifecycle enum/table was added during the audit.

Database safety notes:

- Provider credentials, customer email, customer phone, internal notes, unrestricted raw provider responses, full prompts containing customer content, attachment contents, hidden activity, and raw source metadata are not stored in `feedback_ai_analyses`.
- The manual AI retry repair required no schema change. It reuses the existing `FeedbackAIAnalysis` row, resets automatic retry eligibility in `retryCount`, and preserves prior generated summary/sentiment/language fields until a replacement provider result overwrites them.
- The migration does not insert or update feedback rows and does not run AI backfill.
- Daily usage counts use `lastAttemptAt >= UTC start of day`.
- Local verification after migration found `Feedback.count() = 12`, `FeedbackAIAnalysis.count() = 0`, and `_prisma_migrations` contains `20260727083000_phase_13_ai_feedback_analysis`.

## Phase 14 Automation Rules Database

Phase 14 Automation Rules Engine database implementation is complete. Migration `20260727091241_phase_14_automation_rules` and follow-up migration `20260727143000_phase_14_field_source_backfill` were created and applied locally.

Implemented model shape:

- `AutomationRule`: business-scoped rule definition with name, description, status, trigger, branch scope, match mode, stop-processing flag, position, version, creator/updater membership references, execution counters, last triggered timestamp, archive timestamp, and timestamps.
- `AutomationRuleBranch`: selected branch scope rows for rules that do not apply to all branches.
- `AutomationCondition`: ordered typed condition rows belonging to a rule. Stores condition type, operator, optional scalar values, optional `valueJson`, and optional target references where relational integrity is useful.
- `AutomationAction`: ordered typed action rows belonging to a rule. Stores action type, target membership/category IDs, priority/status values, and position.
- `AutomationEvent`: database-backed queue row with business, feedback, trigger, status, event key, chain ID/depth, lock token, locked timestamp, attempts, safe error details, and completion timestamps.
- `AutomationExecution`: business/rule/feedback execution record with trigger, status, matched flag, rule version, input fingerprint, execution key, event-chain ID/depth, safe error code/message, action counts, and created timestamp.
- `AutomationActionExecution`: per-action result rows for attempted/skipped/succeeded/failed actions, previous/new values, safe error code/message, and action position.
- `FeedbackFieldState`: per-feedback field ownership/source tracking for status, priority, category, and assignment so automation can protect human changes.
- `FeedbackActivity` gained system actor and automation metadata columns for automation-attributed timeline rows.

Implemented enum values:

- `AutomationRuleTrigger`: `FEEDBACK_CREATED`, `AI_ANALYSIS_COMPLETED`.
- `AutomationRuleMatchMode`: `ALL`, `ANY`.
- `AutomationRuleStatus`: `DRAFT`, `ACTIVE`, `PAUSED`, `ARCHIVED`.
- `AutomationRuleBranchScope`: `ALL_BRANCHES`, `SELECTED_BRANCHES`.
- `AutomationActionType`: `SET_PRIORITY`, `SET_CATEGORY`, `ASSIGN_TO_MEMBERSHIP`, `UNASSIGN`, `SET_STATUS`.
- `AutomationEventStatus`: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`.
- `AutomationExecutionStatus`: `SUCCESS`, `PARTIAL`, `FAILED`, `SKIPPED`, `NOT_MATCHED`.
- `AutomationActionExecutionStatus`: `SUCCESS`, `SKIPPED`, `FAILED`, `CONFLICTED`.
- `FeedbackFieldStateSource`: `DEFAULT`, `HUMAN`, `AI`, `AUTOMATION`, `SYSTEM`.
- `FeedbackActivityActorType`: `HUMAN`, `SYSTEM`.

Recommended indexes and constraints:

- Rule lookup by `[businessId, status, trigger, position]`.
- Rule uniqueness for active non-archived business positions if position is stored as a dense order.
- Condition/action lookup by `[ruleId, position]`.
- Execution queue lookup by `[status, lockedAt, createdAt]`.
- Execution history lookup by `[businessId, createdAt]`, `[ruleId, createdAt]`, and `[feedbackId, createdAt]`.
- Unique execution idempotency key across `ruleId`, `feedbackId`, `trigger`, `ruleVersion`, and `inputFingerprint`.

Migration safety results:

- No migration-time rule execution.
- The base Phase 14 migration did not perform historical field-state backfill.
- The follow-up migration performs an idempotent historical field-state backfill only. It does not change `Feedback` values, execute automation rules, queue automation events, call Gemini, or infer historical actor membership IDs.
- The later automation draft target normalization repair did not change the Prisma schema or migrations. It prevents blank or irrelevant rule-builder target IDs from being written into `automation_conditions` or `automation_actions` foreign-key columns.
- No changes to the Phase 13 migration.
- No changes to the already-applied Phase 14 base migration.
- No destructive reset commands.
- Direct verification before the follow-up migration found `Feedback.count() = 12`, `FeedbackAIAnalysis.count() = 0`, `FeedbackFieldState.count() = 0`, and automation rule/event/execution counts all `0`.
- Direct verification after the follow-up migration found `Feedback.count() = 12`, `FeedbackAIAnalysis.count() = 0`, `FeedbackFieldState.count() = 48`, `automationRule.count() = 0`, `automationEvent.count() = 0`, and `automationExecution.count() = 0`.
- Each field-source group has 12 rows: `STATUS`, `PRIORITY`, `CATEGORY`, and `ASSIGNMENT`.
- Source distribution after local backfill: `STATUS` has 11 `SYSTEM` and 1 `HUMAN`; `PRIORITY` has 11 `DEFAULT` and 1 `HUMAN`; `CATEGORY` has 11 `DEFAULT` and 1 `HUMAN`; `ASSIGNMENT` has 9 `DEFAULT` and 3 `HUMAN`.
- No duplicate `(feedback_id, field)` rows were found, and no feedback rows were missing the required four field-state rows.
- Rules are archived for reversible removal. Permanent rule deletion is now available only after a rule is archived and required no schema change: rule branches, conditions, and actions already cascade from `AutomationRule`, while automation executions, feedback activities, and field-state source references are nullable with `SetNull`.

## Phase 20 Connector Framework and Demo Synchronization Database

Phase 20 Connector Framework and Demo Synchronization database implementation is complete. Migration `20260803090000_phase_20_connector_framework_demo_sync` was created and applied locally.

Implemented schema:

- `IntegrationConnection`: business-scoped provider connection metadata, provider, mode, status, display name, default active branch, demo scenario, connection timestamps, last sync timestamps, safe last-error fields, creator/updater membership references, and timestamps.
- `SynchronizationRun`: connection/business/provider/mode scoped run history, manual trigger, status, start/end timestamps, bounded counters, safe summary/error fields, actor membership reference, and timestamps.
- `SynchronizationItem`: per-run item result with connection/provider/external ID, optional feedback/ingestion references, status, result code, safe message, safe preview fields, processed timestamp, retry count, and timestamps.

Implemented enum values:

- `IntegrationProvider`: `GOOGLE_REVIEWS`, `WHATSAPP`, `EMAIL`, `X`, `FACEBOOK`, `INSTAGRAM`.
- `IntegrationMode`: `DEMO`, `LIVE`; Phase 20 runtime accepts Demo Mode only.
- `IntegrationConnectionStatus`: `CONNECTED`, `PAUSED`, `DISCONNECTED`, `ERROR`.
- `IntegrationDemoScenario`: `STANDARD_MIXED`, `PARTIAL_FAILURE`.
- `SynchronizationRunStatus`: `PENDING`, `RUNNING`, `COMPLETED`, `COMPLETED_WITH_ERRORS`, `FAILED`, `CANCELLED`.
- `SynchronizationTriggerType`: `MANUAL`.
- `SynchronizationItemStatus`: `IMPORTED`, `DUPLICATE`, `SKIPPED`, `FAILED`.
- `FeedbackChannel` now includes `FACEBOOK`.

Database safety results:

- The migration does not create demo connections, create synchronization runs, create synchronization items, import feedback, execute automation, call AI, call providers, or mutate existing feedback values.
- No provider credential, OAuth token, webhook secret, raw provider payload body, or binary attachment table was added.
- `SynchronizationCursor` and separate synchronization-error tables remain deferred to later live-integration phases.
- Direct local verification after migration found `IntegrationConnection.count() = 0`, `SynchronizationRun.count() = 0`, and `SynchronizationItem.count() = 0`.
- Direct table verification found `integration_connections`, `synchronization_runs`, and `synchronization_items`.
- Direct enum verification found `feedback.channel` includes `FACEBOOK`.

Future connector phases may introduce additional conceptual records equivalent to:

- `IntegrationConnection`: tenant-scoped provider connection metadata, provider type, display name, connection health, last synchronization time, imported item count, and a connection mode equivalent to `DEMO` or `LIVE`.
- `SynchronizationRun`: one synchronization attempt with start/end timestamps, trigger type, result status, imported/skipped/duplicate/failed counts, and safe error summary.
- `SynchronizationCursor`: provider-specific cursor/checkpoint data for incremental synchronization, scoped to one integration connection.
- `SynchronizationError`: safe provider or import error records that support retry and troubleshooting without storing secrets, raw tokens, full customer payloads, or unsafe provider responses.

Future `IntegrationConnection.mode` should distinguish:

- `DEMO`: simulated provider data, clearly labeled Demo Mode, no real provider connectivity.
- `LIVE`: real provider connectivity after provider approval, credentials, token refresh, webhooks or polling, rate-limit handling, and security review are implemented.

## Phase 21 Live Email Integration Database Changes

Phase 21 Live Email Integration is implemented for the Gmail-only MVP. Migration `20260805090000_phase_21_live_email_gmail_oauth` is applied locally.

Existing-model changes:

- Make `IntegrationConnection.demoScenario` nullable or conditionally unused for `mode=LIVE`.
- Make `SynchronizationRun.demoScenario` nullable or conditionally unused for `mode=LIVE`.
- Add safe live email fields to `IntegrationConnection`: `liveProviderType`, `providerAccountId`, `providerAccountLabel`, `providerTenantId`, `synchronizationFolder`, `lastProviderCursor`, `lastProviderCursorAt`, `requiresReauthorization`, `lastConnectionTestAt`, and `lastConnectionTestStatus`.
- Phase 21 originally kept one Live Email connection per Business. Phase 23 later changes this to one Live Email connection per email provider type per Business so Gmail and Outlook can coexist.

New enums:

- `EmailProviderType`: `GMAIL`, `MICROSOFT`, `IMAP`.
- `IntegrationCredentialType`: `OAUTH2`, `IMAP_PASSWORD`.

New models:

- `IntegrationCredential`: one credential row per connection/credential type, encrypted token/password fields only, key version, access-token expiry, safe scope summary, rotation/revocation timestamps, and cascade delete with the connection.
- `IntegrationOAuthState`: one-time authorization state, business and membership binding, connection or pending setup reference, provider type, state hash, PKCE verifier storage strategy, safe redirect target, expiry, used timestamp, and indexes for expiry cleanup.

Credential-storage rules:

- No plaintext access tokens, refresh tokens, IMAP passwords, OAuth code verifiers, client secrets, provider responses, raw MIME, or raw headers in database rows.
- No secrets in `IntegrationConnection` or connection settings JSON.
- `Feedback.sourceMetadata` for imported email should contain only bounded safe metadata such as Live Mode flag, provider type, connection ID/name, Gmail message ID, thread ID, received date, source label, and short preview fields.
- `FeedbackAttachment` remains metadata-only; no binary storage, remote attachment URLs, or attachment content import are added in Phase 21.

Cursor and deduplication plan:

- Use Gmail message ID as the primary connection-scoped `SynchronizationItem.externalId`.
- Use RFC Message-ID as secondary safe metadata/deduplication input.
- Use deterministic SHA-256 payload hash fallback where provider/header identifiers are missing.
- Store Gmail history ID as `IntegrationConnection.lastProviderCursor` after successful bounded initial sync and completed incremental runs.

Local migration verification:

- `npx prisma migrate deploy` applied `20260805090000_phase_21_live_email_gmail_oauth`.
- `npx prisma migrate status` reports 15 migrations and the database schema is up to date.
- No database reset, destructive migration, direct `Feedback` insert path, raw MIME storage, attachment binary storage, or credential plaintext storage was added.

Additional live-provider concepts are planned for later phases only. Do not create IMAP, live Google Reviews, live X, broader social replies/DMs/publishing/media/moderation, provider-location mapping, monitoring, or alerting models until the relevant phase is explicitly started.

Phase 24 starts the social media webhook scope for Facebook and Instagram only. Do not create live Google Reviews, X, replies/DMs/publishing/media/moderation, multi-account onboarding, provider-location mapping, monitoring, or alerting models until the relevant follow-up scope is explicitly started.

## Phase 22 Live WhatsApp Cloud API Database Changes

Phase 22 Live WhatsApp Cloud API Meta test-number inbound webhook MVP is implemented. Migration `20260810120000_phase_22_live_whatsapp_cloud_api` is applied locally.

Existing-model changes:

- `IntegrationCredentialType` now includes `META_WHATSAPP`.
- `SynchronizationTriggerType` now includes `WEBHOOK` for webhook-origin history/future recovery semantics.
- `IntegrationCredential` has optional `encryptedAppSecret`; the current MVP stores the Meta access token encrypted in the database and uses the Meta App Secret from backend environment for pre-parse signature validation.
- `IntegrationConnection` has WhatsApp-safe metadata fields: `whatsappPhoneNumberId`, `whatsappBusinessAccountId`, `whatsappDisplayPhoneNumber`, `webhookVerifyTokenHash`, `webhookStatus`, `lastWebhookReceivedAt`, `lastWebhookVerifiedAt`, and `lastInboundMessageAt`.
- `IntegrationConnection` keeps one Live WhatsApp connection per Business through the existing `[businessId, provider, mode]` uniqueness and adds a short-named unique index on `[provider, mode, whatsappPhoneNumberId]`.

New model:

- `IntegrationWebhookDelivery`: durable safe webhook activity with connection/business/provider, optional provider event ID, payload hash, status, safe result code/message, message type, sender hash, safe preview, received/processed timestamps, and short-named indexes for activity lookup and deduplication.

Migration notes:

- The first local `npx prisma migrate deploy` attempt failed with MySQL error 1059 because Prisma's default generated unique index name for webhook delivery exceeded the identifier limit after earlier additive statements had applied.
- The Phase 22 schema and migration now use explicit short `map` names for the new indexes and foreign keys.
- The missing additive DDL was applied, then `npx prisma migrate resolve --applied 20260810120000_phase_22_live_whatsapp_cloud_api` restored a clean local migration state.
- Final `npx prisma migrate status` reports the schema is up to date. Post-migration local counts: `IntegrationConnection=3`, `IntegrationCredential=1`, `Feedback=24`, `FeedbackIngestion=25`, `IntegrationWebhookDelivery=0`.

No direct `Feedback` insert path was added; Live WhatsApp imports continue through `FeedbackProcessingService`.

## Phase 23 Live Outlook / Microsoft Email Database Changes

Phase 23 Live Outlook / Microsoft Email inbound OAuth MVP is implemented. Migration `20260810170000_phase_23_live_outlook_email` is applied locally.

Existing-model changes:

- `IntegrationConnection` uniqueness changed from one connection per `(businessId, provider, mode)` to one connection per `(businessId, provider, mode, liveProviderType)`.
- This allows one Gmail Live Email connection and one Outlook Live Email connection for the same Business while preserving Demo Email coexistence by `IntegrationMode`.
- Because `liveProviderType` is nullable for Demo and WhatsApp connections, singleton behavior for Demo provider connections and Live WhatsApp is enforced in service logic as well as provider-specific unique indexes where applicable.
- `IntegrationConnection.lastProviderCursor` stores Outlook Graph delta links opaquely for incremental manual synchronization.
- `IntegrationConnection.providerAccountLabel` stores only masked mailbox display data in API responses; provider account IDs and tenant IDs remain backend metadata.

Credential-storage rules:

- Outlook OAuth tokens use the existing `IntegrationCredential` model with `credentialType=OAUTH2`.
- Access tokens, refresh tokens, and OAuth PKCE verifiers are encrypted with provider-specific associated data.
- No Microsoft client secret, plaintext token, raw Graph response, raw message body beyond normalized feedback content, raw header, or attachment binary data is stored.
- `FeedbackAttachment` remains metadata-only for Outlook imports.

Migration notes:

- `npx prisma migrate dev --skip-generate` was not used because Prisma detected checksum drift in two previously applied migrations and requested a destructive database reset.
- No reset was performed.
- `npx prisma migrate deploy` applied `20260810170000_phase_23_live_outlook_email` non-destructively.
- The migration only drops the old broad connection unique index and adds `conn_live_email_provider_key`.

## Phase 24 Live Facebook + Instagram Meta Social Database Notes

Phase 24 Live Facebook + Instagram Meta Social Feedback Webhook Integration MVP is implemented with no Prisma migration.

Existing storage reused:

- `IntegrationProvider.FACEBOOK` and `IntegrationProvider.INSTAGRAM` already exist from Phase 20.
- `IntegrationMode.LIVE` already exists from Phase 20.
- `FeedbackChannel.FACEBOOK` and `FeedbackChannel.INSTAGRAM` already exist for imported feedback.
- `IntegrationConnection.providerAccountId` stores the Facebook Page ID or Instagram professional-account ID.
- `IntegrationConnection.providerAccountLabel` stores only the safe Page/account label returned in API responses.
- `IntegrationConnection.providerTenantId` stores the Instagram professional account type where provided, such as `BUSINESS` or `CREATOR`.
- `IntegrationConnection.webhookVerifyTokenHash`, `webhookStatus`, `lastWebhookReceivedAt`, `lastWebhookVerifiedAt`, and `lastInboundMessageAt` are reused for social webhook health.
- `IntegrationCredential` stores per-connection encrypted Meta developer/test access tokens. Phase 24 reuses the existing `META_WHATSAPP` credential type as the generic Meta credential bucket because credentials are scoped by `connectionId` and encrypted with provider-specific associated data.
- `IntegrationWebhookDelivery` stores durable safe Facebook/Instagram webhook activity, payload hashes, provider comment IDs, status, safe result codes/messages, comment previews, and timestamps.

Cardinality and uniqueness:

- One Live Facebook Page connection per Business and one Live Instagram professional-account connection per Business are enforced in service logic.
- Provider comment ID plus connection ID provides webhook delivery deduplication and feedback idempotency.

Source metadata:

- Live Facebook and Instagram imports store bounded `Feedback.sourceMetadata` only: provider, Live Mode flag, connection ID/name, safe Page/account label, external comment ID, optional media/post reference, original preview, created/imported timestamps, and source type.
- No access token, verify token, App Secret, signature, raw webhook body, raw provider payload, media binary, reply target, or moderation state is stored in feedback metadata.

Phase 24 GET verification repair:

- `GET /api/integrations/meta/webhook` no longer queries or updates `IntegrationConnection` during Meta's verification handshake. This removes a non-protocol database dependency from the public challenge response; signed POST delivery continues to update webhook health with resolved provider/tenant context.
- No Prisma schema change, migration, database reset, data backfill, or direct SQL operation was required.

## Future Migration Strategy

When future models are introduced:

1. Update `backend/prisma/schema.prisma`.
2. Run `npm run prisma:validate`.
3. Run `npm run prisma:migrate` against the local XAMPP database.
4. Run `npm run prisma:generate`.
5. Update database notes and implementation status.

Do not add destructive reset commands to the normal workflow.
