# Exotel provider and webhook

## Why

Stage 4 claims dose events and hands them to a provider that only logs. Stage 5 replaces that with a
real Exotel outbound call behind the same `CallProvider` interface, and adds the authenticated,
idempotent `exotelWebhook` that turns call status and DTMF key presses into `callSessions` and
`doseEvents` writes. TTS prompts are Stage 6, so this stage captures DTMF only (1 = taken, 2 = not
yet, 9 = stop reminders).

## What changes

- `functions/src/exotel/config.ts`: `defineSecret` declarations (`EXOTEL_API_KEY`,
  `EXOTEL_API_TOKEN`, `EXOTEL_ACCOUNT_SID`, `EXOTEL_CALLER_ID`, `EXOTEL_FLOW_URL`,
  `EXOTEL_WEBHOOK_TOKEN`) plus `exotelConfigFromEnv()` and `createCallProvider()`; `CALL_PROVIDER`
  selects `exotel` or the safe `logging` default.
- `functions/src/exotel/exotelCallProvider.ts`: implements `CallProvider` against the Exotel v1
  `POST /v1/Accounts/{sid}/Calls/connect` (outgoing call to a flow) with Basic auth, transactional
  `CallType`, a `StatusCallback` (JSON terminal events), and `CustomField = parentId`. Injectable
  `fetch` for mocked-HTTP tests. Errors carry codes only.
- `functions/src/exotel/webhook.ts`: `exotelWebhookHandler` for two authenticated request kinds on
  the same HTTPS function:
  - `POST .../exotelWebhook?token=...&kind=status` (Exotel StatusCallback, JSON) - closes/updates
    the `callSessions` row and retries or resolves the group when no DTMF was captured;
  - `GET .../exotelWebhook?token=...&kind=gather` (Passthru after a Gather applet, URL-encoded query)
    - applies the DTMF answer to every event in the session, idempotently.
- Shared-secret authentication with constant-time comparison; the token lives in a Firebase secret.
  Exotel does not document a request signature for these callbacks, so the token in the URL is the
  authentication mechanism (stated in the Stage 5 verification note).
- Dispatcher success now writes `parents/{parentId}/callSessions/{callSid}` (server-only) with the
  group's `doseEventIds` and `lastCallSid` on each member; Dispatch creates the session only after
  Exotel accepted the call (`startCall` returned a sid).
- `dispatchDueCalls` binds the new secrets and chooses the provider from `CALL_PROVIDER`; emulator
  runs stay on the logging provider unless explicitly set to `exotel`.

## Spec changes

- `specs/call-flow/spec.md`:
  - ADDED **Exotel outbound call contract** - outgoing call to the configured call flow, form
    encoding, Basic auth, status callback, `CustomField = parentId`, secrets only, no PII in logs.
  - ADDED **DTMF answer mapping and revocation** - 1 resolves the whole session's events as taken
    by DTMF (group-confirmed when grouped), 2 resolves them as not_taken with the one extra
    reminder, 9 revokes consent and stops calls, any other non-empty input is unclear, empty input
    changes nothing.
  - ADDED **callSessions created at call start** - one session per accepted call, id = callSid,
    listing all dose event ids.
  - MODIFIED **Dispatcher eligibility and provider boundary** - the dispatcher can use the Exotel
    provider in production; logging stays the default for local/emulator runs; failures still
    revert to pending.
  - MODIFIED **Webhook authenticity** - shared secret token in the callback URL, constant-time
    check, reject 401 before any read/write; Exotel has no documented signature to verify.
  - MODIFIED **Idempotent webhook handlers** - session-scoped idempotency: duplicate DTMF callbacks
    do nothing when the session already has `dtmfInput`, and duplicate/late terminal callbacks do
    nothing when the session is already terminal.
- `specs/data-model/spec.md`:
  - ADDED **callSessions identity** - the document id is the Exotel `CallSid`; the document keeps
    `doseEventIds` for the group, so callbacks can be routed from `CustomField = parentId` without
    a collection-group query or new index.

## Impact

- New secrets must be set before deploying with `CALL_PROVIDER=exotel`; without them the deploy-time
  config check fails loudly and local runs continue to log only.
- The dispatcher writes sessions in the same batch as the lastCallSid write. No Firestore rules or
  index changes.
- Real-call verification (KYC/DLT, per-call playback and DTMF in a live call) cannot be done in this
  environment and is flagged as a manual prerequisite.
