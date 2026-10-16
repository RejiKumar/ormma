# Tasks

Constraints: emulators only (project `demo-ormma`); no deploys, no pushes, no secrets, no real APIs. `shared/` stays types only.

## 1. Shared types

- [x] 1.1 Write `shared/types.ts` with types for every document of the data-model spec (users, parents with callPolicy and consent, members, medicines, doseEvents, healthLogs, callSessions, prescriptions with the extraction schema, alerts, invites, auditLogs) and the enums; verify `npm run typecheck` and `npm run lint` pass
- [x] 1.2 Use `import type` from `shared/` in `functions/` (typed test helpers) and verify the isolated-build check still holds (built `functions/` output runs from a copy of `functions/` alone)

## 2. Firestore rules, indexes and tests

- [x] 2.1 Add test tooling: `@firebase/rules-unit-testing` and `firebase` in `functions/`, `jest.rules.config.js`, `tsconfig.test.json`, scripts `test:rules:run` (functions) and `test:rules` (root, via `firebase emulators:exec --only firestore,storage --project demo-ormma`); verify the command starts the emulators and runs an empty-suite smoke test
- [x] 2.2 Write `firestore.rules` and the Firestore rules tests Rules test 1 to 16 (by spec number) plus the additional path tests and list-query tests; verify `npm run test:rules` passes and that each numbered test fails when the rule it covers is weakened (mutation check on a temp copy of the rules for tests 5, 6, 7, 8, 9, 12, 13, 14, 15)
- [x] 2.3 Write `firestore.indexes.json` per the data-model spec; verify it is valid JSON and the emulator loads it without a warning

## 3. Storage rules and tests

- [x] 3.1 Write `storage.rules` (prescriptions for owner/editor, images, max 10 MB, transcripts denied) and Storage tests; verify they pass in the same `test:rules` run

## 4. Documentation and close

- [x] 4.1 Write `docs/rules-test-coverage.md` mapping each spec requirement and scenario to its tests, and add the Stage 1 decisions and the "cannot be enforced in rules" list to `docs/DECISIONS.md`; verify every requirement of the access-control spec appears in the table
- [x] 4.2 Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:rules` and verify all pass; archive the change and verify `openspec validate --specs` passes

## Workflow follow-up

- Commit "Stage 1: data model and rules".
