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
| `npm test`          | Jest in `functions/` and `mobile/`                                      |

Emulators use project id `demo-ormma` and keep data in `emulator-data/` (git-ignored).
Ctrl+C in the emulator terminal exports data on exit.

## Before the first EAS build or Firebase app registration

The iOS bundle identifier and Android package in `mobile/app.json` are the placeholder `com.example.ormma`. Replace them with the real ids before the first EAS build or before registering the apps in Firebase.
