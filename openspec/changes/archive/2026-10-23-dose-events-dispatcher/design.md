# Design

## Module layout

```
functions/src/schedule/
  time.ts          # timezone wall-clock <-> epoch ms, local YYYYMMDDHHmm keys
  quietHours.ts    # parse HH:mm, containment (wrap-aware), first allowed instant
  stateMachine.ts  # pure DoseEventState + applyTransition
  generate.ts      # planDoseEvents (pure) + generateDoseEventsHandler (Firestore)
  dispatch.ts      # planCallGroups (pure) + dispatchDueCallsHandler (Firestore) + claim
functions/src/callProvider.ts   # CallProvider interface + LoggingCallProvider
```

Everything that decides "what should happen" is a pure function over plain data with `now` injected.
The handlers only read Firestore, call the pure functions, and write the resulting patches.

## State machine

`DoseEventState` is the persisted dose-event shape plus the two new server fields. Time values are
epoch ms; `Timestamptz` conversion happens at the handler boundary. `applyTransition` returns
`{ state, effect }` or `null` for an invalid transition, so callers can treat `null` as "no change".

Transition table (source: dose-event-lifecycle + grouped-calls):

| From                                   | Transition        | To                     | Effects |
| -------------------------------------- | ----------------- | ---------------------- | ------- |
| pending                                | call_started      | calling                | attempts+1, lastCallAt=at |
| calling                                | answered_yes      | taken                  | resolvedAt, resolvedBy dtmf/voice, groupConfirmed=grouped |
| calling                                | answered_not_yet  | not_taken              | groupConfirmed=grouped, schedule one reminder at at+retryGapMinutes |
| calling                                | no_answer         | pending or missed      | missed when attempts >= 1+retryCount (missedAt, alert effect) |
| calling                                | unclear           | unclear                | retry at the next dispatcher run (reminderAt=at) |
| not_taken / unclear                    | reminder_due      | pending or missed      | due at reminderAt; missed when attempts exhausted |
| pending/no_answer/unclear/not_taken    | missed_check      | missed                 | due at scheduledFor+missedAfterMinutes; missedAt, alert effect |
| pending/calling/not_taken/no_answer/unclear | family_confirm | taken                 | resolvedBy family, resolvedAt, resolvedByUid, groupConfirmed=false |
| missed                                 | family_override   | taken                  | resolvedAt/resolvedByUid set; missedAt, attempts, alertSent, lastCallSid untouched |
| taken, or missed without override      | anything else     | -                      | null (invalid) |

The one-extra-reminder rule: `reminderAt` is written once when a `not_taken` reminder is scheduled
and kept afterwards; a later `not_taken` on the same event cannot schedule a second one.

Grouped calls reuse the same per-event transitions: the caller applies the same transition to every
member of the claim group (answers are all-or-nothing, sharing attempts/lastCallSid).

## Quiet hours

`isQuietNow(now, timeZone, quietHours)` converts the instant to local minutes with
`Intl.DateTimeFormat` (hourCycle h23) and checks a wrap-aware interval. The dispatcher does not
mutate events when quiet: due events simply wait, and the next minute's run is the "first allowed
minute". `firstAllowedAt` is provided for the notification copy/tests. Missed-dose alerts are out of
scope for this stage and are always allowed when Stage 9 adds them.

## Generation

`planDoseEvents(medicines, windowStart, windowEnd, timeZone)` iterates the local calendar dates that
overlap `[windowStart, windowEnd)`, keeps times whose instant falls in the window and whose date is
within `startDate..endDate`, and returns deterministic ids `${medicineId}_${yyyyMMddHHmm}` built from
the parent's local wall clock. The handler creates each event with `DocumentReference.create`, so an
existing id raises `ALREADY_EXISTS` (gRPC 6) which is ignored: overlapping daily runs and manual
reruns are idempotent without overwriting a live event's status.

Payloads set every field the data model requires, with `status: "pending"`, zero attempts, null
resolution fields, `alertSent: false`, `groupConfirmed: false`, `confirmationNote: null`, and the two
new server fields null.

## Dispatch

1. Query `collectionGroup("doseEvents")` where `status == "pending"` and `scheduledFor <= now`
   (the collection-group composite index already exists), limited to 200 per run.
2. Load the involved parent docs and their medicines (one query per parent).
3. `planCallGroups` filters eligibility: parent active, consent granted, attempts below
   `1 + retryCount`, at least 10 minutes since `lastCallAt`, medicine active + confirmed + still
   listing the event's local `HH:mm`, and not inside quiet hours for the parent. Survivors group by
   `(parentId, scheduledFor)`.
4. For each group, one transaction re-reads every member, re-checks `pending`, applies
   `call_started` to each and writes them together. Any failure means the whole group is skipped,
   never partially claimed.
5. The provider is called once per group with ids only (no transcripts). On success the shared
   `lastCallSid` is written back to every member; on failure a transaction returns the members to
   `pending` (attempts stay incremented, so a broken provider cannot loop forever).

No `callSessions` document is written in this stage: the fake provider has no real call lifecycle;
Stage 5 creates session rows when Exotel calls actually start.

## Failure and logging rules

Every log line carries ids, statuses and error codes only - never phone numbers, names or
transcripts (hard rule 6). Provider failures increment attempts and keep the event pending for the
next eligible minute (bounded by `1 + retryCount`), matching the spec's outage edge case until the
missed-dose checker (Stage 9) takes over.

## Testing

Pure unit tests (no emulator, `npm test`):
- `time.test.ts`: wall-clock conversion in IST and a DST timezone, local key format.
- `quietHours.test.ts`: parsing, wrap-around windows, boundary minutes, first allowed instant.
- `stateMachine.test.ts`: every table row, invalid transitions, terminal guards, one-reminder rule,
  family transitions (missedAt preserved, no alert), effect payloads.
- `generate.test.ts`: horizon inclusivity, start/end dates, inactive/unconfirmed filtering,
  deterministic ids, duplicate-free overlapping windows.
- `dispatch.test.ts`: eligibility matrix (consent, active, attempts, spacing, quiet hours), medicine
  re-check (deactivated, time removed), grouping (single vs multi, different parents/times).

Emulator tests (`npm run test:fns`):
- generation handler creates the expected deterministic events, never overwrites an existing event,
  and a second run adds nothing;
- dispatch handler claims a group in one transaction, calls the fake provider once per group, writes
  shared lastCallSid, skips revoked/inactive parents, skips deactivated medicines, and a provider
  error returns the group to pending.
