# Tasks

Constraints for every task: `specs/` is not edited, no project code changes, nothing is archived or committed. Verification output is saved next to this file in `verification/` and shown to the user at the end.

## 1. Ledger and verification script

- [x] 1.1 Write `verification/check-migration.mjs`: split each `specs/0N-*.md` into atomic units, match each unit to the requirement or scenario that contains it in `specs/<capability>/spec.md` of this change, and exit non-zero on any unmatched unit; verify by running it against a deliberately broken copy (one sentence removed) and seeing it fail, then against the real files
- [x] 1.2 Generate `docs/spec-migration-map.md` from the script (ID, old file and section, first words of the unit, new capability, requirement or scenario, late-addition tag #2, #2a, #7, #7a, #7b, #8, #8a); verify the table has one row per unit and zero unmatched rows, and that every late-addition item from the proposal appears with its locations

## 2. Asserted counts

- [x] 2.1 Assert and print these counts, saved to `verification/counts.txt`: 14 capability folders; 14 "Rules test" scenarios (1 to 14, no gaps); 6 "Grouped-call test" scenarios; 4 "Family override test" scenarios; 5 "Call script step" requirements; 5 "Component" requirements; every requirement has at least one scenario; verify the script exits non-zero if any count differs

## 3. Token check

- [x] 3.1 Extend the script with the token check (backticked identifiers, quoted strings including all call-script and alert templates, numbers, enum literals, and modal words may/should/must/never/only/cannot/can/optional/skippable): every old token occurs at least as often in the new specs; verify zero missing tokens and save output to `verification/tokens.txt`

## 4. Fresh-eyes comparison

- [x] 4.1 Run six independent reviewers, one per old spec file, each given only that old file and the new capability files it maps to (not the ledger or this change's design); each reports dropped, softened, strengthened or added rules, including in scenarios and lead-ins; save reports to `verification/fresh-eyes.md`
- [x] 4.2 Resolve every finding by correcting the delta spec (never `specs/`) or record it as accepted with a reason in `verification/fresh-eyes.md`; rerun tasks 1.1, 2.1 and 3.1 and verify all still pass

## 5. Validation and hand-off

- [x] 5.1 Run `openspec validate bootstrap-specs` and verify it passes; record any `--strict` warnings in `verification/validate.txt` (two are expected: the over-500-character `consent` field line, and the SHOULD requirement "Emergency prompt in the family app" which has no SHALL or MUST)
- [x] 5.2 Verify `git diff --exit-code specs CLAUDE.md PROMPTS.md openspec/config.yaml docs/DECISIONS.md` shows no change, then stop and show the user the verification output and counts without archiving or committing

## Workflow follow-up

- After the user approves: archive this change (creates `openspec/specs/`), commit it, and tag `specs-v1-pre-openspec`.
- In a second commit after review: delete `specs/` and update the pointers in `CLAUDE.md`, `PROMPTS.md` and `openspec/config.yaml`, keeping `docs/spec-migration-map.md`.
