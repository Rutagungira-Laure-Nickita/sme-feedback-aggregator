# Phase 21 Live Email Integration Discovery

Date: 2026-08-05

This report is documentation-only discovery for Phase 21, Live Email Integration. No application code, Prisma schema, migration, package, reference image, browser session, browser automation, provider API call, IMAP connection, SMTP connection, mailbox connection, credential request, credential storage, synchronization run, or email import was added.

Official provider sources reviewed:

- Google Gmail API server-side OAuth: https://developers.google.com/workspace/gmail/api/auth/web-server
- Google OAuth 2.0 overview: https://developers.google.com/identity/protocols/oauth2
- Gmail `users.messages.list`: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list
- Gmail `users.history.list`: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list
- Gmail message resource and parsed payload shape: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages
- Google Workspace API user data and Gmail restricted-scope policy: https://developers.google.com/workspace/workspace-api-user-data-developer-policy
- Microsoft identity platform auth-code flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- Microsoft Graph list messages: https://learn.microsoft.com/en-us/graph/api/mailfolder-list-messages?view=graph-rest-1.0
- Microsoft Graph message delta: https://learn.microsoft.com/en-us/graph/api/message-delta?view=graph-rest-1.0
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- IMAP4rev2 RFC 9051: https://www.rfc-editor.org/rfc/rfc9051.html

## 1. CURRENT PROJECT FINDINGS

Phases 1 through 7 are complete and manually verified. Phases 8 through 10 are implemented and core workflows have passed, but final multi-tenant, platform-administrator, concurrency, failure-handling, regression, and security checks remain deferred. Phases 11 through 14 are implementation-complete with selected supervisor-facing checks reported as passed, but exhaustive manual verification remains pending. Phase 20 Connector Framework and Demo Synchronization is implementation-complete, Demo Mode-only, and manually verified for Google Reviews Demo and WhatsApp Demo core flows; exhaustive all-provider regression remains pending.

The current Git state at discovery start was clean. Recent commits ended at `f5abcd1 Implemented phase 20 successfully`.

Environment inspection found existing backend Google sign-in and SMTP configuration variables, but no live integration credential-encryption variable and no live Gmail/Microsoft/IMAP mailbox variables. The existing Google authentication is ID-token based for application login and account linking; it is not a Gmail mailbox OAuth grant and must not be reused as if it authorized mailbox access.

## 2. PHASE 20 EXTENSION POINTS

Reusable unchanged:

- `IntegrationProvider.EMAIL` and `IntegrationMode.LIVE` already exist.
- `IntegrationConnection` already records business, provider, mode, status, display name, default branch, lifecycle timestamps, sync timestamps, error code, and total imports.
- `SynchronizationRun` already records tenant, connection, provider, mode, manual trigger, status, lock token, retry attempt count, counters, timestamps, safe summary, and safe error code.
- `SynchronizationItem` already records connection-scoped external ID, SHA-256 payload hash, result status, safe result message, safe preview, optional feedback and ingestion references, received timestamp, retry count, and uniqueness on `[connectionId, externalId]`.
- The connector registry already maps provider plus mode to a connector implementation.
- The disabled-by-default integration worker already claims pending runs, recovers stale runs, and processes a bounded batch.
- The integration APIs are mounted under authenticated business routes and enforce active Owner/Admin `BusinessMembership`; platform administrators without tenant membership are blocked.
- The Phase 4 `FeedbackProcessingService` already handles input validation, payload hashing, idempotency, duplicate detection, safe failed-ingestion records, transactionally persisted feedback and attachment metadata, exact Customer auto-linking, AI scheduling, and automation scheduling.

Minimum Phase 21 extensions:

- Add a live Email connector contract path beside the demo connector path.
- Make demo-only fields nullable or conditional for live runs, especially `IntegrationConnection.demoScenario` and `SynchronizationRun.demoScenario`.
- Add safe live-email metadata fields to `IntegrationConnection`.
- Add separate encrypted credential storage.
- Add one-time OAuth state storage if Gmail OAuth is approved.
- Add provider cursor storage for Gmail history ID or equivalent incremental checkpoint.
- Extend the Integrations UI instead of adding a parallel Email page.

## 3. LIVE EMAIL RISKS

The primary risks are OAuth CSRF, forged or replayed callbacks, refresh-token theft, plaintext secret storage, weak encryption keys, provider-account takeover, tenant leakage, branch leakage, connection/run/item ID enumeration, malicious HTML, tracking pixels, script injection, oversized MIME bodies, MIME nesting abuse, prompt injection in customer content, duplicate imports, token-refresh races, revoked access, accidental whole-mailbox import, logs containing customer content, unsafe provider error leakage, and platform-administrator tenant bypass.

