# Proposal

## Why

The bootstrap copied the old specs verbatim, so five specs still disagree with PROPOSED decisions #1, #3, #4, #5, #6 and #14, and three items were left open in #30 (emergency prompt wording, the launch review, the call policy values). Stages 1 to 4 build code against these specs, so the disagreements must be settled first. The user's instruction for this run is to adopt the recommended default of each.

## What Changes

Each item adopts the default recorded in `docs/DECISIONS.md` (reasoning is recorded there too) and is applied as MODIFIED requirements, or one ADDED requirement for #1. No requirement outside the table below changes.

Spec changes:

| # | Requirement (spec file) | Old behaviour | New behaviour |
|---|---|---|---|
| 1 | "Consent and active gate" (call-flow) | Never call a parent whose consent.status is not "granted", or whose `active` is false. | Same, except a call of type "consent" while consent.status is "pending" (the parent must still be `active`). |
| 1 | "Consent call type" (call-flow, ADDED) | none | A call of type "consent" is allowed while "pending"; it plays only the consent script and writes no health data; all other calls still require "granted". |
| 1 | "Initial consent state" (consent) | No calls or health logging until "granted". | Same, except the consent call. |
| 3 | "prescriptions document" (data-model) | `extracted: { medicines: [{ name, doseText, times[], confidence }], doctor, date }` | `extracted` uses the `prescription-reading` schema: nullable doseText, frequencyText, times, illegible per medicine, overallConfidence. |
| 4 | "Retention" (data-model) and "Transcript storage" (data-protection) | Transcripts stored in Storage with a 30-day lifecycle (unless needsReview is true / when needed for review). | Transcripts are stored only when needsReview is true, under `transcripts/review/`, deleted when the review is resolved or after 30 days, whichever comes first. |
| 5 | "parents path rule" (access-control) and new "Rules test 15" | Create by any signed-in user (creator becomes owner via a Cloud Function). | Parents are created only through a callable Cloud Function that writes the parent and its owner member in one batch; clients cannot create parents directly. |
| 6 | "members document" (data-model) | members have role, addedBy, addedAt. | Also `displayName`, copied by the function at create/invite acceptance; `users/{uid}` stays self-only. |
| 14 | "medicines path rule" (access-control) and new "Rules test 16" | Client may not set `confirmedByHuman` true on prescription_scan documents except through the review screen path. | `confirmedByHuman: true` can be written only by an owner or editor; the review screen path is not enforced in rules and is dropped. |
| 30 | "Emergency prompt in the family app" (medical-safety) | SHOULD show a prompt to call local emergency services. | SHALL show it. |
| 30 | "Review before launch" (medical-safety) | A doctor or pharmacist reads the scripts, alert templates, trend wording, disclaimer and urgent-keyword list. | Same, and it is a launch gate: no release to real users until each item is reviewed and recorded in `docs/DECISIONS.md` with the reviewer's role and the date. |
| 30 | "parents callPolicy field" (data-model) | callPolicy is { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60, quietHours: 22:00 to 06:00 }. | Those values are per-parent defaults that an owner may change for one parent. |

Also: record each adopted decision as DECIDED with its reasoning in `docs/DECISIONS.md`, and mark the superseded esbuild line.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `data-model`: parents callPolicy field, members document, prescriptions document, Retention.
- `access-control`: parents path rule, medicines path rule, Rules test suite (tests 15 and 16 added).
- `call-flow`: Consent and active gate (modified); Consent call type (added).
- `consent`: Initial consent state.
- `data-protection`: Transcript storage.
- `medical-safety`: Emergency prompt in the family app, Review before launch.

## Impact

- Specs only; no code. Stage 1 onward implements these versions.
- `docs/DECISIONS.md` updated. The other PROPOSED items (#9 to #13, #15 to #17, #27) belong to later stages or need the user, and are adopted in their stage change (#27 needs the real bundle id from the user and stays PROPOSED).

## Out of scope

- Code, rules files, functions, screens.
- #9 to #13, #15 to #17 (adopted in their stages), #27 (needs the user), #31 (Stage 6 check).
- The lawyer review in the `consent` spec (not part of #30).
