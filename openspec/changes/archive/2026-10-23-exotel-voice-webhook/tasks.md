# Tasks

Constraints: no change to `firestore.rules` or `firestore.indexes.json`; region asia-south1 only;
no PII, transcripts or phone numbers in logs (ids/statuses/codes only); secrets via
`defineSecret`, never source or git; the call flow itself is configured in the Exotel dashboard and
its spoken audio is Stage 6. Provider HTTP is mocked in tests; emulator runs never dial.

## 0. Change artifacts

- [x] 0.1 Proposal, design, two delta specs and tasks; `openspec validate exotel-voice-webhook --strict` and `openspec validate --specs` pass.

## 1. Exotel client

- [x] 1.1 `functions/src/exotel/config.ts`: secret declarations for API key/token/account sid/caller id/flow URL/webhook token, `exotelConfigFromEnv()`, `createCallProvider()` with `CALL_PROVIDER` selection and code-only config errors. Verify: unit tests for selection, missing secrets, logging default.
- [x] 1.2 `functions/src/exotel/exotelCallProvider.ts`: `ExotelCallProvider` (`fetch` injectable) posting the documented form fields with Basic auth, parsing `Call.Sid`, coded errors, no PII in logs. Verify: mocked-HTTP unit tests for the request, success, non-2xx, missing sid.

## 2. Session write at dispatch

- [x] 2.1 Dispatcher: after `startCall` succeeds, write `callSessions/{callSid}` (callSid, doseEventIds, status initiated, dtmfInput null, startedAt, endedAt null) together with `lastCallSid` on every member. Verify: emulator test asserts one session per accepted call, shared sid, and grouped ids; provider failure writes no session.

## 3. Webhook

- [x] 3.1 `functions/src/exotel/webhook.ts`: pure parse/classify helpers (token check, digit trim, DTMF mapping, terminal classification) plus `exotelWebhookHandler` doing transactional session + member + parent reads/writes, session-scoped idempotency, 401/400 codes. Verify: unit tests for pure helpers.
- [x] 3.2 Export `exotelWebhook` as `onRequest` with the secret bound and the handler wired; keep responses code-only. Verify: `functions/src/index.test.ts` still loads the entry.
- [x] 3.3 Emulator tests: 401 wrong token (no writes), press 1/2/9/other on single and grouped calls, duplicate DTMF, duplicate/late terminal, answered event, dropped-call classification, unknown session, empty digits. Verify: `npm run test:fns` green.

## 4. Close

- [x] 4.1 `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:fns`, `npm run test:rules` pass; `openspec validate exotel-voice-webhook --strict` and `openspec validate --specs` pass.
- [x] 4.2 `docs/DECISIONS.md`: provider selection, shared-token auth (no Exotel signature), session id = CallSid with CustomField parent id, DTMF 9 behaviour, dropped-call classification. Document required secrets and dashboard flow in `docs/SETUP.md`, including the manual live-call verification that could not run here.
- [x] 4.3 Archive the change and commit (`Stage 5: Exotel provider and webhook`).
