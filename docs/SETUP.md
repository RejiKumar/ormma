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
| `npm run android:prepare` | Creates the short `D:\nm` junction used by the Android build     |
| `npm run android:apk` | Builds the debug APK in place and copies it to `ormma-debug-arm64.apk` |

Emulators use project id `demo-ormma` and keep data in `emulator-data/` (git-ignored).
Ctrl+C in the emulator terminal exports data on exit.

## Android builds on Windows (long paths)

This repo sits under `D:\RARK\AI Native\Projects\...`, deep enough that CMake's mirrored
object paths (`.cxx\<variant>\<hash>\<abi>\CMakeFiles\<target>.dir\D_/RARK/...`) pass the
260-character Windows limit. Ninja then fails with:

```
ninja: error: mkdir(...D_/RARK/...): No such file or directory
```

The project stays where it is; the fix only shortens the paths the C++ toolchain sees. It is
committed as an Expo config plugin (`mobile/plugins/withWindowsNativePaths.js`, registered in
`mobile/app.json`), so `npx expo prebuild --platform android` reproduces it after the
git-ignored `mobile/android` folder is regenerated:

| Short path | Purpose |
| --- | --- |
| `D:\nm` | Junction to `mobile/node_modules`; Gradle points the native module projects here, so their CMake builds and codegen directories are short |
| `D:\a` | CMake staging directory for `:app` (`buildStagingDirectory`); AGP appends the variant, hash and ABI |

The junction is machine setup rather than source code, so the build helper creates it:

```
npm run android:prepare   # create/repair D:\nm only
npm run android:apk       # debug APK, arm64-v8a, copied to ./ormma-debug-arm64.apk
```

The helper runs `:app:assembleDebug` from `mobile/android` (nothing is copied) and drops the APK
at the repo root. Extra arguments are passed to Gradle, e.g.
`npm run android:apk -- :app:assembleRelease -PreactNativeArchitectures=arm64-v8a`.

Keep both names short. If a native build needs a clean slate, delete `D:\a` and the `.cxx`
directories under `mobile/node_modules/*/android/`, then run the helper again.

## Local dev against the emulators

For a development build point the app at the emulators with `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST`:
`127.0.0.1` for the iOS simulator, `10.0.2.2` for the Android emulator (the host machine from inside
it), or the machine's LAN IP for a physical device. Production builds ignore it, and the wiring never
runs under Jest; see `mobile/src/firebase/emulators.ts`.

### Running on a physical Android device

Two things differ from the emulator: the phone needs the emulator ports forwarded to the PC, and
React Native Firebase must stop rewriting the host to `10.0.2.2` (an emulator-only address).

`mobile/firebase.json` sets `react-native.android_bypass_emulator_url_remap`, so `localhost` is used
as given; it is read by the React Native Firebase Gradle plugin at build time, so a dev client built
before that file existed has to be rebuilt once.

```powershell
# once per connection (repeat after the phone reconnects)
adb reverse tcp:9099 tcp:9099
adb reverse tcp:8080 tcp:8080
adb reverse tcp:5001 tcp:5001
adb reverse tcp:9199 tcp:9199
adb reverse tcp:8081 tcp:8081

# Metro (host stays localhost, the reverse tunnel makes it reachable)
cd mobile
$env:EXPO_PUBLIC_FIREBASE_EMULATOR_HOST = "localhost"
npx expo start --dev-client --port 8081

# install the APK built by `npm run android:apk`, then open it on the dev server
npx expo run:android --binary "..\ormma-debug-arm64.apk" --device <serial> --port 8081
```

If the dev client opens its launcher instead of the project, launch it with the full deep link
(`exp+ormma://`, not `ormma://`, plus the explicit component):

```powershell
adb shell am start -W -a android.intent.action.VIEW `
  -d "exp+ormma://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" `
  -n com.ormma.app/.MainActivity
```

With the emulators running, `npm run seed` reads `users/*` and creates two parents per user (the user
is the owner member), medicines, today's dose events in every status and recent alerts. With no users
it seeds `demo-user` (phone `+919876500000`). Re-running
overwrites the same seeded documents; the script verifies the data over the emulator REST API before
exiting.

The Auth emulator does not send SMS and it does not accept a fixed code: each "Send code" issues a
real one-time code that only the emulator knows. Read it with `npm run otp`, which lists the codes
issued for the project (the newest is the valid one) from
`/emulator/v1/projects/demo-ormma/verificationCodes` on port 9099.

