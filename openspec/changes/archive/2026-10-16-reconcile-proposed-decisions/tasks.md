# Tasks

Constraints: specs and `docs/` only; no code, no deploys, no pushes.

## 1. Specs

- [x] 1.1 Delta specs under `specs/<capability>/spec.md` modify the six capabilities in proposal.md; verify `openspec validate reconcile-proposed-decisions` passes with no warnings
- [x] 1.2 Verify every MODIFIED block differs from its main-spec block only in the intended lines (diff against `openspec/specs/`), and that no other requirement changes

## 2. Decision log

- [x] 2.1 In `docs/DECISIONS.md` mark #1, #3, #4, #5, #6, #14 as DECIDED with their reasoning, add the #30 resolution, mark the esbuild line superseded, and record that the autonomous run waives the CLAUDE.md "wait for OK" step; verify each of those ids has a DECIDED line with a "Why" and no PROPOSED tag remains for them

## 3. Verification and archive

- [x] 3.1 Run `npm run lint`, `npm run typecheck` and `npm test` and verify all pass (code is unchanged, so this proves the repo is still green)
- [x] 3.2 Archive with `openspec archive reconcile-proposed-decisions --yes`, then verify `openspec validate --specs` passes, the six main specs contain the new text, and the old text is gone (grep)

## Workflow follow-up

- Commit "Reconcile PROPOSED decisions".
