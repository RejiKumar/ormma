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
| `PLAY_SERVICE_ACCOUNT_JSON` | The JSON key of the service account created in section 8b (Google Cloud IAM → Service accounts → Keys). Paste the whole file as the secret value. |
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
| Other user content (read receipts, notification preferences, relationship and city) | Yes | No | App functionality | Who viewed a dose update and when; three notification toggles; a member's own relationship and city; no precise location |
| Third-party contacts (emergency contacts) | Yes | No | App functionality | Entered by the family owner |
| Purchase history | Yes | No | App functionality | The plan, product and end date, and a one-way hash of the purchase token; payment itself is handled by Google Play |

Encryption in transit: yes. Users can request deletion: yes (Family tab → Settings → Delete account, Delete parent, and Export data). Play also asks for a web page where a user can request account deletion: use the published privacy policy page and say that deletion is in the app under Settings, or give a support email.
Re-check these answers against `docs/PRIVACY-POLICY.md` before submitting.

## 8b. Subscriptions (Google Play Billing)

The app sells one subscription, Ormma Family, monthly and yearly. Prices below are the agreed ones; Google Play is the merchant of record and handles tax.

1. **Merchant profile.** Play Console → Setup → Payments profile: complete it so the app can sell subscriptions.
2. **Create the products.** Play Console → your app → Monetize → Subscriptions → Create subscription:
   - Product ID `ormma_family_monthly`, name "Ormma Family monthly", one base plan: monthly auto-renewing, price ₹299.
   - Product ID `ormma_family_yearly`, name "Ormma Family yearly", one base plan: yearly auto-renewing, price ₹2,999.
   - The ids must match `PRODUCT_IDS` in `mobile/src/billing/billing.ts` and `functions/src/subscription/play.ts` exactly. Activate both base plans.
3. **Service account for verification.**
   - Google Cloud console (the project linked to Play) → IAM → Service accounts → create `ormma-play-verifier` (no roles needed in Cloud).
   - Enable the **Google Play Android Developer API** in that Cloud project.
   - Play Console → Users and permissions → Invite new users → paste the service account email → app permissions: this app → grant **View financial data** and **Manage orders and subscriptions**.
   - Create a JSON key for the service account and store it as the secret `PLAY_SERVICE_ACCOUNT_JSON` (section 2). Never commit it.
4. **Real-time developer notifications.**
   - Google Cloud → Pub/Sub → create topic `play-billing-events` in the Firebase project.
   - Grant `google-play-developer-notifications@system.gserviceaccount.com` the role Pub/Sub Publisher on that topic.
   - Play Console → Monetize → Monetization setup → Real-time developer notifications → topic `projects/ormma-prod/topics/play-billing-events`, notification type: subscriptions only. Use "Send test notification".
   - Deploy functions so `playBillingEvents` subscribes to that topic (`firebase deploy --only functions`).
5. **Indexes.** `firebase deploy --only firestore:indexes` creates the new indexes for `parents(createdBy, createdAt)` and `invites(parentId, usedBy, expiresAt)`. Wait until they show as Enabled.
6. **Test before launch (needs a real phone).**
   - Play Console → Setup → License testing: add the tester Google accounts.
   - Upload a build to the Internal testing track and install it from the Play link (purchases do not work from a sideloaded debug build or the emulator).
   - Buy monthly with a licence tester account (it renews every few minutes in test mode). Check that `subscriptions/{uid}` appears, the Settings plan row shows Ormma Family, and a second parent can be added.
   - Cancel in Play and confirm the plan stays until the end date; refund a test order and confirm the plan ends at once; reinstall and use Restore purchases.
7. **Legal pages.** Publish `docs/PRIVACY-POLICY.md` and `docs/TERMS.md` as web pages (after legal review), then put the two URLs into `mobile/src/legal/legalConfig.ts` and into Play Console (Privacy policy URL; and the Terms link in the store listing description). Run `node scripts/build-legal.mjs` after any edit to those documents so the in-app text matches.
8. **Cost check.** Replace the assumed ₹5 to ₹10 per call with Exotel's rate card in `docs/PRELAUNCH-CHECKLIST.md` and confirm the free limits still make sense.

## 9. Before you press Production

- [ ] `docs/PRELAUNCH-CHECKLIST.md` is fully ticked
- [ ] Rules and functions deployed to `ormma-prod`, secrets set, `CALL_PROVIDER=exotel`
- [ ] One real call placed and answered; a missed-dose alert and push notification received
- [ ] Release build installed from Play internal testing on a real phone and signed in by real SMS
- [ ] Consent flow, export and delete tried with a real owner account
- [ ] Privacy policy URL live; Data safety and Health apps forms submitted
- [ ] Upload key and passwords backed up in two places
