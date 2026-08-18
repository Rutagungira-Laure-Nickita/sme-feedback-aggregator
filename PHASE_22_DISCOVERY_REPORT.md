# Phase 22 Live WhatsApp Cloud API Discovery

Date: 2026-08-10

This report is documentation-only discovery for Phase 22, Live WhatsApp Cloud API. No application code, Prisma schema, migration, package, reference image, browser session, browser automation, Meta app, Meta credential request, credential storage, WhatsApp Cloud API call, public webhook, tunnel, real WhatsApp message processing, synchronization run, webhook delivery, or feedback import was added.

Official/current sources reviewed:

- Meta WhatsApp Cloud API getting started: https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started
- Meta WhatsApp Business Platform overview: https://developers.facebook.com/documentation/business-messaging/whatsapp/overview
- Meta WhatsApp platform overview: https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform
- Meta WhatsApp webhooks overview: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
- Meta webhook setup example: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/set-up-whatsapp-echo-bot
- Meta WhatsApp business phone numbers: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers
- Meta WhatsApp message API reference: https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api
- Meta Graph API webhook setup/security: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
- Meta Graph API versions: https://developers.facebook.com/docs/graph-api/changelog/versions
- Cloudflare Quick Tunnels: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/
- Cloudflare Tunnel downloads: https://developers.cloudflare.com/tunnel/downloads/
- ngrok free plan limits and Windows setup were checked as a fallback: https://ngrok.com/docs/pricing-limits/free-plan-limits and https://ngrok.com/download/windows

Note: direct Meta documentation fetches were intermittently unstable and large, but the official pages were successfully fetched for the key facts used here: test-number/API Setup flow, webhook GET verification parameters, payload structure, WhatsApp webhook retry/payload limits, `X-Hub-Signature-256`, app-secret HMAC validation, and current Graph API versions.

## 1. PREPARATION COMPLETED

Required project memory and instruction files were reviewed: `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_STATUS.md`, `NEXT_STEPS.md`, `API_NOTES.md`, `DATABASE_NOTES.md`, `SECURITY_NOTES.md`, `DEPLOYMENT.md`, `CHANGELOG.md`, `PHASE_20_DISCOVERY_REPORT.md`, and `PHASE_21_DISCOVERY_REPORT.md`.

Repository inspection included complete file listing, Git status, Git diff, Git diff stat, and recent commit log. Git was clean at discovery start. Relevant implementation inspected included Phase 4 `FeedbackProcessingService`, normalized input, idempotency/payload hashing, Customer matching, AI/automation scheduling, Phase 20 integration registry and WhatsApp Demo connector, Phase 21 Gmail credential encryption and Live Email patterns, integration routes/services/schema, inbox source display, backend environment validation, Express middleware order, rate limiting, request logging, and Prisma integration models.

## 2. CURRENT WHATSAPP DEMO ARCHITECTURE

Phase 20 already implements Demo WhatsApp through `IntegrationProvider.WHATSAPP`, `FeedbackChannel.WHATSAPP`, `DemoConnector`, `IntegrationConnection`, `SynchronizationRun`, and `SynchronizationItem`. Demo items are deterministic simulated inbound customer messages with stable external IDs and optional phone snapshots.

The Demo path is:

```text
simulated WhatsApp source item
-> DemoConnector.normalizeItem
-> NormalizedFeedbackInput
-> feedbackProcessingService.process
-> FeedbackIngestion and Feedback
-> Customer auto-linking
-> AI scheduling
-> FEEDBACK_CREATED automation scheduling
-> Unified Inbox
```

This architecture is reusable for normalization, safe metadata, run/item activity, and UI mode separation, but Live WhatsApp must not pretend to be manually synchronized. WhatsApp inbound is push/webhook-driven.

## 3. PHASE 21 COMPONENTS REUSABLE

Reusable Phase 21 pieces:

- encrypted backend-only `IntegrationCredential` storage with AES-256-GCM envelopes;
- `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` as a 32-byte base64 backend key;
- safe connection serialization that does not return tokens;
- one Live connection per Business pattern using `@@unique([businessId, provider, mode])`;
- Demo/Live coexistence by `IntegrationMode`;
- required default active Branch;
- Owner/Admin management with platform-admin tenant bypass blocked;
- connection lifecycle and safe test metadata;
- integration registry and connector capability listing;
- safe inbox source metadata display pattern.

OAuth state/PKCE itself is not needed for the same-day test-number WhatsApp MVP if the user manually enters a Meta temporary token, phone number ID, WABA ID, and app secret.

