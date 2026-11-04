# Releasing Ormma to the Play Store

There is one environment: **production, which is `main`**. The Firebase project is `ormma-prod` (see
`.firebaserc`). Nothing below uses a staging project. The Android package is **`com.ormma.app`** and it
cannot change after the first upload to Play.

Do the sections in order. Items marked **[you]** need your accounts or secrets; I cannot do them.

---

## 1. Firebase project (`ormma-prod`) **[you]**

1. Console → create or open the project `ormma-prod`. Switch it to the **Blaze** plan (Functions v2,
   Cloud Scheduler and Secret Manager need billing). Add a budget alert.
2. Enable: **Authentication → Phone**, **Firestore** (location `asia-south1`, production mode),
   **Storage** (location `asia-south1`), **Cloud Messaging**. In Google Cloud also enable Cloud Functions,
   Cloud Scheduler, Secret Manager, Cloud Speech-to-Text and Cloud Text-to-Speech.
3. Authentication → Settings → **SMS region policy**: allow only India (and any country your family
   members sign in from). Authentication → Phone → add a **test phone number** with a fixed code for the
   Play reviewers (section 8). Keep the list to one or two numbers.
4. **Register the Android app**: Project settings → Add app → Android → package `com.ormma.app`.
   Download `google-services.json` and save it as `mobile/google-services.json` (it is git-ignored).
   Do the same for iOS later (`GoogleService-Info.plist`).
5. **SHA fingerprints** (needed for phone auth on real devices). Add both, after section 6 and section 8:
   - SHA-1 and SHA-256 of your **upload key**
   - SHA-1 and SHA-256 of the **Play App Signing key** (Play Console → Release → Setup → App signing)
   Re-download `google-services.json` after adding them.
6. **App Check** (recommended): register the Android app with **Play Integrity**, then enforce it for
   Firestore, Storage and Functions once the first release is live.

## 2. Secrets **[you]**

All secrets live in Secret Manager. Set each one with the Firebase CLI. The function code reads exactly
these names:

```bash
firebase use prod
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set EXOTEL_ACCOUNT_SID
firebase functions:secrets:set EXOTEL_API_KEY
firebase functions:secrets:set EXOTEL_API_TOKEN
firebase functions:secrets:set EXOTEL_CALLER_ID
firebase functions:secrets:set EXOTEL_FLOW_URL
firebase functions:secrets:set EXOTEL_WEBHOOK_URL
firebase functions:secrets:set EXOTEL_WEBHOOK_TOKEN
firebase functions:secrets:set GOOGLE_STT_API_KEY
firebase functions:secrets:set GOOGLE_TTS_API_KEY
firebase functions:secrets:set VOICE_PROMPT_TOKEN
firebase functions:secrets:set VOICE_AUDIO_BASE_URL
```

| Secret | Where the value comes from |
| --- | --- |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys. Create a key just for Ormma and set a spend limit. |
| `EXOTEL_ACCOUNT_SID` | Exotel dashboard → API settings (Account SID). |
| `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN` | Exotel dashboard → API settings → create API credentials. |
| `EXOTEL_CALLER_ID` | Your Exotel virtual number (ExoPhone) in E.164, for example `+9180xxxxxxxx`. |
| `EXOTEL_FLOW_URL` | The URL of the Exotel call flow (app) you create in section 3. |
| `EXOTEL_WEBHOOK_URL` | Public URL of the deployed webhook function (printed by `firebase deploy`, section 4). |
| `EXOTEL_WEBHOOK_TOKEN` | Any long random string (`openssl rand -hex 32`). Exotel sends it back so the function can trust the call. Put the same token in the Exotel flow's webhook URL. |
| `GOOGLE_STT_API_KEY`, `GOOGLE_TTS_API_KEY` | Google Cloud → APIs and Services → Credentials → create API keys. **Restrict** each key to its one API. |
| `VOICE_PROMPT_TOKEN` | Another long random string, used to protect the prompt endpoint. |
| `VOICE_AUDIO_BASE_URL` | `https://asia-south1-ormma-prod.cloudfunctions.net/voiceAudio` |

Never put any of these in the app, in git, or in a `.env` that is committed.

## 3. Exotel **[you]**

1. Create the Exotel account and finish **KYC**. Outbound calls in India also need **DLT**
   registration for the entity and the call/SMS templates (Exotel support guides this; allow several
   days).
2. Buy or assign an **ExoPhone** (virtual number). Its number is `EXOTEL_CALLER_ID`.
3. Build the call flow (Exotel "app"): connect the call, play the prompt from the voice prompt
   endpoint, collect DTMF, and call back the webhook URL with the token. Copy the flow URL into
   `EXOTEL_FLOW_URL`.
4. Point the status callback at `EXOTEL_WEBHOOK_URL` (with `?token=<EXOTEL_WEBHOOK_TOKEN>` if your flow
   adds it as a parameter).
5. Turn real calls on in production: set the function environment `CALL_PROVIDER=exotel`
   (otherwise the log-only provider is used and no call is placed).
6. Place one test call to your own phone before adding any family.

## 4. Deploy backend **[you]**

```bash
npm install && npm --prefix functions install
npm --prefix functions run build
npm run test:rules          # emulator tests must pass first
firebase deploy --only functions,firestore:rules,firestore:indexes,storage:rules --project prod
```

