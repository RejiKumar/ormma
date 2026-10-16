# Design

## Context

Specs: `data-model` and `access-control` (reconciled: parents are created only by a callable, `confirmedByHuman` is enforced as writer-is-owner/editor, members carry displayName, prescriptions use the extraction schema). Stage 0 left deny-all placeholder rules, an empty `shared/types.ts` and a Jest setup in `functions/`. See proposal.md for scope and the added requirements.

## Goals / Non-Goals

**Goals:** rules and types faithful to the specs; every rule proven by an emulator test; nothing weaker than the spec; failing closed where the spec is silent.

**Non-Goals:** callables, app code, deployment.

## Decisions

- **Shared types are structural.** `shared/types.ts` defines its own minimal `Timestamp` interface (seconds, nanoseconds, toDate, toMillis) that both the Admin SDK and the client SDK timestamps satisfy, so no SDK import (and no runtime code) enters `shared/`. Document types are exported with `export interface` and `export type`, which the types-only lint rule allows.
- **Membership checks use `exists` and `get` on the member document**, so removing a member takes effect on the next request (Rules test 6). Role comes from the same document, so one document read serves membership and role.
- **Consent visibility is one helper used for healthLogs, alerts and doseEvents.** `visibleAt(parentId, ts)` reads the parent's `consent` with `get()`, treats a missing `revokedAt` or `regrantedAt` as null, and returns `revokedAt == null || ts < revokedAt || (regrantedAt != null && ts >= regrantedAt)`. Owners skip it. A parent without a `consent` map errors and denies (fail closed). Queries by non-owners must repeat the same `where` clause; the tests prove an unconstrained list is denied and a constrained one is allowed.
- **doseEvent client update is a whitelist.** `affectedKeys().hasOnly(['status','resolvedAt','resolvedBy','resolvedByUid'])`, new status in `taken`/`not_taken`, resolvedBy "family", resolvedByUid equal to the caller, resolvedAt a timestamp. Old status `taken` is never changed and `missed` only becomes `taken`. Creates and deletes are denied; the server writes everything else with the Admin SDK, which bypasses rules.
- **healthLogs: `createdAt == request.time` on client creates.** The visibility rule is date-based, so a client-chosen `createdAt` would let a member place data on the visible side of a revocation. Voice logs come from the server.
- **Strict shapes with `keys().hasOnly(...)` for client-written documents** (users, parents update whitelist, medicines, healthLogs, prescriptions). Extra fields are denied. Phone numbers are checked against `^\+[1-9][0-9]{7,14}$` (E.164, CLAUDE.md hard rule 7).
- **No client deletes** for parents, medicines, doseEvents, healthLogs, prescriptions and alerts. Deactivation is an update. Parent deletion is the owner's callable with recursive delete (data-model Retention, data-protection Delete right), added in Stage 12.
- **Indexes.** `doseEvents (status, scheduledFor)` is created with both COLLECTION and COLLECTION_GROUP scope because the dispatcher queries across parents with the Admin SDK. `healthLogs (type, createdAt desc)` is a composite index. `alerts (createdAt desc)` is a single-field query served by the automatic single-field index, which `firestore.indexes.json` cannot express as a composite, so it is intentionally not listed.
- **Rules tests live in `functions/test/rules/`** and run with `firebase emulators:exec --only firestore,storage --project demo-ormma`. They use a separate Jest config (`jest.rules.config.js`) so the plain `npm test` does not need emulators. Root script `test:rules` runs the prerequisite check first (Java 21+).
- **Rules that cannot be enforced in rules alone, with the Cloud Function alternative:**
  - Creating a parent and its owner member atomically, and member add/remove: callable functions (Stages 2 and 12).
  - Last owner cannot be removed or leave, invite expiry, single use, 8-character codes: callables (#15, Stage 2).
  - "Never schedule an AI-extracted medicine without a human confirming it on screen": rules only see the writer, not the screen (decision #14); the dispatcher re-checks `confirmedByHuman` and the active flag before calling (Stage 4).
  - Image content: Storage rules check size and the declared content type, which the client controls; the prescription function verifies the file before sending it to Claude (Stage 10).
  - Deleting a parent's subcollections and Storage files: recursive delete callable.
  - Quiet hours, retries, idempotency: functions (Stage 4).

## Risks / Trade-offs

- [Rules `get()` limit of 10 document reads per request] -> each rule reads at most the member document and the parent document.
- [A client that forgets the visibility `where` clause is denied rather than filtered] -> documented in the spec; the mobile queries in Stage 3 include it.
- [Stricter shapes than the spec text could block a future legitimate write] -> every addition is listed as an ADDED requirement; a later stage changes the requirement through a change if needed.
- [Cross-service Storage rules read Firestore] -> tests run both emulators together.