## 4. META TEST ENVIRONMENT FINDINGS

Meta's WhatsApp getting-started flow requires a Meta developer app with the WhatsApp product/use case and a WhatsApp Business Account. In the App Dashboard/API Setup flow, Meta provides or displays a temporary access token, a selectable test business phone number, the test phone number ID, and the WhatsApp Business Account ID. The setup flow asks the developer to add a recipient phone number and send a test message, then reply to keep the conversation going.

The official getting-started text says to retain the test phone number ID and WhatsApp Business account ID for later use. It also notes that a WABA may be created automatically during app/business setup and should be verified in API Setup before proceeding.

For today's target, use the Meta-provided test number. Production number onboarding, Embedded Signup, billing/payment setup, business verification, template approvals, and long-lived production token strategy should remain deferred.

## 5. SAME-DAY FEASIBILITY

Same-day Live WhatsApp inbound feedback is feasible if the user can complete Meta test app setup and start a temporary HTTPS tunnel.

Smallest credible target:

- Meta test number;
- one Business;
- one active default Branch;
- one Live WhatsApp connection;
- text-only inbound messages;
- public HTTPS webhook endpoint;
- GET webhook verification;
- POST signature validation;
- phone-number-ID connection lookup;
- `FeedbackProcessingService` import;
- Unified Inbox display.

The main same-day risk is not application code complexity; it is local callback reachability and Meta dashboard setup.

## 6. RECOMMENDED PHASE 22 MVP

Recommended MVP:

- WhatsApp Cloud API only.
- Meta test number first.
- One Live WhatsApp connection per Business.
- Demo WhatsApp and Live WhatsApp coexist by mode.
- One required active default Branch per connection.
- Inbound webhook only.
- Text messages imported as Feedback.
- Non-text messages recorded as skipped/unsupported activity, no media downloads.
- No outbound replies, templates, conversation UI, polling, scheduled sync, Redis, Kafka, or third-party BSP.
- Mandatory webhook signature validation before processing.
- Idempotency by `connectionId + WhatsApp message ID`.
- Customer matching by exact normalized phone only.
- AI and automation stay downstream/non-blocking.

## 7. META APP REQUIREMENTS

The user needs:

- a Meta developer account;
- a Meta app with WhatsApp enabled;
- a WhatsApp Business Account connected to the app;
- the app's App Secret for webhook signature validation;
- API Setup access to the test phone number, phone number ID, WABA ID, and temporary token;
- webhook configuration for the app/WABA;
- subscription to the WhatsApp `messages` webhook field.

## 8. TEST NUMBER REQUIREMENTS

For the Meta test-number workflow:

- use the test number shown under WhatsApp/API Setup;
- record the Phone Number ID;
- record the WABA ID;
- add the user's personal WhatsApp number as an allowed test recipient where the dashboard requires it;
- send/receive a supported test message according to Meta's current dashboard flow;
- reply from the real WhatsApp account to generate inbound webhooks.

The implementation should not require adding or registering a production business phone number for the first demo.

## 9. PAYMENT/BUSINESS VERIFICATION REQUIREMENTS FOR TEST MODE

The official getting-started flow reviewed for the test number did not require payment method or business verification before using the dashboard test number for the same-day development flow.

Production-number use is different. Adding a real business phone number, scaling real use, sending templates, and durable production operation may require business setup, payment/billing configuration, WhatsApp account eligibility, business verification, App Review, and a long-lived token strategy. Keep those out of the same-day MVP.

## 10. WEBHOOK REQUIREMENTS

Meta webhooks require a public HTTPS callback URL with a valid TLS/SSL certificate. Self-signed certificates are not supported.

The endpoint must handle:

- GET verification requests;
- POST event notifications;
- JSON webhook payloads;
- the WhatsApp `messages` field;
- duplicate deliveries caused by provider retry.

Meta's WhatsApp webhook overview says WhatsApp webhook payloads can be up to 3 MB and that Meta retries failed WhatsApp webhook deliveries with decreasing frequency for up to 7 days when the endpoint does not return HTTP 200 or cannot be delivered.

## 11. LOCAL HTTPS/TUNNEL RECOMMENDATION

Recommend Cloudflare Quick Tunnel for same-day local testing.

Reasons:

- works on Windows;
- no Docker;
- no app hosting migration;
- no domain required;
- no Cloudflare account required for Quick Tunnels;
- produces an HTTPS `trycloudflare.com` URL;
- forwards only the local backend port when run as `cloudflared tunnel --url http://localhost:5000`;
- official docs say it is intended for development/testing.

