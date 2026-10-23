# Design

## Provider

Exotel v1 is the only documented API with outgoing call-to-flow plus status callbacks:

- `POST https://api.exotel.com/v1/Accounts/{account_sid}/Calls/connect`
- Basic auth `api_key:api_token`
- form fields: `From` (parent E.164), `CallerId` (ExoPhone), `Url` (dashboard flow URL),
  `CallType=trans`, `TimeLimit=300`, `StatusCallback`, `StatusCallbackEvents[0]=terminal`,
  `StatusCallbackContentType=application/json`, `CustomField=parentId`
- response `{ Call: { Sid, Status, ... } }`

The configured flow (dashboard, native-speaker reviewed in Stage 6) is: Greeting -> Gather
(one digit) -> Passthru GET back to `exotelWebhook?kind=gather` on each digit branch -> Closing. The
Passthru response is HTTP 200/302 only, so the webhook never produces prompt text; Stage 6 owns all
spoken audio.

The provider takes an injectable `fetch` and a `ExotelConfig`; tests assert the request line,
Basic header, form body and error mapping without network. No name, phone or language is logged.

## Wiring

`createCallProvider()` reads `CALL_PROVIDER`:

- `exotel`: builds `ExotelCallProvider` from secrets and requires `EXOTEL_WEBHOOK_URL` (the public
  HTTPS base URL of the function). Missing values throw at first use with a code-only message.
- anything else (`logging`, unset): `LoggingCallProvider`, keeping local and emulator runs safe.

Both `dispatchDueCalls` and `exotelWebhook` declare the secrets in `secrets: [...]`, so values are
available through `process.env` at runtime.

## Session identity and callbacks

Every accepted call creates `parents/{parentId}/callSessions/{callSid}` with
`{ callSid, doseEventIds, status: "initiated", dtmfInput: null, startedAt, endedAt: null }` and sets
`lastCallSid` on every member in the same batch. `CustomField` carries only the parent id, so a
callback needs no lookup by callSid: validate the id, then address the document directly. This avoids
a collection-group query (and therefore an index change).

## Webhook request handling

One HTTPS function, two shapes, discriminated by `kind`:

```
POST /exotelWebhook?token=...&kind=status   JSON StatusCallback
GET  /exotelWebhook?token=...&kind=gather   URL-encoded Passthru query (?digits=...)
```

1. Extract `token`; compare with `EXOTEL_WEBHOOK_TOKEN` using `timingSafeEqual` after a length check.
   Failures return 401 before touching Firestore. (Exotel documents Basic auth for the API and a
   status-callback payload, but no HMAC/signature for callbacks; the unguessable URL token is the
   documented-compatible shared-secret mechanism.)
2. Parse and validate ids: `CallSid` matches `[A-Za-z0-9_-]{1,64}`, `CustomField/To` parent id
   matches the same alphabet, `Status` is from the documented set. Invalid input returns 400 with a
   code only.
3. Load the session and parent in a transaction; missing session returns 200 with
   `{ ignored: "unknown_session" }` (authenticated but nothing to do, avoids Exotel retry storms).

### Gather (DTMF)

`digits` arrives possibly wrapped in double quotes; trim and keep only digits. Mapping:

| digits | Session | Events |
| ------ | ------- | ------ |
| 1 | dtmfInput="1", status answered | every calling member -> taken, resolvedBy dtmf, groupConfirmed = grouped |
| 2 | dtmfInput="2", status answered | every calling member -> not_taken, groupConfirmed = grouped, one reminder at now + retryGapMinutes |
| 9 | dtmfInput="9" | parent consent revoked (revokedAt first time, regrantedAt null); calling members -> no_answer transition (stops retries via the consent gate) |
| other non-empty | dtmfInput=that value | members -> unclear (retry path) |
| empty | untouched | none, 200 |

Idempotency: if `session.dtmfInput !== null`, return 200 with `{ ignored: "duplicate_dtmf" }` and
write nothing. Terminal sessions ignore gather events (late/duplicate delivery).

### Status

`EventType=answered` moves an initiated session to answered.

Terminal statuses:

| Exotel Status | Session | Events still calling |
| ------------- | ------- | -------------------- |
| completed, answered and no dtmf | failed (dropped mid-script) | no_answer transition (retry) |
| completed, no answer event | completed | no_answer transition |
| completed, dtmf captured | completed | none (already resolved) |
| no-answer / busy / canceled | no_answer | no_answer transition |
| failed | failed | no_answer transition |

The group is always processed together; a terminal callback on an already terminal session is
ignored (`{ ignored: "duplicate_status" }`). `endedAt` and `dtmfInput` are set in the same
transaction as the member transitions. `missedAt`/alerts remain Stage 9.

## Files

```
functions/src/exotel/config.ts
functions/src/exotel/exotelCallProvider.ts
functions/src/exotel/webhook.ts
functions/src/exotel/*.test.ts        (unit: config, provider, pure mapping)
functions/test/fns/exotelWebhook.test.ts (emulator: idempotency, auth, transitions)
```

## Tests

- Provider: URL/path/basic auth/form fields, JSON parse, non-2xx -> `ExotelError` code, missing Sid,
  `CustomField`/`doseEventIds` payload passed through, no PII in errors/logs.
- Config: `CALL_PROVIDER` chooses provider; missing secrets throw a code-only error; logging default.
- Pure mapping: digit trimming, DTMF branches, terminal status classification, grouped flag.
- Webhook (emulator): 401 without/with wrong token (no writes), 1/2/9/other digits, grouped vs
  single, duplicate DTMF, duplicate terminal, answered event, dropped-call classification,
  unknown session, empty digits, member re-check (session resolution only touches calling members).