## 4. RECOMMENDED PHASE 21 MVP

Recommended MVP:

- Gmail-only Live Email connection through Gmail API OAuth.
- Owner/Admin-only management.
- One Live Email connection per Business.
- One required default active Branch.
- Demo Email and Live Email may coexist because they differ by `mode`.
- Inbox folder only.
- Manual synchronization only.
- Initial sync limited to the latest 20 Inbox messages, optionally additionally bounded by the last 30 days.
- Incremental sync via Gmail history ID after the initial sync.
- No provider read/unread state changes.
- Message-level Feedback: each Gmail message becomes one Feedback row; thread ID is metadata only.
- Plain text body preferred; HTML body converted to plain text.
- Attachment metadata only; no downloads.
- Deduplicate by connection plus Gmail message ID, then connection plus RFC Message-ID, then deterministic payload hash fallback.
- Reuse `FeedbackProcessingService` for persistence and downstream Customer/AI/automation behavior.

This is smaller than adding Gmail, Microsoft Graph, and IMAP together, but still credible because it synchronizes real inbound mail through the production ingestion pipeline.

## 5. PROVIDER COMPARISON

Gmail API:

- Strengths: official OAuth flow, no mailbox password storage, stable Gmail message ID, thread ID, parsed MIME payload, `INBOX` label filtering, `users.messages.list`, `users.messages.get`, and `users.history.list` for incremental sync.
- Costs: Gmail read scopes are sensitive/restricted under Google Workspace API policy; external production use may require OAuth verification and possibly additional security review. Local testing needs OAuth consent screen setup and test users.
- Complexity: medium, mostly OAuth callback, token encryption, Gmail REST calls, MIME tree parsing, cursor handling, and verification disclosures.

Microsoft Graph:

- Strengths: delegated OAuth, `Mail.Read`, mailbox folder message listing, delta query support, personal and work/school account support, official SDKs and docs.
- Costs: Microsoft identity tenant/account-type configuration, mailbox folder identity, delta-link persistence, optional immutable-ID header behavior, and admin-consent nuance for organizations.
- Complexity: medium-to-high. Good second provider after the abstraction is proven.

Generic IMAP:

- Strengths: broad protocol, standard UID plus UIDVALIDITY cursor model, no vendor OAuth app verification, can work with a dedicated mailbox.
- Costs: password or app-password storage, provider-specific restrictions, reliability differences, TLS/certificate handling, mailbox naming differences, MIME parsing from raw messages, and poor UX for non-technical owners.
- Complexity: deceptively high and less safe because it normalizes password storage as the first live-provider pattern.

## 6. RECOMMENDED PROVIDER

Recommend Gmail API only for the Phase 21 MVP.

Why it is fastest: one provider, official REST API, existing project familiarity with Google auth tooling, stable message IDs, parsed payload support, `INBOX` filtering, and history-based incremental sync.

Why it is safe enough: OAuth grants can be revoked, app stores refresh tokens instead of mailbox passwords, `gmail.readonly` avoids write permissions, and Phase 21 can keep all credentials backend-only and encrypted.

Compromises: Gmail restricted-scope verification may block broad public production rollout until review is complete; Microsoft and IMAP users wait for later provider extensions; local demo requires a Google Cloud OAuth client configured for mailbox access.

Later providers can be added by keeping `IntegrationProvider.EMAIL` as the channel-level integration, adding `EmailProviderType.MICROSOFT` and `EmailProviderType.IMAP`, and registering one live connector implementation per provider subtype.

## 7. AUTHENTICATION FLOW

Use server-side OAuth with PKCE and a one-time state row.

Flow:

1. Owner/Admin creates or begins a Live Email connection for provider `GMAIL`, display name, and default branch.
2. Backend verifies active membership, active business, active branch, one-live-email-per-business cardinality, and no existing active authorization attempt.
3. Backend creates an `IntegrationOAuthState` row containing business ID, membership ID, connection ID or pending setup payload, provider type, random state hash, PKCE verifier hash or encrypted verifier, redirect target, expiry, and used timestamp.
4. Frontend receives only the provider authorization URL, never tokens.
5. User authorizes Gmail access using a redirect URI such as `/api/integrations/email/oauth/gmail/callback`.
6. Callback validates state, expiry, session/membership binding where practical, PKCE verifier, provider, and business intent.
7. Backend exchanges the authorization code for access and refresh tokens.
8. Backend obtains safe provider account identity, stores encrypted token material in `IntegrationCredential`, updates connection metadata, and marks the connection `CONNECTED`.
9. Callback redirects to `/business/:businessId/integrations?integration=email&connection=<id>&status=connected` or a safe failure equivalent.
10. Reauthorization repeats the same state flow for an existing connection and rotates credentials.