Manual setup later:

1. Download/install `cloudflared` for Windows from Cloudflare's official download page.
2. Start the backend at `http://localhost:5000`.
3. Run `cloudflared tunnel --url http://localhost:5000`.
4. Copy the generated `https://*.trycloudflare.com` URL.
5. Configure Meta callback URL as `https://<generated-host>/api/integrations/whatsapp/webhook`.
6. Stop the tunnel after testing.

ngrok remains a workable fallback, but current free ngrok setup requires an account/authtoken and has free-plan quotas. Cloudflare Quick Tunnel is simpler for this project.

## 12. WEBHOOK GET VERIFICATION

Recommended route:

```text
GET /api/integrations/whatsapp/webhook
```

Meta sends query parameters:

- `hub.mode=subscribe`;
- `hub.verify_token=<token configured in dashboard>`;
- `hub.challenge=<integer/string challenge>`.

The backend must compare `hub.verify_token` to the stored configured verify token using a timing-safe comparison after length normalization. On success, respond HTTP 200 with the raw challenge value, not JSON. On failure, respond 403 with no token details.

This route must bypass session auth because Meta is not an authenticated platform user.

## 13. WEBHOOK POST AUTHENTICITY

Meta Graph webhooks include `X-Hub-Signature-256: sha256=<signature>`. Official Graph webhook docs say to generate a SHA-256 signature using the payload and the app's App Secret, compare it to the value after `sha256=`, and treat matching signatures as genuine.

Phase 22 should require this header for POST processing. Missing or invalid signature must be rejected before connection lookup, JSON processing, `FeedbackProcessingService`, AI, or automation work.

## 14. RAW BODY REQUIREMENTS

Signature validation requires the exact raw request body bytes. The current backend mounts global `express.json({ limit: "1mb" })` before routes, so a future WhatsApp route cannot validate the raw payload unless middleware order changes.

Recommended implementation approach:

- mount `/api/integrations/whatsapp/webhook` before global JSON parsing with `express.raw({ type: "application/json", limit: "3mb" })`; or
- add a JSON parser `verify` hook that preserves `req.rawBody` only for the WhatsApp webhook path.

Do not break existing JSON APIs. Keep the body limit aligned with Meta's documented 3 MB WhatsApp webhook limit, or smaller if a clear product/security reason is approved.

## 15. CONNECTION RESOLUTION

Webhook tenant identity must come from trusted provider metadata, not user session, query business ID, or request body business selection.

Resolution:

```text
payload.entry[].changes[].value.metadata.phone_number_id
-> IntegrationConnection where provider=WHATSAPP, mode=LIVE, providerPhoneNumberId matches, status=CONNECTED
-> Business where status=ACTIVE
-> defaultBranchId where Branch belongs to Business and status=ACTIVE
```

Reject unknown, inactive, disconnected, paused, wrong-mode, wrong-provider, inactive-business, and inactive-branch connections safely.

## 16. DATABASE DESIGN

Existing enums already include `IntegrationProvider.WHATSAPP` and `FeedbackChannel.WHATSAPP`.

Recommended migration after approval:

- extend `IntegrationConnection` with WhatsApp-safe metadata:
  - `whatsappPhoneNumberId String? @db.VarChar(80)`;
  - `whatsappBusinessAccountId String? @db.VarChar(80)`;
  - `whatsappDisplayPhoneNumber String? @db.VarChar(40)`;
  - `webhookVerifyTokenHash String? @db.VarChar(64)`;
  - `webhookStatus String? @db.VarChar(40)`;
  - `lastWebhookReceivedAt DateTime?`;
  - `lastWebhookVerifiedAt DateTime?`;
  - `lastInboundMessageAt DateTime?`;
  - `liveProviderType` should remain Email-specific unless replaced with a more general provider-subtype design.
- reuse `IntegrationCredential` for encrypted Meta access token and App Secret.
- add an `IntegrationWebhookDelivery` table only if durable receipt-before-processing is approved.

Recommended indexes:

- unique `IntegrationConnection(provider, mode, whatsappPhoneNumberId)` or equivalent nullable-safe service plus database uniqueness;
- index `IntegrationConnection(businessId, provider, mode)`;
- `IntegrationWebhookDelivery(connectionId, externalEventId)`;
- unique `IntegrationWebhookDelivery(connectionId, externalEventId)` where message ID exists;
- `IntegrationWebhookDelivery(status, receivedAt)`.

