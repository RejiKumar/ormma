# Design

## Context

Stages 0–2 shipped data model, rules, auth, parents and invites. The Medicines and Today tabs are still placeholders (`TabPlaceholders`), there are no Firestore reads beyond `useParents`, and the emulator has no demo data. Field shapes and role rules already exist (data-model, access-control); this stage adds screens over them and nothing server-side. See proposal.md — Why.

## Goals / Non-Goals

- Goals: medicines CRUD screens, Today dashboard with status chips + recent alerts + disclaimer, realtime listeners, consent-correct list queries, emulator seed script, dev-build emulator wiring so the seed is actually visible.
- Non-Goals: marking events taken/missed from the dashboard (dose-event-lifecycle override UI comes with the alerts stage), writing alerts or dose events (server-only until the dispatcher), prescription upload, health logs.

## Decisions

- **Consent-correct queries (`src/family/visibility.ts`)**: the access-control "Visibility check mechanics" requirement means non-owner list queries must carry filters Firestore can prove against the consent rule. A pure helper turns `(role, consent, windowStart, windowEnd, field)` into 0–2 date ranges: owner or no revocation → one plain window; revoked → `field < min(windowEnd, revokedAt)`; revoked + re-granted → two ranges (`< min(windowEnd, revokedAt)` and `>= max(windowStart, regrantedAt)`), merged client-side; non-owner with a missing consent map → zero ranges (fail closed, no query issued so no rules error). Rules tests `paths.test.ts:426-479` pin the exact provable shapes (`<` strict, never `<=`). Unit-tested purely, no Firestore.
- **Per-parent queries, not collection groups**: alerts and doseEvents are queried as `parents/{id}/…` subcollections so the rules' `get(parents/{id})` consent check stays statically provable; parents count is small, so N listeners merge fine. `createdAt desc` / range constraints also satisfy the `(createdAt desc)` and `(status, scheduledFor)` index expectations.
- **Today window**: `localDayWindow(timezone, now)` in the same module computes the parent-local `[start, end)` epoch range via `Intl.DateTimeFormat(..., { timeZone })` with an `Asia/Kolkata` fallback when Intl data is missing. The dashboard queries `scheduledFor` inside the window; event grouping uses the parent-local date, matching "today in the parent's timezone".
- **Data hooks**: `useMedicines(parentId)`, `useTodayEvents(parentId, consent…)`, `useAlerts(parentId, …)` follow the `useParents` pattern (RN Firebase `onSnapshot`, manual mocks in tests). `useParents` is extended to carry `timezone` and the raw `consent` map (status, revokedAt, regrantedAt) that the visibility helper needs; `FamilyParent` grows those fields only.
- **Screens and navigation**: the Today tab becomes a stack holding the dashboard; the Medicines tab becomes a `MedicineStack` (parent selector + list → add → edit). Roles: viewers get no add/edit/deactivate controls (access-control role table mirrored client-side). Statuses render through the existing `StatusChip`, alerts through `Card`/`ListItem`, disclaimer through `DisclaimerFooter`.
- **Medicine form**: name, doseText (free text, never interpreted), one-or-more `HH:mm` time rows validated as 24-h, `startDate` (YYYY-MM-DD, defaults today), deactivate is a confirm action writing `active: false` (never a delete). Manual save writes `source: "manual"`, `confirmedByHuman: true` (data-model delta).
- **Emulator wiring**: in `__DEV__` only, and only when the native module exposes `useEmulator`, the app points Auth/Firestore/Functions at a host from `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` (default `localhost`; Android emulator uses `10.0.2.2`, devices `adb reverse`). Guarded by `typeof x.useEmulator === "function" && !process.env.JEST_WORKER_ID` so Jest mocks and tests never see it.
- **Seed script (`scripts/seed-emulator.mjs`)**: talks to the Firestore emulator REST (`runQuery`, no auth) and seeds, for every uid found in `users/*` (created by first sign-in), two parents with owners, medicines across schedules, today's dose events in every status, and recent alerts; with no users it seeds a `demo-user` fallback and prints "sign in once, then re-run". npm script `npm run seed`.

## Risks / Trade-offs

- [Hermes `Intl` timezone data incomplete on device] → helper falls back to `Asia/Kolkata` (the default parent timezone) and is unit-tested under Node's full ICU; the four supported languages are all India-first, so the fallback is the common case anyway.
- [Non-owner sees empty dashboard when consent map is missing] → required fail-closed behaviour (rules test "parent without a consent map fails closed"); the UI shows the normal empty state, not an error.
- [N listeners (parents × 2 collections)] → fine for v1 family sizes (≤ a handful of parents); re-evaluate with a collection-group design only if rules gain a provable group query.
- [Dev emulator wiring breaks real-device dev builds] → gated on `__DEV__` + explicit host env var; production paths untouched.

## Migration Plan

None: no rules, index, function or schema changes; seed script is additive tooling.

## Open Questions

- None blocking; reactivate-from-deactivate UI ships alongside deactivate (writes `active: true`) because the medicine document already supports it and no spec forbids it.
