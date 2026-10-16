# Decisions

One line per non-obvious decision. Tags: [DECIDED] final; [PROPOSED Sn] default to resolve in stage n; [SPEC-CONFLICT] needs a spec edit when approved.

- 2026-10-16 [DECIDED] Mobile uses Expo with development builds (prebuild/CNG) and @react-native-firebase; Expo Go is not supported.
- [PROPOSED S0] Functions are bundled with esbuild so `packages/shared` resolves on `firebase deploy` (deploy uploads only `functions/`).
- #1 [PROPOSED S12][SPEC-CONFLICT 03/05] Add call type "consent", allowed while consent.status is "pending"; it plays only the consent script and writes no health data. All other calls still require "granted".
- #2 [DECIDED 2026-10-16, specs 01, 02, 03 updated] Family may change `missed` to `taken` (resolvedBy "family"). `missedAt` is kept, `missed` stays terminal for all server transitions, and no alert is re-sent or retracted.
- #3 [PROPOSED S1/S10][SPEC-CONFLICT 01] `prescriptions.extracted` uses the spec 06 schema (frequencyText, illegible, nullable doseText/times, overallConfidence); spec 01 updated to match.
- #4 [PROPOSED S7][SPEC-CONFLICT 01] Transcripts are stored only when needsReview, under `transcripts/review/`, deleted when the review is resolved or after 30 days, whichever comes first.
- #5 [PROPOSED S1/S2][SPEC-CONFLICT 02] Parent creation is callable-only: the function writes the parent and its owner member in one batch. Clients cannot create parents directly.
- #6 [PROPOSED S1][SPEC-CONFLICT 01] `members/{uid}` carries `displayName` (copied by the function at create/invite acceptance); `users/{uid}` stays self-only.
- #7 [DECIDED 2026-10-16, specs 01, 02, 05 updated] `consent.revokedAt`; after revocation, rules hide healthLogs/alerts (createdAt) and doseEvents (scheduledFor) dated at or after revokedAt from non-owners; older data stays visible. Queries must repeat the date filter. Re-grant is decided in #7a, repeated revocation in #7b.
- #7a [DECIDED 2026-10-16, specs 01, 02, 05 updated] Re-grant keeps `revokedAt` and adds `regrantedAt`; non-owners read data dated before revokedAt or at/after regrantedAt; data in between stays hidden from non-owners; owners see everything.
- #7b [DECIDED 2026-10-16, specs 01, 02, 05 updated] v1 limitation: one revoke/re-grant cycle only. A second revocation keeps the FIRST `revokedAt` and clears `regrantedAt`, so non-owners see only data from before the first revocation. History between a re-grant and a later revocation is hidden from non-owners on purpose (fail closed); overwriting `revokedAt` would expose the first gap. Revisit with a `consentGaps[]` array if repeated revocation matters.
- #2a [DECIDED 2026-10-16, specs 01, 02, 03 updated] The missed -> taken override is owner/editor only. `resolvedByUid` is stored on doseEvents and rules require it to equal request.auth.uid on every client status update, not only overrides.
- #18 [DECIDED 2026-10-16] A minimal `.gitignore` (env files, keys, service accounts, emulator data, node_modules) was added before committing firebase.json and .firebaserc; the Stage 0 skeleton will extend it.
- #8 [DECIDED 2026-10-16, specs 01 and 03 updated] One doseEvent per medicine; calls group events by (parentId, scheduledFor) and are DTMF-only with an explicit "ALL" question. 1 = all taken, 2 = all not_taken plus retry; no partial answers in v1 (documented limitation); `groupConfirmed` on events; `callSessions.doseEventIds[]`; the family app shows "Morning tablets (2), confirmed together".
- #8a [DECIDED 2026-10-16, spec 03 updated] Group alert is one per group; a group where the parent pressed 2 uses "did not confirm all" wording when it ends missed (no separate immediate alert on pressing 2).
- #9 [PROPOSED S4] The `yyyyMMddHHmm` part of eventId is parent-local time; `scheduledFor` is stored as a UTC timestamp.
- #10 [PROPOSED S4] An event is missed when 1+retryCount attempts are exhausted without resolution, or missedAfterMinutes has elapsed, whichever comes first.
- #11 [PROPOSED S4] `not_taken` returns to `pending` once (extra reminder after retryGapMinutes, counts as an attempt); a family-set `not_taken` behaves the same as the parent's reply.
- #12 [PROPOSED S4] Claiming consumes an attempt; a provider/system error before ringing refunds it, returns the event to `pending` with backoff, and sets `lastFailure: "system"`, which selects the system-failure alert text.
- #13 [PROPOSED S3/S4] Medicine form warns when a time falls in quiet hours; dispatcher defers to quiet-hours end; if that passes missedAfterMinutes the event is marked missed without calling.
- #14 [PROPOSED S1][SPEC-CONFLICT 02] Rules enforce only that `confirmedByHuman: true` is written by an owner/editor; "review screen path" is not enforceable in rules and is dropped from the spec.
- #15 [PROPOSED S1/S2] Owner/editor can confirm doses (viewers cannot); only owners remove members (callable); any member can leave; the last owner cannot leave or be removed; invite codes are 8 chars from an unambiguous alphabet, single-use, 48h expiry, and cannot grant owner.
- #16 [PROPOSED S4/S7] No attempt to detect a stranger answering; any unrecognised reply is `unclear` and nothing from it is stored as health data.
- #17 [PROPOSED S8] Sugar readings in mmol/L (or unknown unit) set needsReview and are never converted.
- #19 [DECIDED 2026-10-16] Mobile uses Expo with prebuild and development builds (not Expo Go), so @react-native-firebase, FCM and phone auth work. Bare RN rejected: more setup and upgrade cost for no benefit in v1.
- #20 [DECIDED 2026-10-16, Stage 0] No npm workspaces: root, `functions/` and `mobile/` each have their own package.json, because Expo/Metro and hoisted workspace deps often conflict. The root package.json holds shared tooling and scripts only.
- #21 [DECIDED 2026-10-16, Stage 0] Shared types live in a root `shared/` folder, TYPES ONLY. Consumers use top-level `import type`, so Metro and the Functions deploy never resolve it at runtime. ESLint enforces no runtime code in `shared/` and `import type` in consumers.
- #22 [DECIDED 2026-10-16, Stage 0] Because `functions/tsconfig.json` includes `../shared`, tsc's common root is the repo root and the build lands in `lib/functions/src/` (entry `lib/functions/src/index.js`) plus an empty `lib/shared/types.js`. Checked: the built output runs from a copy of `functions/` alone.
- #23 [DECIDED 2026-10-16, Stage 0] Emulators run with `--project demo-ormma` (the `demo-` prefix keeps them offline and unable to touch `ormma-prod`) on default ports, importing and exporting `emulator-data/` (git-ignored). `.firebaserc` is committed and untouched.
- #24 [DECIDED 2026-10-16, Stage 0] Placeholder `firestore.rules` and `storage.rules` deny everything until Stage 1 replaces them.
- #25 [DECIDED 2026-10-16, Stage 0] Functions Jest config transforms `jose` (ESM-only, pulled in by firebase-admin) through ts-jest so the Jest CommonJS runtime can load it.
- #26 [DECIDED 2026-10-16, Stage 0] Files the Expo template generated were removed: `AGENTS.md` (it prescribes Expo Router, which conflicts with the React Navigation choice), `LICENSE`, and `mobile/.claude/settings.json` (it enabled a plugin nobody asked for).
- #27 [PROPOSED S0] iOS bundle id and Android package are `com.example.ormma` placeholders; set the real ids before the first native build or store work.
- #28 [DECIDED 2026-10-16, Stage 0] `.gitattributes` forces `eol=lf` to avoid CRLF churn on the Windows dev machine.
- #29 [DECIDED 2026-10-16, Stage 0] Functions runtime is Node 24 (`engines.node` "24", `.nvmrc` 24, `@types/node` 24). Firebase CLI 15.34.0 lists Node 20 as deprecated since 2026-04-30 and decommissioned on 2026-10-30; Node 22 and 24 are GA. 24 is the newer LTS and matches the dev machine. Supersedes the Node 20 pin from the Stage 0 plan.