## 17. CREDENTIAL STORAGE

Credential classification:

- Meta temporary access token: secret, encrypted in `IntegrationCredential`;
- future system-user token: secret, encrypted in `IntegrationCredential`;
- Meta App Secret: secret, encrypted in `IntegrationCredential` or backend environment for single-app deployments;
- webhook verify token: secret-like shared verifier, store only a hash or encrypted value; never return after creation;
- phone number ID: sensitive configuration, safe enough for backend lookup and masked admin display;
- WABA ID: sensitive configuration, safe backend/admin metadata;
- display/test phone number: safe metadata when masked for frontend;
- Graph API version: safe backend config.

The existing `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` can protect Meta credentials because it is a backend-only AES-256-GCM key. The implementation should generalize error wording from "Live Email" to "Live integrations" before using it for WhatsApp.

## 18. TOKEN STRATEGY

Today:

- accept a manually provided Meta temporary access token for test-number setup and connection test;
- store it encrypted;
- use it only for `Test Connection` and any required WABA subscription/configuration checks if explicitly implemented;
- receiving signed webhook POSTs does not require the token on each delivery once Meta is configured and the endpoint validates signatures.

Future production:

- use a durable system-user token or approved Embedded Signup flow;
- document token expiry/rotation;
- support reauthorization/credential replacement;
- avoid blocking same-day inbound testing on production token architecture.

## 19. GRAPH API VERSION STRATEGY

As of the official Meta Graph API versions page reviewed on 2026-08-10, `v26.0` was released on 2026-07-29 and is the latest listed version. Pin the backend Graph API version in one backend-only config value such as `META_GRAPH_API_VERSION=v26.0`.

Do not scatter hardcoded versions. Document upgrades by reviewing Meta changelogs and updating the single env/config value.

## 20. MESSAGE TYPES

Same-day support:

- `text`: import as Feedback.

Recognize and skip safely for MVP:

- `image`;
- `document`;
- `audio` and voice;
- `video`;
- `location`;
- `contacts`;
- `sticker`;
- `interactive` and button/list replies;
- `reaction`;
- unknown/unsupported.

Do not download media in Phase 22 MVP.

## 21. TEXT MESSAGE FIELD MAPPING

From official WhatsApp webhook examples, inbound payloads include:

- `object=whatsapp_business_account`;
- `entry[].id` as WABA/account ID;
- `changes[].field=messages`;
- `changes[].value.metadata.phone_number_id`;
- `changes[].value.metadata.display_phone_number`;
- `changes[].value.contacts[].profile.name`;
- `changes[].value.contacts[].wa_id`;
- `changes[].value.messages[].from`;
- `changes[].value.messages[].id`;
- `changes[].value.messages[].timestamp`;
- `changes[].value.messages[].type`;
- `changes[].value.messages[].text.body` for text messages.

Mapping:

- channel: `WHATSAPP`;
- title: `WhatsApp message`;
- message: `messages[].text.body`;
- customer phone: `+${messages[].from}` or `+${contacts[].wa_id}` when numeric;
- customer name: `contacts[].profile.name` only when supplied;
- occurredAt: provider timestamp converted from seconds;
- externalId: `whatsapp:{connectionId}:{message.id}` or provider-stable equivalent under 255 chars;
- idempotencyKey: `whatsapp:{connectionId}:{message.id}`;
- branchId: connection default branch;
- metadata: source type, provider, Live Mode, connection ID/name, WABA ID, phone number ID, masked sender, message type, external received timestamp, safe provider message reference.

Do not invent names when Meta does not supply one.

## 22. NON-TEXT POLICY

Recommended same-day policy:

- do not import media bodies;
- do not download media;
- record an item/delivery result with `WHATSAPP_MESSAGE_UNSUPPORTED`;
- optionally create metadata-only Feedback later only if the product owner wants non-text customer contact events visible in the Inbox.

For the first demo, skipping unsupported messages is safer and clearer.

## 23. DEDUPLICATION

Primary idempotency key:

```text
connectionId + WhatsApp message ID
```

Use the same value in:

- `SynchronizationItem.externalId` or `IntegrationWebhookDelivery.externalEventId`;
- `NormalizedFeedbackInput.externalId`;
- `NormalizedFeedbackInput.idempotencyKey`.

