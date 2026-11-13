# Design

## Context

See proposal.md. Observed: `CallProvider` has one method, `startCall(CallRequest) -> { callSid }`. `callActivation()` and `createCallProvider()` in `exotel/config.ts` choose `exotel | log | off`. `exotelCallProvider.ts` posts a form to Exotel with `CustomField = parentId`. `exotelWebhook` handles `kind=gather` and `kind=status` with a shared token and is idempotent per CallSid. `voicePrompt`, `voiceAudio` and `voiceReply` already produce the audio and process a spoken reply within an 8 second budget.

## Goals / Non-Goals

**Goals:** run the voice loop on Twilio with the same wording, consent and safety behaviour; reuse the neutral logic; keep every callback idempotent; keep audio out of storage.

**Non-Goals:** changing Exotel, changing call wording, per-parent provider choice.

## Decisions

1. **Neutral core, thin edges.** Move the provider-neutral parts of `exotelWebhook` (digits to dose state, status to session and escalation) behind functions that both providers call, and keep each provider's request parsing and response writing in its own folder. No behaviour change for Exotel; its tests must stay green.
2. **Step per request.** `twilioVoice?step=<greeting|question|gather|record|closing|consent>&parentId=<id>` returns TwiML. Twilio has no custom field, so the parent id and the step travel in our own callback URL, which is covered by the signature.
3. **The TwiML flow.** Greeting: `<Play>` then `<Redirect>` to the question step. Question: a `<Gather input="dtmf" numDigits="1" timeout="5" action=...>` containing the `<Play>` of the question (so a key press interrupts it), then, when nothing was pressed, a `<Record maxLength="8" timeout="3" playBeep="false" action=...>`. A digit goes to the gather step, which applies it and returns the closing. A recording goes to the record step, which processes the reply within the budget and returns the closing, or, when the reply was not usable, the question again with a keypad-only `<Gather>`, then the closing. The consent call uses the consent greeting and a keypad-only gather, and has no recording step.
4. **Signature.** Validate `X-Twilio-Signature` as base64 HMAC-SHA1 of the full public URL plus the POST parameters sorted by name, keyed by the auth token, compared in constant time. The public URL is built from `TWILIO_PUBLIC_BASE_URL` and the request path and query, never from request headers, because the function sits behind Google's proxy. A failed check answers 403 with a code only, before any Firestore access.
5. **Status callback.** `twilioStatus?parentId=<id>` receives `CallStatus` (`completed`, `busy`, `no-answer`, `failed`, `canceled`) and maps it onto the existing terminal session statuses with the existing classifier, idempotently per CallSid.
6. **Recordings.** The reply handler's download adds `Authorization: Basic` only when the URL host is Twilio's API host. Twilio may serve the file a moment after the callback, so the download retries once within the 8 second budget. After the reply is processed, the app server deletes the recording at Twilio. The recording never touches our storage or logs.
7. **Selection and secrets.** One new mode, `twilio`, in `callActivation`; a complete configuration is `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` and `TWILIO_PUBLIC_BASE_URL`. Missing names are logged (never values), once, as for Exotel. The scheduled functions declare the Twilio secrets next to the Exotel ones.
8. **Caller id.** Twilio can call India only from a non-Indian number, so the parent sees an international number. This is a product risk (a parent may not answer), not a code risk; recorded as an open question.

## Risks / Trade-offs

- **International caller id** may reduce answered calls. Mitigation: test with real parents before relying on it; keep Exotel selectable.
- **Trial accounts** only call verified numbers and play a short trial message first. Mitigation: use it for the end-to-end test only.
- **Twilio waits about 15 seconds for a callback response.** The 8 second reply budget already fits.
- **Signature depends on the exact public URL.** Mitigation: one configured base URL, a test that builds the same URL Twilio signed.
- **Refactoring the shared webhook logic** could change Exotel behaviour. Mitigation: its existing unit and emulator tests run unchanged before and after.

## Migration Plan

Nothing to migrate. Deploy with `CALL_PROVIDER` unchanged (calling stays as it is), then switch to `twilio` only when the settings and a successful trial call are in place.

## Open Questions

- Does the trial announcement before the greeting matter for the test (it only exists on trial accounts)?
- Will a parent answer an international caller id? Needs a real test.
- Cost per minute: confirm from Twilio's rate card.
- Whether TRAI rules on automated calls to Indian numbers from abroad allow this: the user confirms.
- Whether Twilio's own speech recognition for Malayalam, Tamil and Hindi should be considered later instead of our STT.
