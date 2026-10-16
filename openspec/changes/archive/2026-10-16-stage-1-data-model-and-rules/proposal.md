# Proposal

## Why

Nothing yet enforces the data model or the access rules: `firestore.rules` and `storage.rules` deny everything and `shared/` holds one placeholder type. Every later stage reads and writes these collections, so the types, rules, indexes and the emulator tests that prove the rules must exist first (PROMPTS.md Stage 1: implement the data-model and access-control specs).

## What Changes

- `shared/types.ts`: TypeScript types for every document of the data-model spec (types only, imported with `import type` from `mobile/` and `functions/`).
- `firestore.rules`: the access-control spec as rules, with the consent visibility rule, the doseEvent client-update limits and deny-by-default.
- `storage.rules`: `/prescriptions/{parentId}/*` for owner/editor (images, max 10 MB) and no client access to `/transcripts/*`.
- `firestore.indexes.json`: the indexes of the data-model spec.
- Emulator-based rules tests in `functions/test/rules/`: Rules test 1 to 16 of the spec by number, plus tests for every other path rule, list-query behaviour of the visibility rule, and Storage rules. `npm run test:rules` runs them on the Firestore and Storage emulators (project `demo-ormma`).
- `docs/rules-test-coverage.md`: which spec requirement each test covers.
- Decisions and the rules that cannot be enforced in rules alone are recorded in `docs/DECISIONS.md`.

Spec changes: refinements for behaviour the access-control spec leaves open, added as new requirements; no existing requirement is modified. Each is consistent with the existing text and fails closed.

| Requirement (spec file) | Old behaviour | New behaviour |
|---|---|---|
| "doseEvents client updates and terminal states" (access-control, ADDED) | Silent on which current statuses a client update may start from. | A client update never changes a doseEvent whose status is `taken`, and changes a `missed` doseEvent only to `taken` (matches the state machine: taken and missed are terminal, family override is missed -> taken only). |
| "healthLogs client create shape" (access-control, ADDED) | Create by owner/editor with source "family". | Also: only the data-model fields, `createdAt` equal to the request time (so the consent visibility rule cannot be dodged by backdating), no transcript reference, type from the enum. |
| "prescriptions client create and update" (access-control, ADDED) | Create by owner/editor; status changes to "confirmed" by owner/editor only. | Client create has status "pending_review"; client updates change only `status`, to a value of the status enum, by owner/editor. |
| "parents client update fields" (access-control, ADDED) | Update by owner only, client may not modify `consent`. | Owner updates are limited to name, phone, language, timezone, active and callPolicy; phone must be E.164 and language one of the four codes. |
| "medicines document shape" (access-control, ADDED) | Create/update by owner or editor. | Only data-model fields, valid enums and types, `createdBy` equal to the creator, `createdBy` and `createdAt` never changed. |
| "users document shape" (access-control, ADDED) | read/write only by that uid. | Phone is E.164 (CLAUDE.md hard rule 7); only data-model fields. |
| "Client deletes denied" (access-control, ADDED) | Silent on deletes. | Clients cannot delete parents, medicines, doseEvents, healthLogs, prescriptions or alerts (deleting a parent is the owner's callable with recursive delete, per data-model Retention). |
| "Rules coverage beyond the numbered tests" (access-control, ADDED) | Tests 1 to 16 only. | Every path rule and the Storage rules also have emulator tests. |

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `access-control`: eight ADDED requirements listed above; no existing requirement text changes.

## Impact

- New: `shared/types.ts` content, `firestore.rules`, `storage.rules`, `firestore.indexes.json` content, `functions/test/rules/`, `functions/tsconfig.test.json`, `functions/jest.rules.config.js`, devDependencies `@firebase/rules-unit-testing` and `firebase` in `functions/`, root script `test:rules`, `docs/rules-test-coverage.md`.
- Functions and the app still contain no features. No deploy, no secrets, no real APIs.

## Out of scope

- Cloud Functions (callable create parent, invite redemption, delete, export): Stages 2 and 12. Rules deny the client paths they will own.
- Mobile code, auth, screens.
- Real Firebase project, deployment of rules or indexes.
- #15 (invite and membership rules for the callables) is adopted in Stage 2.