Repeated Meta retries must not create duplicate Feedback. If the same WhatsApp message ID is redelivered with the same payload, return success after recognizing the duplicate. If the same provider ID appears with incompatible content, record a safe conflict and do not mutate existing Feedback.

## 24. CUSTOMER MATCHING

Reuse existing Customer auto-linking:

- exact normalized phone only for WhatsApp;
- business-scoped;
- active Customer only;
- no name-only automatic link;
- no fuzzy matching;
- no cross-Business linking;
- submitted sender snapshot remains on Feedback even if a Customer is linked.

The current phone normalizer accepts Rwanda local formats and full international `+` numbers. WhatsApp `wa_id`/`from` is typically digits without `+`; prepend `+` only when it is a plausible international number.

## 25. FEEDBACKPROCESSINGSERVICE REUSE

All supported WhatsApp imports must call:

```ts
feedbackProcessingService.process(normalizedInput);
```

Never insert directly into `Feedback`. This preserves branch validation, idempotency, payload hashing, `FeedbackIngestion`, Customer matching, AI scheduling, automation scheduling, and safe failed-ingestion behavior.

## 26. WEBHOOK DURABILITY

Best durable minimal design:

1. Validate signature with raw body.
2. Parse payload.
3. Resolve connection by phone number ID.
4. Create or upsert a durable delivery/message activity record.
5. Process each supported message through `FeedbackProcessingService`.
6. Mark item/delivery result imported, duplicate, skipped, or failed.
7. Return 200 after every message in the delivery is durably accounted for.

If implementation time is extremely tight, one `SynchronizationRun` per POST payload plus `SynchronizationItem` per message can work. The cleaner long-term model is a new `IntegrationWebhookDelivery` table because WhatsApp activity is not a synchronization run initiated by a user.

## 27. WEBHOOK RESPONSE STRATEGY

For same-day MVP, process synchronously after durable recording because payloads are small and text-only. Return:

- 200 for verified duplicate deliveries and successfully recorded/processed deliveries;
- 403/401 for failed verification/signature;
- 400 for malformed verification requests;
- 200 with skipped item status for unsupported message types after valid signature and connection resolution, to avoid repeated retries for permanent unsupported content;
- 500 only for transient server/database failures where Meta retry is useful.

No Redis is needed.

## 28. ACTIVITY/SYNCHRONIZATION HISTORY DESIGN

The UI should not call this "Sync Now" for WhatsApp Live. Recommended wording:

- Inbound activity;
- Webhook events;
- Live messages received;
- Last inbound;
- Imported;
- Duplicates prevented;
- Failed;
- Unsupported skipped.

Implementation choices:

- short-term: use one `SynchronizationRun` per webhook delivery with trigger type later extended to `WEBHOOK`;
- better: add `IntegrationWebhookDelivery` and reuse `SynchronizationItem`-like fields or a child table for per-message results.

Do not show a manual sync button for Live WhatsApp.

## 29. CONNECTION TEST

`Test Connection` can honestly verify:

- Live WhatsApp feature enabled;
- encrypted token/app secret decryptable;
- configured phone number ID present;
- WABA ID present;
- default Branch active;
- optional Meta Graph identity/phone-number lookup succeeds if a token is present;
- webhook verify-token hash exists;
- last webhook status if already verified.

It must not import Feedback or send a WhatsApp message.

## 30. CONNECTION LIFECYCLE

Use existing statuses:

- `CONNECTED`: webhook processing allowed;
- `PAUSED`: webhook verifies but POST messages are recorded/skipped or acknowledged without import, depending on approved behavior;
- `DISCONNECTED`: processing blocked, credentials revoked/deleted/marked revoked, history and Feedback preserved;
- `ERROR`: configuration or credential problem.

Add webhook-specific state in metadata/fields: `PENDING_VERIFICATION`, `ACTIVE`, `FAILING`, `PAUSED`, `DISCONNECTED`.

## 31. ROLE AND TENANT SECURITY

Management:

- Owner/Admin: connect/configure/test/view activity/pause/resume/disconnect;
- Manager/Staff: no integration configuration; imported Feedback visibility remains branch-scoped;
- Platform Administrator: no tenant bypass without active Business membership.

Webhook:

- provider-authenticated through signature, not user-session authenticated;
- no arbitrary `businessId` accepted from the payload;
- phone number ID resolves tenant.

## 32. API DESIGN

Management endpoints should extend existing integration routes:

