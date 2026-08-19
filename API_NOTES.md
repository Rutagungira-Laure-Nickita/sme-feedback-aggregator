# API Notes

## Phase 29A API Compatibility

No endpoint, request schema, response schema, status code, authorization rule, tenant boundary, or worker behavior changed. Phase 29A changes only how backend modules obtain generated Prisma runtime values under native ESM. All direct generated Prisma model/input/result imports remain type-only, and the existing API/service contracts are unchanged.

## Phase 28 Category Contract

- No endpoint or route shape was added. Existing `/api/businesses/:businessId/categories` CRUD remains Owner/Admin-managed and Business-scoped; regular listing returns active categories unless an authorized manager explicitly requests inactive records.
- Both Business creation paths now create the canonical 13 active categories inside the existing creation transaction.
- The All Feedback API keeps `categoryId` and `categoryState`. The frontend's single Category control sends either an active Business category ID or `categoryState=uncategorized`; it clears the mutually exclusive parameter atomically.
- AI analysis still loads only `{ businessId, isActive: true }` categories and accepts only an ID from that set or `null`. Automation category condition/action validation likewise retains active Business ownership checks.
- Report APIs are unchanged. Category distribution now renders a null `categoryId` group as `Uncategorized` in owner and Platform Administrator documents.

## Phase 27 API Behavior

No endpoint path, request schema, response envelope, or authorization role changed. The existing Business Owner report preview/export builders now add `mode: LIVE` to connection and synchronization predicates and require the related connection to be Live for webhook activity. This changes only owner report semantics: Preview/PDF/CSV integration health and activity exclude Demo records. Platform Administrator reporting and integration APIs remain unchanged.

The redesigned owner overview reuses `POST /api/businesses/:businessId/reports/preview` with a bounded recent-period request; no new dashboard endpoint was introduced. Frontend integration filtering is centralized and does not replace backend authorization.

## Phase 26A Business Owner Export Metadata

The Phase 26 endpoint paths, request schemas, authorization, and response envelopes are unchanged. Business Owner report documents now include `branding.reportSubtitle: "BUSINESS REPORTING"`. The PDF renderer uses that safe value for the visible subtitle and Business Owner PDF subject metadata, and Business Owner CSV emits `Report context,BUSINESS REPORTING`. Existing Platform Administrator documents omit the override and retain `PLATFORM ADMINISTRATION` PDF branding and their prior CSV structure.

The `Integration adoption` section returned by Preview and serialized to PDF/CSV now has exactly `Provider | Count`, with one row per `IntegrationProvider`. Counts come from the same authorized Business/optional-Branch connection collection used for the report; connection mode remains available only in the separate detailed `Integration connections` section.

## Phase 26 Business Owner Reporting APIs

Two tenant-scoped endpoints mount under the authenticated business router at `POST /api/businesses/:businessId/reports/preview` and `POST /api/businesses/:businessId/reports/export`. They require an authenticated session whose platform role is `BUSINESS_OWNER` plus an active membership in the route Business (Business must be `ACTIVE`). Platform `STAFF`, `CUSTOMER`, and `PLATFORM_ADMIN` callers, unauthenticated callers, foreign Businesses, foreign branches, suspended/removed memberships, and non-active businesses are denied. The Business is never accepted from the request body; it is resolved from the authenticated membership of the route business.

Request bodies are strict and accept exactly:

```json
{
  "outputFormat": "PDF | CSV" (export only),
  "dateFrom": "2026-08-01",
  "dateTo": "2026-08-31",
  "branchId": "optional branch belonging to the Business",
  "channel": "optional FeedbackChannel",
  "status": "optional FeedbackStatus",
  "sentiment": "optional FeedbackAISentiment",
  "comparePreviousPeriod": true
}
```

