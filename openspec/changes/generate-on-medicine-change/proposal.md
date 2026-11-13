# Proposal

## Why

Requested by the user on 2026-11-13 (not in the BRD). The first real call test showed that a medicine saved during the day is not called until the next 00:30 run: "Vitamin2" saved at 20:07 with a dose at 20:18 had no dose event until the Cloud Scheduler job was forced by hand. A family cannot force a job, so today's remaining doses are silently missed for any medicine added after midnight.

## What changes

A Cloud Function trigger creates the dose events for a medicine the moment it is saved or changed, using the same planning and the same create-if-absent write as the daily run.

- **Trigger.** When a medicine under `parents/{parentId}/medicines/{medicineId}` is created, or one of the fields that decide its events changes (times, start date, end date, active, confirmed by a human), the function plans that medicine's events for the next 24 hours and creates the missing ones as `pending`.
- **Same rules as the daily run.** Only active, human-confirmed medicines inside their date range; the parent's time zone; deterministic event ids; the call-activation gate (nothing is created while calling is off); the parent must be active. A dose time already in the past today is not created, because the window starts now.
- **Safe to repeat.** An event that exists is never overwritten, so the same write twice, rapid edits, and the daily run overlapping all leave exactly one event per dose time.
- **The daily 00:30 run stays** as the safety net, for example if a trigger run fails.
- **No new deletion rules.** If a time is removed or a medicine is deactivated, existing pending events are left alone; the dispatcher already skips an event whose medicine no longer lists that time or is inactive. Events that were called, resolved or missed are never touched.

No app change, no new field, and `firestore.rules` does not change: the trigger runs with the Admin SDK.

## Capabilities

### Modified Capabilities
- `call-flow`: the generation requirement says only the daily run creates events; it now also covers the moment a medicine is saved or changed.

## Spec changes

| Requirement | Old behaviour | New behaviour | Spec file |
| --- | --- | --- | --- |
| Generation horizon and eligibility | The daily run creates the next 24 hours | The same rules also apply to a single medicine at the moment it is created or its schedule changes | `call-flow` |
| Generation when a medicine changes (new) | None | A trigger creates the missing pending events for that medicine, idempotently, behind the same gates, and leaves existing events alone | `call-flow` |

`dose-event-lifecycle` needs no change: an event created by the trigger is an ordinary pending event. `firestore.rules` does not change.

## Out of scope

Changing the 24 hour horizon, the dispatch timing or retry rules, the Exotel or Twilio providers, any app change, and backfilling past days.

## Impact

Server only: `functions/src/schedule/generate.ts` (shared planning and creation), a new trigger function in `functions/src/index.ts`, tests, docs. The call-activation gate means the trigger needs the same call secrets as the other scheduled functions.
