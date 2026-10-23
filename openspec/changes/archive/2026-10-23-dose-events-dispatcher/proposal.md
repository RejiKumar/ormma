# Dose event generation and dispatcher

## Why

The app can now store medicines and show a dashboard, but nothing generates the daily dose events
or starts calls for them. Stage 4 adds the two scheduled Cloud Functions from the call-flow spec -
`generateDoseEvents` (daily, 00:30 IST) and `dispatchDueCalls` (every minute) - and the pure logic
underneath them, so the whole scheduling path is unit-testable without Firebase. Real telephony
comes in Stage 5; this stage must never place a real call.

## What changes

- New pure modules in `functions/src/schedule/`:
  - `time.ts` (timezone wall-clock math for schedule windows and event ids),
  - `quietHours.ts` (quiet-hours containment and first-allowed-minute math),
  - `stateMachine.ts` (one pure transition function for the dose-event table, including the
    family transitions and time-based missed marking, returning the next state plus effects),
  - `generate.ts` (pure `planDoseEvents` plus the Firestore handler),
  - `dispatch.ts` (pure `planCallGroups` plus the transactional claim handler).
- `generateDoseEvents`: reads active parents and their active, human-confirmed medicines, plans the
  next 24 hours in each parent's timezone, and creates deterministic events
  (`{medicineId}_{yyyyMMddHHmm}`), ignoring already-existing ids so reruns never duplicate.
- `dispatchDueCalls`: queries pending due events (collection-group index already exists), filters by
  parent active + consent granted, quiet hours, attempt limits (1 + retryCount) and a 10-minute
  spacing between attempts, re-checks each medicine (active, confirmed, time still on the medicine),
  forms groups by `(parentId, scheduledFor)`, claims each group in one all-or-nothing transaction
  (`pending -> calling`, attempts+1), then hands the group to a `CallProvider`.
- `CallProvider` interface with a `LoggingCallProvider` default: it logs ids/statuses only and
  returns a fake callSid. No network, no Exotel yet (Stage 5 swaps the implementation).
- Server-only attempt metadata `lastCallAt` and `reminderAt` on dose events (needed for the spacing
  rule and the one-extra-reminder rule) added to the data model.
- Scheduler exports in `functions/src/index.ts`; no Firestore rules or indexes change.

## Spec changes

- `specs/call-flow/spec.md` (ADDED):
  - **Generation horizon and eligibility** - the daily run creates events for the next 24 hours in
    the parent's timezone from active, human-confirmed medicines within their start/end dates;
    reruns and overlapping horizons create no duplicates.
  - **Dispatcher eligibility and provider boundary** - the dispatcher enforces parent active +
    consent granted, medicine re-check, attempt limits and 10-minute spacing, defers during quiet
    hours to the first allowed minute, claims transactionally, and reaches telephony only through
    a `CallProvider` whose default implementation does not dial.
- `specs/dose-event-lifecycle/spec.md` (ADDED):
  - **Pure transition function** - all transitions in the state machine (call path, family
    confirm/override, time-based missed marking with the one-extra-reminder rule) are applied by a
    single pure function that rejects invalid transitions and never moves an event out of `missed`
    except for the family override.
- `specs/grouped-calls/spec.md` (ADDED):
  - **Claim-time group formation** - eligibility filtering (including the medicine re-check)
    happens before grouping; survivors with the same `(parentId, scheduledFor)` are claimed in one
    transaction, and a single survivor uses the one-medicine flow.
- `specs/data-model/spec.md` (ADDED):
  - **Server call metadata fields** - `lastCallAt` and `reminderAt` timestamps on dose events,
    server-written only.

## Impact

- New functions deploy automatically with the functions codebase (schedules: `30 0 * * *` IST and
  every minute). The default provider is log-only, so no calls or costs until Stage 5.
- New unit tests (pure) and emulator tests for the two handlers. Existing rules tests and mobile
  tests are untouched.
- DECISIONS entries for the provider boundary, the server-only metadata and the generation window.
