# Proposal

## Why

Requested by the user on 2026-11-16 (not in the BRD). A real test showed five medicines on one parent, but only the two earliest dose times (19:40 and 20:18) were called and notified. The other three (21:00, 21:10, 21:20) were deliberately skipped by the Free plan rule "check-in calls for the first 2 dose times of each day". The user's decision: every record must behave the same, so a call and a push must work for every dose time on every plan.

## What changes

- **No daily call limit on any plan.** Every eligible dose time is called, and a call that is placed and not answered raises the missed-dose alert and push, as it already does.
- **The other Free limits stay**: 1 parent per owner and 2 members per parent. Ormma Family keeps 3 parents and 6 members per parent. Nothing about prices or the subscription flow changes.
- **Server.** The Free plan's `callTimesPerDay` becomes unlimited, so `planSkippedEvents` flags nothing for the call-time rule. Parents above the Free parent limit are still paused. An event that was flagged `callSkipped: "plan"` earlier for the call-time rule, and is still pending, gets its flag cleared when it becomes callable, so the missed-dose checker does not keep ignoring a dose that is now called.
- **App wording.** Every place that says Free has 2 call times a day is updated: the Plans comparison row, the intro and plan lines, the upgrade sheet's benefit line, and the "no check-in call on the current plan" notes, which now apply only to a parent above the Free parent limit.
- **Docs.** The decision and the go-live notes.

No change to `firestore.rules`, to safety features (they were never gated), or to the Exotel and Twilio providers.

## Capabilities

### Modified Capabilities
- `subscription`: what the plans include.
- `call-flow`: the Free-tier daily call limit requirement is removed; the paused-parent rule stays.
- `missed-dose-alerts`: the "Alerts are not gated by plan" requirement keeps its meaning, but "skipped by plan" now means only a parent above the Free parent limit.

## Spec changes

| Requirement | Old behaviour | New behaviour | Spec file |
| --- | --- | --- | --- |
| Plans and limits | Free: calls for the first 2 dose times each day | Free: calls for every dose time; the 1 parent and 2 member limits stay | `subscription` |
| Free-tier daily call limit | Free parents are called for 2 dose times a day; later ones are flagged `callSkipped: "plan"` | Replaced by a requirement that only a parent above the Free parent limit is paused; no call-time limit | `call-flow` |
| Alerts are not gated by plan | A dose flagged `callSkipped: "plan"` is never missed | Same, and the flag now only marks a paused parent; a flag left from the old rule is cleared when the dose becomes callable | `missed-dose-alerts` |

`firestore.rules` does not change. This change must also update the pending `subscription-polish` comparison wording, done in its delta.

## Open product questions

- **Pricing.** With calls unlimited on Free, Ormma Family now differs only by more parents and more members per parent. Whether that is enough to justify the plan is a business decision, recorded here.
- **Cost.** Each call costs money on the telephony provider; unlimited free calls raise the cost of a Free family. Worth checking before launch.

## Out of scope

Changing the parent or member limits, prices, the trial, or the paused-parent behaviour.

## Impact

Server: `functions/src/subscription/plan.ts` and `callGate.ts`, a small flag cleanup in the dispatcher, tests. App: catalogue text, the Plans comparison, the dose card note. Docs.
