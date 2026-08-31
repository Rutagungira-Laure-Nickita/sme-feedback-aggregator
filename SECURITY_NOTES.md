# Security Notes

## Business Owner Detailed Feedback Report Safety

- Existing report endpoints still require an authenticated platform `BUSINESS_OWNER`, active membership in the route Business, an active Business, and a server-validated optional Branch. The detail query reuses the same authorized `businessId` and canonical feedback predicate as every report total.
- The canonical predicate enforces `deletedAt: null` plus the deny-by-default visible-source policy, so only Live Gmail, Live WhatsApp, Manual Entry, and Public Form can appear. Hidden/Demo/provider-history rows cannot leak through client filtering.
- The detail projection includes only identity snapshot fallbacks required by the report (name, email, phone), original message, channel, received timestamp, category name, and status. It omits internal Feedback/customer/provider IDs, source metadata, external IDs, notes, attachments, credentials, tokens, signatures, raw payloads, and AI summaries.
- Sender/message/category strings are rendered as untrusted text and remain verbatim. Existing no-store/nosniff export headers, CSV escaping/formula neutralization, and in-memory PDF/CSV generation remain unchanged.

## Focused Operational Visibility and Role Safety

- The active operational predicate is enforced server-side and always includes both `deletedAt: null` and the exact visible-source allowlist. Frontend filtering is not the security or count-integrity boundary.
- Soft deletion remains non-destructive so provider deduplication, ingestion traceability, audit activity, and related AI/automation history cannot be bypassed by removing a visible item.
- Tenant, Business-state, Branch, customer ownership, and role checks are unchanged. Legacy internal `ADMIN` memberships retain their established permissions but are normalized to Business Owner in presentation; new invitation/role schemas prevent creation of another normal Business Admin persona.
- Hiding QR and Automation navigation does not authorize deletion or bypass their existing guarded routes. Gmail OAuth/label rules, encrypted credentials, incremental cursor/deduplication behavior, WhatsApp signature verification, and safe webhook activity are unchanged.

## Supported-Channel and Gmail Ingestion Safety

- Backend integration lifecycle authorization is now deny-by-default after the existing membership/role checks: only Live Gmail and Live WhatsApp are operational. Frontend hiding is not relied on for security. Unsupported historical rows may remain available to bounded audit code but cannot be created, authorized, resumed, activated, tested, or synchronized through normal product services.
- Operational feedback/report/customer/admin queries combine the existing tenant, role, Branch, and soft-delete predicates with the supported-source predicate. External source metadata must prove Live Gmail or Live WhatsApp; an EMAIL enum alone is insufficient.
- Gmail label resolution uses the authenticated mailbox labels endpoint and exact case-insensitive label-name matching. Import requires both Inbox and the configured label at fetch time, including incremental history candidates. Missing labels fail safely without broadening to the Inbox.
- `Auto-Submitted`, `Precedence`, `List-Id`, `List-Unsubscribe`, conservative automated-sender patterns, and narrowly combined Promotions/sender signals prevent common newsletters and automated mail from entering Feedback. Skips expose only safe reason codes; bodies, credentials, tokens, raw headers, and provider payloads are not added to logs or client responses.
- Facebook/Instagram POST webhook ingestion is retired with a controlled response. WhatsApp still requires exact raw-body `X-Hub-Signature-256` verification before processing and retains provider-message deduplication.
- All-matching bulk exclusions are bounded, schema-validated, and applied server-side within the same authenticated Business/Branch/filter scope; foreign IDs cannot expand selection or mutate another tenant.

## Final Product Hardening Security Boundaries

- Feedback edit/delete/bulk services require an authenticated active membership in an active Business and allow only `OWNER` or `ADMIN`. Every lookup/update includes route `businessId` and `deletedAt: null`; category and Branch targets must belong to that Business. Provider channel, external IDs, ingestion/source metadata, and original timestamps are outside the accepted edit schema.
- Edits use `expectedUpdatedAt` optimistic concurrency. Statuses reuse the existing transition graph; status/category/priority writes record human ownership and activities. Customer identity edits clear a potentially stale Customer link and invoke the established exact-match linker so an old linked customer cannot retain unintended dashboard access.
- Restricted Staff Branch scope comes only from authenticated active `BusinessMembershipBranch` rows. Foreign or inaccessible Branch/category/customer/assignee filters fail closed. Staff dashboard, feedback, customer, and detail queries share this scope; hiding navigation is only a usability layer over backend checks.
- Customer APIs require `CUSTOMER`, derive identity from the session user email/linked normalized Customer email, exclude soft-deleted feedback, return 404 for unowned IDs, and select no internal note, assignee, AI analysis, audit activity, source metadata, provider ID, credential, token, or raw payload.
- Soft deletion preserves ingestion/provider deduplication and audit records. Exact `DELETE` is required for an unfiltered all-matching removal. Normal dashboards/reports and processing candidates exclude removed rows; no hard-delete or cascade path was introduced.
- Gmail OAuth/sync and WhatsApp signature/webhook/test behavior are unchanged. WhatsApp Refresh Activity performs read-only queries and cannot simulate synchronization. No credential, environment, webhook secret, provider permission, or live-connector exposure changed.

## Phase 29A Runtime Import Safety

The Prisma ESM repair changes no authentication, authorization, session, tenant-isolation, webhook-signature, credential-encryption, feedback-processing, AI, automation, or reporting rule. The adapter retains generated static types and introduces no broad `any` cast. Prisma errors, connection strings, tokens, credentials, and provider payloads remain behind their existing service and error-sanitization boundaries.

## Phase 28 Category and Reconciliation Safety

- Categories remain private Business resources. Reads and writes resolve active membership; Owner/Admin is required for create/edit/activation, and every item lookup includes `businessId`.
- AI receives only active categories selected by the feedback Business and its returned category ID is revalidated against the same active Business scope. Unknown, inactive, foreign, and invented category values cannot be assigned; low-confidence semantics are unchanged.
- Automation category definitions continue to validate active Business ownership. Inbox category filtering validates category IDs against the route Business before querying feedback.
- Current-database reconciliation is explicit, deterministic, dry-run-by-default, production-disabled, transaction-wrapped, and limited to confirmed `dev_seed_*` rows. It reports protected non-seed feedback/Live connection counts and does not select, log, create, or mutate credential secrets.
- Live Outlook, Facebook, and Instagram were not enabled. Existing provider implementations and Platform Administrator visibility were not expanded.

## Phase 27 Exposure Safety

- Live-only Business Owner integration filtering is centralized in a deny-by-default allowlist for WhatsApp and Gmail. It reduces owner-facing exposure but does not replace existing authenticated membership, Business-state, provider lifecycle, OAuth, credential-encryption, or webhook-signature checks.
- Business Owner report connection/run/webhook queries require both the authorized `businessId` and Live mode; optional Branch routing remains server-validated. Demo rows cannot leak into owner operational exports through frontend filtering mistakes.
- Redesigned modals, grids, navigation, public pages, and auth wrappers do not broaden API permissions. Platform Administrator routes retain `PLATFORM_ADMIN`; owner tenant routes retain membership/Business checks.
- No credential, token, secret, raw provider payload, protected attachment URL, customer contact field, or cross-tenant data was added to new UI/report projections. Demo seed safeguards still confirm no Live credentials are present.

## Phase 26A Export Review Safety

- The correction does not change endpoint authorization. Business Owner report access still requires platform `BUSINESS_OWNER`, active membership in the route Business, and an active Business; the route `businessId` and optional Branch remain server-validated.
- Provider adoption is calculated only from the already Business/Branch-scoped safe connection projection. It does not add a cross-tenant query or expose mode-specific credentials, tokens, cursors, payloads, or provider secrets.
- Context-aware branding is a constrained report-document label. Business Owner PDF/CSV exports cannot inherit the Platform Administration label, while Platform Administrator PDF branding retains its established default.
- Existing no-store/nosniff export headers, PDF pagination safeguards, CSV BOM/escaping/formula neutralization, safe normalized feedback selection, and Platform Administrator route protection remain unchanged.

## Phase 26 Business Owner Reporting Safety

