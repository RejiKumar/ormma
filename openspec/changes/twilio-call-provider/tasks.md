# Tasks

## 0. Prerequisite

- [x] 0.1 Archive the `go-live-calls` change first (it is complete), so this change's modified requirements build on its text. Verify: `openspec list` no longer shows go-live-calls, and the main `call-activation` spec exists.

## 1. Provider selection

- [x] 1.1 Add the Twilio configuration (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_PUBLIC_BASE_URL`), the `twilio` mode in `callActivation`, and `createCallProvider` returning the Twilio provider. Verify: unit tests for complete, incomplete (names only logged), other provider's settings only, and `log` and unset unchanged.
- [x] 1.2 Declare the Twilio secrets on every scheduled function that declares the Exotel secrets. Verify: a test or build check lists the functions and their secrets.

## 2. Provider and signature

- [x] 2.1 Implement `TwilioCallProvider.startCall` against the Calls API. Verify: unit tests for the request built (fields, Basic auth, callbacks), the returned sid, a non-2xx response, a payload without a sid, and no number or token in logs.
- [x] 2.2 Implement signature validation and a TwiML builder. Verify: tests with Twilio's documented signature example, a changed parameter, a missing header, and constant-time comparison.

## 3. Neutral core

- [ ] 3.1 Extract the provider-neutral digit and status logic from `exotelWebhook` so both providers call it, without changing Exotel behaviour. Verify: the existing Exotel unit and emulator tests pass unchanged.

## 4. Voice, status and recordings

- [ ] 4.1 Build `twilioVoice` for the greeting, question, gather, record, closing and consent steps using the existing prompt and audio services. Verify: unit tests for the TwiML of each step, language and consent rules, keypad and spoken paths, and the not-usable repeat.
- [ ] 4.2 Build `twilioStatus` with the status mapping. Verify: emulator tests for answered, no-answer, busy, failed, repeated and late callbacks.
- [ ] 4.3 Make the reply download use Basic auth only for Twilio's host, retry once, and delete the recording at Twilio afterwards. Verify: tests for the auth scope, the retry, deletion on usable and unusable replies, a failed deletion, and nothing stored or logged.

## 5. Docs and readiness

- [ ] 5.1 Write `docs/TWILIO-FLOW.md`, update `docs/GO-LIVE.md` and make `scripts/check-go-live.mjs` check the Twilio secrets, the settings and the endpoints when `CALL_PROVIDER=twilio`. Verify: the script reports pass and fail correctly with and without the Twilio settings.

## 6. Verification

- [ ] 6.1 Run function unit tests, emulator tests, typecheck, lint and `openspec validate twilio-call-provider`. Verify: all pass.
- [ ] 6.2 With the user: a Twilio trial account, the user's own verified number, one real call. Verify: greeting, a spoken answer, a keypad answer, the dose state in the app, the recording gone at Twilio, and the function log free of numbers and content.