Access tokens are short-lived. Refresh tokens are stored encrypted, rotated when the provider returns a replacement, and discarded on disconnect. Revoked access should set `requiresReauthorization=true`, `status=ERROR`, and `lastErrorCode=EMAIL_REAUTHORIZATION_REQUIRED`.

## 8. SECRET STORAGE

Add backend-only authenticated encryption for integration credentials.

Recommended environment variable:

```text
INTEGRATION_CREDENTIALS_ENCRYPTION_KEY
```

The value should be a high-entropy 32-byte key encoded as base64 for AES-256-GCM. Store an encryption envelope for each secret with key version, IV/nonce, authentication tag, and ciphertext. The database must never store plaintext tokens, app passwords, OAuth code verifiers, or provider client secrets. API responses must return only safe metadata such as provider type, masked mailbox, connection status, and test timestamp.

Do not place secrets in `IntegrationConnection`, settings JSON, logs, errors, local storage, session storage, or frontend state beyond the current request lifecycle.

## 9. CONNECTION CARDINALITY

Recommend one Live Email connection per Business in Phase 21. Every connection must choose one default active Branch. Multiple live mailboxes, branch-specific mailboxes, and mailbox-to-branch routing rules should be deferred.

## 10. DEMO/LIVE COEXISTENCE

A Business may have one Demo Email connection and one Live Email connection simultaneously because the existing unique constraint is `[businessId, provider, mode]`. Demo Email remains simulated and labeled Demo Mode. Live Email is real Gmail data and must be labeled Live Mode. Counts and history should remain separated by mode while the Inbox can show both as `FeedbackChannel.EMAIL` with source metadata distinguishing Demo versus Live.

## 11. DATABASE DESIGN

Phase 21 requires a migration after approval.

Proposed existing-model changes:

- `IntegrationConnection.demoScenario IntegrationDemoScenario?`
- `SynchronizationRun.demoScenario IntegrationDemoScenario?`
- `IntegrationConnection.liveProviderType EmailProviderType?`
- `IntegrationConnection.providerAccountId String? @db.VarChar(255)`
- `IntegrationConnection.providerAccountLabel String? @db.VarChar(255)`
- `IntegrationConnection.providerTenantId String? @db.VarChar(255)`
- `IntegrationConnection.synchronizationFolder String @default("INBOX") @db.VarChar(120)`
- `IntegrationConnection.lastProviderCursor String? @db.Text`
- `IntegrationConnection.lastProviderCursorAt DateTime?`
- `IntegrationConnection.requiresReauthorization Boolean @default(false)`
- `IntegrationConnection.lastConnectionTestAt DateTime?`
- `IntegrationConnection.lastConnectionTestStatus String? @db.VarChar(40)`

Proposed new models:

- `IntegrationCredential`
- `IntegrationOAuthState`

Indexes:

- `IntegrationConnection`: `[businessId, provider, mode]` remains; add `[businessId, liveProviderType]`, `[requiresReauthorization]`, and `[lastConnectionTestAt]` if used in lists.
- `IntegrationCredential`: unique `[connectionId, credentialType]`.
- `IntegrationOAuthState`: unique state hash, indexes on expiry and business/membership.

## 12. ENUM DESIGN

Keep `IntegrationProvider.EMAIL`. Add provider subtype enums instead of replacing the existing provider enum.

Recommended enums:

```prisma
enum EmailProviderType {
  GMAIL
  MICROSOFT
  IMAP
}

enum IntegrationCredentialType {
  OAUTH2
  IMAP_PASSWORD
}
```

Do not add `GMAIL`, `MICROSOFT_OUTLOOK`, or `IMAP` to `IntegrationProvider`, because `IntegrationProvider` is already used as the product/channel integration family and existing Demo Email data depends on `EMAIL`.

## 13. CREDENTIAL MODEL

Recommended model shape:

```prisma
model IntegrationCredential {
  id                    String                    @id @default(cuid())
  connectionId          String                    @map("connection_id")
  credentialType        IntegrationCredentialType @map("credential_type")
  encryptedAccessToken  String?                   @map("encrypted_access_token") @db.Text
  encryptedRefreshToken String?                   @map("encrypted_refresh_token") @db.Text
  encryptedPassword     String?                   @map("encrypted_password") @db.Text
  encryptionKeyVersion  Int                       @default(1) @map("encryption_key_version")
  accessTokenExpiresAt  DateTime?                 @map("access_token_expires_at")
  scopeSummary          String?                   @map("scope_summary") @db.VarChar(255)
  createdAt             DateTime                  @default(now()) @map("created_at")
  updatedAt             DateTime                  @updatedAt @map("updated_at")
  rotatedAt             DateTime?                 @map("rotated_at")
  revokedAt             DateTime?                 @map("revoked_at")

  connection IntegrationConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@unique([connectionId, credentialType])
  @@index([revokedAt])
  @@map("integration_credentials")
}
```

