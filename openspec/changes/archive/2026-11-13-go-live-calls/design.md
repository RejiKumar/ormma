# Design

## Context

See proposal.md for motivation. Today `createCallProvider` returns the log-only provider unless `CALL_PROVIDER=exotel`, `generateDoseEvents` always runs, `missedDoseChecker` treats `pending` as missable (`MISSED_STATUSES` includes it), and the app has no way to know whether calls happen. `stt.ts` and `processReply.ts` are complete modules with no caller. Hard rules apply: secrets only in Secret Manager, no health data in logs, schema-validated AI output, idempotent call-flow code, `firestore.rules` changes need emulator tests.

## Goals / Non-Goals

**Goals:** a single definition of "calling is on"; a safe, silent off state; a spoken-reply path that is idempotent and fails to the keypad; no change to rules.

**Non-Goals:** building the Exotel flow, changing the keypad mapping, changing alert wording, adding any AI-generated speech (scripts stay fixed templates).

## Decisions

1. **One function, `callsEnabled(env)`.** True only when `CALL_PROVIDER=exotel` and `exotelConfigFromEnv` does not throw. Every gate (generate, dispatch, checker, digest, status callable) calls it. *Alternative:* separate flags per component, rejected because they drift and can leave the checker on while dispatch is off.
2. **Off is a pause, not an error.** `createCallProvider` returns Exotel, the log provider (only for `CALL_PROVIDER=log`), or `null` (off). Callers treat `null` as "do nothing" and log one line with a status code, never a failure. *Alternative:* fail the deploy when misconfigured, rejected because the user wants the app live on Play before Exotel is.
3. **Status through a callable, not a Firestore document.** `getCallStatus` returns `{ callsEnabled }` to any signed-in user and nothing else. *Alternative:* a `config/calls` document, rejected because it would need rules, rules tests and an access-control spec change for one boolean. The cost is one callable round trip, cached for the session.
4. **Go-live cutoff as an optional env `CALLS_LIVE_FROM` (ISO instant).** Events with `scheduledFor` before it are ignored by dispatch and the checker. *Alternative:* rely only on a cleanup script, kept as well (dry-run by default) but not trusted alone, because a forgotten cleanup would alert at go-live.
5. **Spoken reply endpoint `voiceReply`.** Exotel's Record step posts `CallSid`, `RecordingUrl` and the `CustomField` set at call start, with the shared token. The function downloads the recording into memory, calls the STT client, then `processReply`. It answers **200** when the reply was usable and applied (or already applied) and **422** when not usable, so the Exotel flow can branch to the keypad prompt. Idempotency: a transactional marker on `callSessions/{sid}` (`replyAppliedAt`) written in the same transaction as the dose transitions; a duplicate callback finds it and answers 200 without writing.
6. **Recording format.** The current STT client assumes MP3 at 8 kHz. The endpoint detects WAV from the response content type or file extension and sends `LINEAR16` with the header's sample rate; anything else is treated as not usable. Unit tests use fixtures for both.
7. **Time budget.** Download plus STT plus structuring run synchronously inside the callback with an 8 s total budget; on timeout the endpoint answers 422 (keypad), never 200.
8. **App note.** `useCallStatus()` calls the callable once per app start; it renders the note only on an explicit `false`. Unknown (error, offline) shows nothing, so the app never shows a claim it cannot support.

## Risks / Trade-offs

- **Exotel capabilities are unverified** until the account is recharged: whether the flow can branch on a 200 versus 422 response, and the recording format. Mitigation: `docs/EXOTEL-FLOW.md` states the assumption, and the first test call to the owner's phone is a go-live gate. If branching is not possible, the flow plays the keypad prompt after every recording and the endpoint still applies a usable voice reply first.
- **Synchronous latency** could make the caller wait. Mitigation: the 8 s budget and the keypad fallback.
- **STT accuracy for Malayalam and Tamil** uses the short-utterance model; low confidence falls back to the keypad, never guessed.
- **Pause is silent for the owner.** Mitigation: the Today note, and `docs/GO-LIVE.md` says to switch calls on before onboarding families.

## Migration Plan

Deploy functions with calling off (the default). Upload the app to Play. When Exotel is ready: set the secrets, set `CALL_PROVIDER=exotel` and `CALLS_LIVE_FROM`, redeploy, run the clear-pre-live-events script (dry run first), place one test call, then remove the Firebase Auth test phone numbers and the debug SHA fingerprints.

## Open Questions

- Can the Exotel flow branch on the 200 versus 422 response? (Verified at the test call; the design degrades safely if not.)
- Which recording format does the account deliver, WAV or MP3? (Both are handled.)
