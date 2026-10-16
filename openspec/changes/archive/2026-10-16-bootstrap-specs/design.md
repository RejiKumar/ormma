# Design

## Context

`specs/01` to `specs/06` are final. OpenSpec main specs are created at archive from the ADDED
requirements of a change, so the 14 delta specs in this change are the migrated text. See
proposal.md for scope and the split. `specs/` stays untouched; nothing is archived or committed
until the user approves.

## Goals / Non-Goals

**Goals:** every sentence, field, enum, number, template string and numbered test of the old specs
exists exactly once in the new specs, with no rule softened, strengthened or added; a machine-checked
ledger proves it.

**Non-Goals:** fixing the discrepancies listed in the proposal, rewording for style, merging
duplicates, deleting `specs/`, editing `CLAUDE.md`, `PROMPTS.md` or `openspec/config.yaml`.

## Decisions

- **One ADDED requirement per source bullet, sentence group or table.** Keeps each requirement under
  OpenSpec's 500-character guideline and makes the ledger granular. Where one source line is itself longer than 500 characters
  (the `consent` field line in `data-model`) it stays whole and `openspec validate --strict` is expected to warn once, and the SHOULD requirement warns once too; plain
  `openspec validate` must pass.
- **Lead-ins only introduce the original text.** Schemas use "SHALL have these fields", rule lists use
  "The following SHALL hold", "Never" lists use "The system SHALL NOT:", "Always" lists use
  "The system SHALL:". The original items follow untouched. Items that carry their own modal word
  ("may", "should", "can", "optional", "skippable") keep it. The sources use "should" once, in
  `medical-safety` ("The family app should show a prompt to call local emergency services"). It is its own requirement,
  "Emergency prompt in the family app", introduced as a recommendation (SHOULD) and not under a SHALL lead-in, with the original wording untouched.
  `openspec validate` accepts it with a warning (no SHALL or MUST), so `--strict` fails on it by design. Whether it becomes SHALL is decided in the
  reconcile change (docs/DECISIONS.md #30). The modal-word check covers it.
- **Cross-references keep their original words and gain a gloss.** "see spec 02", "see below", "Grouped calls" stay in the
  text; a following parenthetical names the capability. The ledger records each one.
- **Scenarios are restatements, never new facts.** OpenSpec requires a scenario per requirement, so each scenario is
  WHEN/THEN built from the same source sentence. The fresh-eyes review checks scenarios as well as requirements.
- **Numbered tests are one requirement per capability with numbered scenarios.** "Rules test 1" to "Rules test 14" in
  `access-control`; "Grouped-call test 1" to "6" in `grouped-calls`; "Family override test 1" to "4" in
  `dose-event-lifecycle`. The call script is "Call script step 1" to "5" and the components "Component 1" to "5" in `call-flow`.
- **Duplicated content stays duplicated.** The consent visibility rule (02, 05), transcript retention (01, 05) and
  delete-parent (01, 05) appear in both capabilities with a cross-reference.
- **Verification is mechanical first, human second.** A script in this change folder splits each old file into atomic units
  (bullet, numbered item, table row, sentence, numbered test), finds the requirement or scenario that contains each unit's
  normalised text, and writes the ledger. It fails on any unmatched unit. A token check compares backticked identifiers,
  quoted strings, numbers and modal words between old and new (new count must be at least the old count). Six
  independent reviewers, one per old file, compare old and new without seeing the ledger.
- **Numbered tests are matched by number, not by text.** Their scenarios are WHEN/THEN restatements, so each old numbered test is paired with the like-numbered scenario and must reach at least 85% word recall of the old sentence; the token check and the reviewers cover the rest.
- **Method for the ledger text match:** normalise by lowercasing, stripping markdown, bullets, numbering and the lead-in
  and gloss sentences, and collapsing whitespace. A unit matches if its normalised text is a substring of the normalised
  text of a new requirement. Units split across requirements (a bullet split by sentence) are matched sentence by sentence.

## Risks / Trade-offs

- [A scenario restates a rule slightly differently and reads as a new rule] -> fresh-eyes review of scenarios; scenarios reuse source words.
- [The substring match passes on text that moved to the wrong capability] -> the ledger lists the target capability for each unit and the user reviews the table against the proposal split.
- [Duplicates drift apart later] -> cross-references in both places; the consent visibility rule has its enforcing text in `access-control`.
- [A SHALL lead-in strengthens a "should"] -> the single instance is its own SHOULD requirement.