For Gmail MVP, only `OAUTH2`, encrypted access token, encrypted refresh token, expiry, key version, and safe scope summary are needed. IMAP password fields remain deferred until IMAP is approved.

## 14. CONNECTION METADATA

Safe connection metadata should include:

- `liveProviderType=GMAIL`
- masked mailbox address
- provider account ID
- provider account label
- default branch
- synchronization folder `INBOX`
- last Gmail history ID cursor
- last successful sync
- last attempted sync
- total imported
- last safe error code
- requires reauthorization flag
- last test timestamp and status

Do not store raw headers, raw MIME, access scopes in noisy detail, tokens, OAuth code, code verifier, client secret, or full provider errors in connection metadata.

## 15. MESSAGE DISCOVERY

Initial Gmail sync:

- Call `users.messages.list` with `userId=me`, `labelIds=INBOX`, `includeSpamTrash=false`, and `maxResults=20`.
- Fetch each message with `users.messages.get` using `format=full`.
- Use Gmail `id` as the primary provider message ID, `threadId` as conversation metadata, and `internalDate` as the received timestamp.
- Store the latest safe Gmail `historyId` after a successful initial pass.

Incremental Gmail sync:

- Call `users.history.list` with `startHistoryId=lastProviderCursor`, `labelId=INBOX`, and `historyTypes=messageAdded`.
- Fetch added message IDs with `messages.get`.
- If Gmail returns an invalid or stale history ID, fail safely with `EMAIL_CURSOR_INVALID` and require a bounded resync path, not a full mailbox import.

## 16. INITIAL SYNCHRONIZATION WINDOW

Recommend latest 20 Inbox messages as the default and hard maximum for Phase 21. Optionally add a secondary query bound such as newer than 30 days if implementation can do so cleanly. Do not offer a full-mailbox import. This is suitable for a supervisor demonstration and reduces accidental customer-data ingestion.

## 17. INCREMENTAL CURSOR

Use Gmail `historyId` as the cursor after initial sync. Store it on `IntegrationConnection.lastProviderCursor` and update it only after a run completes without run-level failure. Item-level failures should not block cursor advancement if their message IDs are recorded and retryable through `SynchronizationItem`; however, the run must clearly report partial failure.

## 18. EMAIL FILTERING

Smallest safe policy:

- Include only messages currently returned under Gmail `INBOX`.
- Exclude spam and trash.
- Do not import drafts or sent mail.
- Do not mark messages read.
- Skip empty normalized bodies.
- Skip messages above the configured MIME size limit.
- Skip obvious calendar invite parts as attachments metadata only.
- Do not use weak heuristics to exclude newsletters, no-reply senders, or internal domains in MVP unless the owner explicitly configures that later.

Skipped items must record safe reasons such as `EMAIL_BODY_EMPTY` or `EMAIL_MESSAGE_INVALID`.

## 19. MIME PARSING

For Gmail MVP, use Gmail's parsed `payload` tree rather than fetching raw RFC 2822 where possible.

Support:

- subject
- text/plain body
- HTML fallback converted to text
- sender display name
- sender address
- received timestamp
- RFC Message-ID header
- Gmail message ID
- Gmail thread ID
- attachment metadata from MIME parts
- charset/encoding through Gmail body data and safe decoding
- multipart recursion bounded by depth

Body preference:

1. `text/plain`
2. safe text extracted from `text/html`

If raw MIME parsing becomes necessary later, add a tested library during implementation approval. Do not hand-roll full RFC MIME parsing for IMAP or raw messages.

## 20. HTML SANITIZATION

Do not store sanitized HTML in Phase 21. Store only normalized plain text as `Feedback.message`.

HTML-only mail should be converted by stripping scripts, styles, forms, embedded content, tracking pixels, remote images, comments, and hidden elements; converting headings, paragraphs, lists, and line breaks to readable text; decoding entities; collapsing excessive whitespace; and bounding final length.

Frontend must never use `dangerouslySetInnerHTML` for imported email content.

## 21. THREAD AND QUOTE HANDLING

Recommend one provider message becomes one Feedback item. Store Gmail `threadId`, RFC Message-ID, and references/in-reply-to flags as safe source metadata. Do not merge whole threads in Phase 21.

Quoted-reply trimming should be conservative. If a lightweight quote/signature trim is risky, import the full normalized plain text and rely on deduplication by message ID. Complex thread merging and newest-unquoted-content extraction should be deferred.

