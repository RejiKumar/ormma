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
| `npm run test:fns`  | Callable, webhook and prompt tests against the Firestore emulator (45 tests) |
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

## Exotel telephony (manual, Stage 5)

The dispatcher stays on the log-only provider unless `CALL_PROVIDER=exotel`. Emulator runs and tests never dial.

1. **Create the secrets** (Secret Manager via the Firebase CLI). Values never go in git or the app:
   ```
   firebase functions:secrets:set EXOTEL_API_KEY
   firebase functions:secrets:set EXOTEL_API_TOKEN
   firebase functions:secrets:set EXOTEL_ACCOUNT_SID
   firebase functions:secrets:set EXOTEL_CALLER_ID
   firebase functions:secrets:set EXOTEL_FLOW_URL
   firebase functions:secrets:set EXOTEL_WEBHOOK_URL
   firebase functions:secrets:set EXOTEL_WEBHOOK_TOKEN
   ```
   `EXOTEL_CALLER_ID` is the ExoPhone in E.164 (`+91…`). `EXOTEL_FLOW_URL` is the dashboard flow's start URL. `EXOTEL_WEBHOOK_URL` is the deployed `exotelWebhook` URL (`https://asia-south1-<project>.cloudfunctions.net/exotelWebhook`). Pick a long random `EXOTEL_WEBHOOK_TOKEN`; it is the only callback authentication Exotel offers.
2. **Opt in**: add `CALL_PROVIDER=exotel` to `functions/.env.<projectId>` (or the deployed environment variables), deploy functions, then confirm `dispatchDueCalls` dials.
3. **Dashboard flow**: Greeting → Gather (one digit; 1/2/9, timeout a few seconds) → Passthru **GET, sync** to `https://asia-south1-<project>.cloudfunctions.net/exotelWebhook?token=<EXOTEL_WEBHOOK_TOKEN>&kind=gather` → Closing. The Passthru must pass the gather `digits` through (it also receives `CallSid` and `CustomField`). The flow only collects a key this stage; spoken prompts/audio are Stage 6. The provider sets `StatusCallback` (terminal + answered, JSON) and `CustomField = parentId`; the webhook routes on those plus `CallSid`.
4. **Manual live verification** (cannot be automated here; needs Exotel KYC, an approved caller ID/DLT and a real phone): place one call through the dispatcher, confirm the workflow answers, press 1/2/9 and see `taken`/`not_taken`/consent revoked in the app, then confirm the terminal callback closes the `callSessions` row. Check logs contain ids/status codes only — never transcripts or phone numbers.
5. Without Exotel credentials you can still run everything locally: the logging provider and the emulator webhook tests (mocked HTTP + emulator Firestore) cover the code paths.

## Voice prompts and TTS (manual, Stage 6)

The fixed scripts live in `functions/src/voice/templates.ts`; edit only that file (native speakers
review every line). Audio is cached privately in the default Storage bucket under `tts/`.

1. **Secrets**:
   ```
   firebase functions:secrets:set GOOGLE_TTS_API_KEY      # key restricted to Cloud Text-to-Speech API
   firebase functions:secrets:set VOICE_PROMPT_TOKEN      # long random; shared with the dashboard URLs
   firebase functions:secrets:set VOICE_AUDIO_BASE_URL    # https://asia-south1-<project>.cloudfunctions.net/voiceAudio
   ```
   Deploy functions after setting them. `voicePrompt` and `voiceAudio` are HTTPS endpoints in
   asia-south1; a missing TTS key makes `voicePrompt` return 503 (code only), it never crashes.
2. **Exotel flow**: each audio applet uses the "Type Text → URL" mode pointing at
   `https://asia-south1-<project>.cloudfunctions.net/voicePrompt?token=<VOICE_PROMPT_TOKEN>&kind=<kind>`
   with `kind` = `greeting`, `question`, `closing` or `consent`. Exotel appends `CallSid`,
   `CustomField` (the parent id) and `From`; the function returns one audio URL (8 kHz mono MP3)
   from `voiceAudio`. Keep Greeting → Question+Gather → Passthru → Closing, with the Passthru as in
   the Stage 5 section. Exotel sends HEAD as well as GET; both are supported.
3. **First use**: the first request for a language/prompt synthesises and caches it; later calls
   reuse the same object and URL. Watch that first-call latency stays under Exotel's URL timeout;
   the cache warms permanently after that.
4. **Launch gate (manual)**: a native speaker reviews all four languages in `templates.ts`, and a
   doctor or pharmacist reviews the call scripts (medical-safety "Review before launch"). Record
   both reviews in `docs/DECISIONS.md` with role and date; do not ship to real families before that.
5. **Manual check**: play each prompt on a real Exotel call, confirm pronunciation and that pressing
   9 is mentioned, and confirm no name/phone appears in function logs or URLs.