`businessId`, `reportType`, unknown fields, irrelevant filters, reversed dates, and windows over 366 days are rejected with `VALIDATION_ERROR`. The preview returns the shared `AdminReportDocument` shape (branding, title `Business Performance & Customer Experience Report`, scope, period, generatedAt, filters, managementSummary, highlights, sections, optional comparison). The export returns `application/pdf` or `text/csv; charset=utf-8` with `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and a download disposition; CSV is UTF-8 BOM with escaping and formula protection.

The report always covers the single authorized Business. Branch options for the page come from the existing `GET /api/businesses/:businessId/branches` endpoint, which is already membership-scoped. Platform Admin reporting endpoints (`/api/admin/reports/*`) remain `PLATFORM_ADMIN`-only and unchanged.

## Phase 25.4D Operations Report Presentation Compatibility

No endpoint, authorization rule, request/response field, report type, scope query, comparison calculation, content type, cache behavior, date validation, or persisted value changed. `POST /api/admin/reports/preview` and `POST /api/admin/reports/export` continue to consume the same Operations report document. Preview now presents its existing `comparison` array as a visible five-column table only when `comparePreviousPeriod` is enabled; it performs no additional request.

The shared display formatter maps `DRAFT` to `Draft` for report presentation only. PDF applies Operations-only table projections and concise UTC display timestamps. CSV continues to expose the original section headers/columns and original ISO timestamp strings. The clarified `Successful automation executions (period)` label still reads the existing Automation `SUCCESS` count.

## Phase 25.4C Feedback Report Semantics

No endpoint, authorization rule, report type, request field, response field, content type, cache behavior, or date-validation rule changed. `POST /api/admin/reports/preview` and `POST /api/admin/reports/export` still accept the Phase 25.4 Feedback filters and still build one shared report document for Preview, PDF, and CSV.

For `FEEDBACK_CUSTOMER_EXPERIENCE`, Business, Branch, Channel, Workflow Status, Sentiment, and the requested date window now form one canonical feedback scope plan. Current and previous periods share every non-date filter. Open/Completed derive from the scoped workflow distribution, Assigned/Unassigned derive from the scoped assignment distribution, and all remaining feedback metrics/sections use the same scoped predicate. A `NEW`-only request therefore reports matching records as Open and cannot report them as Completed.

Management Summary now returns one explicit leading channel only for a unique maximum, names all tied maximum channels in deterministic display-label order, and reports no leader for zero feedback. Preview shows the most recent 12 trend rows in ascending order; PDF/CSV retain the full supported trend dataset. Important feedback returns only normalized `Feedback.message` content, falling back to title and then `Feedback text unavailable`; customer contact and source/provider payload fields remain excluded. PDF applies a presentation-only multi-line excerpt, while CSV retains the full safe normalized body. Report-facing `OTHER` and `CUSTOMER` values display as `Other` and `Customer`; persisted enum/filter tokens are unchanged.

## Phase 25.4B Report Presentation Compatibility

No endpoint, authorization rule, request field, response field, report type, scope query, comparison calculation, content type, or cache behavior changed. `POST /api/admin/reports/preview` and `POST /api/admin/reports/export` still consume the same built report document.

Generated report display values now pass through the shared report formatter before Preview/PDF/CSV rendering. This corrects Management Summary and filter wording from `Qr Code` to `QR Code` and preserves known initialisms including AI, API, CSV, PDF, SMS, URL, IP, and OAuth. Persisted enum values and API filter tokens remain unchanged. PDF-only changes are presentation-level canonical geometry, cursor restoration, section-aware page preflight, and the measured five-column comparison grid; the Phase 25.4A footer/page-count invariant remains in force.

## Phase 25.4A Reporting Scope Contract

The accepted endpoints, three report types, request filters, authorization, and export content types are unchanged. Preview responses now include `scope.level`, `scope.label`, `scope.notes`, and `scope.metrics`, where each domain is classified as `PLATFORM_WIDE`, `BUSINESS_SCOPED`, `BRANCH_SCOPED`, or `BUSINESS_ONLY_NOT_BRANCH_SCOPABLE`. The same document feeds PDF and CSV exports, so identical requests share labels, values, scope notes, and comparison semantics.

For Executive reports, Branch selection scopes feedback and its trend/distributions by `Feedback.branchId`, Users by all-branch or explicit membership access, and integrations by `IntegrationConnection.defaultBranchId`. Customer profile totals and Business lifecycle/approval state remain business-wide and are explicitly labeled. CSV remains UTF-8 BOM output with escaping and now neutralizes formula-leading string cells; supervisor-facing enums are display-formatted only.

## Phase 25.4 Reporting API Consolidation

`POST /api/admin/reports/preview` and `POST /api/admin/reports/export` now accept exactly `EXECUTIVE_PLATFORM`, `FEEDBACK_CUSTOMER_EXPERIENCE`, or `OPERATIONS_SYSTEM_HEALTH`. The former eight fragmented identifiers are rejected by request validation. Both endpoints remain behind authentication plus `requirePlatformAdmin`; export still returns in-memory PDF or UTF-8 BOM CSV with `Cache-Control: no-store`.

Common request fields remain `dateFrom`, `dateTo`, and `comparePreviousPeriod`. Executive accepts optional `businessId` and `branchId`; Feedback & Customer Experience additionally accepts `channel`, `status`, and `sentiment`; Operations & System Health accepts optional `businessId` and `provider`. Report-aware validation rejects irrelevant fields instead of silently applying misleading filters. Entity validation rejects missing businesses/branches and business/branch mismatches. Date From must be on or before Date To and the maximum window remains 366 days.

The structured preview now includes `managementSummary`, explicitly labeled lifetime/period highlights, sections with optional `emptyMessage`/semantic metadata, and comparison items containing `current`, `previous`, `absoluteChange`, nullable `percentageChange`, and `percentageLabel`. A zero prior value returns `percentageChange: null` and `percentageLabel: "No prior baseline"`. Summaries are deterministic calculations over persisted metrics and never call an external AI provider.

## Phase 25.3 API Compatibility

No new endpoint or request contract was added. Existing Phase 25.2 Platform Administrator business/user/feedback/integration actions, reports, and authorization guards are preserved. The settings service now treats `primaryColor` and `accentColor` as deprecated compatibility fields: accepted legacy payload values are normalized to fixed `#4F46E5` and `#818CF8` in persistence and responses, so arbitrary colors cannot drive frontend tokens or PDF charts. Admin feedback detail continues to return selected attachment metadata and selected safe AI fields only; integration detail continues to exclude credentials, secret hashes, and provider cursors. `/admin/platform-health` is a frontend route label change and continues to call `GET /api/admin/system-health`.

## Phase 25.2 Platform Administration APIs

All routes below require an authenticated `PLATFORM_ADMIN` unless explicitly noted.

- `POST /api/admin/businesses` creates a complete pending business, primary branch, and owner membership for an existing active `BUSINESS_OWNER`.
- `PATCH /api/admin/businesses/:businessId` edits safe business profile fields.
- `POST /api/admin/businesses/:businessId/status` accepts `{ status, reason? }` and enforces the server-side business transition graph.
- `GET /api/admin/users/:entityId`, `PATCH /api/admin/users/:entityId`, and `POST /api/admin/users/:entityId/action` provide safe account detail/profile/action handling. Supported actions are `VERIFY_EMAIL`, `UNVERIFY_EMAIL`, `SUSPEND`, `REACTIVATE`, `DISABLE`, and `REVOKE_SESSIONS`; suspend/disable also revoke active sessions and self-lockout is blocked.
- `GET /api/admin/feedback/:entityId` returns read-only feedback, source, ingestion, attachment metadata, AI, assignment/customer, and workflow activity context. No Platform Administrator feedback mutation endpoint exists.
- `GET /api/admin/integrations/:entityId` returns safe connection/run/webhook context without credential records, provider cursors, or webhook verification hashes.
- `POST /api/admin/integrations/:entityId/action` supports `PAUSE`, `RESUME`, and Demo-only `DISCONNECT`. Live disconnect returns a controlled tenant-action-required error so the established connector path can revoke provider authorization safely.
- `GET/PATCH /api/admin/settings` now includes consumed public description, hero text/CTA labels, support contact, default report range, and report footer fields in addition to Phase 25.1 identity/color/appearance fields.
- Public `GET /api/platform-settings` intentionally exposes the same safe display/configuration fields, but never updater identity, audit metadata, or secrets.

`GET /api/admin/dashboard` now includes `pendingBusinesses` and a pending-approval action item. Significant Platform Administrator mutations feed recent activity through safe audit summaries.

## Phase 25.1 Platform Settings APIs

- `GET /api/platform-settings` is public and returns only platform name, brand tagline, public headline, optional HTTP(S) logo URL, primary/accent hexadecimal colors, default appearance, footer text, and `updatedAt`.
- `GET /api/admin/settings` returns the same safe view and requires an authenticated `PLATFORM_ADMIN`.
- `PATCH /api/admin/settings` accepts one or more explicit settings fields and requires an authenticated `PLATFORM_ADMIN`. Required text is trimmed, length-bounded plain text; colors use `#RRGGBB`; appearance is `SYSTEM`, `LIGHT`, or `DARK`; and logo URLs are null or HTTP(S). Unknown keys, empty updates, HTML delimiters/control characters, invalid colors, and non-HTTP URL schemes are rejected with `400 VALIDATION_ERROR`.

List/Grid preferences do not add an API endpoint. They are presentation-only local-storage values and do not alter collection query, filtering, sorting, or pagination contracts.

## Phase 25 Platform Administrator APIs

All endpoints below require an authenticated `PLATFORM_ADMIN`. Business Owners, Staff, Customers, and unauthenticated callers are denied. Responses never include password hashes, account/reset tokens, OAuth state, provider credentials, access/refresh tokens, App Secrets, encryption material, raw webhook signatures, or raw provider payloads.

- `GET /api/admin/dashboard?period=7d|30d|90d|12m` — combined platform KPIs, period comparisons, feedback trend, channel distribution, business growth, sentiment, integration adoption/health, action-required items, safe activity, and business overview.
- `GET /api/admin/filter-options` — safe business, branch, and feedback-category identifiers/labels for admin filters.
- `GET /api/admin/users` — paginated platform users with search plus role/status/business filters and safe membership summaries.
- `GET /api/admin/feedback` — paginated platform feedback oversight with business, branch, channel, status, priority, category, sentiment, date, and search filters; customer contact fields are not returned.
- `GET /api/admin/integrations` — paginated provider/mode/status/business/health oversight with safe activity and latest-run summary.
- `GET /api/admin/system-health` — API/database connectivity and persisted AI/automation/integration/webhook activity; no fabricated infrastructure telemetry.
- `POST /api/admin/reports/preview` — returns a structured real-data preview.
- `POST /api/admin/reports/export` — returns `application/pdf` or UTF-8 `text/csv` with `Cache-Control: no-store` and download disposition.

This original Phase 25 catalog is superseded by Phase 25.4 above. Report windows remain limited to 366 days, comparison now covers relevant report-specific period metrics with safe zero baselines, and reports do not call external AI providers.

## API Prefix

All backend API routes are mounted under:

```text
/api
```

## Public Backend Legal Pages

The backend also serves three public HTML documents outside the `/api` prefix so they can be used directly through the current backend Cloudflare tunnel:

```text
GET /privacy
GET /terms
GET /data-deletion
```

These routes require no authentication, session cookie, business membership, or frontend application. Each returns HTTP `200` with `Content-Type: text/html; charset=utf-8`, does not redirect to the frontend, does not query the database, and does not expose secrets or integration credentials. They load no external JavaScript, analytics, tracking, image, font, or stylesheet dependency. The data-deletion page is intended for Meta's User Data Deletion Instructions URL field.

## Standard Success Format

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

## Standard Error Format

```json
{
  "success": false,
  "message": "Safe user-facing error message",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

Production responses must not expose stack traces, database credentials, raw Prisma errors, local file paths, or sensitive environment information.

## Health Endpoints

### `GET /api/health`

Returns API service status.

Expected successful response:

```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "service": "sme-feedback-aggregator-api",
    "status": "ok",
    "environment": "development",
    "timestamp": "2026-07-20T00:00:00.000Z"
  }
}
```

### `GET /api/health/database`

Verifies Prisma can connect to the MySQL-compatible database with a lightweight `SELECT 1` query.

Expected successful response:

```json
{
  "success": true,
  "message": "Database connection is healthy",
  "data": {
    "database": "mysql",
    "status": "connected",
    "timestamp": "2026-07-20T00:00:00.000Z"
  }
}
```

If the connection fails, the API returns a safe `DATABASE_CONNECTION_FAILED` error without exposing the raw database error or connection string.

## Authentication Endpoints

All authentication endpoints are mounted under:

```text
/api/auth
```

Tokens are set as HttpOnly cookies. API responses never return access tokens, refresh tokens, password hashes, refresh-token hashes, JWT secrets, or raw Prisma errors.

### `POST /api/auth/register`

Public endpoint with stricter authentication rate limiting.

Request body:

```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "owner@example.com",
  "password": "at-least-10-characters",
  "role": "BUSINESS_OWNER"
}
```

Allowed public roles:

- `BUSINESS_OWNER`
- `CUSTOMER`

Rejected public roles:

- `PLATFORM_ADMIN`
- `STAFF`

Successful response after Phase 2C:

```json
{
  "success": true,
  "message": "Registration received. Verify your email address to finish setup.",
  "data": {
    "email": "owner@example.com",
    "verificationRequired": true,
    "emailDeliveryStatus": "SENT"
  }
}
```

Password registration creates an unverified user and sends a verification email. It does not create a session and does not set auth cookies. If SMTP delivery is enabled but the delivery attempt fails after account creation, the response uses `emailDeliveryStatus: "FAILED"` and the user can request another verification email.

Safe errors:

- `VALIDATION_ERROR`
- `ACCOUNT_REGISTRATION_FAILED`
- `EMAIL_DELIVERY_NOT_CONFIGURED`
- `AUTH_RATE_LIMIT_EXCEEDED`

### `POST /api/auth/login`

Public endpoint with stricter authentication rate limiting.

Request body:

```json
{
  "email": "owner@example.com",
  "password": "at-least-10-characters"
}
```

Successful response matches the safe user shape returned by registration.

Safe errors:

- `VALIDATION_ERROR`
- `INVALID_CREDENTIALS`
- `EMAIL_NOT_VERIFIED`
- `ACCOUNT_SUSPENDED`
- `ACCOUNT_DISABLED`
- `AUTH_RATE_LIMIT_EXCEEDED`

Login uses a generic invalid-credentials response and does not reveal whether an email exists.

For an existing password account with a valid password and `emailVerifiedAt = null`, login returns `EMAIL_NOT_VERIFIED`, creates no session, and sets no cookies.

### `POST /api/auth/email-verification/resend`

Public endpoint with focused rate limiting.

Request body:

```json
{
  "email": "owner@example.com"
}
```

Behavior:

- Normalizes the email.
- Returns the same generic success response regardless of whether an account exists.
- For an active unverified password account, invalidates prior active verification tokens, creates a new `EMAIL_VERIFICATION` token, and sends a verification email.
- Does not disclose missing, already verified, disabled, suspended, or unsuitable accounts.

Successful response:

```json
{
  "success": true,
  "message": "If verification is available, a new email will be sent.",
  "data": {
    "accepted": true
  }
}
```

Safe errors:

- `VALIDATION_ERROR`
- `EMAIL_DELIVERY_NOT_CONFIGURED`
- `EMAIL_DELIVERY_FAILED`
- `RATE_LIMITED`

### `POST /api/auth/email-verification/confirm`

Public endpoint with focused rate limiting.

Request body:

```json
{
  "token": "raw-token-from-email"
}
```

Behavior:

- Hashes the submitted token and looks up an unused, unexpired `EMAIL_VERIFICATION` token.
- Sets `User.emailVerifiedAt` if needed.
- Marks the token used and invalidates remaining active verification tokens for that user.
- Does not create a session automatically.

Successful response:

```json
{
  "success": true,
  "message": "Email address verified.",
  "data": {
    "verified": true,
    "alreadyVerified": false
  }
}
```

Safe errors:

- `VERIFICATION_TOKEN_REQUIRED`
- `VERIFICATION_TOKEN_INVALID`
- `VERIFICATION_TOKEN_EXPIRED`
- `ACCOUNT_SUSPENDED`
- `ACCOUNT_DISABLED`
- `RATE_LIMITED`

### `POST /api/auth/forgot-password`

Public endpoint with focused rate limiting.

Request body:

```json
{
  "email": "owner@example.com"
}
```

Behavior:

- Always returns a generic accepted response when email delivery is configured.
- Sends a reset email only for active users that have a password hash.
- Does not disclose missing, disabled, suspended, or Google-only accounts.

Successful response:

```json
{
  "success": true,
  "message": "If an account can reset its password, an email will be sent.",
  "data": {
    "accepted": true
  }
}
```

Safe errors:

- `VALIDATION_ERROR`
- `EMAIL_DELIVERY_NOT_CONFIGURED`
- `EMAIL_DELIVERY_FAILED`
- `RATE_LIMITED`

### `POST /api/auth/reset-password`

Public endpoint with focused rate limiting.

Request body:

```json
{
  "token": "raw-token-from-email",
  "newPassword": "at-least-10-characters",
  "confirmPassword": "at-least-10-characters"
}
```

Behavior:

- Hashes the submitted token and requires an unused, unexpired `PASSWORD_RESET` token.
- Verifies the account is active and has a password-based sign-in.
- Hashes the new password with Argon2id.
- In one transaction, updates the password hash, marks the token used, invalidates remaining reset tokens, and revokes all active sessions for the user.
- Clears auth cookies where present and does not sign the user in automatically.

Successful response:

```json
{
  "success": true,
  "message": "Password reset successful. Please sign in again.",
  "data": {
    "reset": true,
    "sessionsRevoked": true
  }
}
```

Safe errors:

- `VALIDATION_ERROR`
- `PASSWORD_RESET_TOKEN_REQUIRED`
- `PASSWORD_RESET_TOKEN_INVALID`
- `PASSWORD_RESET_TOKEN_EXPIRED`
- `PASSWORD_RESET_NOT_AVAILABLE`
- `ACCOUNT_SUSPENDED`
- `ACCOUNT_DISABLED`
- `RATE_LIMITED`

### `POST /api/auth/google/register`

Public endpoint with stricter registration rate limiting.

Request body:

```json
{
  "credential": "google-id-credential",
  "role": "BUSINESS_OWNER",
  "firstName": "Ada",
  "lastName": "Lovelace"
}
```

Allowed public roles:

- `BUSINESS_OWNER`
- `CUSTOMER`

Behavior:

- Verifies the Google ID credential on the backend.
- Uses Google `sub` as the permanent external identifier.
- Requires a verified Google email.
- Creates a user only when the Google identity is unlinked and the verified email does not already belong to another account.
- Does not create a Business, customer profile, connector, or later-phase model.
- Creates the existing application session and HttpOnly cookies on success.

Safe success response returns the safe authenticated user. For Google-only users, `hasPassword` is `false`, `hasGoogleAccount` is `true`, and `emailVerifiedAt` is set from the verified Google email.

Safe errors:

- `VALIDATION_ERROR`
- `GOOGLE_AUTH_NOT_CONFIGURED`
- `GOOGLE_CREDENTIAL_REQUIRED`
- `GOOGLE_CREDENTIAL_INVALID`
- `GOOGLE_CREDENTIAL_EXPIRED`
- `GOOGLE_EMAIL_NOT_VERIFIED`
- `GOOGLE_PROFILE_INCOMPLETE`
- `GOOGLE_ACCOUNT_ALREADY_EXISTS`
- `ACCOUNT_EMAIL_ALREADY_EXISTS`
- `AUTH_RATE_LIMIT_EXCEEDED`

### `POST /api/auth/google/login`

Public endpoint with stricter login rate limiting.

Request body:

```json
{
  "credential": "google-id-credential"
}
```

Behavior:

- Verifies the Google ID credential on the backend.
- Looks up `ExternalAccount` by `provider=GOOGLE` and Google `sub`.
- Does not create users.
- Does not link by email.
- Confirms the linked user is active.
- Updates Google `lastUsedAt`, updates `User.lastLoginAt`, creates the existing application session, and sets HttpOnly cookies on success.

Safe errors:

- `GOOGLE_AUTH_NOT_CONFIGURED`
- `GOOGLE_CREDENTIAL_REQUIRED`
- `GOOGLE_CREDENTIAL_INVALID`
- `GOOGLE_CREDENTIAL_EXPIRED`
- `GOOGLE_EMAIL_NOT_VERIFIED`
- `GOOGLE_LOGIN_NOT_LINKED`
- `ACCOUNT_SUSPENDED`
- `ACCOUNT_DISABLED`
- `AUTH_RATE_LIMIT_EXCEEDED`

### `POST /api/auth/google/link`

Requires authentication through the existing application session.

Request body:

```json
{
  "credential": "google-id-credential"
}
```

Behavior:

- Uses only the server-authenticated current user ID.
- Verifies the Google ID credential on the backend.
- Requires the verified Google email to match the current user's normalized account email.
- Rejects Google identities already linked to another user.
- Rejects users already linked to a different Google identity.
- Treats the exact same Google account already linked to the current user as idempotent success.
- Sets `emailVerifiedAt` when Google verifies the same account email.
- Returns the updated safe authenticated user.

Safe errors:

- `AUTHENTICATION_REQUIRED`
- `GOOGLE_AUTH_NOT_CONFIGURED`
- `GOOGLE_CREDENTIAL_REQUIRED`
- `GOOGLE_CREDENTIAL_INVALID`
- `GOOGLE_CREDENTIAL_EXPIRED`
- `GOOGLE_EMAIL_NOT_VERIFIED`
- `GOOGLE_EMAIL_MISMATCH`
- `GOOGLE_ACCOUNT_ALREADY_LINKED`
- `GOOGLE_ACCOUNT_LINKED_TO_ANOTHER_USER`
- `ACCOUNT_SUSPENDED`
- `ACCOUNT_DISABLED`
- `AUTH_RATE_LIMIT_EXCEEDED`

### `POST /api/auth/refresh`

Uses the refresh-token HttpOnly cookie. The request body is empty.

Behavior:

- Verifies refresh JWT signature, issuer, audience, expiration, token type, user ID, and session ID.
- Confirms the database session exists, is not revoked, is not expired, and belongs to an active user.
- Compares only the stored refresh-token hash.
- Rotates the refresh token and updates `Session.refreshTokenHash` and `Session.lastUsedAt`.
- Replaces the access and refresh cookies.

Successful response returns the safe current user.

Safe errors:

- `SESSION_REFRESH_REJECTED`
- `ACCOUNT_SUSPENDED`
- `ACCOUNT_DISABLED`
- `AUTH_RATE_LIMIT_EXCEEDED`

If a previously rotated refresh token is reused, the affected session is revoked and cookies are cleared.

### `POST /api/auth/logout`

Public-safe endpoint. It revokes the current session when a valid access or refresh cookie is available, clears auth cookies, and succeeds even when cookies are absent or already invalid.

Successful response:

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {
    "loggedOut": true
  }
}
```

### `POST /api/auth/logout-all`

Requires authentication.

Revokes all active sessions for the authenticated user and clears current cookies.

Successful response:

```json
{
  "success": true,
  "message": "Logged out from all devices",
  "data": {
    "loggedOut": true
  }
}
```

Safe errors:

- `AUTHENTICATION_REQUIRED`
- `INVALID_TOKEN`

### `GET /api/auth/me`

Requires authentication.

When no access cookie is present, this endpoint returns the standard 401
`AUTHENTICATION_REQUIRED` error. The frontend treats that as an ordinary logged-out
startup state.

Returns the safe current user:

```json
{
  "success": true,
  "message": "Current user loaded",
  "data": {
    "user": {
      "id": "string",
      "email": "owner@example.com",
      "firstName": "Ada",
      "lastName": "Lovelace",
      "role": "BUSINESS_OWNER",
      "status": "ACTIVE",
      "emailVerifiedAt": null,
      "hasPassword": true,
      "hasGoogleAccount": false,
      "googleEmail": null,
      "avatarUrl": null,
      "lastLoginAt": "2026-07-20T00:00:00.000Z",
      "createdAt": "2026-07-20T00:00:00.000Z",
      "updatedAt": "2026-07-20T00:00:00.000Z"
    }
  }
}
```

### `GET /api/auth/sessions`

Requires authentication.

Returns active sessions belonging only to the authenticated user:

```json
{
  "success": true,
  "message": "Sessions loaded",
  "data": {
    "sessions": [
      {
        "id": "string",
        "createdAt": "2026-07-20T00:00:00.000Z",
        "lastUsedAt": "2026-07-20T00:00:00.000Z",
        "expiresAt": "2026-08-19T00:00:00.000Z",
        "userAgent": "browser user agent",
        "ipAddress": "127.0.0.1",
        "isCurrent": true
      }
    ]
  }
}
```

Refresh-token hashes are never returned.

### `DELETE /api/auth/sessions/:sessionId`

Requires authentication.

Revokes an active session only when it belongs to the authenticated user. This prevents insecure direct-object access. If the current session is revoked, cookies are cleared and the frontend clears its safe user state.

Successful response:

```json
{
  "success": true,
  "message": "Session revoked",
  "data": {
    "revokedCurrentSession": false
  }
}
```

Safe errors:

- `AUTHENTICATION_REQUIRED`
- `SESSION_NOT_FOUND`

## Phase 3 Business, Branch, Staff, and Invitation Endpoints

All workspace endpoints require authentication through the existing HttpOnly-cookie session. Platform user role is used only for onboarding eligibility and platform-admin oversight. Business permissions come from `BusinessMembership`.

### Current User Businesses

- `GET /api/businesses/mine`
  - Query: `search`, `status`, `page`, `pageSize`.
  - Returns businesses where the current user has an active membership, plus the current membership summary.
- `POST /api/businesses`
  - Requires platform role `BUSINESS_OWNER`.
  - Body includes business profile/contact/address/timezone/logo URL fields and `primaryBranch`.
  - Transactionally creates the business, active primary branch, owner membership, and all-branch owner access.

### Business Profile

- `GET /api/businesses/:businessId`
  - Requires active membership. Suspended businesses may load for blocked-state display.
- `PATCH /api/businesses/:businessId`
  - Requires `OWNER` or `ADMIN` business role and active business.
  - Body accepts partial business profile/contact/address/timezone/logo URL fields.

### Branches

- `GET /api/businesses/:businessId/branches`
  - Requires active membership. Managers/staff see only authorized branches.
  - Query: `search`, `status`, `page`, `pageSize`.
- `POST /api/businesses/:businessId/branches`
  - Requires `OWNER` or `ADMIN`.
  - Body: `name`, `code`, address/contact fields, optional `isPrimary`.
- `GET /api/businesses/:businessId/branches/:branchId`
  - Requires branch belongs to business and current membership has branch access.
- `PATCH /api/businesses/:businessId/branches/:branchId`
  - Requires `OWNER` or `ADMIN`.
- `POST /api/businesses/:businessId/branches/:branchId/set-primary`
  - Requires `OWNER` or `ADMIN`; target branch must be active.
- `POST /api/businesses/:businessId/branches/:branchId/activate`
  - Requires `OWNER` or `ADMIN`.
- `POST /api/businesses/:businessId/branches/:branchId/deactivate`
  - Requires `OWNER` or `ADMIN`; primary branch cannot be deactivated until another active branch is primary.

### Memberships

- `GET /api/businesses/:businessId/memberships`
  - Requires active business membership.
  - Query: `search`, `role`, `status`, `branchId`, `page`, `pageSize`.
- `GET /api/businesses/:businessId/memberships/:membershipId`
  - Requires active business membership and membership belongs to the business.
- `PATCH /api/businesses/:businessId/memberships/:membershipId/role`
  - Requires `OWNER` or `ADMIN`; owner is protected; admin assignment is owner-only; admins cannot modify admins or owners.
- `PUT /api/businesses/:businessId/memberships/:membershipId/branch-access`
  - Requires `OWNER` or `ADMIN`; applies only to manager/staff memberships.
  - Body: `allBranchesAccess`, `branchIds`.
- `POST /api/businesses/:businessId/memberships/:membershipId/suspend`
- `POST /api/businesses/:businessId/memberships/:membershipId/reactivate`
- `DELETE /api/businesses/:businessId/memberships/:membershipId`
  - Removal sets status `REMOVED`; it does not delete the user or revoke global sessions.

### Staff Invitations

- `GET /api/businesses/:businessId/invitations`
  - Requires `OWNER` or `ADMIN`.
  - Query: `search`, `status`, `page`, `pageSize`.
- `POST /api/businesses/:businessId/invitations`
  - Requires `OWNER` or `ADMIN`; admin invitations are owner-only; owner invitations are rejected.
  - Body: `invitedEmail`, `role`, `allBranchesAccess`, `branchIds`.
  - Requires SMTP delivery to be configured; creates a hashed single-use invitation token and emails the raw token link.
- `POST /api/businesses/:businessId/invitations/:invitationId/resend`
  - Requires `OWNER` or `ADMIN`; rotates the token hash and sends a new link.
- `DELETE /api/businesses/:businessId/invitations/:invitationId`
  - Requires `OWNER` or `ADMIN`; marks pending invitation cancelled.

### Public Invitation Flow

- `GET /api/business-invitations/preview?token=<raw-token>`
  - Public-safe preview. Validates token hash, pending status, expiry, and business status.
- `POST /api/business-invitations/accept/session`
  - Requires authenticated current session; account email must match invited email.
- `POST /api/business-invitations/accept/password`
  - Public new-account acceptance. Body: token, first name, last name, password.
  - Creates a verified platform `STAFF` account and application session when no account exists for the invited email.
- `POST /api/business-invitations/accept/google`
  - Public Google acceptance. Verifies Google ID token on the backend, requires verified email match, safely links or creates a staff user only when compatible.

All acceptance flows transactionally validate the token, confirm email, create/reactivate membership, apply role/branch access, mark accepted, and prevent token reuse.

### Platform Administrator Oversight

- `GET /api/admin/businesses`
  - Requires platform role `PLATFORM_ADMIN`.
  - Query: `search`, `status`, `page`, `pageSize`.
- `GET /api/admin/businesses/:businessId`
  - Requires `PLATFORM_ADMIN`.
- `POST /api/admin/businesses/:businessId/suspend`
  - Requires `PLATFORM_ADMIN`; blocks normal workspace operations.
- `POST /api/admin/businesses/:businessId/reactivate`
  - Requires `PLATFORM_ADMIN`; restores access subject to membership status.

Safe Phase 3 errors include `BUSINESS_NOT_FOUND`, `BUSINESS_ACCESS_DENIED`, `BUSINESS_SUSPENDED`, `BUSINESS_OWNER_REQUIRED`, `BUSINESS_ROLE_REQUIRED`, `BRANCH_NOT_FOUND`, `BRANCH_ACCESS_DENIED`, `BRANCH_CODE_EXISTS`, `PRIMARY_BRANCH_REQUIRED`, `MEMBERSHIP_NOT_FOUND`, `MEMBERSHIP_SUSPENDED`, `MEMBERSHIP_REMOVED`, `OWNER_ROLE_PROTECTED`, `ROLE_CHANGE_FORBIDDEN`, `INVITATION_NOT_FOUND`, `INVITATION_ALREADY_EXISTS`, `INVITATION_ALREADY_ACCEPTED`, `INVITATION_CANCELLED`, `INVITATION_EXPIRED`, `INVITATION_EMAIL_MISMATCH`, `INVITATION_TOKEN_INVALID`, `EMAIL_DELIVERY_NOT_CONFIGURED`, `EMAIL_DELIVERY_FAILED`, `VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, and `FORBIDDEN`.

## Phase 4 Internal Feedback Processing Service

Phase 4 does not add a public feedback API endpoint, manual-entry endpoint, webhook endpoint, or frontend feedback page. Future backend modules call the internal service:

```ts
import { feedbackProcessingService } from "./modules/feedback-processing/index.js";

await feedbackProcessingService.process(input);
```

The reusable normalized input contract is `NormalizedFeedbackInput`:

```ts
{
  businessId: string;
  branchId?: string;
  channel: FeedbackChannel;
  externalId?: string;
  idempotencyKey: string;
  title?: string;
  message: string;
  rating?: number;
  occurredAt?: Date | string;
  sourceUrl?: string;
  languageCode?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  attachments?: {
    filename: string;
    mimeType: string;
    sizeBytes?: number;
    externalUrl?: string;
    checksum?: string;
    metadata?: JsonObject;
  }[];
  metadata?: JsonObject;
}
```

Processing result:

```ts
{
  feedbackId: string;
  ingestionId: string;
  businessId: string;
  branchId: string;
  channel: FeedbackChannel;
  created: boolean;
  duplicate: boolean;
  processedAt: string;
}
```

Safe Phase 4 error codes:

- `FEEDBACK_INPUT_INVALID`
- `FEEDBACK_BUSINESS_NOT_FOUND`
- `FEEDBACK_BUSINESS_SUSPENDED`
- `FEEDBACK_BRANCH_NOT_FOUND`
- `FEEDBACK_BRANCH_INACTIVE`
- `FEEDBACK_BRANCH_BUSINESS_MISMATCH`
- `FEEDBACK_PRIMARY_BRANCH_REQUIRED`
- `FEEDBACK_EXTERNAL_ID_CONFLICT`
- `FEEDBACK_IDEMPOTENCY_CONFLICT`
- `FEEDBACK_PROCESSING_FAILED`
- `FEEDBACK_METADATA_TOO_LARGE`
- `FEEDBACK_ATTACHMENT_LIMIT_EXCEEDED`

Validation and behavior:

- `message` is required and limited to 10,000 characters.
- `rating` is optional and must be an integer from 1 to 5.
- Optional strings are trimmed; blank optional strings become `null` before storage.
- Customer email is normalized to lowercase.
- Messages preserve meaningful line breaks while collapsing accidental repeated spaces.
- Source metadata and attachment metadata must be JSON-compatible and size-limited.
- Attachment metadata is limited to 10 records per feedback.
- The service validates that the business exists and is `ACTIVE`.
- If `branchId` is supplied, the branch must exist, belong to the business, and be `ACTIVE`.
- If `branchId` is omitted, the service resolves the active primary branch for that business or rejects processing with `FEEDBACK_PRIMARY_BRANCH_REQUIRED`.
- Idempotency is scoped by `businessId`, `channel`, and `idempotencyKey`.
- External source IDs are scoped by `businessId`, `channel`, and `externalId` when an external ID exists.

Local manual-verification helper:

```bash
npm run feedback:simulate -- --businessId=<id> --channel=MANUAL --idempotencyKey=<key> --message="Great service"
```

The helper defaults to dry run and writes no data. Add `--commit` only when intentionally testing persistence:

```bash
npm run feedback:simulate -- --businessId=<id> --branchId=<id> --channel=MANUAL --idempotencyKey=<key> --message="Great service" --commit
```

Attachment metadata can be passed with `--attachments=<JSON array>`:

```bash
npm run feedback:simulate -- --businessId=<id> --branchId=<id> --channel=MANUAL --idempotencyKey=<key> --message="Great service" --attachments='[{"filename":"receipt.jpg","mimeType":"image/jpeg","sizeBytes":245000,"externalUrl":"https://example.com/receipt.jpg","checksum":"sha256-test-checksum","metadata":{"source":"manual-test"}}]' --commit
```

PowerShell-safe syntax uses `npm --%` so JSON punctuation is forwarded to npm unchanged:

```powershell
npm --% run feedback:simulate -- --businessId=<id> --branchId=<id> --channel=MANUAL --idempotencyKey=<unique-key> --message="Great service" --attachments=[{"filename":"receipt.jpg","mimeType":"image/jpeg","sizeBytes":245000,"externalUrl":"https://example.com/receipt.jpg","checksum":"sha256-test-checksum","metadata":{"source":"manual-test"}}] --commit
```

The helper parses `--attachments` as JSON, requires an array, and then passes it through the existing normalized input schema. It preserves the 10-attachment limit, does not duplicate validation or persistence logic, does not download or upload files, does not fetch external URLs, and does not print attachment content, URLs, checksums, customer data, or metadata. Invalid JSON or a non-array value prints only:

```text
FEEDBACK_INPUT_INVALID: --attachments must be a valid JSON array.
```

For local failed-ingestion verification only, the helper supports `--simulateFailureAfterIngestion` with `--commit` and a unique idempotency key:

```powershell
npm --% run feedback:simulate -- --businessId=<id> --branchId=<id> --channel=MANUAL --idempotencyKey=<unique-failure-key> --message="Trigger local failure" --commit --simulateFailureAfterIngestion
```

This option is development/manual-verification only, is not exported from the feedback-processing barrel, is not exposed through an HTTP API, refuses to run when `NODE_ENV=production`, and is not part of future connector contracts. It creates a `FeedbackIngestion` row, throws a controlled safe error inside the real processing transaction before `Feedback` or `FeedbackAttachment` persistence, and reuses the existing failed-ingestion handling so the row ends with `status=FAILED` plus safe error code/message fields only. CLI output is:

```text
FEEDBACK_PROCESSING_FAILED: Simulated local processing failure.
```

The helper reuses the real processing service, prints only safe identifiers/status on success, and prints only a safe `FEEDBACK_*` code plus short message on validation or processing failure. Empty messages are reported as `FEEDBACK_INPUT_INVALID: Message is required.` without a stack trace. Unexpected helper failures are reported as `FEEDBACK_PROCESSING_FAILED: Feedback processing failed.` The helper must not be treated as Codex manual verification.

Future adapters should implement `FeedbackSourceAdapter<TPayload>` to validate source-specific payloads and produce `NormalizedFeedbackInput`. No real source adapter is implemented in Phase 4.

## Phase 5 Manual Feedback Backend API

### `POST /api/businesses/:businessId/feedback/manual`

Requires authentication through the existing HttpOnly-cookie session. The caller must have an active `BusinessMembership` for the route business. Platform administrators do not bypass membership rules.

Headers:

```text
Content-Type: application/json
Idempotency-Key: <UUID-style random key generated by the client>
```

`Idempotency-Key` is required, trimmed, must not be blank, must be 255 characters or fewer, and is not accepted in the JSON body. The backend does not generate this key.

Request body:

```json
{
  "branchId": "required branch ID",
  "title": "optional title",
  "message": "required feedback message",
  "rating": 1,
  "occurredAt": "2026-07-24T12:00:00.000Z",
  "languageCode": "en",
  "customer": {
    "name": "Optional Customer",
    "email": "customer@example.com",
    "phone": "+250 788 000 000"
  },
  "source": {
    "type": "PHONE_CALL",
    "note": "optional note",
    "reference": "optional reference",
    "sourceUrl": "https://example.com/reference"
  },
  "attachments": [
    {
      "filename": "receipt.jpg",
      "mimeType": "image/jpeg",
      "sizeBytes": 245000,
      "externalUrl": "https://example.com/receipt.jpg",
      "checksum": "optional checksum",
      "metadata": {
        "source": "manual-entry"
      }
    }
  ]
}
```

Unknown top-level fields are rejected. The body must not include `businessId`, `channel`, `idempotencyKey`, actor IDs, ingestion status, payload hash, arbitrary source metadata, feedback IDs, or internal Prisma fields.

Manual source types:

- `PHONE_CALL`
- `IN_PERSON`
- `SUGGESTION_BOX`
- `SMS`
- `EMAIL_COPY`
- `SOCIAL_MEDIA_COPY`
- `OTHER`

Successful response data:

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

Status behavior:

- `201`: new manual feedback persisted.
- `200`: same idempotency key and same normalized payload returned an existing feedback result with `created=false` and `duplicate=true`.
- `400`: invalid body, missing/invalid `Idempotency-Key`, invalid manual source type, or invalid attachment metadata.
- `401`: not authenticated.
- `403`: missing/suspended/removed membership, branch access denied, cross-business branch, or suspended business according to the safe existing conventions.
- `404`: branch not found where safe to return.
- `409`: idempotency conflict, inactive branch, or an already-processing/failed compatible ingestion state.
- `429`: manual-feedback rate limit exceeded.
- `500`: sanitized unexpected processing failure.

Permission matrix:

| Membership role | Allowed branch scope                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `OWNER`         | Any active branch in the business                                                                     |
| `ADMIN`         | Any active branch in the business                                                                     |
| `MANAGER`       | All active branches only when `allBranchesAccess=true`, otherwise explicitly assigned active branches |
| `STAFF`         | All active branches only when `allBranchesAccess=true`, otherwise explicitly assigned active branches |

Blocked callers include suspended memberships, removed memberships, suspended businesses, inactive branches, cross-business branches, users without a membership, platform administrators without a membership, and customers without a valid business membership.

Safe errors include `MANUAL_FEEDBACK_IDEMPOTENCY_KEY_REQUIRED`, `MANUAL_FEEDBACK_IDEMPOTENCY_KEY_INVALID`, `MANUAL_FEEDBACK_SOURCE_INVALID`, `MANUAL_FEEDBACK_ACCESS_DENIED`, `FEEDBACK_INPUT_INVALID`, `FEEDBACK_IDEMPOTENCY_CONFLICT`, `FEEDBACK_BUSINESS_SUSPENDED`, `FEEDBACK_BRANCH_NOT_FOUND`, `FEEDBACK_BRANCH_INACTIVE`, `FEEDBACK_BRANCH_BUSINESS_MISMATCH`, `FEEDBACK_PROCESSING_FAILED`, `FEEDBACK_ATTACHMENT_LIMIT_EXCEEDED`, `BUSINESS_ACCESS_DENIED`, `BRANCH_ACCESS_DENIED`, `MEMBERSHIP_SUSPENDED`, `MEMBERSHIP_REMOVED`, `AUTHENTICATION_REQUIRED`, and `RATE_LIMITED`.

Manual API testing with `curl.exe` from Windows PowerShell:

```powershell
$CookieJar = "$PWD\.manual-feedback.cookies.txt"
$LoginBody = @{ email = "<TEST_EMAIL>"; password = "<TEST_PASSWORD>" } | ConvertTo-Json
curl.exe -i -c $CookieJar -b $CookieJar -H "Content-Type: application/json" -X POST "http://localhost:5000/api/auth/login" --data $LoginBody
```

```powershell
$BusinessId = "<BUSINESS_ID>"
$BranchId = "<BRANCH_ID>"
$ManualFeedbackKey = [guid]::NewGuid().ToString()
$ManualFeedbackBody = @{
  branchId = $BranchId
  title = "Phone call follow-up"
  message = "Customer called to say the service was excellent."
  rating = 5
  occurredAt = (Get-Date).ToUniversalTime().ToString("o")
  languageCode = "en"
  customer = @{ name = "Test Customer"; email = "customer@example.com"; phone = "+250 788 000 000" }
  source = @{ type = "PHONE_CALL"; note = "Logged from an afternoon call"; reference = "CALL-001"; sourceUrl = "https://example.com/manual-source" }
} | ConvertTo-Json -Depth 8
curl.exe -i -c $CookieJar -b $CookieJar -H "Content-Type: application/json" -H "Idempotency-Key: $ManualFeedbackKey" -X POST "http://localhost:5000/api/businesses/$BusinessId/feedback/manual" --data $ManualFeedbackBody
```

Repeat the same request with the same key and body to confirm `200` duplicate behavior:

```powershell
curl.exe -i -c $CookieJar -b $CookieJar -H "Content-Type: application/json" -H "Idempotency-Key: $ManualFeedbackKey" -X POST "http://localhost:5000/api/businesses/$BusinessId/feedback/manual" --data $ManualFeedbackBody
```

Reuse the same key with different content to confirm `409 FEEDBACK_IDEMPOTENCY_CONFLICT`:

```powershell
$ConflictBody = @{ branchId = $BranchId; message = "Different message under the same idempotency key."; source = @{ type = "PHONE_CALL" } } | ConvertTo-Json -Depth 6
curl.exe -i -c $CookieJar -b $CookieJar -H "Content-Type: application/json" -H "Idempotency-Key: $ManualFeedbackKey" -X POST "http://localhost:5000/api/businesses/$BusinessId/feedback/manual" --data $ConflictBody
```

Submit to an inaccessible branch:

```powershell
$InaccessibleBranchId = "<BRANCH_ID>"
$InaccessibleBody = @{ branchId = $InaccessibleBranchId; message = "Access check test."; source = @{ type = "IN_PERSON" } } | ConvertTo-Json -Depth 6
curl.exe -i -c $CookieJar -b $CookieJar -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid().ToString())" -X POST "http://localhost:5000/api/businesses/$BusinessId/feedback/manual" --data $InaccessibleBody
```

Submit to an inactive branch:

```powershell
$InactiveBranchId = "<BRANCH_ID>"
$InactiveBody = @{ branchId = $InactiveBranchId; message = "Inactive branch test."; source = @{ type = "SUGGESTION_BOX" } } | ConvertTo-Json -Depth 6
curl.exe -i -c $CookieJar -b $CookieJar -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid().ToString())" -X POST "http://localhost:5000/api/businesses/$BusinessId/feedback/manual" --data $InactiveBody
```

Test a suspended business:

```powershell
$SuspendedBusinessId = "<BUSINESS_ID>"
$SuspendedBusinessBranchId = "<BRANCH_ID>"
$SuspendedBusinessBody = @{ branchId = $SuspendedBusinessBranchId; message = "Suspended business test."; source = @{ type = "OTHER" } } | ConvertTo-Json -Depth 6
curl.exe -i -c $CookieJar -b $CookieJar -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid().ToString())" -X POST "http://localhost:5000/api/businesses/$SuspendedBusinessId/feedback/manual" --data $SuspendedBusinessBody
```

Test missing `Idempotency-Key`:

```powershell
curl.exe -i -c $CookieJar -b $CookieJar -H "Content-Type: application/json" -X POST "http://localhost:5000/api/businesses/$BusinessId/feedback/manual" --data $ManualFeedbackBody
```

Test invalid rating or email:

```powershell
$InvalidBody = @{ branchId = $BranchId; message = "Invalid validation test."; rating = 6; customer = @{ email = "not-an-email" }; source = @{ type = "SMS" } } | ConvertTo-Json -Depth 6
curl.exe -i -c $CookieJar -b $CookieJar -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid().ToString())" -X POST "http://localhost:5000/api/businesses/$BusinessId/feedback/manual" --data $InvalidBody
```

Test attachment metadata:

```powershell
$AttachmentBody = @{
  branchId = $BranchId
  message = "Attachment metadata test."
  source = @{ type = "OTHER"; reference = "BOX-001" }
  attachments = @(@{ filename = "receipt.jpg"; mimeType = "image/jpeg"; sizeBytes = 245000; externalUrl = "https://example.com/receipt.jpg"; checksum = "sha256-test-checksum"; metadata = @{ source = "manual-entry" } })
} | ConvertTo-Json -Depth 8
curl.exe -i -c $CookieJar -b $CookieJar -H "Content-Type: application/json" -H "Idempotency-Key: $([guid]::NewGuid().ToString())" -X POST "http://localhost:5000/api/businesses/$BusinessId/feedback/manual" --data $AttachmentBody
```

Confirm records through Prisma Studio:

```powershell
npm run prisma:studio -w backend
```

## Current API Limitations

## Phase 6 Public Feedback Portal API

### Authenticated Portal Management

These endpoints require the existing HttpOnly-cookie session and an active Owner/Admin `BusinessMembership` for the route business. Managers, staff, customers, users without membership, suspended/removed memberships, suspended businesses, cross-business access, and platform administrators without membership are blocked by backend authorization.

```text
GET  /api/businesses/:businessId/public-feedback
PATCH /api/businesses/:businessId/public-feedback
POST /api/businesses/:businessId/public-feedback/regenerate
```

Settings response:

```json
{
  "success": true,
  "message": "Public feedback settings loaded",
  "data": {
    "enabled": true,
    "welcomeMessage": "We value your feedback.",
    "publicUrl": "http://localhost:5173/feedback/<token>",
    "hasToken": true,
    "updatedAt": "2026-07-24T12:00:00.000Z"
  }
}
```

`PATCH` body:

```json
{
  "enabled": true,
  "welcomeMessage": "Optional public welcome message"
}
```

Validation:

- `enabled` is optional Boolean.
- `welcomeMessage` is optional, trimmed, nullable, blank-to-null, and 500 characters maximum.
- Unknown fields are rejected.
- Enabling lazily creates a secure token when missing.
- Disabling keeps the token stored but makes public GET/POST unavailable.
- Regeneration creates a new secure token and invalidates the old public URL immediately.

### Public Configuration

```text
GET /api/public/feedback/:portalToken
```

No authentication is required. The response exposes only safe public data:

```json
{
  "success": true,
  "message": "Public feedback portal loaded",
  "data": {
    "business": {
      "name": "Kigali Waffle Cuisine",
      "logoUrl": null
    },
    "portal": {
      "welcomeMessage": "We value your feedback."
    },
    "branches": [
      {
        "id": "branch-id",
        "name": "Kigali - Kiyovu",
        "location": "Kigali - Nyarugenge - Rwanda"
      }
    ]
  }
}
```

Invalid tokens, disabled portals, and suspended businesses return a generic unavailable response. A valid active portal with no active branches returns `PUBLIC_FEEDBACK_NO_ACTIVE_BRANCHES`.

### Public Submission

```text
POST /api/public/feedback/:portalToken
```

Headers:

```text
Content-Type: application/json
Idempotency-Key: <client-generated key>
```

Request body:

```json
{
  "branchId": "required active branch ID",
  "rating": 5,
  "message": "The service was excellent.",
  "occurredAt": "2026-07-24T12:00:00.000Z",
  "customer": {
    "name": "Optional Customer",
    "email": "customer@example.com",
    "phone": "+250 788 000 000"
  },
  "allowFollowUp": false,
  "website": ""
}
```

Response data:

```json
{
  "feedbackId": "string",
  "ingestionId": "string",
  "businessId": "string",
  "branchId": "string",
  "channel": "PUBLIC_FORM",
  "created": true,
  "duplicate": false,
  "processedAt": "2026-07-24T12:00:00.000Z"
}
```

Status behavior:

- `201`: new public feedback persisted.
- `200`: same idempotency key and same normalized payload returned an existing feedback result.
- `400`: invalid body, missing/invalid `Idempotency-Key`, follow-up contact missing, or honeypot rejection.
- `404`: invalid/disabled portal or branch not found.
- `409`: no active branches, inactive branch, idempotency conflict, or previous compatible processing failure.
- `429`: public feedback submission rate limit exceeded.
- `500`: sanitized unexpected processing failure.

Public validation requires an active branch from the portal business, required integer rating from 1 to 5, required non-blank message up to 5,000 characters, optional ISO datetime, optional normalized customer contact fields, and email or phone when follow-up is allowed. Unknown fields and body-supplied business/channel/idempotency/internal fields are rejected.

Safe Phase 6 errors include `PUBLIC_FEEDBACK_PORTAL_UNAVAILABLE`, `PUBLIC_FEEDBACK_NO_ACTIVE_BRANCHES`, `PUBLIC_FEEDBACK_IDEMPOTENCY_KEY_REQUIRED`, `PUBLIC_FEEDBACK_IDEMPOTENCY_KEY_INVALID`, `PUBLIC_FEEDBACK_VALIDATION_FAILED`, `PUBLIC_FEEDBACK_ACCESS_DENIED`, `PUBLIC_FEEDBACK_REJECTED`, `FEEDBACK_INPUT_INVALID`, `FEEDBACK_IDEMPOTENCY_CONFLICT`, `FEEDBACK_BRANCH_NOT_FOUND`, `FEEDBACK_BRANCH_INACTIVE`, `FEEDBACK_BRANCH_BUSINESS_MISMATCH`, `FEEDBACK_BUSINESS_SUSPENDED`, `FEEDBACK_PROCESSING_FAILED`, `BUSINESS_ACCESS_DENIED`, `BUSINESS_ROLE_REQUIRED`, `MEMBERSHIP_SUSPENDED`, `MEMBERSHIP_REMOVED`, `AUTHENTICATION_REQUIRED`, and `RATE_LIMITED`.

## Phase 7 QR-Code Feedback Submissions API

### Authenticated QR Management

These endpoints require the existing HttpOnly-cookie session and active `BusinessMembership`. Platform administrators do not bypass membership rules.

```text
GET   /api/businesses/:businessId/public-feedback/qr-codes
POST  /api/businesses/:businessId/public-feedback/qr-codes
POST  /api/businesses/:businessId/public-feedback/qr-codes/:qrCodeId/regenerate
PATCH /api/businesses/:businessId/public-feedback/qr-codes/:qrCodeId
```

Permissions:

| Membership role | QR management behavior                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `OWNER`         | View, create, copy/open/download/print, rename, regenerate, and disable QR codes                                                |
| `ADMIN`         | Same as owner                                                                                                                   |
| `MANAGER`       | View/open/download/print branch-scoped QR codes for assigned branches; all-branch managers can also view business-wide QR codes |
| `STAFF`         | Blocked by default                                                                                                              |

Creation request:

```json
{
  "name": "Front counter",
  "branchId": "optional-active-branch-id"
}
```

`branchId` omitted or blank creates a business-wide QR code. A supplied branch must belong to the route business and be active. Unknown fields are rejected. Creation and regeneration require the Phase 6 public portal to be enabled and have a token.

Management response item:

```json
{
  "id": "qr-code-id",
  "name": "Front counter",
  "scope": "BRANCH",
  "branch": {
    "id": "branch-id",
    "name": "Kiyovu Branch"
  },
  "publicUrl": "http://localhost:5173/feedback/qr/<qr-token>",
  "isActive": true,
  "isValidForCurrentPortal": true,
  "availabilityStatus": "AVAILABLE",
  "createdAt": "2026-07-24T12:00:00.000Z",
  "updatedAt": "2026-07-24T12:00:00.000Z"
}
```

List responses also include safe portal status:

```json
{
  "portal": {
    "enabled": true,
    "publicUrl": "http://localhost:5173/feedback/<portal-token>",
    "hasToken": true
  },
  "qrCodes": []
}
```

`publicUrl` for the business-wide portal is withheld from branch-limited managers. QR responses do not return portal-token fingerprints, creator membership IDs, raw Prisma relations, scan counts, feedback counts, customer data, or metadata.

`PATCH` accepts:

```json
{
  "name": "Receipt QR",
  "isActive": false
}
```

Changing branch scope is not supported. Create a new QR code instead. Disable is a soft state change; it does not disable the Phase 6 portal.

### Public QR Configuration

```text
GET /api/public/feedback/qr/:qrToken
```

No authentication is required. The QR token resolves trusted server-side QR, business, portal, and optional fixed-branch context.

Successful response:

```json
{
  "business": {
    "name": "Kigali Waffle Cuisine",
    "logoUrl": null
  },
  "portal": {
    "welcomeMessage": "We value your feedback."
  },
  "qrCode": {
    "scope": "BRANCH",
    "name": "Kiyovu counter"
  },
  "branches": [
    {
      "id": "branch-id",
      "name": "Kiyovu Branch",
      "location": "Kigali - Rwanda"
    }
  ],
  "fixedBranchId": "branch-id"
}
```

Business-wide QR codes return all active branches and `fixedBranchId: null`. Branch-specific QR codes return only the fixed active branch and a populated `fixedBranchId`.

Invalid QR tokens, disabled QR codes, disabled portals, suspended businesses, portal-token fingerprint mismatches, missing portal tokens, inactive fixed branches, and cross-business branch inconsistencies return the generic safe unavailable state: `QR_FEEDBACK_LINK_UNAVAILABLE`.

### Public QR Submission

```text
POST /api/public/feedback/qr/:qrToken
```

Headers:

```text
Content-Type: application/json
Idempotency-Key: <client-generated key>
```

Request body:

```json
{
  "branchId": "required-active-branch-id",
  "rating": 5,
  "message": "The service was excellent.",
  "occurredAt": "2026-07-24T12:00:00.000Z",
  "customer": {
    "name": "Optional Customer",
    "email": "customer@example.com",
    "phone": "+250 788 000 000"
  },
  "allowFollowUp": false,
  "website": ""
}
```

Business-wide QR submissions require an active branch from the QR business. Branch-specific QR submissions must exactly match the server-trusted fixed branch; changing the request payload to another branch returns `QR_FEEDBACK_BRANCH_LOCKED`.

Successful response follows the existing safe processing-result convention:

```json
{
  "feedbackId": "string",
  "ingestionId": "string",
  "businessId": "string",
  "branchId": "string",
  "channel": "QR_CODE",
  "created": true,
  "duplicate": false,
  "processedAt": "2026-07-24T12:00:00.000Z"
}
```

Status behavior:

- `201`: new QR feedback persisted.
- `200`: same QR token, same idempotency key, and same normalized payload returned an existing feedback result.
- `400`: invalid body, missing/invalid `Idempotency-Key`, missing branch, follow-up contact missing, honeypot rejection, or branch lock violation.
- `404`: generic unavailable QR link or invalid branch for a business-wide QR.
- `409`: no active branches, inactive branch, idempotency conflict, or previous compatible processing failure.
- `429`: QR public submission rate limit exceeded.
- `500`: sanitized unexpected processing failure.

QR submissions are processed only through `QrFeedbackSourceAdapter` and the existing Phase 4 `feedbackProcessingService`; they are stored as `FeedbackChannel.QR_CODE`. Public QR submission rate limiting is 40 submissions per 15 minutes per QR-token prefix plus IP address. Idempotency remains database-backed through Phase 4 and is scoped by business, channel, and key.

QR download and print are frontend-generated from authorized `publicUrl` values using the `qrcode` package. The backend does not generate, receive, or store QR image bytes.

## Phase 9 Feedback Workflow API

All workflow endpoints require an active `BusinessMembership` for the route business. Platform administrators without a membership are blocked.

### `PATCH /api/businesses/:businessId/feedback/:feedbackId/status`

Updates the feedback status with optimistic concurrency control.

Request body:

```json
{
  "status": "IN_REVIEW"
}
```

Allowed status values: `NEW`, `IN_REVIEW`, `RESOLVED`, `CLOSED`.

Allowed transitions:

- `NEW` → `IN_REVIEW`, `RESOLVED`
- `IN_REVIEW` → `NEW`, `RESOLVED`
- `RESOLVED` → `IN_REVIEW`, `CLOSED`
- `CLOSED` → `IN_REVIEW`

Rejected transitions:

- Same-status updates → HTTP 400 `TRANSITION_INVALID`
- `NEW` → `CLOSED`, `IN_REVIEW` → `CLOSED`, `RESOLVED` → `NEW`, `CLOSED` → `NEW`, `CLOSED` → `RESOLVED` → HTTP 400 `TRANSITION_INVALID`
- Concurrent modification (status changed by another member) → HTTP 409 `FEEDBACK_STATUS_CONFLICT`

Successful response:

```json
{
  "success": true,
  "message": "Status updated.",
  "data": {
    "feedback": {
      "id": "string",
      "status": "IN_REVIEW",
      "updatedAt": "2026-07-25T00:00:00.000Z"
    },
    "activity": {
      "id": "string",
      "type": "STATUS_CHANGED",
      "fromStatus": "NEW",
      "toStatus": "IN_REVIEW",
      "note": null,
      "actor": {
        "membershipId": "string",
        "name": "Ada Lovelace",
        "role": "OWNER"
      },
      "createdAt": "2026-07-25T00:00:00.000Z",
      "isSynthetic": false
    }
  }
}
```

Safe errors:

- `FEEDBACK_NOT_FOUND` (404)
- `FEEDBACK_STATUS_CONFLICT` (409)
- `TRANSITION_INVALID` (400)
- `BUSINESS_ACCESS_DENIED` (403)
- `MEMBERSHIP_SUSPENDED` (403)
- `MEMBERSHIP_REMOVED` (403)
- `BUSINESS_SUSPENDED` (403)
- `VALIDATION_ERROR` (400)

### `POST /api/businesses/:businessId/feedback/:feedbackId/notes`

Adds an append-only private internal note.

Request body:

```json
{
  "note": "Spoke with the customer. They agreed to a follow-up call."
}
```

Validation:

- `note` is required, must not be blank after trimming.
- Maximum 2000 characters.
- Plain text only.

Successful response:

```json
{
  "success": true,
  "message": "Note added.",
  "data": {
    "activity": {
      "id": "string",
      "type": "NOTE_ADDED",
      "fromStatus": null,
      "toStatus": null,
      "note": "Spoke with the customer. They agreed to a follow-up call.",
      "actor": {
        "membershipId": "string",
        "name": "Ada Lovelace",
        "role": "OWNER"
      },
      "createdAt": "2026-07-25T00:00:00.000Z",
      "isSynthetic": false
    }
  }
}
```

Safe errors: same authorization set as status update, plus `NOTE_INVALID` (400) for empty or over-length notes.

### `GET /api/businesses/:businessId/feedback/:feedbackId/activity`

Returns the append-only activity timeline for the feedback, including the synthetic "Feedback received" item.

Response:

```json
{
  "success": true,
  "message": "Activity loaded.",
  "data": {
    "items": [
      {
        "id": "received-<feedback-id>",
        "type": "FEEDBACK_RECEIVED",
        "fromStatus": null,
        "toStatus": null,
        "note": null,
        "channel": "MANUAL",
        "sourceLabel": "Manual Entry",
        "actor": null,
        "createdAt": "2026-07-25T00:00:00.000Z",
        "isSynthetic": true
      },
      {
        "id": "string",
        "type": "STATUS_CHANGED",
        "fromStatus": "NEW",
        "toStatus": "IN_REVIEW",
        "note": null,
        "actor": {
          "membershipId": "string",
          "name": "Ada Lovelace",
          "role": "OWNER"
        },
        "createdAt": "2026-07-25T01:00:00.000Z",
        "isSynthetic": false
      }
    ]
  }
}
```

Activity types: `STATUS_CHANGED`, `NOTE_ADDED`, and synthetic `FEEDBACK_RECEIVED`. Items are ordered newest-first, max 200.

### `GET /api/businesses/:businessId/feedback/:feedbackId/workflow-status`

Returns only the current feedback status and available transitions for quick polling.

Response:

```json
{
  "success": true,
  "message": "Status loaded.",
  "data": {
    "status": "IN_REVIEW",
    "availableTransitions": ["NEW", "RESOLVED"]
  }
}
```

### Modified Phase 8 Inbox Endpoints

#### `GET /api/businesses/:businessId/feedback`

Extended query parameter:

- `status`: optional filter by `FeedbackStatus` value (`NEW`, `IN_REVIEW`, `RESOLVED`, `CLOSED`).

List response items now include `status` field.

#### `GET /api/businesses/:businessId/feedback/:feedbackId`

Detail response now includes:

- `status`: the current `FeedbackStatus`.
- `availableTransitions`: array of allowed next statuses computed from the current status.

### Inbox Query Filter Extension

The Phase 8 inbox list query now accepts an optional `status` parameter. The filter is reflected as a URL query parameter in the frontend and included in the TanStack Query key so filter changes trigger a refetch.

## Phase 10 Assignment, Categories, and Priorities API

All Phase 10 authenticated endpoints require an active business membership and active business. Platform administrators without tenant membership remain blocked from ordinary tenant workflow endpoints.

### Category Endpoints

- `GET /api/businesses/:businessId/feedback-categories`: lists active categories for all active members; owners/admins may pass `includeInactive=true`.
- `GET /api/businesses/:businessId/feedback-categories/:categoryId`: returns a single category scoped to the route business.
- `POST /api/businesses/:businessId/feedback-categories`: owner/admin-only category creation.
- `PATCH /api/businesses/:businessId/feedback-categories/:categoryId`: owner/admin-only category name, description, or color update.
- `PATCH /api/businesses/:businessId/feedback-categories/:categoryId/activation`: owner/admin-only activation/deactivation.

Category names are trimmed, business-unique, and limited to 100 characters. Descriptions are optional and limited to 500 characters. Supported color keys are `slate`, `blue`, `indigo`, `violet`, `emerald`, `amber`, `orange`, and `rose`.

### Workflow Endpoints

- `GET /api/businesses/:businessId/feedback/:feedbackId/eligible-assignees`: returns active members eligible for the feedback branch.
- `PATCH /api/businesses/:businessId/feedback/:feedbackId/assignment`: accepts `{ "membershipId": string | null }`.
- `PATCH /api/businesses/:businessId/feedback/:feedbackId/category`: accepts `{ "categoryId": string | null }`.
- `PATCH /api/businesses/:businessId/feedback/:feedbackId/priority`: accepts `{ "priority": "LOW" | "NORMAL" | "HIGH" | "URGENT" }`.

Each mutation returns the changed feedback fragment and the created activity item. Assignment/category/priority mutations are transactional, branch-aware, and write `ASSIGNMENT_CHANGED`, `CATEGORY_CHANGED`, or `PRIORITY_CHANGED` activity records with safe before/after snapshots.

### Modified Inbox Endpoints

`GET /api/businesses/:businessId/feedback` accepts these additional optional filters:

- `assignedTo`: `me`, `unassigned`, or an active business membership ID.
- `categoryId`: business-scoped feedback category ID.
- `priority`: `LOW`, `NORMAL`, `HIGH`, or `URGENT`.

List and detail feedback responses now include:

- `assignedTo`: safe membership summary or `null`.
- `category`: safe category summary or `null`.
- `priority`: current priority value.

## Phase 11 Customer Profiles API

Phase 11 Customer Profiles endpoints are implemented under the authenticated business router. All endpoints require an active `BusinessMembership`; platform administrators without tenant membership are blocked.

Implemented protected endpoints:

```text
GET   /api/businesses/:businessId/customers
POST  /api/businesses/:businessId/customers
GET   /api/businesses/:businessId/customers/:customerId
PATCH /api/businesses/:businessId/customers/:customerId
POST  /api/businesses/:businessId/customers/:customerId/archive
POST  /api/businesses/:businessId/customers/:customerId/reactivate
GET   /api/businesses/:businessId/customers/:customerId/feedback
GET   /api/businesses/:businessId/customers/:customerId/activity
GET   /api/businesses/:businessId/feedback/:feedbackId/customer
GET   /api/businesses/:businessId/feedback/:feedbackId/customer-matches
PATCH /api/businesses/:businessId/feedback/:feedbackId/customer
POST  /api/businesses/:businessId/feedback/:feedbackId/customer
```

Implemented rules:

- All endpoints require active `BusinessMembership`; platform administrators without tenant membership are blocked.
- Customers are scoped to one business. Feedback history and aggregates are additionally branch-filtered for managers/staff.
- Customer list supports pagination, search, status filter, and conservative sorting.
- Customer detail returns profile fields and branch-safe aggregate counts.
- Customer creation/editing accepts profile fields only; it must not mutate `Feedback.customerName`, `Feedback.customerEmail`, or `Feedback.customerPhone`.
- Editing, archive, and reactivate use optimistic concurrency with `expectedUpdatedAt`.
- Feedback link/unlink is transactional, branch-aware, auditable, and rejects inaccessible feedback, inaccessible customers, archived customers, stale updates, and link conflicts safely.
- Customer matches classify candidates as exact email matches, exact phone matches, conflicting matches, exact-name suggestions, and archived matches. Name-only matches are suggestions only.
- `POST /feedback/:feedbackId/customer` creates a customer from accessible feedback and links it in one transaction. It never mutates the feedback snapshot.
- Feedback detail responses include immutable submitted customer snapshot data plus optional linked customer profile state.

Safe errors include:

- `CUSTOMER_NOT_FOUND`
- `CUSTOMER_ACCESS_DENIED`
- `CUSTOMER_ARCHIVED`
- `CUSTOMER_CONFLICT`
- `CUSTOMER_STALE_UPDATE`
- `CUSTOMER_CONTACT_INVALID`
- `CUSTOMER_MATCH_AMBIGUOUS`
- `FEEDBACK_CUSTOMER_ALREADY_LINKED`
- `FEEDBACK_CUSTOMER_LINK_CONFLICT`

## Phase 12 Search and Filters API

Phase 12 Full Search and Filters is implemented without a schema change, migration, package, external search service, AI search, fuzzy search, saved views, exports, reports, or bulk actions.

`GET /api/businesses/:businessId/feedback` now supports:

- Existing fields: `page`, `pageSize`, `search`, `branchId`, `channel`, `status`, `assignedTo`, `categoryId`, `priority`, `rating`, `dateFrom`, `dateTo`, `sort`, and `feedbackId` in frontend URL state.
- New Phase 12 fields: `assignmentState`, `categoryState`, `ratingMin`, `ratingMax`, `includeUnrated`, `datePreset`, `customerLinkState`, and `customerId`.
- Search covers `Feedback.title`, `Feedback.message`, submitted customer name/email/phone snapshots, and linked Customer display/name/email/normalized-email/phone/normalized-phone fields.
- Date filtering and newest/oldest sorting use `Feedback.receivedAt`.
- Invalid enum values, invalid page/page-size values, malformed dates, and inaccessible branch/category/assignee/customer filter IDs are normalized away safely.
- Internal notes, activity text, source metadata, QR/public tokens, payload hashes, storage paths, and provider credentials are not searched.

`GET /api/businesses/:businessId/customers` now supports:

- Existing fields: `page`, `pageSize`, `search`, `status`, and `sort`.
- New Phase 12 fields: `branchId`, `channel`, `ratingMin`, `ratingMax`, `latestFeedbackFrom`, `latestFeedbackTo`, and `contactState`.
- Customer search covers display, first, last, email, normalized email, phone, and normalized phone fields.
- `sort=latestFeedback` uses branch-safe accessible linked feedback dates rather than Customer `updatedAt`.

`GET /api/businesses/:businessId/customers/:customerId/feedback` now supports:

- `page`, `pageSize`, `search`, `branchId`, `channel`, `status`, `assignedTo`, `categoryId`, `priority`, `rating`, `ratingMin`, `ratingMax`, `includeUnrated`, `dateFrom`, `dateTo`, and `sort`.
- Branch access is applied before filtering and counting so restricted users cannot infer inaccessible feedback.

All Phase 12 endpoints continue to require active tenant `BusinessMembership`. Platform administrators without tenant membership remain blocked.

## Phase 13 AI Analysis API

Phase 13 AI Sentiment Analysis, Categorization, and Summaries APIs are implemented under the authenticated business router.

Implemented protected endpoints:

```text
GET  /api/businesses/:businessId/feedback/:feedbackId/ai-analysis
POST /api/businesses/:businessId/feedback/:feedbackId/ai-analysis/retry
POST /api/businesses/:businessId/feedback/:feedbackId/ai-category/apply
POST /api/businesses/:businessId/feedback/:feedbackId/ai-category/dismiss
GET  /api/businesses/:businessId/ai/status
POST /api/businesses/:businessId/ai/backfill
```

`GET /api/businesses/:businessId/feedback` now also accepts:

- `sentiment`: `POSITIVE`, `NEUTRAL`, `NEGATIVE`, or `MIXED`.
- `aiStatus`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, or `SKIPPED`.
- `aiSuggestionState`: `AVAILABLE`, `APPLIED`, `DISMISSED`, or `NONE`.

Inbox list and feedback detail responses now include `aiAnalysis` when an analysis row exists. The AI summary shape includes status, sentiment, sentiment confidence and confidence level, summary, detected language, suggested category, category confidence and confidence level, dismissal/application metadata, computed `categorySuggestionState` (`NONE`, `AVAILABLE`, `AUTO_APPLIED`, `MANUALLY_APPLIED`, `DISMISSED`, or `CONFLICTED`), input truncation metadata, safe retry/error state, provider/model names, prompt/schema versions, timestamps, and action permissions.

Business AI status is owner/admin-only and returns operational state (`DISABLED`, `NOT_CONFIGURED`, or `READY`), enabled/configured flags, provider/model labels, auto-apply configuration, daily business limit/usage, worker settings, status counts, and the maximum backfill batch size. It never returns provider credentials.

Business AI backfill is owner/admin-only and reports `examined`, `queued`, `alreadyAnalyzed`, `alreadyPending`, `skippedNoText`, `blockedByDailyLimit`, `failedToQueue`, and `limitRemaining`, with legacy `skipped` and `alreadyHadAnalysis` totals retained for compatibility.

Implemented rules:

- Require active tenant `BusinessMembership`; platform administrators without tenant membership remain blocked.
- Enforce branch access before returning AI results or mutating category suggestions.
- Use standard success/error response shapes.
- Return no provider secrets, raw provider responses, full prompts, internal notes, hidden activity, customer email/phone unless explicitly approved, stack traces, or cross-tenant data.
- Treat retry, apply, dismiss, and backfill actions as idempotent where practical.
- Manual retry resets automatic retry eligibility and may return a `PENDING` or `PROCESSING` analysis that still includes the last generated sentiment, language, and summary until a replacement result completes. Category-suggestion actions remain unavailable unless the current analysis state exposes an available completed suggestion.
- Protect AI routes with `aiAnalysisRateLimiter` and provider execution with a daily per-business limit.
- Allow staff read-only AI result access for accessible feedback. Manual retry, apply, and dismiss are limited to owner/admin/manager where branch access allows; business-level status and backfill are owner/admin-only.

Safe errors include `AI_ANALYSIS_NOT_FOUND`, `AI_ANALYSIS_NOT_READY`, `AI_ANALYSIS_RETRY_UNAVAILABLE`, `AI_CATEGORY_SUGGESTION_NOT_FOUND`, `AI_CATEGORY_ALREADY_SET`, `AI_DAILY_LIMIT_REACHED`, `AI_PROVIDER_NOT_CONFIGURED`, `AI_PROVIDER_UNAVAILABLE`, `AI_PROVIDER_RATE_LIMITED`, and `AI_INVALID_RESPONSE`.

## Phase 14 Automation Rules APIs

Phase 14 Automation Rules Engine APIs are implemented under authenticated business routes. They require an active tenant `BusinessMembership`; platform administrators without tenant membership are not treated as automation managers.

The Phase 14 completion audit did not change the public automation API contract. It added historical/default field-source persistence semantics and made frontend automation list filters URL-backed with `search`, `status`, and `trigger` query parameters.

Implemented protected endpoints:

```text
GET    /api/businesses/:businessId/automation-rules
POST   /api/businesses/:businessId/automation-rules
GET    /api/businesses/:businessId/automation-rules/:ruleId
PATCH  /api/businesses/:businessId/automation-rules/:ruleId
POST   /api/businesses/:businessId/automation-rules/:ruleId/activate
POST   /api/businesses/:businessId/automation-rules/:ruleId/pause
POST   /api/businesses/:businessId/automation-rules/:ruleId/archive
POST   /api/businesses/:businessId/automation-rules/:ruleId/unarchive
POST   /api/businesses/:businessId/automation-rules/:ruleId/duplicate
POST   /api/businesses/:businessId/automation-rules/:ruleId/test
POST   /api/businesses/:businessId/automation-rules/:ruleId/run
GET    /api/businesses/:businessId/automation-rules/:ruleId/executions
DELETE /api/businesses/:businessId/automation-rules/:ruleId
POST   /api/businesses/:businessId/automation-rules/reorder
GET    /api/businesses/:businessId/automation-executions
GET    /api/businesses/:businessId/automation-executions/:executionId
```

Access rules:

- Create, edit, activate, pause, archive, unarchive, duplicate, permanent delete, preview/test, manual run, reorder, and execution-history access are owner/admin-only in the MVP.
- Platform administrators without tenant `BusinessMembership` remain blocked from tenant automation APIs.
- Managers and staff do not receive automation management access.
- All request bodies are validated on the server with Zod. Frontend validation is only UX support.
- Rule targets are validated against the route business before save and revalidated at execution time.

Rule request shape:

- `name`, `description`, `trigger`, `matchMode`, `stopProcessing`, `conditions`, `actions`, and `expectedUpdatedAt` for edit concurrency.
- Maximum 10 conditions and 5 actions.
- Conditions and actions use typed shapes, not arbitrary JSON code.

Execution behavior:

- Create and update normalize submitted rule definitions before validation and persistence. Blank selected IDs become `null`, branch IDs are deduplicated, and fields irrelevant to the selected condition/action type are cleared so stale UI state cannot become invalid foreign-key writes.
- `test` is a dry run against one accessible feedback record and does not mutate feedback, activity, execution history, or field-source tracking.
- `run` executes one selected feedback only in the MVP and respects idempotency, human override, branch scoping, target validation, and loop prevention.
- `unarchive` requires the rule to be archived and restores it as `DRAFT` at the end of the non-archived rule order.
- `DELETE /automation-rules/:ruleId` requires the rule to be archived first and permanently removes the rule definition. Rule-owned branch, condition, and action rows cascade; execution/activity/field-source references remain safe through nullable rule references.
- Automatic events are queued after feedback persistence and after AI analysis completion. The worker claims queued events, evaluates active rules in position order, records executions and per-action results, and logs safe failures without rolling back feedback ingestion or AI completion.
- Execution-history endpoints paginate and return safe rule/action status, safe error codes, matched/not-matched state, rule version, feedback link, and timestamps without stack traces, raw SQL, hidden branch data, hidden membership data, or raw rule JSON.

Safe Phase 14 error codes include `AUTOMATION_RULE_NOT_FOUND`, `AUTOMATION_RULE_INVALID`, `AUTOMATION_RULE_DISABLED`, `AUTOMATION_RULE_ARCHIVED`, `AUTOMATION_ACCESS_DENIED`, `AUTOMATION_CONDITION_INVALID`, `AUTOMATION_ACTION_INVALID`, `AUTOMATION_TARGET_INACTIVE`, `AUTOMATION_TARGET_INACCESSIBLE`, `AUTOMATION_CATEGORY_INACTIVE`, `AUTOMATION_STATUS_CONFLICT`, `AUTOMATION_HUMAN_OVERRIDE`, `AUTOMATION_ALREADY_EXECUTED`, `AUTOMATION_EXECUTION_FAILED`, `AUTOMATION_EXECUTION_PARTIAL`, `AUTOMATION_LOOP_PREVENTED`, `AUTOMATION_STALE_RULE`, `AUTOMATION_LIMIT_REACHED`, and `AUTOMATION_EVENT_ALREADY_EXISTS`.

## Phase 20 Connector and Demo Synchronization APIs

Phase 20 Connector Framework and Demo Synchronization APIs are implemented under authenticated business routes. They are Demo Mode-only and require an active tenant `BusinessMembership`; platform administrators without tenant membership remain blocked.

The Phase 20 MVP API is Owner/Admin-only for integration management, tenant-membership scoped, manually synchronized, and imports feedback through the existing Phase 4 `FeedbackProcessingService`. It does not expose provider credentials, OAuth, live provider callbacks, public simulator routes, webhooks, or scheduled provider polling.

Implemented protected endpoints:

```text
GET    /api/businesses/:businessId/integration-providers
GET    /api/businesses/:businessId/integrations
POST   /api/businesses/:businessId/integrations
GET    /api/businesses/:businessId/integrations/:connectionId
PATCH  /api/businesses/:businessId/integrations/:connectionId
POST   /api/businesses/:businessId/integrations/:connectionId/test
POST   /api/businesses/:businessId/integrations/:connectionId/sync
POST   /api/businesses/:businessId/integrations/:connectionId/pause
POST   /api/businesses/:businessId/integrations/:connectionId/resume
POST   /api/businesses/:businessId/integrations/:connectionId/disconnect
POST   /api/businesses/:businessId/integrations/:connectionId/reconnect
GET    /api/businesses/:businessId/integrations/:connectionId/runs
GET    /api/businesses/:businessId/integration-runs/:runId
GET    /api/businesses/:businessId/integration-runs/:runId/items
POST   /api/businesses/:businessId/integration-runs/:runId/items/:itemId/retry
```

Implemented providers: `GOOGLE_REVIEWS`, `WHATSAPP`, `EMAIL`, `X`, `FACEBOOK`, and `INSTAGRAM`.

Implemented modes and scenarios: `DEMO` only for runtime connections, with `STANDARD_MIXED` and `PARTIAL_FAILURE` demo scenarios. `LIVE` exists only as a reserved enum value for future phases and is rejected by the Demo connector registry.

No public provider-simulator routes were added. Demo source item generation happens inside authenticated Owner/Admin integration workflows and does not call real provider endpoints.

Imports pass through the existing Phase 4 processing service:

```text
provider source item
-> connector adapter
-> NormalizedFeedbackInput
-> feedbackProcessingService.process(input)
```

Connector APIs do not insert directly into the `Feedback` table, bypass idempotency, bypass duplicate detection, expose provider credentials, expose raw OAuth tokens, return unsafe source payloads, or leak cross-tenant synchronization records.

Synchronization item states are `IMPORTED`, `DUPLICATE`, `SKIPPED`, and `FAILED`. Synchronization run states are `PENDING`, `RUNNING`, `COMPLETED`, `COMPLETED_WITH_ERRORS`, `FAILED`, and `CANCELLED`. Inbox source metadata for demo imports remains bounded and tenant-safe, including provider, Demo Mode, external source item ID, connection name, source label, original preview, simulated-data flag, and no raw provider payload body.

## Phase 21 Live Email Integration APIs

Phase 21 implements the Gmail-only Live Email MVP by extending the existing Phase 20 integration endpoints rather than creating a duplicate email-only subsystem.

Implemented protected endpoints:

```text
GET    /api/businesses/:businessId/integration-providers
GET    /api/businesses/:businessId/integrations?provider=EMAIL&mode=LIVE
POST   /api/businesses/:businessId/integrations
POST   /api/businesses/:businessId/integrations/:connectionId/authorize
GET    /api/integrations/email/oauth/gmail/callback
POST   /api/businesses/:businessId/integrations/:connectionId/test
POST   /api/businesses/:businessId/integrations/:connectionId/sync
POST   /api/businesses/:businessId/integrations/:connectionId/pause
POST   /api/businesses/:businessId/integrations/:connectionId/resume
POST   /api/businesses/:businessId/integrations/:connectionId/reauthorize
POST   /api/businesses/:businessId/integrations/:connectionId/disconnect
GET    /api/businesses/:businessId/integrations/:connectionId/runs
GET    /api/businesses/:businessId/integration-runs/:runId
GET    /api/businesses/:businessId/integration-runs/:runId/items
```

`POST /api/businesses/:businessId/integrations` Live Email request:

```json
{
  "provider": "EMAIL",
  "mode": "LIVE",
  "liveProviderType": "GMAIL",
  "displayName": "Support Inbox",
  "defaultBranchId": "branch-id"
}
```

Implemented behavior:

- Management endpoints remain Owner/Admin-only and require active tenant `BusinessMembership`; platform administrators without tenant membership remain blocked.
- The Gmail OAuth callback validates one-time state, expiry, PKCE, expected provider, tenant binding, and redirects back to the configured frontend integration workspace with safe status/error parameters.
- Authorization initiation returns only a provider authorization URL, never tokens.
- Connection/test/list responses return only safe metadata such as provider, masked mailbox, status, default Branch, last sync, total imports, safe error code, and test timestamp.
- No API response returns access tokens, refresh tokens, OAuth code verifiers, app passwords, raw MIME, raw headers, raw provider responses, provider client secrets, or credential storage envelopes.
- Synchronization remains manual first, bounded to Inbox-only, latest-20 initial import, and no read-state mutation.
- Imported Email feedback continues through `FeedbackProcessingService.process(input)` and never inserts directly into `Feedback`.
- Demo Email and Live Gmail can coexist because integration connections are separated by `IntegrationMode`.

## Phase 22 Live WhatsApp Cloud API APIs

Phase 22 Live WhatsApp Cloud API Meta test-number inbound webhook MVP is implemented by extending the existing integration APIs.

Implemented management endpoints:

```text
GET    /api/businesses/:businessId/integration-providers
GET    /api/businesses/:businessId/integrations?provider=WHATSAPP&mode=LIVE
POST   /api/businesses/:businessId/integrations
PATCH  /api/businesses/:businessId/integrations/:connectionId
POST   /api/businesses/:businessId/integrations/:connectionId/test
POST   /api/businesses/:businessId/integrations/:connectionId/pause
POST   /api/businesses/:businessId/integrations/:connectionId/resume
POST   /api/businesses/:businessId/integrations/:connectionId/disconnect
GET    /api/businesses/:businessId/integrations/:connectionId/activity
```

Implemented public webhook endpoints:

```text
GET  /api/integrations/whatsapp/webhook
POST /api/integrations/whatsapp/webhook
POST /api/integrations/meta/webhook (shared signed Meta callback)
```

Live WhatsApp create/update accepts these setup fields in addition to the shared integration fields:

```json
{
  "provider": "WHATSAPP",
  "mode": "LIVE",
  "displayName": "WhatsApp Webhook - Gisementi",
  "defaultBranchId": "branch-id",
  "phoneNumberId": "meta-phone-number-id",
  "wabaId": "whatsapp-business-account-id",
  "displayPhoneNumber": "+250 788 000 000",
  "temporaryAccessToken": "meta-test-token"
}
```

Implemented behavior:

- Management endpoints remain Owner/Admin-only and require active tenant `BusinessMembership`.
- Connection responses return masked WhatsApp phone/WABA metadata, webhook status, last webhook/inbound timestamps, and safe disclosure text only.
- `temporaryAccessToken` is encrypted backend-side and is never returned; edit requests may omit it to keep the current token.
- `POST /sync` rejects Live WhatsApp because delivery is webhook-driven.
- `GET /activity` returns safe webhook delivery records without raw webhook payloads, signatures, full phone numbers, or tokens.
- GET webhook verification compares `hub.verify_token` against backend configuration and returns only the raw `hub.challenge` on success.
- POST webhook delivery validates `X-Hub-Signature-256` with the Meta App Secret and exact raw body before JSON parsing.
- Signed `object=whatsapp_business_account` deliveries received on the shared Meta callback dispatch to this same Phase 22 WhatsApp processor after signature validation.
- Tenant resolution uses the signed webhook WABA entry ID when present together with `metadata.phone_number_id` to find the Live WhatsApp connection.
- Inbound text messages produce `NormalizedFeedbackInput` with `FeedbackChannel.WHATSAPP` and call `FeedbackProcessingService.process(input)`.
- Non-text messages are skipped without media download.

## Phase 24 Live Facebook + Instagram Meta Social Webhook APIs

Phase 24 extends the existing integration APIs for Live Facebook Page comments and Live Instagram professional-account comments. It does not add duplicate provider cards or a standalone social subsystem.

Implemented management endpoints:

```text
GET    /api/businesses/:businessId/integration-providers
GET    /api/businesses/:businessId/integrations?provider=FACEBOOK&mode=LIVE
GET    /api/businesses/:businessId/integrations?provider=INSTAGRAM&mode=LIVE
POST   /api/businesses/:businessId/integrations
PATCH  /api/businesses/:businessId/integrations/:connectionId
POST   /api/businesses/:businessId/integrations/:connectionId/test
POST   /api/businesses/:businessId/integrations/:connectionId/pause
POST   /api/businesses/:businessId/integrations/:connectionId/resume
POST   /api/businesses/:businessId/integrations/:connectionId/disconnect
GET    /api/businesses/:businessId/integrations/:connectionId/activity
```

Implemented public webhook endpoints:

```text
GET  /api/integrations/meta/webhook
POST /api/integrations/meta/webhook
```

Live Facebook create/update accepts these setup fields in addition to the shared integration fields:

```json
{
  "provider": "FACEBOOK",
  "mode": "LIVE",
  "displayName": "Facebook Page Comments - Remera",
  "defaultBranchId": "branch-id",
  "providerAccountId": "facebook-page-id",
  "providerAccountLabel": "Page display name",
  "temporaryAccessToken": "meta-developer-or-test-token"
}
```

Live Instagram create/update accepts:

```json
{
  "provider": "INSTAGRAM",
  "mode": "LIVE",
  "displayName": "Instagram Comments - Remera",
  "defaultBranchId": "branch-id",
  "providerAccountId": "instagram-professional-account-id",
  "providerAccountLabel": "account_username",
  "providerAccountType": "BUSINESS",
  "temporaryAccessToken": "meta-developer-or-test-token"
}
```

Implemented behavior:

- Management endpoints remain Owner/Admin-only and require active tenant `BusinessMembership`.
- Connection responses return provider name, safe Page/account label, webhook status, timestamps, and disclosure text only.
- `temporaryAccessToken` is encrypted backend-side and is never returned; edit requests may omit it to keep the current token.
- `POST /sync` rejects Live Facebook and Live Instagram because delivery is webhook-driven.
- `GET /activity` returns safe webhook delivery records without raw webhook payloads, signatures, access tokens, or credential envelopes.
- GET webhook verification requires string `hub.mode`, `hub.verify_token`, and `hub.challenge` values, compares the token against the existing backend configuration, and returns only the exact plain-text `hub.challenge` on success. Missing parameters return `400`; an invalid mode/token returns `403`.
- GET verification does not require `X-Hub-Signature-256`, a raw request body, or a database query/update.
- POST webhook delivery validates `X-Hub-Signature-256` with the Meta App Secret and exact raw body before JSON parsing.
- After signature validation, `object=whatsapp_business_account` dispatches to the existing Live WhatsApp processor; `object=page` and `object=instagram` remain on the existing social processor.
- Tenant resolution uses the signed webhook's Facebook Page ID or Instagram professional-account ID to find the Live connection.
- Inbound comments produce `NormalizedFeedbackInput` with `FeedbackChannel.FACEBOOK` or `FeedbackChannel.INSTAGRAM` and call `FeedbackProcessingService.process(input)`.
- Instagram mentions, DMs, Messenger events, reactions, publishing/moderation events, and media downloads are not imported.

## Phase 23 Live Outlook / Microsoft Email APIs

Phase 23 extends the existing Phase 21 Live Email API surface for Microsoft Graph Outlook/Microsoft 365 mailboxes. It does not add a standalone Outlook integration card or a separate mailbox subsystem.

Additional implemented OAuth callback endpoint:

```text
GET /api/integrations/email/oauth/outlook/callback
```

`POST /api/businesses/:businessId/integrations` Live Outlook request:

```json
{
  "provider": "EMAIL",
  "mode": "LIVE",
  "liveProviderType": "MICROSOFT",
  "displayName": "Outlook Inbox - Remera",
  "defaultBranchId": "branch-id"
}
```

Implemented behavior:

- Gmail and Outlook Live Email connections can coexist for the same Business; duplicate Gmail or duplicate Outlook setup reuses the existing same-provider connection and starts a fresh authorization flow.
- Management endpoints remain Owner/Admin-only and require active tenant `BusinessMembership`.
- Outlook OAuth uses Microsoft identity platform authorization-code flow with PKCE state and delegated read-only mailbox scopes: `offline_access`, `User.Read`, and `Mail.Read`.
- Outlook synchronization is manual, Inbox-only, capped to latest 20 messages initially, and uses Microsoft Graph v1.0 delta links for incremental follow-up runs.
- Graph message reads request immutable IDs and text bodies. Attachment handling reads metadata only and does not download binary content.
- API responses return safe connection/run metadata only: provider type, masked mailbox, status, safe error codes, run counters, default Branch, timestamps, and safe item previews.
- No API response returns access tokens, refresh tokens, OAuth code verifiers, Microsoft client secrets, raw Graph responses, raw message bodies beyond normalized feedback content, raw headers, attachment binary data, or credential envelopes.
- Imported Outlook feedback continues through `FeedbackProcessingService.process(input)` and never inserts directly into `Feedback`.

## Current API Limitations

Phase 6 public feedback portal and Phase 7 QR-code feedback submissions are implemented and manually verified. Phase 8 unified feedback inbox, Phase 9 feedback details/workflow, Phase 10 assignment/categories/priorities, Phase 11 customer profiles, Phase 12 search/filter implementation, Phase 13 AI analysis APIs, Phase 14 automation rules APIs, Phase 20 Demo Mode integration APIs, Phase 21 Gmail Live Email APIs, Phase 22 Live WhatsApp inbound webhook APIs, Phase 23 Live Outlook / Microsoft Email APIs, Phase 24 Live Facebook/Instagram inbound comment webhook APIs, and Phase 25 Platform Administrator analytics/report APIs are implemented. Phase 11, Phase 12, Phase 13, Phase 14, Phase 20, exhaustive Phase 21 security/regression verification, Phase 22 Meta test-number/browser verification, Phase 23 real Outlook OAuth/browser synchronization verification, Phase 24 Meta/browser verification, and Phase 25 manual browser/report verification remain pending. Phases 8, 9, and 10 must not be marked fully verified until deferred post-Phase-20 checks pass. Notifications, payment processing, contact-form delivery, customer accounts, Business Owner reporting expansion, IMAP mailbox sync, outbound email/replies, live Google Reviews, live X, broader social replies/DMs/publishing/media/moderation, production social OAuth onboarding, and Phase 26 integration monitoring/recovery are not implemented.

The earlier public website routes remain frontend SPA routes. The later Meta publishing support fix adds only the standalone backend HTML routes `/privacy`, `/terms`, and `/data-deletion`; it does not add a contact-submission endpoint, marketing backend, legal JSON API, database behavior, or integration mutation.