## 22. FIELD MAPPING

Mapping:

- `Feedback.title <- email subject`
- `Feedback.message <- normalized plain text body`
- `Feedback.customerName <- sender display name`
- `Feedback.customerEmail <- normalized sender address`
- `Feedback.channel <- EMAIL`
- `Feedback.occurredAt <- Gmail internalDate or provider received timestamp`
- `Feedback.externalId <- gmail:<connectionId>:<gmailMessageId>` or a provider-stable equivalent under the 255-character limit
- `Feedback.branchId <- connection.defaultBranchId`
- `Feedback.attachments <- metadata-only attachment records`
- `Feedback.sourceMetadata <- safe live-email metadata`

Fallbacks:

- Missing subject: `Email from <masked sender>` or `Customer email`.
- Missing sender name: use sender email local-part only if safe, otherwise `Email sender`.
- Missing RFC Message-ID: continue with Gmail message ID.
- Empty text body after normalization: skip with `EMAIL_BODY_EMPTY`.

## 23. DEDUPLICATION

Primary hierarchy:

1. `connectionId + Gmail message ID` through `SynchronizationItem.externalId`.
2. `connectionId + RFC Message-ID` as a secondary lookup or stored safe metadata key.
3. Deterministic payload hash fallback when message ID headers are missing.

For `FeedbackProcessingService`, use a stable idempotency key such as `email:gmail:{connectionId}:{gmailMessageId}` and a non-null external ID that includes provider and connection scoping. If provider ID repeats with changed body, record a safe conflict and do not mutate existing Feedback. If a message moves folders, existing Feedback remains immutable. If provider ID changes but RFC Message-ID repeats, classify as duplicate if the safe payload is compatible; otherwise fail with a conflict for human review.

## 24. SYNCHRONIZATION WORKER

Reuse the existing integration worker and `SynchronizationRun` claim flow. The current worker already supports pending run polling, run claiming, stale recovery, retry attempts, and bounded batch processing. Phase 21 should generalize the current demo item fetch path into a live connector `fetchItems` or `sync` method and keep per-item processing isolated so one malformed email does not fail the full run.

Manual sync may continue to process immediately through the same service path, but run records should remain durable and worker-compatible.

## 25. TOKEN OR CREDENTIAL REFRESH

For Gmail OAuth:

- Refresh access tokens server-side when expired or near expiry.
- Use a single credential row per connection and update it transactionally.
- If Google returns a replacement refresh token, encrypt and replace the old one.
- On refresh failure due to revocation or invalid grant, set `requiresReauthorization=true`, mark the connection `ERROR`, and return `EMAIL_REAUTHORIZATION_REQUIRED`.
- Do not log token endpoint responses.

For IMAP later: password/app-password rotation must be explicit and should never redisplay the old password.

## 26. PARTIAL FAILURE

A run should be:

- `COMPLETED` when all fetched items import, duplicate, or intentionally skip without failures.
- `COMPLETED_WITH_ERRORS` when at least one item fails and at least one item succeeds, duplicates, or skips.
- `FAILED` when provider authentication, mailbox access, cursor, or all-item processing failure prevents useful progress.

Each failed item records a safe code/message. Raw provider responses, stack traces, headers, MIME bodies, tokens, passwords, and customer message content must not appear in errors.

## 27. PROVIDER ERROR HANDLING

Recommended safe codes:

- `EMAIL_AUTH_REQUIRED`: reauthorization required.
- `EMAIL_AUTH_REVOKED`: reauthorization required.
- `EMAIL_TOKEN_REFRESH_FAILED`: reauthorization required or retryable depending on provider response.
- `EMAIL_MAILBOX_NOT_FOUND`: configuration error.
- `EMAIL_FOLDER_NOT_FOUND`: configuration error.
- `EMAIL_CURSOR_INVALID`: configuration error requiring bounded resync.
- `EMAIL_MESSAGE_FETCH_FAILED`: item-level retryable.
- `EMAIL_MESSAGE_INVALID`: item-level failure.
- `EMAIL_MIME_PARSE_FAILED`: item-level failure.
- `EMAIL_BODY_EMPTY`: skipped item.
- `EMAIL_ATTACHMENT_UNSUPPORTED`: skipped attachment metadata or item warning.
- `EMAIL_RATE_LIMITED`: retryable run-level failure.
- `EMAIL_PROVIDER_UNAVAILABLE`: retryable run-level failure.
- `EMAIL_SYNC_PARTIAL_FAILURE`: run completed with item failures.

## 28. ATTACHMENT SCOPE

Phase 21 should store metadata only:

