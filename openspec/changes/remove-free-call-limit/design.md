# Design

## Context

See proposal.md. Observed: `PLAN_LIMITS.free.callTimesPerDay` is 2 and `planSkippedEvents` flags events past the first two distinct dose times of the local day with `callSkipped: "plan"`; `callGate` already skips the check when the limit is infinite (the paid plan). The missed-dose checker leaves `callSkipped: "plan"` events alone, and the dispatcher recomputes the gate each run. The paused-parent rule (parents above the Free parent limit, oldest kept) uses the same flag.

## Decisions

1. **Make the Free call limit unlimited rather than delete the machinery.** Set `PLAN_LIMITS.free.callTimesPerDay` to `Number.POSITIVE_INFINITY`. The gate already treats that as "no limit", the paused-parent rule keeps working, and the change is one value plus tests. `allowedCallTimes` stays as a tested pure function so a limit can be reintroduced deliberately.
2. **Clear stale flags.** An event flagged `callSkipped: "plan"` under the old rule that is still pending becomes callable once the limit is gone. When the dispatcher plans a call for an event that carries the flag, it removes the flag in the same claim, so the missed-dose checker treats a dose that is now called like any other.
3. **No backfill of past days.** Events already skipped and past stay as they are.
4. **Wording.** The catalogue lines that promise or compare call times are rewritten as plain statements: every dose time is called on every plan; Ormma Family adds more parents and more members. The "no check-in call on the current plan" note stays for a paused parent only.

## Risks / Trade-offs

- **Cost per call** for Free families (see proposal).
- **A flag race** between the dispatcher and the checker is avoided because the flag is cleared in the claim transaction.

## Migration Plan

Deploy functions, then the app. Nothing to migrate; stale flags clear themselves when the dose is next planned.

## Open Questions

- Whether the paid plan should offer something else instead (for example more parents) to stay worth buying.
