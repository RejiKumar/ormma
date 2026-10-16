# Design

## Context

See proposal.md for the item-by-item table. The change edits specs and the decision log only. The user's run instruction is to adopt the recommended default for each PROPOSED decision, treat the emergency prompt as SHALL, "Review before launch" as a launch gate, and call policy values as per-parent defaults.

## Goals / Non-Goals

**Goals:** make the specs agree with the decisions before any code depends on them; keep every other requirement and scenario byte-identical.

**Non-Goals:** implementing anything; adopting the stage-bound proposals #9 to #13 and #15 to #17; choosing the real bundle id.

## Decisions

- **MODIFIED blocks are full copies of the main spec block** (OpenSpec replaces the whole block and refuses to drop scenarios). Existing scenario names are kept; where a scenario's content had to change it is reworded under the same name, and new scenarios are added beside it.
- **#1 consent call keeps `active` required.** The decision relaxes only the consent.status condition; a parent with `active: false` is still never called. This is the conservative reading of "all other calls still require granted".
- **#3 schema field order** follows the `prescription-reading` output schema (doctor, date, medicines, overallConfidence) so the stored shape is the model output after validation. Nothing is filled in beyond what the schema allows to be null.
- **#4 two specs say the same thing.** `data-model` Retention and `data-protection` Transcript storage are both modified so they cannot disagree; the Storage rule that `/transcripts/*` has no client access is unchanged and covers `transcripts/review/`.
- **#5 and #14 each get a rules test** (Rules test 15 and 16) so the emulator suite proves the new behaviour. Tests 1 to 14 are untouched.
- **#14 wording says what rules cannot enforce.** "Whether the field was set through a review screen is not enforced in rules" is stated rather than silently dropped; the "never schedule an AI-extracted medicine without a human confirming it on screen" rule in `medical-safety` is unchanged and is enforced in the app and functions.
- **#30 launch gate is recorded in `docs/DECISIONS.md`** with reviewer role and date, so the gate is checkable from the repo without inventing a new file.
- **#30 call policy defaults are changed by an owner**, which follows the existing "Update by owner only" parents rule; no new permission is created.

## Risks / Trade-offs

- [A SHALL emergency prompt could be read as adding a new UI duty] -> it only upgrades "should" to the SHALL that the decision asks for; the wording is otherwise unchanged.
- [Rules cannot enforce the review screen] -> documented in the requirement; the human-confirmation safety rule remains in `medical-safety`.
- [The launch gate has no automation] -> it is a documented gate checked at Stage 13; code cannot enforce a human review.
