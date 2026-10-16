# Proposal

## Why

The repo holds only specs and config. Every later stage (rules, auth, call flow) needs a
buildable `mobile/` and `functions/` project, a local Firebase emulator setup, and shared
lint/format tooling. Doing it once, with no features, keeps later diffs reviewable.

## What Changes

- Add `mobile/`: Expo (prebuild + development builds, not Expo Go), TypeScript, React Navigation, a placeholder app shell only.
- Add `functions/`: Firebase Functions v2, TypeScript, default region `asia-south1`, one health-free placeholder export, Jest test runner.
- Extend the existing `firebase.json` with config for Firestore, Storage, Functions and the emulator suite (auth, firestore, functions, storage, UI).
- `.firebaserc` is already committed (project `ormma-prod`) and stays untouched.
- Add `shared/` (types only, `import type` from both projects, no runtime exports) and `.gitattributes` (`* text=auto eol=lf`).
- Add `firestore.indexes.json` (empty) and minimal deny-all `firestore.rules` and `storage.rules` placeholders so emulators start (real rules are Stage 1).
- Add root ESLint and Prettier config shared by both projects, and root npm scripts: `emulators`, `lint`, `format`, `typecheck`, `test`.
- Extend `.gitignore` where needed (Expo native dirs, emulator exports).
- Add a short entry to `docs/DECISIONS.md` for each non-obvious choice made.

Spec changes: none. The placeholder rules are deny-all and do not implement any requirement of `specs/02-security-rules.md`.

## Capabilities

### New Capabilities
None. This is tooling and scaffolding; no behaviour changes, so the change sets `skip_specs: true`.

### Modified Capabilities
None.

## Impact

- New top-level directories `mobile/` and `functions/`; new root files (`package.json`, ESLint/Prettier config, `.firebaserc`, rules and index files).
- New dev dependencies (Expo, React Navigation, firebase-functions/admin, Jest, ESLint, Prettier, firebase-tools).
- No secrets are added; no Claude, Exotel or Google clients are wired up.

## Out of scope

- Any feature, screen beyond a placeholder, or Cloud Function logic.
- Real security rules and their tests (Stage 1), shared types package (Stage 1).
- `@react-native-firebase` auth/FCM wiring and native Firebase config files (needed from Stage 2).
- Secrets setup, CI, EAS build configuration, deployment to a real Firebase project.
