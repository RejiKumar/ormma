# Releasing Ormma to the Play Store

There is one environment: **production, which is `main`**. The Firebase project is `ormma-prod` (see
`.firebaserc`). Nothing below uses a staging project. The Android package is **`com.ormma.app`** and it
cannot change after the first upload to Play.

Do the sections in order. Items marked **[you]** need your accounts or secrets; I cannot do them.

**Current build:** 1.0.1, `versionCode` 2 (`release/ormma-1.0.1-vc2.aab`). The short upload path is
[PLAY-UPLOAD.md](PLAY-UPLOAD.md); what to check before Production is section 9 and
[PRELAUNCH-CHECKLIST.md](PRELAUNCH-CHECKLIST.md); the go-live order is [GO-LIVE.md](GO-LIVE.md).

## Links

- Play Console: <https://play.google.com/console>
- Firebase console (`ormma-prod`): <https://console.firebase.google.com/project/ormma-prod/overview>
- Authentication: <https://console.firebase.google.com/project/ormma-prod/authentication/providers>
- Project settings (fingerprints, `google-services.json`): <https://console.firebase.google.com/project/ormma-prod/settings/general>
- Firestore data: <https://console.firebase.google.com/project/ormma-prod/firestore>
- Cloud Functions (logs): <https://console.cloud.google.com/functions/list?project=ormma-prod>
- Cloud Scheduler: <https://console.cloud.google.com/cloudscheduler?project=ormma-prod>
- Secret Manager: <https://console.cloud.google.com/security/secret-manager?project=ormma-prod>
- Pub/Sub topics: <https://console.cloud.google.com/cloudpubsub/topic/list?project=ormma-prod>
- Google Cloud billing: <https://console.cloud.google.com/billing>
- Testing Google Play Billing: <https://developer.android.com/google/play/billing/test>
- bundletool (install an `.aab` locally): <https://github.com/google/bundletool/releases>
- Repository: <https://github.com/RejiKumar/ormma>

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
5. Turn real calls on in production with `CALL_PROVIDER=exotel` and `CALLS_LIVE_FROM=<ISO time>` in `functions/.env.ormma-prod`, then redeploy. Without them calling is **off**: nothing is generated, called or alerted, and the app shows "Check-in calls will start soon.". The exact order is in `docs/GO-LIVE.md`.
6. Place one test call to your own phone before adding any family.

## 4. Deploy backend **[you]**

```bash
npm install && npm --prefix functions install
npm --prefix functions run build
npm run test:rules          # emulator tests must pass first
firebase deploy --only functions,firestore:rules,firestore:indexes,storage --project prod
```

Write down the deployed URLs for the webhook and `voiceAudio`, then finish `EXOTEL_WEBHOOK_URL` and
`VOICE_AUDIO_BASE_URL` in section 2 and redeploy functions once.

## 5. App configuration

Already done in the repo (`mobile/app.json` and `mobile/plugins`): package `com.ormma.app`,
`versionCode` 2 (version 1.0.1; raise it for every upload with `node scripts/bump-version.mjs`), `allowBackup` off, `POST_NOTIFICATIONS` added, `SYSTEM_ALERT_WINDOW` and storage
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
`mobile/app.json` for every upload (`node scripts/bump-version.mjs`).

The shortcut on this machine is `.\scripts\release-build.ps1` (the `.aab`, production Firebase config,
upload key) and `.\scripts\release-apk.ps1` (a small arm64 APK for a sideload test, same key). Both swap
in `mobile\google-services.prod.json` for the build and put the test file back afterwards.

**Check the version before you upload.** The `android/` folder is generated from `mobile/app.json` by
`expo prebuild`. If you raised `versionCode` and did not prebuild, the bundle still carries the old number
and Play rejects it ("version code already used"). Either run the prebuild above, or confirm that
`mobile/android/app/build.gradle` shows the new `versionCode` and `versionName` before building. Play shows
the version it read on the release page; stop there if it is not the one you expect.

A sideloaded APK cannot be installed over a copy that was signed with a different key (the debug key,
for example): Android refuses with "signatures do not match". Uninstall the old copy first, which signs you
out; your data stays in Firebase.

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
| Photos (a scanned prescription page) | Yes, only while a review is open | Processed by an AI service provider on our behalf | App functionality | Uploaded when an owner or editor scans a prescription, read to list the medicines, deleted when the review ends; never used for ads |
| Voice or audio | Not stored | Processed by Google Speech services | App functionality | Call audio is processed in memory and not recorded |
| Device or app ids (FCM token) | Yes | No | Push notifications | |
| Approximate activity (member last seen) | Yes | No | App functionality | One timestamp per member, no location |
| Other user content (read receipts, notification preferences, relationship and city) | Yes | No | App functionality | Who viewed a dose update and when; three notification toggles; a member's own relationship and city; no precise location |
| Third-party contacts (emergency contacts) | Yes | No | App functionality | Entered by the family owner |
| Purchase history | Yes | No | App functionality | The plan, product and end date, and a one-way hash of the purchase token; payment itself is handled by Google Play |