```powershell
npm run otp
# otp: +919876500000 -> 604364
```

## Release to the Play Store

The Android package is `com.ormma.app` (set in `mobile/app.json`). The full production checklist, secrets, Exotel, signing and Play Console steps are in [`docs/RELEASE.md`](RELEASE.md).

## Firebase console prerequisites (manual, Stage 2)

These steps live in the Firebase console and cannot be verified by tests; they are the first thing to check when login fails on a device:

1. **Enable Phone auth**: Firebase console → Authentication → Sign-in method → Phone → enable. Without it every OTP request fails.
2. **Register the apps**: add an Android app (package name from `mobile/app.json`) and an iOS app (bundle id from `mobile/app.json`) to the Firebase project so the config files exist.
3. **Android fingerprints**: register the Android app's SHA-1 **and** SHA-256 (`./gradlew signingReport`, or the Play-upload key's fingerprints later). Without them phone auth fails only on device, while all mocked tests stay green.
4. **Place the platform files**: put `google-services.json` at `mobile/android/app/google-services.json` (after `expo prebuild`) and `GoogleService-Info.plist` at `mobile/ios/GoogleService-Info.plist`. Both are gitignored; `.dist.example` placeholders show the expected shape. The `current_key` API key must be a real-looking key (`^A[\w-]{38}$`, e.g. `AIza…`); a placeholder like `"fake"` is rejected by `FirebaseInstallations`, which the Android Functions SDK touches before every callable, so calls fail with `code=unknown` and `Please set a valid API key`. For the local emulators any format-valid key works (`AIzaSyOrmmaLocalEmulatorDummyKey0000000`).
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

## Voice replies with Speech-to-Text (manual, Stage 7)

The STT adapter lives in `functions/src/voice/stt.ts`. It takes call audio in memory, uses the
parent's language, and returns a transcript plus confidence. Low confidence, missing confidence,
empty results and silence are not usable and must fall back to the DTMF prompt. Nothing is stored or
logged. It is wired into `processReply` in Stage 9; there is no HTTP endpoint in this stage.

1. **Secret**:
   ```
   firebase functions:secrets:set GOOGLE_STT_API_KEY   # key restricted to Cloud Speech-to-Text API
   ```
   Enable the Cloud Speech-to-Text API for the project and restrict the key to it. `STT_SECRETS`
   is exported for the function that will use it in Stage 8.
2. **Manual live verification** (needs Exotel recording/voice capture and a real phone): record a
   short Malayalam/Tamil/Hindi/English answer, confirm the transcript and confidence, then try a
   wrong-language answer and silence and confirm both are classified as not usable. Live voice
   capture needs a recording/voicebot applet; the current dashboard flow is DTMF-only.

## Reply structuring with Claude (manual, Stage 8)

The structuring module lives in `functions/src/reply/` and the versioned prompt in
`functions/src/prompts/replyStructuring.v1.ts`. It is not yet connected to an endpoint; Stage 9 adds
`processReply` and the Firestore writes. No transcript is logged by this module.

1. **Secret**:
   ```
   firebase functions:secrets:set ANTHROPIC_API_KEY   # Claude API key; never in the app or git
   ```
   `AI_SECRETS` is exported for the function that will call the model in Stage 9. Without the key,
   `createReplyModelClient` returns null so the caller can fall back to DTMF-only.
2. **API version**: the installed SDK (`@anthropic-ai/sdk` 1.1) sends API version `2026-10-21`,
   which rejects `temperature`, `top_p` and `top_k` with a 400. Do not add them back; the fixed
   prompt and strict schema provide stability instead.
3. **Eval** (manual, costs tokens):
   ```
   npm --prefix functions run eval:reply
   ```
   It builds the functions, runs all fixtures in `functions/test/fixtures/reply-transcripts.json`
   against the real model and prints fixture ids, per-field pass/fail and accuracy. It never prints
   transcripts. Run it before accepting any prompt change.
4. **Launch gate (manual)**: a native speaker reviews the urgent keyword lists in
   `functions/src/urgent-keywords.ts` and the `confirmationNote` instructions in the prompt; a doctor
   or pharmacist reviews the wording and the plausibility ranges. Record both reviews in
   `docs/DECISIONS.md` with role and date. Do not ship to real families before that.
5. **Review queue**: low confidence (< 0.6), implausible readings and invalid output after the
   single retry all return `needsReview: true` and `canApplyDoseStatus: false`. The caller must not
   change a dose status from those results; Stage 9 surfaces them for family review.
