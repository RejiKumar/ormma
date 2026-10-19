# Tasks

Constraints: no `firestore.rules` change; no new dependencies; the note never changes a dose status; the zod schema and prompt text belong to Stage 8 — this change fixes the contract, the shared type and the rules coverage. Existing hard rules apply (zod validation before any write, review path never silently saved, idempotent call flow, no health data in logs).

## 1. Contract and shared type

- [x] 1.1 Verify the spec deltas: run `openspec validate confirmation-note` (or `openspec validate --change confirmation-note`) and confirm the reply-structuring MODIFIED and data-model ADDED requirements validate against the schema.
- [x] 1.2 Add `confirmationNote: string | null` to `DoseEventDoc` in `shared/types.ts` with a comment noting it is server-written by reply structuring, one family-language sentence, `null` on the review path. Verify `npm run typecheck` passes at the repo root.

## 2. Rules coverage (no rules change)

- [x] 2.1 Add two emulator tests to `functions/test/rules/`: (a) a client status update on a doseEvent that already contains `confirmationNote` is allowed, and (b) a client update that sets or clears `confirmationNote` is denied. Verify `npm run test:rules` passes against the unchanged `firestore.rules`.

## 3. Close

- [x] 3.1 Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:rules`. Verify all pass; archive the change (`openspec archive confirmation-note`), which syncs the delta requirements into `openspec/specs/reply-structuring/spec.md` and `openspec/specs/data-model/spec.md`, and verify `openspec validate --specs` reports all specs valid.