Write down the deployed URLs for the webhook and `voiceAudio`, then finish `EXOTEL_WEBHOOK_URL` and
`VOICE_AUDIO_BASE_URL` in section 2 and redeploy functions once.

## 5. App configuration

Already done in the repo (`mobile/app.json` and `mobile/plugins`): package `com.ormma.app`,
`versionCode` 1, `allowBackup` off, `POST_NOTIFICATIONS` added, `SYSTEM_ALERT_WINDOW` and storage
permissions removed, release signing wired to your upload key.

Still **[you]**: replace `mobile/google-services.json` with the real file from section 1, and make sure
`EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` is **not set** when you build (production builds ignore it, but do
not rely on that).

## 6. Upload key **[you]**

Create the key once and keep it safe. Losing it means a support request to reset the Play upload key.

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore ormma-upload.jks -alias ormma-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Store `ormma-upload.jks` outside the repo, in a password manager or encrypted backup. Then create
`mobile/keystore.properties` (git-ignored):

```properties
storeFile=C:/secure/ormma-upload.jks
storePassword=...
keyAlias=ormma-upload
keyPassword=...
```

(or set `ORMMA_UPLOAD_STORE_FILE`, `ORMMA_UPLOAD_STORE_PASSWORD`, `ORMMA_UPLOAD_KEY_ALIAS`,
`ORMMA_UPLOAD_KEY_PASSWORD` in the environment). Print the fingerprints for Firebase:

```bash
keytool -list -v -keystore ormma-upload.jks -alias ormma-upload
```

## 7. Build the release bundle

Play wants an **`.aab`**, not an `.apk`.

```powershell
cd mobile
npx expo prebuild --platform android --clean     # regenerates android/ from app.json and the plugins
cd ..
npm run android:prepare                           # creates the short D:\nm junction (Windows long paths)
cd mobile\android
.\gradlew.bat :app:bundleRelease
```

Output: `mobile/android/app/build/outputs/bundle/release/app-release.aab`. A release build without a
configured upload key fails on purpose; it never falls back to the debug key. Raise `versionCode` in
`mobile/app.json` for every upload.

Smoke-test the exact release build before uploading: install the `.aab` through `bundletool`, or build
`:app:assembleRelease` and install the APK on a real phone and sign in with a real SMS.

## 8. Play Console **[you]**

1. **Developer account**: play.google.com/console, one-time fee, identity verification. A *personal*
   account created recently must run a **closed test with at least 12 testers for 14 days** before it can
   apply for production. An *organisation* account does not have that requirement.
2. **Create app**: name `Ormma`, default language, App (not game), Free, accept the declarations.
3. **Set up your app → App content** (all required):
   - **Privacy policy**: host `docs/PRIVACY-POLICY.md` (after legal review) at a public URL and paste it.
   - **App access**: login is by phone code, so give reviewers the **Firebase test phone number and its
     fixed code** from section 1, with one line on how to sign in.
   - **Ads**: no.
   - **Content rating**: complete the questionnaire (no violence, no user-generated public content).
   - **Target audience**: 18 and over.
   - **Data safety**: see the table below.
   - **Health apps declaration**: the app manages medication reminders for family care, so complete it
     honestly. State that it is not a medical device and gives no medical advice.
   - Government, financial features, news: not applicable.
4. **Store listing**: title, short description (80 chars), full description (4000), app icon 512x512,
   feature graphic 1024x500, at least 2 phone screenshots (use the real app; include the Today screen with
   the disclaimer visible). Contact email and website.
5. **Release**: Testing → **Internal testing** → create release → upload `app-release.aab` → release
   notes → roll out. Add your testers' emails. Check the Pre-launch report. Then **Closed testing**, then
   **Production** with a staged rollout (for example 10 percent first).
6. After the first upload, copy the **Play App Signing SHA-1 and SHA-256** into Firebase (section 1.5),
   download the new `google-services.json`, bump `versionCode` and ship that build.

### Data safety answers

| Data | Collected | Shared | Why | Notes |
| --- | --- | --- | --- | --- |
| Phone number | Yes | No | Account sign-in, calling the parent | The parent's number is stored in E.164 |
| Name | Yes | No | Family display | Parent and member display names |
| Health info (medicines, dose status, readings the parent reports) | Yes | No | App functionality | Not used for ads; not sold |
| Voice or audio | Not stored | Processed by Google Speech services | App functionality | Call audio is processed in memory and not recorded |
| Device or app ids (FCM token) | Yes | No | Push notifications | |
| Approximate activity (member last seen) | Yes | No | App functionality | One timestamp per member, no location |
| Third-party contacts (emergency contacts) | Yes | No | App functionality | Entered by the family owner |

Encryption in transit: yes. Users can request deletion: yes (Family tab → Delete parent, and Export data).
Re-check these answers against `docs/PRIVACY-POLICY.md` before submitting.

## 9. Before you press Production

- [ ] `docs/PRELAUNCH-CHECKLIST.md` is fully ticked
- [ ] Rules and functions deployed to `ormma-prod`, secrets set, `CALL_PROVIDER=exotel`
- [ ] One real call placed and answered; a missed-dose alert and push notification received
- [ ] Release build installed from Play internal testing on a real phone and signed in by real SMS
- [ ] Consent flow, export and delete tried with a real owner account
- [ ] Privacy policy URL live; Data safety and Health apps forms submitted
- [ ] Upload key and passwords backed up in two places