- filename
- MIME type
- size
- inline/content-disposition hint where safe
- provider attachment ID only if needed for audit and safe retry

Do not download attachments, store binaries, store remote attachment URLs, scan attachment contents, import attachment contents as feedback text, or expose executable attachment previews.

## 29. CUSTOMER MATCHING

Email auto-linking should use exact normalized sender email only. The existing Customer service also supports phone matching, but Email MVP should not invent phone extraction from signatures or bodies. Archived Customers must not be automatically linked. Name-only matching remains forbidden for automatic links.

## 30. AI INTEGRATION

The Email connector must not call AI directly. `FeedbackProcessingService` schedules AI analysis after persistence. Email content is untrusted Customer content and may contain prompt-injection attempts; Phase 13 input preparation, truncation, provider error classification, and safe output handling remain the boundary.

Synchronization must not wait for AI completion.

## 31. AUTOMATION INTEGRATION

The Email connector must not execute automation directly. `FeedbackProcessingService` schedules a `FEEDBACK_CREATED` automation event after persistence. The AI worker later schedules `AI_ANALYSIS_COMPLETED` automation events when analysis completes. Synchronization success must not depend on automation completion.

## 32. CONNECTION TEST

A Live Email connection test should:

- verify credentials or OAuth grant
- refresh token if needed
- confirm the Gmail mailbox identity
- confirm the configured `INBOX` folder/label is reachable
- avoid importing messages
- avoid changing read/unread state
- avoid advancing the sync cursor
- return provider, masked mailbox, connection status, safe code, and test timestamp only

## 33. CONNECTION LIFECYCLE

Recommended lifecycle:

- `CONNECTED`: sync allowed.
- `PAUSED`: sync blocked, encrypted credentials retained.
- `DISCONNECTED`: sync blocked, provider token revoked where possible, encrypted credentials deleted or marked revoked, imported Feedback/history preserved.
- `ERROR`: sync blocked or degraded depending on error; reauthorize/test action shown.
- `requiresReauthorization=true`: separate flag, not a new status in MVP.

Disconnect should revoke the Google token where possible, delete encrypted credentials, preserve the connection record, preserve run/item history, and preserve imported Feedback.

## 34. ROLE PERMISSIONS

MVP permissions:

- OWNER: connect, authorize, test, synchronize, pause, reauthorize, disconnect, view runs/errors.
- ADMIN: same as Owner.
- MANAGER: no connection management; may view imported Feedback for accessible branches through existing Inbox permissions.
- STAFF: no connection management; may view imported Feedback for accessible branches through existing Inbox permissions.
- Platform Administrator: no tenant integration access unless they also have active Owner/Admin membership in that Business.

Server-side enforcement must remain authoritative.

## 35. API DESIGN

Prefer extending existing integration APIs:

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

`POST /integrations` request for Live Email:

```json
{
  "provider": "EMAIL",
  "mode": "LIVE",
  "liveProviderType": "GMAIL",
  "displayName": "Support Inbox",
  "defaultBranchId": "branch-id"
}
```

Authorization response returns an authorization URL only. Callback responses redirect to safe frontend paths. All mutation endpoints require active Owner/Admin membership. OAuth callback must validate one-time state, expiry, PKCE, expected provider, tenant binding, and safe redirect allowlist.

## 36. FRONTEND FLOW

Inside `/business/:businessId/integrations`:

1. Select Email.
2. Choose Live Mode.
3. Choose Gmail.
4. Choose default active Branch.
5. Review Live Mode disclosure.
6. Start Google authorization.
7. Return to Integrations with connected or error state.
8. Test connection.
9. Run first synchronization.
10. Review synchronization history and imported-email summary.

Demo Email and Live Email must be visually distinct. Tokens, scopes beyond friendly labels, and credentials must never be displayed.

## 37. CONNECTION CARD DESIGN

Live Email card should show:

- Email
- Live Mode badge
- Gmail provider type
- masked mailbox address
- default Branch
- connection status
- reauthorization flag where applicable
- last successful sync
- total imported
- last safe error
- Sync Now
- Test
- Pause/Resume
- Reauthorize
- Disconnect
- View history

Do not display credentials, tokens, raw scopes, raw headers, raw MIME, or provider server responses.

## 38. INBOX INTEGRATION

Live Email Feedback should display existing Email channel labels plus Live source metadata:

- channel: Email
- subject/title
- sender display name
- sender email according to existing Feedback permissions
- Branch
- received date
- attachment metadata count
- Live source badge
- connection name

Do not expose raw MIME headers or auth metadata.

## 39. FEEDBACK DETAILS INTEGRATION

Source section should show:

- Source: Email
- Live Mode
- connection display name
- provider type: Gmail
- external received date
- safe message reference, such as a shortened Gmail message ID
- RFC Message-ID only if safe and useful
- attachment metadata

Do not show provider token, raw headers, raw MIME, OAuth scopes, mailbox server internals, or full provider errors.

## 40. SECURITY

Mitigations:

- OAuth CSRF: one-time random state, state hash in DB, expiry, membership binding, safe redirect allowlist.
- Callback forgery: validate authorization code exchange and expected provider/account.
- State replay: mark state used transactionally.
- Token theft: AES-GCM encryption, key versioning, backend-only access, no logs.
- Weak key: startup validation for base64 32-byte key before live connectors run.
- Tenant leakage: all connection/run/item queries include business ID and active membership.
- Branch leakage: default branch must belong to the business and be active; Inbox permissions remain branch-aware.
- ID enumeration: load by business-scoped IDs only.
- Malicious HTML: convert to plain text; never render raw HTML.
- Tracking pixels: strip embedded/remote content and do not fetch remote resources.
- Oversized email and MIME bombs: enforce size, depth, part count, and body length limits.
- Prompt injection: treat email as untrusted AI input and preserve Phase 13 controls.
- Duplicate imports: connection-scoped provider ID, idempotency key, and payload hash.
- Token refresh races: serialize refresh per connection or use transactional credential update.
- Revoked access: mark reauthorization required and stop sync.
- Accidental whole-mailbox import: latest-20 initial cap and Inbox-only filter.
- Logs: log safe codes and IDs only, never body, raw provider payload, tokens, or customer content.
- Platform administrator bypass: no tenant APIs without active Owner/Admin membership.

## 41. LIMITS

Recommended limits:

- one Live Email connection per Business
- one active run per connection
- initial sync maximum: 20 messages
- incremental sync maximum: 20 messages per manual run
- subject maximum: 250 characters, matching `Feedback.title`
- normalized body maximum: use current feedback schema limit if present; otherwise cap at 10,000 to 20,000 characters before Phase 4 input
- maximum Gmail message size processed: 1 MB in MVP
- maximum MIME depth: 8
- maximum MIME parts: 100
- maximum attachment metadata entries: 10, matching existing processing limit
- provider request timeout: 15 to 30 seconds
- token-refresh retries: 1 immediate retry
- sync retries: existing integration max retry, currently max 3
- sync cooldown: 30 to 60 seconds per connection
- stale-run threshold: keep current 15 minutes unless live provider timeouts require shorter

## 42. PERFORMANCE

The latest-20 cap keeps the first run small. Gmail list returns IDs, then details are fetched per message. Process messages sequentially or with very small concurrency to reduce rate-limit and token-refresh race risk. Store only safe metadata and plain text, not raw MIME. Cursor-based incremental sync avoids scanning the mailbox repeatedly.

## 43. AUTOMATED TEST STRATEGY

Add tests during implementation for provider capability listing, Gmail-only provider selection, OAuth state creation/validation/replay rejection, PKCE handling, credential encryption/decryption, credential redaction, no secret API responses, token refresh, revoked credentials, connection lifecycle, branch routing, owner/admin permissions, platform-admin blocking, Gmail message mapping with mocked provider responses, plain-text preference, HTML-to-text script/style/tracking removal, attachment metadata-only handling, provider-ID deduplication, RFC Message-ID deduplication, payload hash fallback, cursor persistence, invalid cursor recovery, partial item failure, exact Customer email matching, Phase 4 pipeline reuse, AI non-blocking scheduling, automation non-blocking scheduling, disconnect cleanup, and no outbound email/read-state mutation.

## 44. SUPERVISOR-FOCUSED MANUAL TEST

Future short manual test:

1. Open Integrations.
2. Choose Email.
3. Select Live Mode.
4. Connect a dedicated Gmail test inbox.
5. Send one Customer complaint email from another account.
6. Run synchronization.
7. Confirm the message appears in Unified Inbox.
8. Confirm Email channel, subject, message, sender snapshot, Branch, and Live source badge.
9. Confirm exact sender-email Customer matching where a matching active Customer exists.
10. Run sync again.
11. Confirm no duplicate Feedback.
12. Confirm AI analysis appears when configured.
13. Confirm automation may react to the imported complaint.

Do not claim this manual verification until the user completes it.

## 45. MIGRATION REQUIREMENT

Phase 21 requires a migration after approval for nullable demo fields, live email provider metadata, encrypted credential storage, OAuth state storage, and cursor/test metadata. No migration was created during this discovery.

## 46. EXPLICIT OUT-OF-SCOPE ITEMS