```text
POST  /api/businesses/:businessId/integrations
PATCH /api/businesses/:businessId/integrations/:connectionId
POST  /api/businesses/:businessId/integrations/:connectionId/test
POST  /api/businesses/:businessId/integrations/:connectionId/pause
POST  /api/businesses/:businessId/integrations/:connectionId/resume
POST  /api/businesses/:businessId/integrations/:connectionId/disconnect
GET   /api/businesses/:businessId/integrations/:connectionId/runs-or-activity
```

Live WhatsApp creation body:

```json
{
  "provider": "WHATSAPP",
  "mode": "LIVE",
  "displayName": "WhatsApp Test Number",
  "defaultBranchId": "branch-id",
  "phoneNumberId": "meta-phone-number-id",
  "wabaId": "meta-waba-id",
  "displayPhoneNumber": "+1555...",
  "temporaryAccessToken": "secret",
  "appSecret": "secret"
}
```

Public webhook endpoints:

```text
GET  /api/integrations/whatsapp/webhook
POST /api/integrations/whatsapp/webhook
```

## 33. FRONTEND DESIGN

Use one WhatsApp provider card with mode switching, not duplicate main WhatsApp cards.

Live card should show:

- WhatsApp;
- Live Mode;
- connected Meta test number, masked;
- Branch;
- Webhook: pending/active/failing;
- Last inbound;
- Imported;
- Duplicates prevented;
- Failed/skipped;
- actions: Test Connection, View Activity, Pause/Resume, Disconnect.

Demo Mode remains available through mode selection/menu.

## 34. DEMO/LIVE COEXISTENCE

The current schema uniqueness `[businessId, provider, mode]` supports one Demo WhatsApp and one Live WhatsApp connection per Business. Keep Demo WhatsApp clearly labeled as simulated. Keep Live WhatsApp clearly labeled as real inbound Meta webhook data.

## 35. UNIFIED INBOX INTEGRATION

Live WhatsApp Feedback should appear in the existing Unified Inbox:

- Channel: WhatsApp;
- Live badge;
- message preview;
- submitted sender snapshot;
- Branch;
- received timestamp;
- Customer link when exact phone match exists.

No separate WhatsApp inbox.

## 36. FEEDBACK DETAILS INTEGRATION

Safe source details:

- Source: WhatsApp;
- Mode: Live;
- connection name;
- received timestamp;
- safe provider message reference;
- masked sender;
- message type.

Do not display tokens, App Secret, raw webhook JSON, signature, full WABA credentials, or media URLs.

## 37. AI INTEGRATION

No WhatsApp connector should call AI directly. After Feedback persists, existing Phase 13 scheduling runs. WhatsApp message text is untrusted customer content and prompt-injection protections remain necessary.

## 38. AUTOMATION INTEGRATION

No WhatsApp connector should execute automation directly. `FeedbackProcessingService` schedules `FEEDBACK_CREATED`, and AI later schedules `AI_ANALYSIS_COMPLETED` as already implemented. Human override protections remain unchanged.

## 39. SECURITY

Risks and mitigations:

- forged webhooks: require `X-Hub-Signature-256`;
- replayed delivery: provider message ID idempotency;
- verify-token leakage: store hash/encrypted value and never return it;
- access-token/App Secret leakage: encrypted credentials and redacted logs;
- tenant confusion: phone-number-ID lookup only;
- Branch leakage: server-side default Branch validation;
- duplicate delivery: database uniqueness;
- oversized body: webhook-specific 3 MB or stricter limit;
- malformed payload: strict parsing and safe errors;
- malicious text/prompt injection: treat as untrusted Feedback;
- PII logging: avoid raw payload, message body, full phone;
- public abuse: signature validation before expensive work;
- stale/disconnected connection: block or record without import;
- platform-admin bypass: no membership, no management access.

## 40. LOGGING

Allowed:

- provider;
- connection ID;
- delivery/item status;
- safe error code;
- timestamps;
- hashed/truncated provider message ID where useful.

Avoid:

- access tokens;
- App Secret;
- verify token;
- full phone number;
- message body;
- raw webhook payload;
- media URLs;
- signature;
- customer PII beyond existing safe operational policy.

## 41. FAILURE HANDLING

Recommended safe codes:

