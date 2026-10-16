# Tasks

Constraints for every task: no feature code, no EAS config, no secrets. Existing `.firebaserc` (project `ormma-prod`) is not modified.

## 1. Root tooling

- [x] 1.1 Add `.gitattributes` with `* text=auto eol=lf`; verify `git ls-files --eol` shows lf for committed text files
- [x] 1.2 Add root `package.json` (private, scripts: `emulators`, `lint`, `format`, `typecheck`, `test`), Prettier config and ESLint flat config; verify `npm install` and `npm run lint` succeed on the empty tree
- [x] 1.3 Extend `.gitignore` for `mobile/android`, `mobile/ios` (prebuild output) and emulator exports; verify `git status` shows no generated files after install

- [x] 1.4 Add a prerequisite check script that fails unless `java -version` reports major version 21 or newer (the minimum for Firebase CLI 15.34.0), and that `firebase --version` is available; verify it passes on this machine (Temurin 21.0.12) and fails when Java is absent from PATH

## 2. shared/ (types only)

- [x] 2.1 Add `shared/` with a placeholder `types.ts` (type exports only, no runtime code, no package.json); verify it type-checks
- [x] 2.2 Add ESLint rules forbidding runtime exports in `shared/` and requiring `import type` when importing from it; verify with a temporary fixture that a runtime export and a value import each fail lint, then remove the fixture

## 3. Firebase config

- [x] 3.1 Extend the existing `firebase.json` (currently `{}`) with firestore, storage, functions (source `functions`) and emulators (auth, firestore, functions, storage, UI); verify the original file's content is preserved and the JSON is valid
- [x] 3.2 Add empty `firestore.indexes.json` and deny-all `firestore.rules` and `storage.rules` (real rules are Stage 1); verify `.firebaserc` is byte-identical to HEAD via `git diff --exit-code .firebaserc`
- [x] 3.3 Set the `emulators` script to run with `--project demo-ormma` and import/export `emulator-data/`; verify data persists across a restart and the folder is git-ignored

## 4. functions/

- [x] 4.1 Scaffold Functions v2 TypeScript project (Node 24, strict tsconfig, `include` covering `../shared`) with `setGlobalOptions({ region: "asia-south1" })`, using `import type` from `shared/` in one placeholder; verify `npm run build` and `npm test` pass
- [x] 4.2 Verify build isolation: copy `functions/` alone (with its package.json and build output) into a temp dir outside the repo, install, and load the built entry with Node; it must run with no file from outside `functions/`
- [x] 4.3 Add a placeholder export that logs nothing health-related; verify it loads in the Functions emulator

## 5. mobile/

- [x] 5.1 Create the Expo TypeScript app with React Navigation and a one-screen placeholder showing "This app does not provide medical advice.", tsconfig `include` covering `../shared` and one `import type` from it; verify `npx tsc --noEmit` and `npx expo-doctor` pass
- [x] 5.2 Add a smoke render test (jest-expo) for the placeholder screen; verify `npm test` in `mobile/` passes
- [x] 5.3 Configure `app.json` for prebuild/dev client (`expo-dev-client`, placeholder bundle ids, no EAS config); verify `npx expo prebuild --no-install` succeeds and output stays git-ignored, and that Metro bundles with `shared/` outside the project root

## 6. Decisions and final check

- [x] 6.1 Add DECISIONS.md lines for the choices in design.md and a "Prerequisites and commands" section (Node, Java, firebase-tools); verify a fresh clone following it works
- [x] 6.2 Final check: root `lint`, `typecheck` and `test` pass across both projects, and `npm run emulators` starts auth, firestore, functions and storage emulators and stops cleanly; review the diff for secrets, committed generated files, feature code or EAS config
