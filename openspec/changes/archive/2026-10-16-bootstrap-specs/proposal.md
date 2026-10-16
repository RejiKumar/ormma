# Proposal

## Why

The six numbered files in `specs/` are the source of truth, but OpenSpec, `CLAUDE.md` and
`openspec/config.yaml` expect them under `openspec/specs/`. Until they move, no later stage can
write delta specs against them, and `openspec list --specs` is empty. The specs are final, so this
change moves them without changing their meaning.

## What Changes

- Add 14 capability specs under `openspec/specs/` (created at archive from the delta specs in this change), migrated verbatim from `specs/01` to `specs/06`.
- Allowed edits are only: (a) a lead-in sentence that introduces the original text and carries SHALL, SHALL NOT or MUST without softening, strengthening or adding any rule ("Never" items become SHALL NOT with the original items untouched); (b) cross-references such as "spec 02 test 11" rewritten to capability names; (c) mechanical OpenSpec structure (Purpose, requirement and scenario headings).
- Field names, enums, numbers, alert and call-script template strings are copied byte for byte.
- Numbered tests stay numbered, as one requirement per capability, each test a scenario. Rules tests 1 to 14, grouped-call tests 1 to 6 and family-override tests 1 to 4 keep their own numbering.
- Write the ledger `docs/spec-migration-map.md`: every atomic unit of the old specs (bullet, table row, script step, numbered test) with its new location.
- Verify the move with asserted counts, a token check, an independent fresh-eyes comparison and `openspec validate`.
- `specs/` is left untouched in this change. Its removal, the tag `specs-v1-pre-openspec` and the pointer updates (`CLAUDE.md`, `PROMPTS.md`, `openspec/config.yaml`) are a separate, later commit that needs approval.

Spec changes: none to behaviour. Every requirement below is an ADDED copy of an existing one; no requirement is changed, dropped or merged.

| Old file | New capabilities (spec files affected) | Behaviour change |
|---|---|---|
| specs/01-data-model.md | `data-model` | none |
| specs/02-security-rules.md | `access-control` | none |
| specs/03-call-flow.md | `dose-event-lifecycle`, `call-flow`, `grouped-calls`, `missed-dose-alerts` | none |
| specs/04-medical-safety.md | `medical-safety`, `trend-flagging` | none |
| specs/05-consent-dpdp.md | `consent`, `data-protection` | none |
| specs/06-ai-contracts.md | `ai-contracts`, `reply-structuring`, `prescription-reading`, `weekly-summary` | none |

Duplicates that already exist in the old specs are kept in both places with a cross-reference: the consent visibility rule (02 and 05), transcript retention (01 and 05), delete-parent (01 and 05).

## Known discrepancies, not fixed here

The specs still disagree with these PROPOSED items in `docs/DECISIONS.md`. They are migrated as written and stay in DECISIONS for their stage.

- **#1** (S12): a "consent" call type allowed while consent is "pending". `call-flow` still says never call a parent whose consent.status is not "granted".
- **#3** (S1/S10): says spec 01 was updated to the spec 06 prescription schema, but `data-model` still has `extracted: { medicines: [{ name, doseText, times[], confidence }], doctor, date }`, while `prescription-reading` has frequencyText, illegible and overallConfidence.
- **#4** (S7): transcripts are stored only when needsReview, under `transcripts/review/`, deleted on review resolution or after 30 days. The `data-model` retention bullet ("unless needsReview is true") and the `data-protection` bullet are worded differently and neither mentions the path.
- **#5** (S1/S2): parent creation is callable-only. `access-control` still says "Create by any signed-in user (creator becomes owner via a Cloud Function, not the client)".
- **#6** (S1): `members/{uid}` carries `displayName`. It is not in `data-model`.
- **#14** (S1): "review screen path" is dropped from the spec. `access-control` still contains it in the medicines rule.

## Capabilities

### New Capabilities
- `data-model`: Firestore collections, fields, indexes and retention (spec 01).
- `access-control`: roles, per-path Firestore and Storage rules, consent visibility, and the 14 rules tests (spec 02).
- `dose-event-lifecycle`: doseEvent state machine, terminal states, family override of a missed dose, override tests.
- `call-flow`: components, call script, idempotency and safety, edge cases, unit-test coverage.
- `grouped-calls`: one call for several medicines at the same time, group script, group tests.
- `missed-dose-alerts`: missed-dose alert trigger, templates and group variants.
- `medical-safety`: what the app never and always does, review before launch.
- `trend-flagging`: deterministic 7-day trend comparison.
- `consent`: consent granting, revocation, re-grant, visibility rule, one-cycle limitation.
- `data-protection`: data minimisation, rights, transparency, breach readiness.
- `ai-contracts`: rules common to all AI calls, cost controls, evaluation test set.
- `reply-structuring`: Haiku transcript structuring contract.
- `prescription-reading`: Sonnet prescription photo contract.
- `weekly-summary`: Haiku weekly summary contract.

### Modified Capabilities
None. `openspec/specs/` is empty.

## Impact

- New: `openspec/specs/*` (at archive) and `docs/spec-migration-map.md`.
- Unchanged in this change: `specs/`, `CLAUDE.md`, `PROMPTS.md`, `openspec/config.yaml`, `docs/DECISIONS.md`, all code.
- No dependency, rules or runtime change.

## Out of scope

- Fixing any discrepancy above or any wording in the specs.
- Deleting `specs/`, tagging, and updating pointers (separate approved commit).
- Archiving or committing this change before approval.
- Stage 1 work.
