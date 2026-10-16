# Design

## Context

Greenfield repo; see proposal.md for motivation. Constraints: stack fixed in CLAUDE.md, region
`asia-south1`, Expo with dev builds (DECISIONS #19), no secrets in git, Windows dev machine.

## Goals / Non-Goals

**Goals:** one command starts all emulators; lint, typecheck and tests run from the repo root; each project builds independently.

**Non-Goals:** shared-types packaging (decided in Stage 1 plan), runtime Firebase wiring in the app.

## Decisions

- **Separate package.json per project, thin root package.json for scripts (no npm workspaces).** Expo/Metro and hoisted workspace deps often conflict. Alternative: workspaces, rejected for Metro resolution risk.
- **Shared types live in a root `shared/` folder, TYPES ONLY.** Both projects use `import type` from it, so Metro and the Functions deploy never resolve it at runtime (it is erased at compile time). `shared/` has no package.json and no runtime exports; an ESLint rule (`no-restricted-syntax` on non-type exports plus `@typescript-eslint/consistent-type-imports` in consumers) enforces this. Both tsconfigs `include` `../shared`. `functions/` build output must run with nothing outside `functions/`; this is verified by copying `functions/` alone to a temp dir and loading the built entry. Alternatives: a published/linked package (runtime resolution and deploy packaging risk), copying types (drift).
- **Root ESLint flat config + Prettier, with per-project TypeScript parser settings.** One style for both projects. Alternative: per-project configs, rejected as duplication.
- **Functions: Node 24 runtime (Node 20 is decommissioned 2026-10-30), Jest with ts-jest.** Emulator-based rules tests will also run under Jest in Stage 1, so one runner. Alternative: Vitest, rejected to match firebase-functions-test docs.
- **Region set once via `setGlobalOptions({ region: "asia-south1" })`** in `functions/src/index.ts`, so no function can accidentally deploy elsewhere.
- **Placeholder rules are deny-all (`allow read, write: if false`)** so the emulator starts and nothing is accidentally open before Stage 1.
- **Emulator ports use Firebase defaults** (auth 9099, functions 5001, firestore 8080, storage 9199, UI 4000); `emulators` script uses `--import/--export-on-exit` into the git-ignored `emulator-data/`.
- **`.firebaserc` is already committed with alias `prod` -> `ormma-prod`; it is left untouched.** `firebase.json` is currently `{}` and is extended, not replaced. Emulator scripts pass `--project demo-ormma` (the `demo-` prefix keeps emulators fully offline and cannot touch `ormma-prod`; this id is a deliberate choice, not a placeholder).
- **`.gitattributes` with `* text=auto eol=lf`** avoids CRLF churn on the Windows dev machine.

## Risks / Trade-offs

- [Expo SDK / React Navigation versions drift] → pin via the Expo-recommended template and `npx expo install`.
- [Accidental deploy to ormma-prod] → no deploy script is added; emulators use a `demo-` project id.
- [shared/ gains a runtime export and breaks Metro or deploy] → ESLint rule plus the isolated-build check.
- [Emulators need Java and firebase-tools] → Firebase CLI 15.34.0 requires Java 21 or newer (`MIN_SUPPORTED_JAVA_MAJOR_VERSION = 21`); document it and check it in task 1.4.