- `WHATSAPP_NOT_CONFIGURED`;
- `WHATSAPP_WEBHOOK_VERIFICATION_FAILED`;
- `WHATSAPP_WEBHOOK_SIGNATURE_INVALID`;
- `WHATSAPP_CONNECTION_NOT_FOUND`;
- `WHATSAPP_CONNECTION_INACTIVE`;
- `WHATSAPP_BRANCH_INACTIVE`;
- `WHATSAPP_MESSAGE_INVALID`;
- `WHATSAPP_MESSAGE_UNSUPPORTED`;
- `WHATSAPP_MESSAGE_DUPLICATE`;
- `WHATSAPP_PROCESSING_FAILED`;
- `WHATSAPP_PROVIDER_UNAVAILABLE`;
- `WHATSAPP_CREDENTIAL_INVALID`.

Public webhook responses should stay terse. Detailed classification belongs in internal activity records.

## 42. AUTOMATED TEST STRATEGY

Add tests during implementation for:

- GET verification success and wrong token;
- missing signature;
- invalid signature;
- modified-body signature failure;
- valid text payload;
- unknown phone number ID;
- inactive connection;
- inactive Branch;
- cross-Business safety;
- provider message ID deduplication;
- webhook redelivery;
- malformed payload;
- unsupported message;
- exact phone Customer matching;
- no name-only matching;
- `FeedbackProcessingService` reuse;
- no direct Feedback insert;
- AI/automation non-blocking;
- credential redaction;
- log redaction;
- Demo/Live coexistence;
- management roles;
- disconnect behavior;
- public webhook bypasses user-session auth but requires provider authenticity;
- no media download;
- no outbound messages.

## 43. SAME-DAY SUPERVISOR MANUAL TEST

Shortest credible demo:

1. Open Meta WhatsApp API Setup.
2. Confirm test phone number, phone number ID, and WABA ID.
3. Start local backend.
4. Start Cloudflare Quick Tunnel.
5. Create/connect Live WhatsApp integration in the app and select Remera, Gisementi Branch.
6. Configure Meta callback URL and verify token.
7. Subscribe to `messages`.
8. Send/reply with one real WhatsApp text message through the supported Meta test workflow:

```text
Hello, I visited the Remera branch today. The food was good but the service was slow.
```

9. Confirm backend receives webhook.
10. Confirm Feedback appears in Unified Inbox with WhatsApp, Live Mode, correct text, sender snapshot, correct Branch, and timestamp.
11. Send a second new text message and confirm another Feedback appears.
12. Leave redelivery testing to automated tests.

## 44. MIGRATION REQUIREMENT

Yes, implementation likely needs a migration unless WhatsApp metadata is forced into generic fields, which is not recommended for secrets and lookup keys.

Minimum migration:

- add WhatsApp phone/WABA/webhook status fields to `IntegrationConnection`;
- reuse `IntegrationCredential`;
- add `IntegrationWebhookDelivery` if durable receipt-before-processing is approved;
- add any needed enum for webhook trigger/status if using run history.

No migration was created during discovery.

## 45. ENVIRONMENT VARIABLES

Recommended backend env:

```env
LIVE_WHATSAPP_ENABLED=false
META_GRAPH_API_VERSION=v26.0
```

Optional if using one Meta app for all tenants and not per-connection storage:

```env
META_WHATSAPP_APP_ID=
META_WHATSAPP_APP_SECRET=
```

Preferred for same-day tenant setup: store token/App Secret/verify token per connection, encrypted or hashed backend-side. Do not expose any `VITE_` WhatsApp secrets.

`INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` can be reused for encrypted Meta credentials.

## 46. META MANUAL SETUP STEPS

Future manual setup:

1. Open Meta for Developers.
2. Create/select app.
3. Add/enable WhatsApp.
4. Open WhatsApp/API Setup.
5. Confirm or create/connect WhatsApp Business Account.
6. Copy test phone number ID.
7. Copy WABA ID.
8. Generate/copy temporary access token for testing.
9. Add and verify the user's personal WhatsApp number as a test recipient where required.
10. Create the Live WhatsApp connection in the app.
11. Start `cloudflared tunnel --url http://localhost:5000`.
12. Configure callback URL: `https://<trycloudflare-host>/api/integrations/whatsapp/webhook`.
13. Paste the verify token generated/stored by the backend.
14. Verify and save.
15. Subscribe to `messages`.
16. Send/reply with a WhatsApp text message using Meta's test flow.
17. Confirm Unified Inbox import.

## 47. OUT-OF-SCOPE ITEMS

Out of scope: outbound replies, templates, marketing messages, agent chat, media downloads, OCR/transcription, WhatsApp Flows, production number registration, Embedded Signup, billing setup, business verification, multiple WhatsApp numbers per Business, automatic Branch routing, polling, scheduled sync, Redis, Kafka, third-party BSPs, Twilio, unofficial WhatsApp libraries, WhatsApp Web automation, Selenium/Puppeteer, Outlook implementation.

