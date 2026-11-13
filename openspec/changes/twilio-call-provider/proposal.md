# Proposal

## Why

Requested by the user on 2026-11-13 (not in the BRD). The check-in calls need a telephony provider, and the only one wired in, Exotel, needs business KYC that an individual proprietor without GST may not clear. Twilio can be opened by one person with an email and a card, and its trial account can call the person's own verified phone number, so the whole voice loop (greeting, question, keypad or spoken reply, closing, status) can be tested end to end, and later run in production if Exotel stays unavailable.

## What changes

A second real provider behind the existing `CallProvider` boundary. Exactly one real provider is active at a time, chosen by `CALL_PROVIDER` (`exotel` as today, or the new `twilio`).

- **Provider selection.** `CALL_PROVIDER=twilio` with a complete Twilio configuration turns calling on. It never falls back to the log-only provider, and an incomplete configuration keeps calling off, as for Exotel.
- **`TwilioCallProvider`.** Starts a call through Twilio's Calls API with the parent's number, the Twilio number, our TwiML address and a status callback.
- **`twilioVoice` function.** Twilio has no dashboard flow like Exotel's, so the flow is TwiML (XML) returned by a new HTTPS function, one step per request: greeting, question with a keypad, a short recording when no key is pressed, and the closing. The consent call has no recording step. The audio is the existing text-to-speech from `voicePrompt` and `voiceAudio`, so wording, languages and consent rules are unchanged.
- **Callbacks.** Twilio's digit, recording and status callbacks are translated at the edge into the existing provider-neutral logic (dose state, call session, escalation, spoken reply), which is reused, not copied. Every callback stays safe to repeat.
- **Authenticity.** Twilio signs each request (`X-Twilio-Signature`); the function validates it with the auth token and refuses anything else before touching Firestore.
- **Recordings.** Twilio recordings need Basic auth to download; the reply handler adds it only for Twilio's own host, and the recording is deleted from Twilio after the reply is processed, so no audio stays at the provider.
- **Docs and readiness.** `docs/TWILIO-FLOW.md`, `docs/GO-LIVE.md`, and the readiness script check the Twilio settings when `CALL_PROVIDER=twilio`.

Not changed: the Exotel provider's behaviour, call wording, consent and quiet-hours rules, escalation, the reply structuring prompt, and `firestore.rules`.

**Prerequisite:** the `go-live-calls` change must be archived first. It introduces the call-activation capability and rewrites the dispatcher requirement that this change extends; the deltas here are written against that text.

## Capabilities

### Modified Capabilities
- `call-activation`: calling is on for Twilio too, with exactly one real provider.
- `call-flow`: provider boundary and selection; new requirements for the Twilio call contract, voice endpoint, request signature, status mapping and recordings.

## Spec changes

| Requirement | Old behaviour | New behaviour | Spec file |
| --- | --- | --- | --- |
| Calling is on only when it is configured | Exotel or the test provider | Also Twilio with a complete Twilio configuration; one real provider at a time | `call-activation` |
| Dispatcher eligibility and provider boundary | Exotel or the test provider | Exotel or Twilio, chosen by `CALL_PROVIDER` | `call-flow` |
| Exotel outbound call contract | A scenario says any other `CALL_PROVIDER` value uses the logging provider | That scenario is corrected: only `log` uses it, and `twilio` uses Twilio | `call-flow` |
| Twilio outbound call contract (new) | None | The Calls API request and the returned call id | `call-flow` |
| Twilio voice endpoint (new) | None | TwiML per step with the same templates, audio and consent rules | `call-flow` |
| Twilio request authenticity (new) | None | Signature validated before any read or write | `call-flow` |
| Twilio status mapping (new) | None | Twilio call statuses mapped idempotently to the existing session statuses | `call-flow` |
| Twilio recordings (new) | None | Basic auth for Twilio's host only, deleted at Twilio after processing | `call-flow` |

`firestore.rules` does not change: no new collection or field is written by a client.

**New secrets and settings (for the user):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (Firebase secrets) and `TWILIO_PUBLIC_BASE_URL` (a plain setting). No new native or app dependency.

## Out of scope

SMS, WhatsApp, inbound calls, buying numbers automatically, caller-id registration for India, Twilio Studio flows, a provider per parent, changing the Exotel provider, and iOS.

## Impact

Server only: `functions/src` (call provider, a new `twilio` folder, the voice reply download, scheduled-function secrets), docs and the readiness script. The app does not change.
