# Tasks

## 1. Calling on or off

- [ ] 1.1 Add `callsEnabled(env)` and change `createCallProvider` to return Exotel, the log provider only for `CALL_PROVIDER=log`, or `null`. Verify: unit tests for unset, `exotel` complete, `exotel` incomplete (names only logged), and `log`.
- [ ] 1.2 Make the dispatcher claim nothing and write nothing while off, and ignore events before `CALLS_LIVE_FROM`. Verify: emulator tests for off, on, and cutoff.
- [ ] 1.3 Make `generateDoseEvents` create nothing while off. Verify: emulator test that no event is created.
- [ ] 1.4 Make `missedDoseChecker` and the evening digest do nothing while off and honour the cutoff. Verify: emulator tests that no alert, status change or digest results; the existing alert-once tests still pass.
- [ ] 1.5 Add the `getCallStatus` callable returning only `{ callsEnabled }`, signed-in only. Verify: tests for signed in, signed out and the response shape.

## 2. The app note

- [ ] 2.1 Add `useCallStatus()` and show the note on Today only on an explicit `false`, with the catalogue text. Verify: tests for off, on, error and offline, and that the wording and colour rules tests pass.

## 3. Spoken reply

- [ ] 3.1 Teach the STT client WAV (LINEAR16 with the header's rate) alongside MP3. Verify: unit tests with mocked Google for both and for an unknown format.
- [ ] 3.2 Add the `voiceReply` endpoint: token check, download in memory, STT, `processReply`, 8 s budget, 200 or 422. Verify: tests with mocked Exotel download, Google and Claude clients for each scenario in the spec.
- [ ] 3.3 Apply the result through the existing transition function once per CallSid with a transactional marker on the call session. Verify: emulator test for duplicate delivery and for a not-usable reply.
- [ ] 3.4 Export the endpoint in `index.ts` with its secrets, and write `docs/EXOTEL-FLOW.md` (Record step, callback URL, 200 versus 422 branch, keypad fallback). Verify: build passes and the doc matches the endpoint.

## 4. Go-live

- [ ] 4.1 Add a script that lists and, only with `--apply`, deletes dose events scheduled before a given instant. Verify: tests for dry run and apply.
- [ ] 4.2 Write `docs/GO-LIVE.md` with the exact order and update `docs/RELEASE.md` section 3 for `CALL_PROVIDER=log` and `CALLS_LIVE_FROM`. Verify: read-through against the secrets list.
- [ ] 4.3 Record the decisions in `docs/DECISIONS.md`. Verify: entries exist.

## 5. Verification

- [ ] 5.1 Run the app and function unit tests, the emulator function tests, typecheck and lint, and `openspec validate go-live-calls`. Verify: all pass.