- Both owner report endpoints are mounted inside the authenticated business router (`authMiddleware`) and additionally require the platform `BUSINESS_OWNER` role plus an active membership in the route Business, which must be `ACTIVE`. Platform `STAFF`, `CUSTOMER`, and `PLATFORM_ADMIN` callers, unauthenticated callers, foreign Businesses, foreign branches, suspended/removed memberships, and non-active businesses are denied with the established safe error codes.
- The strict Zod schemas reject `businessId`, `reportType`, `outputFormat` (preview only), unknown fields, and irrelevant provider filters. The authorized Business is always derived from authenticated membership; the frontend sends no Business identifier.
- Every report query is scoped by the authorized `businessId`: feedback (including lifetime/period/previous, trend, distributions, assignment, important feedback), customers, integrations and their synchronization/webhook activity, AI processing, and automation. Branch scoping uses the persisted `defaultBranchId` routing and `Feedback.branchId` relations only.
- Report sources select no passwords/hashes, customer email/phone, access/refresh tokens, OAuth secrets, encrypted App Secrets, provider cursors, webhook verify hashes/signatures/raw payloads, source metadata, attachment URLs/checksums, or encryption material. Important feedback rows contain only normalized `Feedback.message` (or title fallback) plus workflow metadata.
- Exports are generated in memory with `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, UTF-8 BOM, RFC-style escaping, and formula-leading-cell neutralization. The Management Summary is a deterministic local calculation and never sends feedback content to an external AI provider. Platform Admin reporting routes remain `PLATFORM_ADMIN`-only and are unchanged.

## Phase 25.4C Feedback Report Safety

- Canonical current/previous feedback scopes preserve all validated filters and continue to use parameterized Prisma/raw-SQL values; no client-provided SQL or authorization bypass was added.
- Important-feedback rows select only normalized `Feedback.message`, the title fallback, workflow/rating/category labels, safe business/branch names, and receipt time. They do not select customer email/phone, `sourceMetadata`, ingestion/provider payloads, credentials, tokens, signatures, attachment URLs/checksums, or encryption material.
- The full normalized message is present only in the existing `PLATFORM_ADMIN`-protected in-memory report document/CSV. Preview and PDF apply bounded presentation excerpts; exports retain `Cache-Control: no-store`, CSV escaping, UTF-8 BOM, and formula-leading-cell neutralization.
- Generic enum display formatting is limited to enum-style uppercase tokens. Opaque lowercase identifiers remain unchanged, and important-feedback message cells bypass enum humanization so customer content is not rewritten.
- Management Summary remains deterministic local calculation over the already built metrics; it performs no separate query and sends no feedback content to an external AI provider.

## Phase 25.4A Export and Scope Safety

- Preview/PDF/CSV still originate from the same `PLATFORM_ADMIN`-protected report builder and select no credential, token, secret, provider cursor, raw webhook payload/signature, attachment URL/checksum, or customer contact detail.
- Shared scope metadata makes intentional business-wide values explicit inside a Branch-filtered report and prevents a renderer from silently substituting a broader query scope.
- CSV retains UTF-8 BOM and quote/comma/newline escaping. String cells beginning with `=`, `+`, `-`, or `@` are prefixed with an apostrophe before escaping to prevent spreadsheet formula execution.
- Report enum humanization uses an explicit allowlist and does not rewrite opaque identifiers or persisted values.

## Phase 25.4 Reporting Security

- All preview/export routes remain protected by `authMiddleware` and `requirePlatformAdmin`; the report refactor adds no tenant-role bypass.
- Report-aware schemas reject obsolete report identifiers, irrelevant filters, reversed/overlong dates, and mismatched business/branch scope. Parameterized Prisma SQL is used for scoped time buckets.
- The three builders select aggregates and deliberately safe operational fields only. They do not select passwords/hashes, sessions, reset/verification tokens, OAuth state, integration credentials, encrypted access/refresh/App Secrets, provider cursors, webhook verify hashes/signatures/raw payloads, attachment URLs/checksums, or customer email/phone.
- Important-feedback report rows contain bounded feedback text and workflow metadata but no customer contact or raw source metadata. Integration/webhook/automation descriptions use safe or human-readable text rather than exposing raw internal error codes as primary report content.
- Management summaries are deterministic local strings based on calculated counts; no feedback or operational data is sent to an external AI provider for report writing.
- Exports remain generated in memory, use `Cache-Control: no-store`, and are not persisted. Fixed Indigo branding cannot be changed through deprecated color fields; semantic sentiment/health colors remain independent of branding.

## Phase 25.3 UI Security Preservation

- All admin modal data still comes from `PLATFORM_ADMIN`-guarded endpoints; moving details into portals does not broaden authorization.
- Feedback attachments expose metadata only. Technical source/provider IDs are collapsed by default, wrap safely, and may be copied; secrets, attachment URLs/checksums, AI lock/retry internals, credential hashes, tokens, and provider cursors remain excluded.
- Raw integration error codes are not primary UI copy. Human-readable messages are shown normally; raw codes appear only in collapsed technical detail.
- High-impact user, integration, and business lifecycle actions use a separate confirmation dialog. Server-side lifecycle/self-lockout/action validation remains authoritative.
- Legacy `sme-feedback-theme` storage is removed and never read. A cached platform appearance improves first paint but is replaced by fetched settings; every settings revision reasserts the server value.
- Deprecated color fields cannot inject arbitrary application styling because frontend tokens and report rendering are fixed to Indigo and backend settings reads/writes are normalized.

## Phase 25.2 Administration and Approval Security

- All new administrative mutation/detail routes remain behind `authMiddleware` plus `requirePlatformAdmin`; tenant APIs do not grant Platform Administrators implicit membership access.
- New businesses are deny-by-default at the tenant-operation layer until explicitly activated. Central and module-specific checks require `BusinessStatus.ACTIVE`, including feedback intake/processing, inbox/workflow, customers, categories, AI, automation, QR/public feedback, and integrations.
- Business lifecycle transitions are server-validated rather than trusting UI button visibility. Existing businesses are not automatically moved to pending.
- User administration returns safe account/profile/membership/session metadata only. Password hashes, refresh-token hashes, account-token hashes, external authorization tokens, and credentials are excluded. Suspending/disabling revokes active sessions; an administrator cannot suspend or disable their own account.
- Platform feedback oversight is read-only. Source metadata and internal notes remain privileged Platform Administrator data and are rendered as text, never executable markup.
- Integration oversight excludes credential relations, provider cursors, and webhook verification hashes. Live disconnect is rejected from the platform route so provider revocation and credential deletion cannot be bypassed.
- Safe audit entries record who performed significant platform mutations and the changed state/field names, without storing feedback content or authentication/provider secrets.
- Platform setting inputs remain strict plain text/validated URLs/colors/email/phone/bounded numbers. Public exposure is limited to settings intentionally consumed by public UI and reporting.

## Phase 25.1 Platform Settings Security

- `GET/PATCH /api/admin/settings` inherit `authMiddleware` and `requirePlatformAdmin`; tenant roles cannot update global branding. The frontend RoleGuard is defense in depth only.
- The public settings response uses an allowlisted projection and never includes `updatedByUserId`, users, credentials, tokens, environment values, or other platform data.
- Update validation is strict and bounded. Branding text rejects HTML delimiters and disallowed control characters, colors require six-digit hexadecimal syntax, logo URLs allow only HTTP(S), and React renders text without raw HTML.
- The server owns the singleton ID and internal updater ID; clients cannot select another settings record or spoof the updater.
- User theme preference remains local and overrides the platform default. Collection view preferences contain only `list`/`grid` UI state and no customer, feedback, tenant, or authentication data.

## Phase 25 Platform Administrator Security Boundary

- Every new `/api/admin/*` route applies `authMiddleware` and `requirePlatformAdmin`; focused tests verify Platform Admin allowance and Business Owner, Staff, and Customer denial.
- The Platform Administrator frontend also wraps every new route in `RoleGuard`, but backend authorization remains authoritative.
- Platform-wide oversight is isolated in dedicated admin services and does not weaken tenant-scoped Business Owner/Staff APIs or grant Platform Administrators implicit `BusinessMembership` access to tenant mutation routes.
- User responses omit password hashes, account tokens, sessions, and reset/verification secrets. Feedback oversight omits customer email/phone. Integration/report responses omit `IntegrationCredential`, OAuth state, access/refresh tokens, provider App Secrets, encrypted values, raw signatures, and raw payloads.
- Report downloads use bounded validated filters, a maximum 366-day window, `Cache-Control: no-store`, a fixed server-generated filename, and server-side PDF/CSV rendering. Reports never call external AI APIs.
- Integration health/action logic is derived only from persisted safe states. System Health deliberately omits CPU, RAM, uptime, and real-time worker claims that the application does not collect.
- `npm audit --omit=dev` on 2026-08-16 reported two moderate React Router advisories. Resolving them appears to require a router upgrade outside the current phase; no forced major upgrade was made. This remains a dependency-hardening follow-up.

## Phase 1 Security Foundation

The backend currently implements:

- Helmet security headers.
- Controlled CORS using `FRONTEND_URL`.
- Credential support for future cookie-based auth.
- JSON body size limiting.
- `cookie-parser` for future HttpOnly cookie handling.
- Request rate limiting on `/api`.
- Environment variable validation with Zod.
- Centralized not-found handling.
- Centralized error handling.
- Safe API error responses.
- Pino structured logging with sensitive-value redaction.
- Strict TypeScript.

## Environment Protection

Secrets and local connection values belong in `.env` files only. The repository includes `.env.example` files, while real `.env` files are ignored.

The API must not expose `DATABASE_URL`, database passwords, raw Prisma errors, stack traces in production, local paths, or sensitive request headers.

## Phase 2A Authentication Security

Phase 2A adds the core email/password authentication foundation.

Password handling:

- Passwords are hashed with Argon2id.
- Plaintext passwords are never stored.
- Passwords are never returned in API responses.
- Password hashes are never returned in API responses.
- Password validation requires 10 to 128 characters.
- Password confirmation exists only in the frontend registration schema.
- No unnecessary uppercase/lowercase/number/symbol composition rules are enforced.

JWT and session handling:

- Access tokens and refresh tokens use separate secrets.
- Tokens are verified for signature, issuer, audience, expiration, and token type.
- Access tokens include user ID, role, and session ID.
- Refresh tokens include user ID, session ID, token type, and a unique token ID.
- Access and refresh tokens are stored only in HttpOnly cookies.
- The frontend never stores tokens in `localStorage`, `sessionStorage`, Zustand, React state, or URLs.
- Raw refresh tokens are never stored in the database.
- `Session.refreshTokenHash` stores a SHA-256 hash of the refresh token.
- Refresh-token rotation replaces the stored hash on every successful refresh.
- Reuse of a rotated refresh token revokes the affected session and clears cookies.
- Logout and session revocation set `Session.revokedAt`.

Cookie handling:

- Auth cookies use `httpOnly: true`.
- Local development uses `COOKIE_SECURE=false` for HTTP.
- Production must use `COOKIE_SECURE=true`.
- The current local default is `COOKIE_SAME_SITE=lax`.
- `COOKIE_DOMAIN` is optional and should only be set when deployment topology requires it.
- The refresh cookie uses the narrow `/api/auth` path so refresh and logout can both access it.
- Cookies are cleared consistently during logout, logout-all, refresh rejection, and current-session revocation.

Rate limiting and safe errors:

- Login, registration, and refresh have stricter authentication-specific rate limits.
- Login returns a generic invalid-credentials error and does not reveal whether an email exists.
- Public registration permits only `BUSINESS_OWNER` and `CUSTOMER`.
- `PLATFORM_ADMIN` accounts are created only by the controlled seed script using `PLATFORM_ADMIN_*` environment variables.
- `STAFF` accounts are reserved for later invitation workflows.
- Authentication middleware never trusts user IDs or roles from the frontend.
- Role middleware uses only the server-verified authenticated role.
- Logs avoid passwords, JWTs, cookies, secrets, and refresh-token hashes.
- The platform administrator seed hashes the configured password with Argon2id, marks the administrator email verified, never logs the plaintext password, refuses to promote existing non-admin users, and does not create tenant memberships.
- The comprehensive development seed runs only outside `NODE_ENV=production`, can be disabled with `DEVELOPMENT_SEED_ENABLED=false`, uses reserved `.test` identities and stable `dev_seed_*` IDs, and hashes the shared local-only password without logging it.
- Development upserts stop if a reserved seed ID or email conflicts with a non-seed identity. They modify only named seed fixtures and never delete unrelated data.
- Seeded connector state is explicitly `DEMO`; the seed creates no Live connection, integration credential, OAuth state, webhook delivery, access/refresh token, provider request, or raw provider payload. AI and automation rows are deterministic historical fixtures and do not call providers or enqueue workers.
- The documented database drop/recreate command is intentionally manual, names only `sme_feedback_aggregator`, and is forbidden for shared or production databases.
- Frontend startup treats a missing access cookie as a normal unauthenticated state and does not store tokens while doing so.
- The global Axios refresh interceptor skips login, registration, plain logout, refresh, and startup current-user requests to avoid refresh loops or noisy logged-out startup behavior.
- Backend environment validation rejects JWT duration strings outside the supported `s`, `m`, `h`, and `d` units.
- Backend environment validation rejects `COOKIE_SAME_SITE=none` unless `COOKIE_SECURE=true`.
- Frontend post-authentication landing is role-aware for usability only: platform administrators default to `/admin`, business owners and staff default to `/business`, and customers default to `/account`. Backend authentication, role middleware, and business-membership checks remain authoritative; the frontend redirect does not grant access.
- Protected-route `from` redirects are preserved after login, while already-authenticated public-only routes, unauthorized role-guard fallbacks, and root/error fallbacks use the same safe default destination map.

## Service Worker Audit

Phase 1 and Phase 2A do not intentionally include PWA or offline behavior. The 2026-07-21 audit found no repository code registering Workbox, `vite-plugin-pwa`, `registerSW`, `service-worker`, or `navigator.serviceWorker`. Workbox console output during manual testing is likely stale localhost browser state or a browser extension, not committed application behavior.

## Production Cookie Considerations

For production deployments:

- Set `COOKIE_SECURE=true`.
- Keep `COOKIE_SAME_SITE=lax` unless cross-site deployment requirements are fully understood.
- If `COOKIE_SAME_SITE=none` is required, `COOKIE_SECURE=true` is mandatory.
- Set `COOKIE_DOMAIN` only when frontend/backend subdomain sharing requires it.
- Use strong, unique production values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Do not reuse development JWT secrets in production.
- Configure deployment platform secret storage instead of committing `.env` values.

## Phase 2B Google Authentication Security

Phase 2B adds Google registration, Google login, and explicit secure linking without changing the core application session architecture.

Google credential handling:

- The frontend uses `@react-oauth/google` and sends the returned Google ID credential to the backend.
- The backend verifies Google ID credentials with `google-auth-library`.
- Verification uses the configured Web client ID as the expected audience.
- The backend requires a valid Google credential, stable `sub`, email presence, and `email_verified=true`.
- Google `sub` is stored as the permanent external account identifier.
- Email is not used as the permanent Google identifier.
- Google ID credentials are not persisted in localStorage, sessionStorage, Zustand, cookies, URLs, logs, or the database.
- Google access tokens and refresh tokens are not requested or stored.

Linking and duplicate-account controls:

- Google registration refuses an already-linked Google `sub`.
- Google registration refuses to create a duplicate user when the verified Google email already belongs to an existing account.
- Google login only works for an already-linked Google `sub`; it never creates a user and never links by email.
- Google linking requires an authenticated application session.
- Google linking uses only the server-authenticated current user ID.
- Google linking requires the verified Google email to match the current user's normalized email during Phase 2B.
- Google identities linked to another user are rejected.
- Users already linked to another Google identity are rejected.
- Existing users are not merged, deleted, or automatically linked by matching email.

Session security:

- Successful Google registration and login create the same database-backed application sessions used by email/password auth.
- Access and refresh JWTs remain stored only in HttpOnly cookies.
- Refresh tokens remain hashed in `Session.refreshTokenHash` and rotated on refresh.
- Logout, logout-all, session listing, and session revocation continue to operate on the same session model.

Configuration security:

- `GOOGLE_AUTH_ENABLED=false` lets the backend start without Google credentials.
- `GOOGLE_AUTH_ENABLED=true` requires `GOOGLE_CLIENT_ID`.
- Missing frontend `VITE_GOOGLE_CLIENT_ID` does not crash the SPA; Google UI is shown as unavailable.
- Real Google client IDs belong in `.env` files or deployment secret configuration, not committed source.

## Phase 2C Email Verification and Password Reset Security

Phase 2C adds email verification, forgot-password, password reset, and focused authentication hardening.

Account tokens:

- Email-verification and password-reset tokens are generated with Node.js cryptographic randomness.
- Raw tokens are sent only in email links and are never stored.
- `AccountToken.tokenHash` stores only a SHA-256 hash of the raw token.
- Token hashes and raw tokens are never returned by the API.
- Tokens are scoped to `EMAIL_VERIFICATION` or `PASSWORD_RESET`, preventing wrong-purpose token use.
- Tokens are single-use through `usedAt`.
- Tokens expire.
- Previous active tokens of the same type are invalidated when a replacement token is created.
- Malformed, missing, wrong-purpose, expired, and already-used tokens fail safely.

Email verification:

- New password registrations are unverified and do not receive sessions or cookies until the user verifies and logs in.
- Login verifies the submitted password before returning `EMAIL_NOT_VERIFIED`, avoiding disclosure for unknown emails or wrong passwords.
- Verification confirmation does not automatically create a session.
- Existing legacy password users were marked verified in the controlled Phase 2C migration to avoid locking out pre-verification development accounts.

Forgot password and reset:

- Forgot-password responses are generic and do not reveal whether an email exists, is disabled, is suspended, or is Google-only.
- Google-only users do not receive inappropriate password-reset emails and no password is created for them.
- Password reset uses the existing Argon2id password hashing utility.
- Password reset revokes all active sessions for the user and clears current auth cookies when present.
- The user must sign in again after reset.

Email delivery and SMTP:

- Email delivery is disabled by default with `EMAIL_ENABLED=false`.
- The backend starts when email is disabled.
- Email-dependent operations return `EMAIL_DELIVERY_NOT_CONFIGURED` when delivery is required but disabled.
- SMTP passwords are never logged.
- Raw Nodemailer/provider errors are not exposed to clients.
- Templates safely interpolate user-controlled names and include plain-text and HTML bodies.
- Real SMTP credentials must remain in `.env` or deployment secrets and must never be committed.

Rate limiting:

- Verification resend, verification confirmation, forgot-password, and reset-password have focused rate limiters.
- Existing login, registration, and refresh rate limiters remain in place.

Cleanup:

- Expired account-token records are cleaned opportunistically during token creation.
- Old expired or revoked sessions are cleaned after a retention window.
- Active sessions are not deleted by cleanup.

The following are still not implemented:

- Set-password flow for Google-only accounts.
- Google unlinking.
- Optional future password-change flow.
- Audit logs.
- Production deployment hardening.

## Phase 3 Business, Branch, Staff, and Invitation Security

Phase 3 adds tenant-scoped business, branch, membership, and staff-invitation behavior.

Tenant isolation and IDOR protection:

- Business workspace APIs resolve access from the authenticated user and an active `BusinessMembership`.
- Branch, membership, and invitation IDs are always checked against the requested `businessId`.
- Managers and staff can read only all-branch workspaces or explicitly assigned branches.
- Frontend active-business selection in local storage is a convenience only; backend membership checks are authoritative.
- Platform Administrators may use dedicated platform oversight routes (e.g., `/api/admin/businesses`) without tenant membership, but they do not automatically bypass `BusinessMembership` for ordinary tenant business operations. A platform administrator without a `BusinessMembership` is blocked from normal workspace endpoints just like any other user without membership.

Role and status enforcement:

- Suspended businesses block normal workspace, branch, staff, and invitation actions.
- Suspended or removed memberships are blocked from workspace APIs.
- Owners are protected from role changes, suspension, removal, and branch-access narrowing.
- Only owners can assign the `ADMIN` business role.
- Admins can manage managers and staff but cannot manage owners or other admins.
- Members cannot change, suspend, remove, or narrow their own membership.
- Primary branches cannot be deactivated; another active branch must be made primary first.

Staff invitation security:

- Invitation tokens are generated with Node.js cryptographic randomness.
- Only SHA-256 token hashes are stored in `StaffInvitation.tokenHash`.
- Raw invitation tokens are sent only in email links and are never returned by management APIs.
- Resending an invitation rotates the token hash and extends expiry.
- Pending invitations are single-use and are marked accepted, cancelled, or expired before reuse is allowed.
- Invitation preview exposes only safe business, branch, role, status, and invitee information.
- Current-session acceptance requires the signed-in user's normalized email to match the invited email.
- Password acceptance creates a verified staff user for the invited email and then creates a normal application session.
- Google acceptance verifies the Google ID token on the backend and requires the verified Google email to match the invited email.
- Google invitation acceptance links to an existing compatible Google identity or creates a new Google-only staff user; it does not auto-link mismatched accounts.
- Invitation creation and resend require configured SMTP delivery so no usable invitation is stored without sending the new raw token.

The following Phase 3 items are intentionally not implemented:

- Business deletion.
- Ownership transfer.
- Full audit logging.
- Logo upload storage.
- Feedback, customer, analytics, AI, connector, report, payment, or external-integration security rules.

## Phase 4 Feedback Processing Security

Phase 4 adds the internal standard feedback-processing service and persistence foundation. It does not add public submission endpoints, staff manual-entry endpoints, webhooks, connector credentials, inbox UI, or external provider calls.

Tenant and branch validation:

- The processing service treats all input IDs as untrusted.
- `businessId` must exist and the business must be `ACTIVE`.
- A provided `branchId` must exist, belong to the same business, and be `ACTIVE`.
- Omitted `branchId` falls back only to the active primary branch for that business.
- Cross-business branch IDs are rejected with `FEEDBACK_BRANCH_BUSINESS_MISMATCH`.
- Suspended businesses reject new feedback with `FEEDBACK_BUSINESS_SUSPENDED`.
- Inactive branches reject new feedback with `FEEDBACK_BRANCH_INACTIVE`.
- Phase 3 membership, invitation, branch-access, and platform-admin permissions were not expanded or redesigned by Phase 4.

Idempotency and concurrency protection:

- Every processing request requires an idempotency key.
- Database uniqueness enforces one ingestion per `[businessId, channel, idempotencyKey]`.
- Database uniqueness also protects non-null external source IDs per `[businessId, channel, externalId]`.
- Replayed identical payloads return the existing feedback as a duplicate.
- Reused idempotency keys or external IDs with different payload hashes return safe conflict errors.
- Feedback and attachment metadata are created transactionally after a `PROCESSING` ingestion row is created.
- If persistence fails after ingestion creation, the ingestion is marked `FAILED` with only a safe code and sanitized message.
- Phase 4 does not add Redis, queues, workers, retries, or in-memory locks.

Payload hashing:

- The service canonicalizes normalized input with sorted object keys before SHA-256 hashing.
- Attachment metadata and safe source metadata are included in the hash.
- Runtime persistence timestamps and idempotency keys are not included in the hash.
- The hash is used for integrity and conflict detection, not as a replacement for explicit idempotency keys.

PII, metadata, and logging:

- Customer messages and contact details are not intentionally logged by the feedback-processing service.
- Request logging continues to redact authorization and cookie headers.
- Optional customer contact is stored only as `customerName`, `customerEmail`, and `customerPhone` snapshots on `Feedback`.
- Full customer profiles and customer matching are deferred.
- Source metadata and attachment metadata must be JSON-compatible and size-limited.
- Sensitive-looking metadata keys such as authorization, cookie, password, secret, token, access-token, refresh-token, API key, and similar variants are removed during normalization.
- Complete raw third-party provider payloads must not be stored by future connectors unless a later security-reviewed design explicitly allows a bounded safe subset.

Attachment metadata limitations:

- Phase 4 stores metadata only. It does not download external files, upload files, scan files, store binary data, or expose local filesystem paths.
- Attachment URLs are validated when supplied.
- Attachments are limited to 10 metadata rows per feedback input.

Error sanitization and CLI safety:

- Safe Phase 4 errors use `FEEDBACK_*` codes and do not expose Prisma errors, SQL errors, stack traces, local paths, payload hashes, customer messages, or customer contact details.
- The local simulation helper reuses the real service.
- The helper defaults to dry-run validation and requires `--commit` before writing data.
- Attachment metadata supplied through `--attachments=<JSON array>` is parsed only as JSON and then validated by the existing Phase 4 input schema; the helper does not print attachment content, URLs, checksums, customer data, or metadata.
- The attachment helper path does not download files, upload files, fetch external URLs, store binary data, or bypass the existing 10-attachment metadata limit.
- The helper catches expected CLI validation and feedback-processing errors at the entry point, sets a failing process exit code, and prints only `FEEDBACK_*: Safe message` output.
- Empty feedback messages are reported as `FEEDBACK_INPUT_INVALID: Message is required.` without a stack trace or source path.
- Invalid attachment JSON is reported only as `FEEDBACK_INPUT_INVALID: --attachments must be a valid JSON array.`
- `--simulateFailureAfterIngestion` is development/manual-verification only, requires `--commit`, refuses to run when `NODE_ENV=production`, is not exported through the feedback-processing public barrel, and is not exposed through an HTTP API.
- The local failure simulation creates a `FeedbackIngestion` and then throws a controlled safe error inside the real processing transaction before `Feedback` or `FeedbackAttachment` persistence, so the failed row stores only safe error code/message fields and no partial feedback or attachment rows are left behind.
- Unexpected helper failures are reported only as `FEEDBACK_PROCESSING_FAILED: Feedback processing failed.`
- On commit, the helper prints only safe identifiers and status fields.
- Codex must not treat running the helper as manual verification; the user will manually test Phase 3 and Phase 4 together.

## Phase 5 Manual Feedback Backend Security

Phase 5 adds an authenticated manual-entry connector endpoint at `POST /api/businesses/:businessId/feedback/manual`.

Authorization:

- Requires the existing active account/session authentication middleware.
- Uses `BusinessMembership` as the source of business permission.
- Allows active `OWNER` and `ADMIN` members to submit to any active branch in their business.
- Allows active `MANAGER` and `STAFF` members to submit only to active branches covered by `allBranchesAccess=true` or explicit `MembershipBranchAccess`.
- Blocks suspended memberships, removed memberships, suspended businesses, inactive branches, cross-business branch IDs, users without memberships, and platform administrators without a normal business membership.
- Does not automatically create memberships and does not trust platform `User.role` as a tenant bypass.

Request and idempotency protection:

- Requires a trimmed `Idempotency-Key` header on every submission and rejects missing, blank, oversized, or null-byte values.
- Rejects body-supplied `businessId`, `channel`, `idempotencyKey`, actor IDs, payload hashes, ingestion status, feedback IDs, arbitrary source metadata, and unknown top-level fields.
- Always maps the connector channel to `MANUAL` server-side.
- Relies on Phase 4 database uniqueness and idempotency conflict handling for duplicate and concurrent submissions.

PII, metadata, and attachments:

- The endpoint does not intentionally log customer contact details or full feedback messages.
- Actor attribution comes only from trusted authenticated user and membership context.
- Source metadata is limited to manual source type, optional note/reference, and internal actor IDs.
- Attachment support is metadata-only JSON; there is no binary upload, file download, URL fetching, file scanning, or file storage.
- API responses expose only safe feedback/ingestion identifiers and processing status, not customer email, customer phone, source metadata, actor IDs, payload hash, Prisma records, SQL errors, or stack traces.

Rate limiting:

- The manual endpoint uses a focused authenticated limiter of 120 submissions per 15 minutes per route business and authenticated user.
- Rate limiting is an abuse control only; idempotency is still enforced by the Phase 4 processing service and database constraints.

## Phase 5 Manual Feedback Frontend Security

Phase 5 adds the protected frontend route `/business/:businessId/feedback/manual`.

- The page is behind the existing `ProtectedRoute` and uses the shared Axios client with HttpOnly-cookie credentials.
- The frontend never reads or stores access tokens, refresh tokens, password hashes, payload hashes, source metadata actor IDs, or raw backend error details.
- Client-side validation mirrors the safe manual-entry contract for usability, but backend authentication, business membership, branch access, business status, branch status, idempotency, and persistence checks remain authoritative.
- The page generates a fresh `Idempotency-Key` for each submission and sends it as a header, not in the request body.
- Attachment references are metadata-only form fields. The UI does not upload files, read local files, download external URLs, fetch remote attachment content, scan files, or store binary data.
- Success and duplicate states display only safe processing status and do not reveal customer PII, actor IDs, source metadata, payload hashes, Prisma records, SQL messages, or stack traces.

## Phase 6 Public Feedback Portal Security

Portal token behavior:

- Public portal tokens are generated on the backend with Node.js cryptographic randomness.
- Existing businesses are not automatically public because `publicFeedbackEnabled` defaults to `false`.
- Tokens are generated lazily when the portal is first enabled or explicitly regenerated.
- Re-enabling a disabled portal preserves the existing token unless the Owner/Admin regenerates it.
- Regenerating the link replaces the token and invalidates the old public URL immediately.
- The frontend receives the complete public URL for copy/open actions, but it does not store the token in localStorage.
- Public feedback source metadata stores only a short SHA-256 token fingerprint, not the full token.

Management authorization:

- Portal management requires an active authenticated account and active Owner/Admin `BusinessMembership`.
- Managers, staff, customers, users without membership, suspended/removed memberships, suspended businesses, cross-business access, and platform administrators without tenant membership are blocked.
- Frontend hiding is only a usability layer; backend authorization is the security boundary.

Public endpoint protection:

- Public configuration and submission endpoints do not require login and use generic unavailable responses for invalid, disabled, or suspended portals.
- Public configuration returns only business name, optional logo URL, optional welcome message, and active branch names plus safe city/district/country labels.
- Public configuration does not return owner/staff data, emails, phone numbers, business status, timestamps, token values, feedback counts, addresses, notes, memberships, or internal settings.
- The public frontend displays a business logo only when the configured URL loads successfully; missing, blank, invalid, or failed images fall back to safe business initials without exposing raw image-loading errors.
- Public submissions require `Idempotency-Key` in the header and never accept it in the body.
- Idempotency duplicate and conflict behavior is enforced by the Phase 4 processing service and database uniqueness.
- Public submissions are rate-limited to 40 submissions per 15 minutes per portal token prefix and IP address.
- The honeypot `website` field must remain empty; filled values are rejected safely and the submitted value is not logged.
- The public adapter sets `FeedbackChannel.PUBLIC_FORM` server-side and rejects body-supplied business IDs, channel values, actor IDs, source metadata, attachment metadata, and Prisma/internal fields through strict validation.

PII and logging:

- Optional customer contact is stored only as existing `Feedback` snapshot fields.
- Follow-up permission is stored only as bounded source metadata and does not create a customer profile.
- The endpoint does not intentionally log customer contact details, full feedback messages, full portal tokens, idempotency keys, payload hashes, Prisma errors, SQL errors, stack traces, or honeypot values.
- Public attachments are not implemented, so no public binary upload, download, URL fetch, file scanning, or external storage is added.

Safe error handling:

- Disabled portals, invalid tokens, and suspended businesses return a safe unavailable state.
- Inactive or mismatched branches, no active branches, validation failures, rate limits, idempotency conflicts, and processing failures use safe application error codes and user-facing messages.
- Raw backend messages, serialized objects, HTML responses, Prisma errors, SQL errors, stack traces, and internal route names are not shown in the public frontend.

## Phase 7 QR Feedback Submission Security

QR token behavior:

- QR public tokens are generated on the backend with Node.js cryptographic randomness.
- QR URLs expose only the QR token in `/feedback/qr/:qrToken`; they do not expose business IDs, branch IDs, membership IDs, portal tokens, or database IDs.
- Each QR record stores a SHA-256 fingerprint of the current Phase 6 portal token. Regenerating the Phase 6 public portal link makes previously generated QR URLs unavailable until each QR code is regenerated.
- Regenerating a QR code rotates only that QR code's public token and does not change existing feedback rows.
- Disabling a QR code makes the public QR URL unavailable without deleting historical records.

Management authorization:

- QR management requires the Phase 6 public portal to be enabled.
- Owners and admins can list, create, rename, regenerate, and disable QR codes for the business.
- Managers can view QR codes for branches they can access, including all QR codes only when their membership grants all-branch access.
- Staff, customers, users without active membership, suspended/removed memberships, suspended businesses, cross-business access, and platform administrators without tenant membership are blocked from QR management.
- Frontend permission checks hide management actions for non-managers, but backend authorization remains authoritative.

Public endpoint protection:

- QR configuration and submission endpoints do not require login and use the same generic unavailable response for invalid, disabled, stale, inactive-branch, disabled-portal, or suspended-business QR links.
- Business-wide QR codes return only the safe public business summary and active branch choices.
- Branch-specific QR codes lock submission to the configured active branch; attempts to submit a different branch are rejected safely.
- The QR public frontend uses `fixedBranchId` from the public QR configuration as the branch lock source of truth and hides the editable branch selector for branch-specific QR links. Backend branch-lock enforcement remains authoritative.
- QR submissions require `Idempotency-Key` in the header and never accept it in the body.
- QR submissions are rate-limited to 40 submissions per 15 minutes per QR-token prefix and IP address.
- The QR adapter sets `FeedbackChannel.QR_CODE` server-side and rejects body-supplied business IDs, channel values, actor IDs, source metadata, attachment metadata, and Prisma/internal fields through strict validation.

PII and storage boundaries:

- Optional customer contact is stored only as existing `Feedback` snapshot fields.
- Follow-up permission and QR context are stored only as bounded source metadata.
- The frontend generates QR preview/download/print images from the public URL client-side; generated QR image files are not uploaded to the backend.
- QR scan analytics, public attachments, customer profiles, inbox/workflow state, notifications, reports, and external integrations are not implemented.

## Phase 9 — Feedback Workflow Security

### Branch-Aware Workflow Access

All Phase 9 workflow endpoints (status update, notes, activity) resolve the authenticated actor's `BusinessMembership` and enforce:

- Active membership (rejects `SUSPENDED`, `REMOVED`, and non-ACTIVE status).
- Active business (rejects `SUSPENDED` businesses).
- Branch scoping: `OWNER` and `ADMIN` roles see all branches. `MANAGER` and `STAFF` see only branches granted through `allBranchesAccess` or explicit `MembershipBranchAccess` rows.
- Feedback lookup uses `findFirst` with `businessId` and branch access constraints, preventing cross-business or unauthorized-branch access.

### Cross-Tenant Protection

- Feedback queries always include `businessId` from the route parameter, never from a request body.
- `BusinessMembership` resolution uses `businessId_userId` composite key, tying the actor to the tenant.
- Platform administrators without a `BusinessMembership` are blocked (403 BUSINESS_ACCESS_DENIED).

### Actor Identity

- `STATUS_CHANGED` and `NOTE_ADDED` activities store `actorMembershipId` linked to the authenticated `BusinessMembership`.
- `actorMembershipId` is set to null on `BusinessMembership` deletion, preserving the activity timeline.
- Synthetic `FEEDBACK_RECEIVED` items have `actor: null`.
- Actor name and role are returned in activity responses for display purposes.

### Internal-Note Privacy

- Notes are stored as `FeedbackActivity` rows with `type: NOTE_ADDED`.
- Returns only through authenticated, branch-authorized endpoints.
- Never exposed through public APIs (Phase 6 public portal, Phase 7 QR routes).
- Never logged in full by the request logger.
- Cannot be edited or deleted after creation.
- Maximum 2000 characters, plain text only.

### Status Transition Allowlist

- Transitions are hardcoded in `getAvailableTransitions()` as a compile-time allowlist.
- Invalid transitions return safe HTTP 400 `TRANSITION_INVALID`.
- Same-status updates return safe HTTP 400 `TRANSITION_INVALID`.
- Unknown status values are rejected by Zod validation.

### Concurrent Update Protection

- Status updates use `updateMany` with `status = currentStatus` in the WHERE clause.
- If `count === 0`, HTTP 409 `FEEDBACK_STATUS_CONFLICT` is returned.
- Activity creation occurs in the same transaction only after a successful update, preventing orphaned activities.
- The frontend refreshes the detail and activity queries on success, ensuring stale transitions are not displayed.

### Public Endpoint Isolation

- Phase 9 workflow endpoints are mounted under the authenticated business router (`/api/businesses/:businessId/feedback`).
- Public endpoints (Phase 6 portal, Phase 7 QR) are mounted under `/api/public/` and `/api/businesses/:businessId/public-feedback/`.
- Workflow routes cannot be reached through public endpoints because the route path structure and Express middleware chain are separate.
- No workflow data is included in public form/submission responses.

## Phase 10 - Assignment, Categories, and Priorities Security

### Tenant and Membership Enforcement

- Category endpoints resolve the authenticated user's `BusinessMembership` for the route `businessId`.
- Assignment, category, and priority workflow endpoints reuse branch-aware feedback access checks before mutation.
- Inbox assignee/category filters are validated against the route business before the feedback query is executed.
- Platform administrators without tenant membership remain blocked from ordinary tenant inbox/workflow/category endpoints.

### Role Boundaries

- Category create, update, activate, and deactivate actions are restricted to `OWNER` and `ADMIN`.
- Category read/list endpoints require active membership; non-manager reads expose active categories only.
- Assignment changes allow owner/admin/manager to assign accessible feedback to eligible active members.
- Staff can self-assign unassigned accessible feedback, unassign themselves, and work only on feedback they can access.

### Branch Scope

- Feedback mutations include both `businessId` and authorized branch scope.
- Eligible assignee responses include only active members eligible for the feedback branch.
- Existing historical assignees that later become inactive or branch-ineligible can be displayed as unavailable but are not offered as new assignment targets.

### Activity Privacy

- Assignment, category, and priority changes create internal `FeedbackActivity` records only after successful mutations.
- Activity snapshots store safe display values or enum values, not raw request payloads, customer PII, secrets, or external connector data.
- Phase 10 workflow data is not returned by public feedback portal or QR endpoints.

## Phase 11 Customer Profiles Security

Phase 11 Customer Profiles is implemented. Manual browser/functional verification remains pending with the user.

### Current Customer Data Exposure

The current implementation stores customer data only as `Feedback` snapshot fields:

- `customerName`
- `customerEmail`
- `customerPhone`

Inbox list responses expose customer name only. Feedback detail responses expose the snapshot name, email, and phone to authorized business members with branch access to that feedback. Public form and QR endpoints do not expose internal feedback history or customer profile data.

### Implemented Phase 11 Privacy Controls

Customer profile APIs:

- Require active `BusinessMembership` for the route business.
- Block platform administrators from tenant customer APIs unless they also have a business membership.
- Scope every customer query by `businessId`.
- Filter profile feedback history by branch access for managers and staff.
- Filter profile aggregates by branch access for managers and staff, including total feedback, latest feedback date, average rating, branch distribution, channel distribution, and duplicate indicators.
- Avoid returning business-wide customer counts or hidden-branch hints to branch-restricted users.
- Keep `Feedback` snapshot data immutable and visible as historical source data.
- Avoid logging full names, emails, phone numbers, profile notes, search strings containing PII, raw source metadata, or match candidate payloads.
- Return the same safe not-found style for inaccessible and missing customers where appropriate to reduce enumeration.
- Rate-limit or otherwise protect customer search and match endpoints from enumeration.
  Current endpoints remain behind authenticated membership access and the global API limiter.

### Matching and Merge Risks

Automatic fuzzy matching is prohibited and not implemented. Safe automatic linking requires one unambiguous active customer in the same business by normalized email or normalized phone. Human review is required for multiple candidates, conflicting email/phone matches, exact-name-only matches, provider-specific identities, and possible duplicates.

Irreversible customer merge should be deferred. If merging is later introduced, it needs preview, survivor selection, transactional feedback relinking, append-only audit history, permission checks, and a clear rollback/unmerge decision.

### Customer Notes and Status

Customer-level notes are not implemented in Phase 11. Customer activity records are internal, tenant-scoped, actor-tracked, timestamped, and available only to owner/admin members.

The Phase 11 customer status set is `ACTIVE` and `ARCHIVED`. `BLOCKED` and `DO_NOT_CONTACT` are not implemented.

## Phase 12 Search and Filters Security

Phase 12 Full Search and Filters is implemented. No schema, migration, package, browser automation, or manual verification was added.

The later Feedback Inbox filter display repair added frontend-only Radix Select/Popover presentation primitives. It did not change backend search/filter validation, tenant authorization, branch scoping, query parameter handling, or public endpoint exposure.

The later workspace dropdown/date-picker standardization is also frontend-only. It replaces native control presentation but does not change authorization decisions, request shapes, API validation, public token handling, branch locking, idempotency, or tenant enforcement.

The later Customer list filter display and responsive repair is frontend-only. It changes how customer filters are grouped and when the list uses cards instead of the table; backend customer-list validation, membership enforcement, branch-scoped visibility, URL query keys, and customer mutation authorization are unchanged.

The later Automation builder responsive row repair is frontend-only. It changes rule-builder control layout and selected-value truncation but does not alter rule definitions, validation, preview/manual-run inputs, execution scheduling, worker behavior, tenant authorization, branch scoping, field-source ownership, or automation API contracts.

The later Branch form responsive required-field repair is frontend-only. It changes branch form labels, placeholders, and responsive action layout but does not alter branch request payloads, branch validation schemas, owner/admin authorization, primary-branch rules, tenant checks, or platform-admin boundaries.

The later Business workspace header responsive alignment repair is frontend-only. It changes shared header flex widths and customer-page action wrapping but does not alter business switching authority, route guards, request payloads, customer queries, customer mutations, backend authorization, tenant checks, branch scoping, or public endpoints.

The later Automation draft target normalization repair keeps backend enforcement authoritative. The frontend clears stale rule-builder target fields before submit, and the backend normalizes the definition again before target validation and Prisma persistence. Valid category, branch, and membership IDs are still checked against the route business and active target state; invalid executable targets return safe automation validation errors instead of raw Prisma foreign-key failures.

The later Automation management UX and archive lifecycle repair keeps backend enforcement authoritative. Duplicate and permanent-delete actions now require an explicit frontend confirmation dialog, but owner/admin membership and archived-state requirements are enforced server-side. Restoring archived rules returns them as drafts, permanent deletion is allowed only for archived rules, and execution/activity/field-source history keeps safe nullable rule references instead of exposing raw deletion errors.

The later portal sidebar logout repair is frontend-only. Sidebar and admin Sign out controls reuse the existing logout mutation, cookie clearing, auth-store clearing, query cleanup, and `/login` redirect flow. The desktop sidebar fixed-scroll experiment was reverted at the user's request, so business/account sidebars and content use normal shared page scrolling again. This does not change backend authentication, route guards, session revocation semantics, tenant authorization, business switching, public endpoints, or API request payloads.

Implemented Phase 12 security rules:

- Every search and filter API requires active tenant `BusinessMembership` and active business status.
- Platform administrators without tenant membership remain blocked from tenant search/filter APIs.
- Branch restrictions are applied before search, filtering, aggregation, counts, pagination totals, and option availability.
- Customer list visibility for managers/staff remains based on accessible linked feedback only.
- Customer feedback history does not expose inaccessible branch history, counts, latest dates, ratings, branch distributions, or channel distributions.
- Search input is trimmed, length-limited, null-byte-safe, and parsed with structured Prisma filters rather than raw SQL string interpolation.
- Stale or inaccessible branch, category, assignee, and customer filter IDs are omitted safely before Feedback Inbox query execution.
- Inbox list responses still avoid exposing customer email/phone, even though those fields are searchable server-side.
- Assignee option loading is narrowed for branch-restricted users to a selected accessible branch or at least one accessible branch.

Phase 12 must not add AI/fuzzy ranking, external provider search, saved-search sharing, reports/exports, notifications, customer accounts, or Phase 20 connector behavior.

## Phase 13 AI Analysis Security

Phase 13 AI sentiment analysis, categorization, and summaries are implemented behind authenticated tenant APIs and a backend-only worker.

Implemented security boundaries:

- Feedback content is treated as untrusted customer data, not instructions.
- Prompts delimit customer content clearly and instruct the model to ignore attempts inside feedback text to reveal secrets, alter system instructions, call tools, or exfiltrate data.
- The provider input sends the minimum useful data: title, message, rating, channel, optional language code, and active business category names/IDs for categorization.
- Do not send internal notes, hidden activity, customer email, customer phone, provider credentials, raw source metadata, tokens, attachment contents, or unrestricted customer profile PII in the MVP.
- Provider secrets stay in environment or approved secret storage and are never exposed to frontend code, logs, prompts, source metadata, or API responses.
- Provider output is strictly validated before persistence; invalid output becomes a safe failed analysis state.
- Active `BusinessMembership` and branch access are enforced for every AI result and action. Platform administrators without tenant membership remain blocked.
- Business-wide AI status and backfill controls require owner/admin membership; managers may retry/apply/dismiss suggestions only for feedback they can access, and staff remain read-only.
- Human-selected category changes are protected from AI retries and delayed provider responses by conditional updates that require uncategorized feedback.
- Logs and client responses omit full feedback text, customer contact fields, raw prompts, raw provider responses, provider keys, and stack traces.
- AI routes use a dedicated rate limiter, provider execution uses a per-business daily limit counted from the UTC start of day, and retry/backfill operations are bounded.
- Manual retry resets the automatic retry counter for the existing tenant-scoped analysis row and keeps the previous generated review visible during replacement attempts without exposing provider errors, prompts, raw responses, keys, or hidden customer/contact data.
- The completion audit added pure tests for prompt minimization, unsafe provider output rejection, transient-provider retry classification, Unicode-safe truncation, and suggestion lifecycle state mapping. Browser/manual security verification is still pending with the user.

## Phase 14 Automation Rules Engine Security

Phase 14 Automation Rules Engine security implementation is complete. Manual browser/API security verification remains pending with the user.

The 2026-07-27 Phase 14 completion audit added `DEFAULT` field ownership and an idempotent historical field-source backfill. The backfill does not mutate feedback values, execute automation rules, queue events, call Gemini, or guess historical membership IDs. Human-owned field rows remain the only source state that automation treats as protected from overwrite.

Implemented Phase 14 security boundaries:

- Automation rules belong to one business and must never operate across businesses.
- Platform administrators without tenant `BusinessMembership` must remain blocked from normal tenant automation management, execution previews, and history.
- Rule management, preview, manual run, reorder, and execution history are owner/admin-only in the MVP.
- All rule definitions, condition values, action targets, and execution requests are server-validated with Zod and domain checks. Frontend validation is only a UX aid.
- Rule definitions do not allow arbitrary JavaScript, raw SQL, regular expressions, webhooks, external API calls, customer messages, or connector operations.
- Branch, category, membership, and feedback IDs are checked against the route business and permitted branch scope before save, preview, and execution.
- Managers and staff do not receive automation-management visibility.
- Automation does not impersonate a human owner/admin/manager/staff member.
- Feedback activity identifies system-generated automation actions with the rule name and safe before/after values.
- Human changes are authoritative. Automation does not overwrite human-owned status, priority, assignment, or category values.
- Execution is idempotent for a given rule version, feedback, trigger, and input fingerprint.
- Loop prevention uses event-chain IDs/depth and the MVP avoids workflow-change triggers.
- Automation failures do not invalidate valid feedback ingestion or AI analysis persistence.
- Stored rule names/descriptions are rendered through React escaping in the frontend.
- Execution errors use safe codes and do not expose stack traces, Prisma errors, SQL, raw JSON definitions, hidden PII, or cross-tenant records.

Recommended abuse limits:

- Maximum 50 active rules per business.
- Maximum 200 total non-archived rules per business.
- Maximum 10 conditions per rule.
- Maximum 5 actions per rule.
- Maximum 3 execution retries.
- Maximum event-chain depth 3.
- Dedicated rate limits for management, test, and manual run endpoints.

## Phase 20 Connector Framework and Demo Synchronization Security

Phase 20 Connector Framework and Demo Synchronization security implementation is complete for the Demo Mode MVP. Manual browser/API security verification remains pending with the user.

Implemented Phase 20 security boundaries:

- Owner/Admin-only integration management.
- Active tenant `BusinessMembership` required; platform administrators without tenant membership remain blocked.
- Demo Mode only, with no provider credentials, OAuth, webhooks, public simulator routes, scheduled provider polling, provider API calls, or live claims.
- One default active Branch per connection, validated on connect/configure and again during synchronization.
- All imports call `FeedbackProcessingService` with `NormalizedFeedbackInput`; direct `Feedback` inserts are not used.
- Deterministic external IDs and idempotency keys prevent repeat-sync duplicates through the Phase 4 pipeline.
- Synchronization run and item errors use safe codes/messages only.
- Raw provider payload bodies, provider secrets, tokens, customer contact beyond approved feedback snapshots, and hidden tenant data are not stored or returned.
- Failed item retry is scoped through the run, item, business, and connection checks.

Demo Mode truthfulness:

- Phase 20 demo synchronization is clearly labeled Demo Mode.
- Simulated provider items are labeled as simulated external data.
- The UI and documentation do not claim that demo sources are connected to real WhatsApp Business, Google Reviews, X, Facebook, Instagram, Email, or any other live provider.
- Demo connector results prove internal architecture only; they are not presented as provider approval, production connectivity, or live synchronization.

Tenant isolation and source metadata:

- Integration connections, synchronization runs, synchronization items, and imported feedback are scoped to the owning business tenant.
- Imported feedback exposes only safe source metadata, such as provider, Demo Mode, external source item ID, source label, connection name, source type, simulated-data flag, and original preview.
- Public routes must not expose internal synchronization records, provider source lists, synchronization history, retry state, cursors, credentials, webhook internals, or tenant-specific import diagnostics.
- Full raw third-party payloads must not be stored or returned unless a later security-reviewed design explicitly allows a bounded safe subset.

Future live credential and provider security:

- Live provider tokens, refresh tokens, API keys, OAuth client secrets, webhook secrets, and mailbox credentials must be stored only in environment or deployment secret storage, or in an encrypted database design approved in a later phase.
- Credentials and tokens must never be logged, returned by APIs, stored in frontend local storage, exposed in URLs, or included in source metadata.
- Live connectors must handle token refresh, expired-token detection, provider permission failures, and provider-specific account disconnect states safely.
- Webhook-based providers must verify signatures or shared secrets before accepting events.
- Polling or webhook workers must enforce tenant scope, rate limits, replay/idempotency protection, and safe error handling.
- Provider rate limits, provider outages, and failed imports must use retry and recovery flows that do not duplicate feedback or leak customer/source data across tenants.

## Phase 21 Live Email Integration Security

Phase 21 Live Email Integration is implemented for the Gmail-only MVP. No real Gmail credentials were requested or stored by Codex, no mailbox was connected, no live Gmail API call was made during automated tests, no IMAP/SMTP integration was added, and no browser/manual verification was performed during the Phase 21 implementation.

Implemented security direction:

- Start with Gmail API OAuth first; Phase 23 later adds Microsoft Graph Outlook support, while IMAP remains deferred.
- Use a separate Gmail mailbox OAuth grant. Existing Google login ID-token configuration is not sufficient for mailbox access.
- Store live credentials only in a separate encrypted backend model, not on `IntegrationConnection` or in source metadata.
- Add a high-entropy backend key `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY`; live email configuration validation requires a 32-byte base64 key when `LIVE_EMAIL_ENABLED=true`.
- Use AES-256-GCM envelopes with key version, IV/nonce, auth tag, ciphertext, and associated data for access tokens, refresh tokens, and OAuth PKCE verifiers.
- Use one-time OAuth state with expiry, state hashing, PKCE, tenant/membership binding, replay prevention, and safe frontend redirect status parameters.
- Return only masked mailbox/account metadata to the frontend; never return access tokens, refresh tokens, OAuth code verifiers, app passwords, credential envelopes, provider client secrets, raw provider responses, raw MIME, or raw headers.
- Keep synchronization manual first, Inbox-only, capped to latest 20 messages initially, and no mailbox read/unread mutations.
- Convert HTML-only email to plain text and store only the normalized plain text as `Feedback.message`; never render imported email HTML with `dangerouslySetInnerHTML`.
- Store attachment metadata only and do not download, scan, proxy, or render attachment contents in Phase 21.
- Treat imported email text as untrusted customer content for Phase 13 AI analysis and preserve prompt-injection protections.
- Continue to require active Owner/Admin tenant membership for connection management; platform administrators without tenant membership remain blocked.
- Preserve existing branch-aware Inbox permissions for Managers and Staff viewing imported Email feedback.

## Phase 22 Live WhatsApp Cloud API Security

Phase 22 Live WhatsApp Cloud API Meta test-number inbound webhook MVP is implemented. Manual Meta test-number/browser security verification remains pending with the user.

Implemented controls:

- The webhook route is mounted before global JSON parsing with a route-specific raw parser so the exact signed bytes are available for validation.
- Public webhook GET verification compares Meta's `hub.verify_token` to backend configuration with timing-safe comparison and returns only the raw `hub.challenge` on success.
- Public webhook POST handling validates `X-Hub-Signature-256` with the Meta App Secret and exact raw body before JSON parsing.
- The shared `/api/integrations/meta/webhook` callback performs signature validation before reading the Meta `object` discriminator, then dispatches WhatsApp Business Account payloads to the same Phase 22 processor used by the dedicated callback.
- The webhook route bypasses user-session auth because Meta is the caller, but POST processing is gated by provider authenticity checks.
- Tenant resolution matches Meta `entry[].id` as the WABA ID when present together with `metadata.phone_number_id`; webhook bodies cannot choose arbitrary business or branch IDs.
- Meta access tokens are encrypted in backend-only `IntegrationCredential` storage with the generalized live-integration AES-GCM helper. App Secret and verify token are backend environment variables.
- The webhook verify token is stored on connections only as a SHA-256 hash for status correlation.
- Connection/list/activity APIs return masked phone/WABA/display metadata and safe activity records only; they never return access tokens, verify tokens, App Secret, raw webhook payloads, signatures, credential envelopes, or full phone numbers.
- Non-text WhatsApp messages are skipped without media download.
- Provider message ID plus connection ID provides idempotency/replay protection for webhook deliveries and feedback imports.
- Active Business and active default Branch are checked before importing.
- Managers and Staff can view imported WhatsApp feedback only through existing branch-aware Inbox rules; integration management remains Owner/Admin-only.
- Platform administrators without tenant `BusinessMembership` remain blocked from tenant integration management.

Manual verification still required:

- Meta test-number GET verification and signed POST delivery.
- Invalid verify-token, missing signature, malformed signature, and mutated-body rejection.
- Cross-business connection/activity ID blocking.
- Paused/disconnected connection behavior.
- Inactive Branch/business behavior.
- Duplicate provider message ID replay.
- Non-text message skip behavior.
- Confirmation that no raw webhook payloads, signatures, tokens, or full phone numbers appear in UI/API responses/logs.

## Phase 23 Live Outlook / Microsoft Email Security

Phase 23 Live Outlook / Microsoft Email inbound OAuth MVP is implemented. Manual real Outlook OAuth/browser security verification remains pending with the user.

Implemented controls:

- Outlook uses Microsoft Graph OAuth authorization-code flow with PKCE-backed one-time state, state hashing, expiry, tenant/membership binding, replay prevention, and safe frontend redirect status parameters.
- The Microsoft app must be configured for delegated mailbox permissions only: `offline_access`, `User.Read`, and `Mail.Read`. `Mail.Send`, SMTP, IMAP, outbound replies, and message mutation are not implemented.
- Outlook access and refresh tokens are stored only in encrypted backend `IntegrationCredential` rows with provider-specific associated data.
- OAuth code verifiers are encrypted and consumed once through `IntegrationOAuthState`.
- Connection/list/run APIs return masked mailbox metadata, provider type, safe status/error codes, timestamps, and counters only.
- No API response returns Microsoft client secrets, access tokens, refresh tokens, PKCE verifiers, credential envelopes, raw Graph responses, raw headers, or attachment binary data.
- Graph reads use v1.0 endpoints, request immutable IDs, prefer text bodies, read Inbox only, and cap manual imports to 20 source items per run.
- Attachment handling reads metadata only and never calls attachment `$value` download endpoints or stores `contentBytes`.
- Gmail and Outlook can coexist per Business, but service logic prevents duplicate same-provider Live Email connections.
- Imported Outlook feedback uses the Phase 4 `FeedbackProcessingService`; direct `Feedback` inserts are not used.
- Platform administrators without tenant `BusinessMembership` remain blocked from tenant integration management.
- Managers and Staff can view imported Outlook feedback only through existing branch-aware Inbox rules; integration management remains Owner/Admin-only.

Manual verification still required:

- Real Microsoft OAuth consent and callback.
- First latest-20 Outlook Inbox synchronization and second duplicate-safe delta synchronization.
- Duplicate Outlook connection blocking while Gmail and Outlook coexist.
- Cross-business connection/run/item ID blocking.
- Inactive Branch/business behavior.
- Confirmation that tokens, PKCE verifiers, raw Graph payloads, raw message bodies beyond normalized feedback content, and attachment binary data are not exposed in UI/API responses/logs.

## Phase 24 Live Facebook + Instagram Meta Social Security

Phase 24 Live Facebook + Instagram Meta Social Feedback Webhook Integration MVP is implemented. Manual Meta/browser security verification remains pending with the user.

Implemented controls:

- The shared `/api/integrations/meta/webhook` route is mounted before global JSON parsing with a route-specific raw parser so the exact signed bytes are available for validation.
- Public webhook GET verification requires Meta's three verification parameters, compares `hub.verify_token` to backend configuration with timing-safe comparison, and returns only the exact raw `hub.challenge` on success. Missing input returns `400` and invalid mode/token input returns `403`, never an unhandled `500`.
- GET verification does not require or inspect `X-Hub-Signature-256` or a request body and no longer depends on a database connection/status mutation.
- Public webhook POST handling validates `X-Hub-Signature-256` with the Meta App Secret and exact raw body before JSON parsing.
- Provider dispatch on the shared callback happens only after signature validation: WhatsApp Business Account objects use the Phase 22 processor, while Page and Instagram objects keep the Phase 24 social path.
- The webhook route bypasses user-session auth because Meta is the caller, but POST processing is gated by provider authenticity checks.
- Tenant resolution uses the signed webhook's Facebook Page ID or Instagram professional-account ID to find a Live social connection; webhook bodies cannot choose arbitrary business or branch IDs.
- Meta developer/test access tokens are encrypted in backend-only `IntegrationCredential` storage with provider-specific associated data. The Meta App Secret and verify token are backend environment variables.
- The webhook verify token is stored on connections only as a SHA-256 hash for status correlation.
- Connection/list/activity APIs return safe Page/account labels and webhook activity records only; they never return access tokens, verify tokens, App Secret, raw webhook payloads, signatures, credential envelopes, or full provider payloads.
- Only inbound Facebook Page comment-add events and Instagram comment events are imported. Instagram mentions, non-comment events, DMs, Messenger events, publishing, moderation, reactions-as-feedback, and media downloads are skipped or out of scope.
- Provider comment ID plus connection ID provides idempotency/replay protection for webhook deliveries and feedback imports.
- Active Business and active default Branch are checked before importing.
- Managers and Staff can view imported Facebook/Instagram feedback only through existing branch-aware Inbox rules; integration management remains Owner/Admin-only.
- Platform administrators without tenant `BusinessMembership` remain blocked from tenant integration management.

Manual verification still required:

- Meta webhook GET verification and signed POST delivery for one Facebook Page comment and one Instagram professional-account comment.
- Invalid verify-token, missing signature, malformed signature, and mutated-body rejection.
- Cross-business connection/activity ID blocking.
- Paused/disconnected connection behavior.
- Inactive Branch/business behavior.
- Duplicate provider comment ID replay.
- Unsupported event skip behavior for Instagram mentions/non-comment events.
- Confirmation that no raw webhook payloads, signatures, tokens, or credential envelopes appear in UI/API responses/logs.

## Public Website Security and Truthfulness Notes

### Public Backend Legal Pages

The Phase 24 Meta publishing support fix adds unauthenticated, read-only `GET /privacy`, `GET /terms`, and `GET /data-deletion` Express routes.

- The routes are intentionally public and require no session, role, business membership, CSRF token, or frontend authentication.
- They return static HTML only and import no Prisma client, integration service, provider SDK, credential helper, or environment secret.
- They do not query the database, mutate state, set application cookies, redirect to the frontend, accept user content, or expose business/customer records.
- They use no external JavaScript, analytics, tracking, cookies, images, fonts, or third-party page dependencies.
- Helmet security headers and normal safe request logging still apply; authorization and cookie headers remain redacted by the existing logger.
- The pages disclose the application contact email intentionally but do not disclose tokens, App Secrets, encryption keys, provider credentials, connection identifiers, or environment configuration.

The public-facing website was implemented before Phase 3 as frontend UI only. It does not add backend APIs, database models, contact-delivery services, payment processing, analytics tracking, service workers, or external integrations.

Public website routes:

- `/`
- `/features`
- `/how-it-works`
- `/pricing`
- `/about`
- `/contact`
- `/privacy-policy`
- `/terms-of-service`

Security and privacy boundaries:

- Public marketing and legal pages are accessible to logged-in and logged-out visitors and do not expose authenticated user data.
- The public navigation links to existing auth routes but does not change route guards, auth state handling, cookies, refresh behavior, or protected account access.
- The public Contact form uses client-side React Hook Form and Zod validation only. It does not send form data to a backend endpoint because no contact API or documented public inbox exists.
- Pricing content is early-access/planned-pricing UI only. No checkout, billing provider, subscription model, payment API, or payment-data handling was added.
- Public feature content labels implemented authentication separately from planned feedback, AI, workflow, analytics, reporting, and integration capabilities so the UI does not misrepresent unavailable features as live.
- Demo dashboard numbers are illustrative product-preview values, not customer metrics or operational claims.
- Privacy Policy and Terms of Service content is grounded in current authentication, cookie, token, Google-auth, SMTP, database, deployment, and roadmap documentation. It requires professional legal review before production launch.
- The public site does not claim unsupported customer counts, uptime guarantees, certifications, regulatory compliance, jurisdictions, offices, awards, investors, or partnerships.