## 48. REFERENCE DESIGN PLAN

After discovery approval, create exactly:

- `frontend/references/phase22-live-whatsapp-primary.png`;
- `frontend/references/phase22-live-whatsapp-states.png`.

No reference images were created during discovery.

## 49. DOCUMENTATION UPDATED

This discovery updates project memory and planning documentation to record Phase 22 Live WhatsApp discovery, Meta test-number same-day target, webhook-driven architecture, credential/security requirements, migration expectation, no outbound/media scope, Cloudflare tunnel recommendation, and Outlook next priority after WhatsApp.

## 50. STATIC CHECK RESULTS

Static checks completed for this documentation-only discovery:

- `npm run format` was run after the documentation edits.
- `npm run format:check` passed; Prettier reported all matched files use the configured style.
- `git diff --check` passed with no whitespace errors. It reported only normal Git LF-to-CRLF working-copy warnings for modified Markdown files on Windows.

## 51. EXACT FILES CHANGED

Documentation-only files changed:

- `PHASE_22_DISCOVERY_REPORT.md`;
- `AGENTS.md`;
- `README.md`;
- `ARCHITECTURE.md`;
- `IMPLEMENTATION_STATUS.md`;
- `NEXT_STEPS.md`;
- `API_NOTES.md`;
- `DATABASE_NOTES.md`;
- `SECURITY_NOTES.md`;
- `DEPLOYMENT.md`;
- `CHANGELOG.md`.

## 52. OPEN DECISIONS REQUIRING APPROVAL

Approve or revise:

- Phase 22 as Live WhatsApp before Live Outlook, despite older roadmap numbering that previously placed Google Reviews next.
- Cloudflare Quick Tunnel as the same-day local HTTPS approach.
- Store Meta App Secret per connection encrypted, or globally in backend environment.
- Store webhook verify token hashed or encrypted.
- Add `IntegrationWebhookDelivery` now, or represent webhook activity through `SynchronizationRun`/`SynchronizationItem` for the MVP.
- Synchronous processing after durable receipt versus worker-claimed delivery processing.
- Skip non-text messages versus metadata-only Feedback for non-text.
- Whether Test Connection may call Meta Graph API during manual testing.
- Exact UI wording for paused webhook behavior.

## 53. FINAL DISCOVERY RECOMMENDATION

Proceed with a narrow Live WhatsApp Cloud API MVP focused on Meta test-number inbound text webhooks. Reuse Phase 20/21 integration management, encrypted credentials, default Branch routing, safe metadata, and Phase 4 processing. Add webhook-specific public routes, raw-body signature validation, phone-number-ID connection resolution, and durable webhook activity. Defer production onboarding, outbound replies, media, templates, polling, and Outlook until after WhatsApp is proven.

Confirmations:

- no application code changed;
- Prisma schema unchanged;
- no migration created;
- no package added;
- no Meta app created;
- no Meta credential requested;
- no credential stored;
- no WhatsApp Cloud API call made;
- no webhook exposed;
- no tunnel started;
- no real WhatsApp message processed;
- no browser opened;
- no browser automation used;
- no manual verification claimed;
- Phase 22 implementation has not started;
- Outlook implementation has not started.

## 54. POST-DISCOVERY IMPLEMENTATION ADDENDUM - 2026-08-10

After this discovery was approved for implementation, the Phase 22 Meta test-number inbound webhook MVP was implemented.

Implemented decisions:

- Meta App Secret is configured globally through backend environment for raw-body webhook signature validation.
- Webhook verify token is configured globally through backend environment and stored on Live WhatsApp connections only as a SHA-256 hash.
- `IntegrationWebhookDelivery` was added for safe durable webhook activity.
- Webhook processing is synchronous in the MVP after signature validation and connection resolution.
- Non-text WhatsApp messages are skipped without media download.
- Test Connection may call Meta Graph API for the configured phone-number ID using the encrypted access token.
- Live WhatsApp is webhook-driven and does not expose Sync Now.

Implementation boundaries preserved:

- No outbound replies, templates, media download, polling, scheduled sync, Redis queue, production phone-number onboarding, WhatsApp Web/Twilio path, Outlook, live Google Reviews, or social media implementation was added.
- No browser, browser automation, screenshots, or reference images were created by Codex during implementation.
- Manual Meta test-number/browser verification remains pending with the user.
