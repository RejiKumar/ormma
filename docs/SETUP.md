# Prerequisites and commands

## Prerequisites

- Node 24 (see `.nvmrc`; Functions deploy with the Node 24 runtime).
- Java 21 or newer. Firebase CLI 15.34.0 sets 21 as its minimum, and the Firestore and Storage emulators need it. `npm run prereqs` checks this.
- Firebase CLI (`firebase --version` must work). It is also a root dev dependency.

## Setup

```
npm install                 # root tooling
npm --prefix functions install
npm --prefix mobile install
```

## Commands (run from the repo root)

| Command             | What it does                                                            |
| ------------------- | ----------------------------------------------------------------------- |
| `npm run prereqs`   | Fails unless Java 21+ and the Firebase CLI are available                |
| `npm run emulators` | Builds functions, starts auth, firestore, functions, storage and the UI |
| `npm run lint`      | ESLint for the whole repo (includes the `shared/` types-only rules)     |
| `npm run format`    | Prettier, write mode (`format:check` only checks)                       |
| `npm run typecheck` | Type-checks `shared/`, `functions/` and `mobile/`                       |
| `npm test`          | Jest in `functions/` and `mobile/` (emulator-free, decision #36)       |
| `npm run test:fns`  | Callable tests against the Firestore emulator (18 tests)              |
| `npm run test:rules`| Security-rules tests against Firestore + Storage emulators            |
| `npm run seed`      | Seeds the running emulators with demo parents, medicines and events    |

Emulators use project id `demo-ormma` and keep data in `emulator-data/` (git-ignored).
Ctrl+C in the emulator terminal exports data on exit.

## Local dev against the emulators

For a development build point the app at the emulators with `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST`:
`127.0.0.1` for the iOS simulator, `10.0.2.2` for the Android emulator (the host machine from inside
it), or the machine's LAN IP for a physical device. Production builds ignore it, and the wiring never
runs under Jest; see `mobile/src/firebase/emulators.ts`.

With the emulators running, `npm run seed` reads `users/*` and creates two parents per user (the user
is the owner member), medicines, today's dose events in every status and recent alerts. With no users
it seeds `demo-user` (phone `+919876500000`, any code `123456` in the auth emulator). Re-running
overwrites the same seeded documents; the script verifies the data over the emulator REST API before
exiting.

## Before the first EAS build or Firebase app registration

The iOS bundle identifier and Android package in `mobile/app.json` are the placeholder `com.example.ormma`. Replace them with the real ids before the first EAS build or before registering the apps in Firebase.

## Firebase console prerequisites (manual, Stage 2)

These steps live in the Firebase console and cannot be verified by tests; they are the first thing to check when login fails on a device:

1. **Enable Phone auth**: Firebase console → Authentication → Sign-in method → Phone → enable. Without it every OTP request fails.
2. **Register the apps**: add an Android app (package name from `mobile/app.json`) and an iOS app (bundle id from `mobile/app.json`) to the Firebase project so the config files exist.
3. **Android fingerprints**: register the Android app's SHA-1 **and** SHA-256 (`./gradlew signingReport`, or the Play-upload key's fingerprints later). Without them phone auth fails only on device, while all mocked tests stay green.
4. **Place the platform files**: put `google-services.json` at `mobile/android/app/google-services.json` (after `expo prebuild`) and `GoogleService-Info.plist` at `mobile/ios/GoogleService-Info.plist`. Both are gitignored; `.dist.example` placeholders show the expected shape.
5. **Billing**: reCAPTCHA-free Android phone auth needs the Blaze plan on the project before shipping; app-check is out of scope for v1.

Then rebuild the dev client (`npx expo run:android` / `run:ios`) — config-plugin changes only land after a prebuild.
