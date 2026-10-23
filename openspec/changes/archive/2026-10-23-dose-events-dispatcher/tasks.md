# Tasks

Constraints: no change to `firestore.rules` or `firestore.indexes.json`; region asia-south1 only;
no health data, phone numbers or names in logs; the default call provider must not dial anything;
all time math goes through the parent's timezone; handlers take `now`/provider as injectable
dependencies so tests never depend on wall-clock timing.

## 0. Change artifacts

- [x] 0.1 Proposal, design, four delta specs and tasks validated (`openspec validate dose-events-dispatcher --strict`, `openspec validate --specs`).

## 1. Pure time + quiet hours

- [x] 1.1 `functions/src/schedule/time.ts`: `zonedTimeToMs(dateKey, time, timeZone)`, `localDateKey(ms, timeZone)`, `localClock(ms, timeZone)` ("HH:mm") using `Intl.DateTimeFormat` with parts, falling back to Asia/Kolkata on invalid zones. Verify: unit tests for IST conversion (UTC 18:30 rollover), a DST timezone (America/New_York spring/fall), and invalid-zone fallback.
- [x] 1.2 `functions/src/schedule/quietHours.ts`: `parseClock`, `isQuietAt(minuteOfDay, quiet)`, `isQuietNow(ms, timeZone, quiet)`, `firstAllowedAt(ms, timeZone, quiet)`. Verify: unit tests for a normal window, a wrap-around window, boundary minutes (start inclusive, end exclusive), and the first allowed instant in IST.

## 2. Pure state machine

- [x] 2.1 `functions/src/schedule/stateMachine.ts`: `DoseEventState`, transition union, `applyTransition` implementing the design table, effects (`reminderAt`, `missed`, `alert`), terminal guards, one-extra-reminder rule, family confirm/override. Add `lastCallAt`/`reminderAt` to `shared/types.ts` `DoseEventDoc`. Verify: unit tests for every row, every invalid transition, and each guard.

## 3. Generation

- [x] 3.1 `functions/src/schedule/generate.ts`: pure `planDoseEvents` (24-hour window, start/end dates, deterministic ids) and `generateDoseEventsHandler({ nowMs })` that loads active parents and their medicines, filters in code (no new index), creates via `DocumentReference.create`, ignores ALREADY_EXISTS (code 6), logs counts only. Verify: unit tests for the planner; emulator test for create/ignore-duplicate/no-overwrite.
- [x] 3.2 Export `generateDoseEvents` scheduler (`30 0 * * *`, Asia/Kolkata) from `functions/src/index.ts`.

## 4. Dispatcher

- [x] 4.1 `functions/src/callProvider.ts`: `CallProvider`, `CallRequest`/`CallHandle`, `LoggingCallProvider` (ids/statuses only, fake sid). Verify: unit test asserts no phone/name in the provider payload allowed for logging and that the fake returns a stable-shaped sid.
- [x] 4.2 `functions/src/schedule/dispatch.ts`: pure `planCallGroups` (parent active + consent, attempts, 10-minute spacing, quiet hours, medicine re-check, grouping by parent+scheduledFor) and `dispatchDueCallsHandler(provider, { nowMs })` with collection-group query, per-group transaction claim (`pending -> calling`, attempts+1, `lastCallAt`), provider call, shared `lastCallSid` write-back, transactional revert to pending on provider error. Verify: unit tests for the eligibility matrix and grouping; emulator tests for single/grouped claim, revoked/inactive skip, deactivated-medicine skip, provider error revert, and no duplicate claim across two consecutive runs.
- [x] 4.3 Export `dispatchDueCalls` scheduler (every minute, Asia/Kolkata) with the logging provider from `functions/src/index.ts`. Verify: `functions/src/index.test.ts` still loads the entry point.

## 5. Verification and docs

- [x] 5.1 `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:fns`, `npm run test:rules` all pass; `openspec validate dose-events-dispatcher --strict` and `openspec validate --specs` pass.
- [x] 5.2 Record decisions in `docs/DECISIONS.md`: provider boundary/no real calls in Stage 4, server-only `lastCallAt`/`reminderAt`, 10-minute spacing constant, generation window and `create`-based idempotency, quiet-hours deferral semantics.
- [x] 5.3 Archive the change and commit (`Stage 4: dose generation and dispatcher`).