Encryption in transit: yes. Users can request deletion: yes (Family tab → Settings → Delete account, Delete parent, and Export data). Play also asks for a web page where a user can request account deletion: use `https://ormma-prod.web.app/delete-account` (built from `docs/ACCOUNT-DELETION.md` by `node scripts/build-legal-site.mjs`, published with `firebase deploy --only hosting --project ormma-prod`). Check the page loads before you submit the form.
Re-check these answers against `docs/PRIVACY-POLICY.md` before submitting.

## 8b. Subscriptions (Google Play Billing)

The app sells one subscription, Ormma Family, monthly and yearly. Prices below are the agreed ones; Google Play is the merchant of record and handles tax.

1. **Merchant profile.** Play Console → Setup → Payments profile: complete it so the app can sell subscriptions.
2. **Create the products.** Play Console → your app → Monetize → Subscriptions → Create subscription:
   - Product ID `ormma_family_monthly`, name "Ormma Family monthly", one base plan: monthly auto-renewing, price ₹299.
   - Product ID `ormma_family_yearly`, name "Ormma Family yearly", one base plan: yearly auto-renewing, price ₹2,999.
   - The ids must match `PRODUCT_IDS` in `mobile/src/billing/billing.ts` and `functions/src/subscription/play.ts` exactly. Activate both base plans.
   - **Free trial (optional, `subscription-polish`).** On each base plan: Add offer → **Free trial** → 7 days, eligibility "New customer acquisition" (Google then shows it only to accounts that have never had the subscription). Give the offer the **offer tag `trial`** (the server reads this tag to mark a purchase as a trial). Activate the offer. The app shows a trial only when Google Play returns one, so leaving this out simply means no trial wording.
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
   - With a trial offer active, the buy button says "Start free trial" and the card says "7 days free, then ₹299.00 per month". After buying, the Plan screen says "Free trial until <date>"; after the first renewal it says "Renews on <date>". Cancel and it says "Cancelled. Ormma Family stays active until <date>."
   - Cancel in Play and confirm the plan stays until the end date; refund a test order and confirm the plan ends at once; reinstall and use Restore purchases.
7. **Legal pages.** Publish `docs/PRIVACY-POLICY.md` and `docs/TERMS.md` as web pages (after legal review), then put the two URLs into `mobile/src/legal/legalConfig.ts` and into Play Console (Privacy policy URL; and the Terms link in the store listing description). Run `node scripts/build-legal.mjs` after any edit to those documents so the in-app text matches.
8. **Cost check.** Replace the assumed ₹5 to ₹10 per call with Exotel's rate card in `docs/PRELAUNCH-CHECKLIST.md`. The Free plan now calls every dose time (decision 187), so the cost of a Free family is every dose time of every day; the paid plan differs only in parents (3) and members (6). Decide whether that is sustainable, or whether Family needs another benefit.

## 8c. Languages, calls and pushes (1.0.1)

- The app follows the phone's language (Malayalam, Tamil, Hindi, English) and Settings, App language overrides it. The choice is stored on the phone, and the app also writes it to `users/{uid}.language` so the server can write each member's pushes and the 8 PM digest in their language. **Deploy `firestore:rules` before the app build reaches users**, because the rules now allow that field (`firebase deploy --only firestore:rules --project ormma-prod`), then deploy functions.
- The parent's call language is separate: Family tab, the parent's card, Parent details, Language for calls (owner only). The next call uses it.
- The text of the Terms and Privacy pages is English in every language.
- The Malayalam, Tamil and Hindi wording (app, pushes, call script) is machine-drafted. Have a fluent speaker of each language read it before you promote beyond Internal testing, and record who reviewed it in `docs/DECISIONS.md`.

## 9. Before you press Production

- [ ] `docs/PRELAUNCH-CHECKLIST.md` is fully ticked
- [ ] Rules and functions deployed to `ormma-prod`, secrets set, `CALL_PROVIDER=exotel` and `CALLS_LIVE_FROM` set (`docs/GO-LIVE.md`)
- [ ] One real call placed and answered; a missed-dose alert and push notification received
- [ ] Release build installed from Play internal testing on a real phone and signed in by real SMS
- [ ] The Play purchase test of section 8b done on that phone (trial wording, buy, cancel, refund, restore)
- [ ] A call in Malayalam (or Tamil or Hindi) answered and a missed-dose push received in the same language
- [ ] Malayalam, Tamil and Hindi wording reviewed by a fluent speaker of each
- [ ] Consent flow, export and delete tried with a real owner account
- [ ] Privacy policy URL live; Data safety and Health apps forms submitted
- [ ] Upload key and passwords backed up in two places
