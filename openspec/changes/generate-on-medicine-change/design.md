# Design

## Context

See proposal.md. Observed: `generateDoseEventsHandler` reads active parents and their active medicines, plans events with the pure `planDoseEvents(medicines, windowStart, windowEnd, timeZone)` (window = now to now + 24 h) and writes each with `create`, ignoring "already exists". It does not look at consent: the dispatcher decides at call time whether a parent may be called. It is gated by `callActivation()`. The app writes medicines directly to Firestore, so there is no callable to hook.

## Goals / Non-Goals

**Goals:** a medicine saved now has its events within seconds; no duplicates; no new rules about deleting events.

**Non-Goals:** changing the horizon, dispatch or retries; changing the app.

## Decisions

1. **Reuse, do not copy.** Extract the per-parent part of the daily run (read medicines, plan, create-if-absent, count) into a function that takes a list of medicines, so the daily run calls it for all of a parent's medicines and the trigger calls it for one. The daily run's behaviour and tests stay unchanged.
2. **Which writes matter.** The trigger compares the medicine before and after and acts only when it is created or when `times`, `startDate`, `endDate`, `active` or `confirmedByHuman` changed. Editing a name, dose or a display note does nothing. A deleted medicine does nothing.
3. **Eligibility is checked again at trigger time**, from the document as it is now: the medicine active and human-confirmed, the parent present and `active`, calling on. A medicine that is not eligible creates nothing.
4. **No cancellation of events.** Removing a time or deactivating a medicine leaves its pending events. The dispatcher already skips an event whose medicine no longer lists that local time or is inactive (call-flow, "Medicine edited or deactivated"). The task list checks that the missed-dose checker does not raise an alert for such a skipped event; if it would, the fix belongs in the checker, not in deleting events here.
5. **Consent.** The daily run creates events for parents without consent and the dispatcher refuses to call them, so the trigger does the same and a later consent grant needs no extra trigger. A dose whose time has already passed when consent is granted is simply not called, as today.
6. **Cutoff.** `CALLS_LIVE_FROM` is applied by the dispatcher and the missed-dose checker, not at generation; the trigger does not change that.
7. **Failure.** The trigger does not retry on its own. If it fails, the daily 00:30 run creates the events. It logs ids, counts and a code only.
8. **Secrets.** `callActivation()` reads the provider settings, so the trigger declares the same call secrets as the other functions that use it.
9. **Near times.** A dose a few minutes away is created. The dispatcher claims events at the minute they are due, so a dose set one or two minutes ahead may run only after the next dispatcher minute; recorded as an open question.

## Risks / Trade-offs

- **A trigger and the daily run racing.** Both use `create`, which fails harmlessly when the id exists; covered by a test.
- **A burst of edits.** Each edit that changes the schedule runs the trigger; each run is a few reads and a few creates.
- **Events for times later removed.** They sit pending until the dispatcher skips them; checked in task 3.1.

## Migration Plan

Deploy the function. Nothing to backfill: medicines saved before the deploy keep today's behaviour until the next daily run.

## Open Questions

- Should removing a time cancel the pending event instead of leaving it for the dispatcher to skip? (Default here: leave it.)
- Whether a dose less than one dispatcher minute away should be created at all (default: yes).
- Whether a parent-level trigger is ever needed (consent, time zone, language); default: no.