Out of scope for Phase 21: outbound email, customer replies, SMTP sending, Gmail sending, Microsoft sending, shared-team reply inbox, drafts, signatures, email templates, automatic responses, scheduled synchronization, provider webhooks, push notifications, attachment downloads, attachment content analysis, antivirus scanning, mailbox deletion, message deletion, marking messages read, moving messages between folders, full-mailbox import, complex thread merging, contact sync, calendar events, Phase 22 Google Reviews live sync, Phase 23 WhatsApp live sync, Phase 24 social sync, and Phase 25 monitoring/recovery.

## 47. OPEN DECISIONS REQUIRING APPROVAL

Approve or revise:

- Gmail-only Phase 21 MVP.
- OAuth-only for MVP; IMAP password flow deferred.
- One Live Email connection per Business.
- Demo Email and Live Email coexistence.
- Initial sync latest 20 Inbox messages.
- Gmail history ID as incremental cursor.
- Inbox-only and no read-state mutation.
- Store plain text only, no sanitized HTML.
- Metadata-only attachments.
- Conservative one-message-one-Feedback threading.
- `requiresReauthorization` flag instead of a new status enum.
- New `IntegrationCredential` and `IntegrationOAuthState` models.
- `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` environment variable.
- Whether to add a small HTML-to-text/MIME helper package during implementation or keep Gmail parsed payload traversal package-free.

## 48. REFERENCE DESIGN PLAN

After discovery approval, create exactly:

- `frontend/references/phase21-live-email-primary.png`
- `frontend/references/phase21-live-email-states.png`

No reference images were created during discovery.

## 49. DOCUMENTATION FILES UPDATED

This discovery updates project memory and planning documentation to record Phase 21 discovery, Gmail-only recommended MVP, inbound-only scope, Phase 20 connector reuse, no outbound email, no credential storage during discovery, manual synchronization first, and Phases 22 through 25 not started.

## 50. STATIC CHECK RESULTS

Static checks passed:

- `npm run format`
- `npm run format:check`
- `git diff --check`

`git diff --check` reported only normal Git LF-to-CRLF working-copy warnings for modified Markdown files.

## 51. EXACT FILES CHANGED

Expected documentation-only changes:

- `PHASE_21_DISCOVERY_REPORT.md`
- `AGENTS.md`
- `README.md`
- `ARCHITECTURE.md`
- `IMPLEMENTATION_STATUS.md`
- `NEXT_STEPS.md`
- `API_NOTES.md`
- `DATABASE_NOTES.md`
- `SECURITY_NOTES.md`
- `DEPLOYMENT.md`
- `CHANGELOG.md`

## 52. CONFIRMATIONS

- No application code changed.
- Prisma schema unchanged.
- No migration created.
- No package added.
- No mailbox connected.
- No credential requested.
- No credential stored.
- No Gmail API call.
- No Microsoft Graph call.
- No IMAP connection.
- No SMTP connection.
- No email imported.
- No browser opened.
- No browser automation used.
- No manual verification claimed.
- Phase 21 implementation not started.
- Phase 22 not started.
- Phase 23 not started.
- Phase 24 not started.
- Phase 25 not started.

## 53. 2026-08-05 IMPLEMENTATION ADDENDUM

After this discovery was approved, Phase 21 Gmail-only Live Email implementation was recovered from an interrupted coding session and completed.

Implemented scope:

- Gmail API OAuth initiation and callback handling with PKCE-backed one-time state.
- Encrypted backend-only integration credential storage using AES-256-GCM envelopes.
- One Live Email connection per Business, with Demo Email and Live Email separated by `IntegrationMode`.
- One required default active Branch per Live Email connection.
- Inbox-only manual synchronization.
- Latest-20 initial import and Gmail history-ID cursor support for later incremental sync.
- Gmail message parsing that stores plain text only as Feedback message content.
- Metadata-only attachment mapping.
- Safe Live Email source metadata in synchronization and inbox responses.
- Frontend Live Gmail connection, authorization, reauthorization, account-display, and status handling in `/business/:businessId/integrations`.
- Reuse of the Phase 20 connector framework and Phase 4 `FeedbackProcessingService`; no direct `Feedback` insertion path was added.

Migration `20260805090000_phase_21_live_email_gmail_oauth` was created and applied locally.

Still pending:

- User-provided Gmail OAuth test-client configuration.
- Manual Gmail authorization against a dedicated test mailbox.
- Manual browser and functional verification.
- Provider-consent and production OAuth verification planning.
- Phase 22 through Phase 25 implementation.

Codex did not request or use real Gmail credentials, connect a mailbox, call the live Gmail API during automated tests, add IMAP/SMTP live integration, open a browser, run browser automation, take screenshots, or claim manual verification.
