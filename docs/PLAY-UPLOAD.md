# Play upload sheet: Ormma 1.0.1 (versionCode 2)

The bundle: `release/ormma-1.0.1-vc2.aab` (a copy of `mobile/android/app/build/outputs/bundle/release/app-release.aab`).
Package `com.ormma.app`, minSdk 24, targetSdk 36, production Firebase config (`ormma-prod`), signed with the upload key
(SHA-256 `91:8F:54:A8:1E:C5:10:E8:3A:73:74:FB:A0:66:35:95:5E:97:00:9C:F1:E2:E1:38:9F:6C:04:86:D4:D1:01:69`).

Every later upload needs a higher `versionCode` in `mobile/app.json` (`node scripts/bump-version.mjs` does it). This full guide is [RELEASE.md](RELEASE.md) section 8; this sheet is the short path.

| Build | versionName | versionCode | What it adds |
| --- | --- | --- | --- |
| first internal build | 1.0.0 | 1 | Check-in calls, family app, plans and Google Play billing |
| this build | 1.0.1 | 2 | App in Malayalam, Tamil and Hindi (Settings, App language); pushes and the evening digest in each member's language; call language editable in Parent details; Free plan calls every dose time; prescription scanner; layout fixes in the three scripts |

## Links

- Play Console: <https://play.google.com/console>
- Firebase console, `ormma-prod`: <https://console.firebase.google.com/project/ormma-prod/overview>
- Firebase Authentication (phone sign-in, test numbers): <https://console.firebase.google.com/project/ormma-prod/authentication/providers>
- Firebase project settings (app fingerprints, `google-services.json`): <https://console.firebase.google.com/project/ormma-prod/settings/general>
- Cloud Functions logs: <https://console.cloud.google.com/functions/list?project=ormma-prod>
- Cloud Scheduler: <https://console.cloud.google.com/cloudscheduler?project=ormma-prod>
- Secret Manager: <https://console.cloud.google.com/security/secret-manager?project=ormma-prod>
- Pub/Sub topics (`play-billing-events`): <https://console.cloud.google.com/cloudpubsub/topic/list?project=ormma-prod>
- Testing Google Play Billing (licence testers): <https://developer.android.com/google/play/billing/test>
- Repository: <https://github.com/RejiKumar/ormma>
- Docs: [RELEASE.md](RELEASE.md), [GO-LIVE.md](GO-LIVE.md), [PRELAUNCH-CHECKLIST.md](PRELAUNCH-CHECKLIST.md), [PRIVACY-POLICY.md](PRIVACY-POLICY.md), [TERMS.md](TERMS.md), [INCIDENT.md](INCIDENT.md)

## 1. Upload to Internal testing

1. Play Console, Create app (once): name Ormma, App, Free, accept the declarations. (One-time developer fee and identity verification if not done.)
2. Testing, Internal testing, Testers: a list with your Google account emails (and the licence testers, section 4), save.
3. Internal testing, Create new release. Accept Play App Signing when asked (the default).
4. Upload `release/ormma-1.0.1-vc2.aab`. Check that Play shows versionCode 2. Release name `1.0.1 (2)`. Release notes (shown to testers):
   - "The app now works in Malayalam, Tamil and Hindi: Settings, App language."
   - "Reminders and the evening update arrive in each family member's language."
   - "The parent's call language can be changed in Parent details."
   - "Check-in calls now go out for every dose time on every plan."
   - "Scan a prescription page to add medicines (you confirm each one)."
5. Next, Save, then Start rollout to Internal testing. (Play may ask you to finish App content first; see section 3.)
6. Open the Testers tab, copy the opt-in link, open it on a phone signed in with a tester account, and install from Play. This replaces any sideloaded copy, so you sign in again.

## 2. Right after the first upload (needed for real SMS sign-in)

Play re-signs the app with its own key, so the upload key's fingerprints no longer match what users run. Skip what is already done.

1. Play Console, your app, Test and release, Setup, App signing (older consoles: Setup, App integrity). Copy the **App signing key certificate** SHA-1 and SHA-256.
2. Firebase console, `ormma-prod`, Project settings, Your apps, `com.ormma.app`, Add fingerprint: add both. Keep the upload-key pair too.
3. Download the new `google-services.json` and replace `mobile/google-services.prod.json` with it.
4. Build again (`.\scripts\release-build.ps1`) if the file changed, and upload.
5. On the phone, install from the Play link and sign in with a real number (not a Firebase test number). This is the test that matches real users.

## 3. App content (required before Production, and before wider tracks)

Privacy policy URL; App access (give the Firebase test number and its fixed code); Ads: no; Content rating questionnaire; Target audience 18+; Data safety (table in [RELEASE.md](RELEASE.md)); Health apps declaration (not a medical device, no medical advice). Then Store listing: title, short and full description, 512x512 icon, 1024x500 feature graphic, at least 2 phone screenshots. Good screenshots now: Today in English and in Malayalam, Plans, Parent details with the call-language list.

## 4. Subscriptions and the purchase test

Monetize, Subscriptions: `ormma_family_monthly` at Rs 299 and `ormma_family_yearly` at Rs 2,999, base plans active, the 7-day `trial` offer on each. Service account, Pub/Sub topic and the step-by-step purchase test are in [RELEASE.md](RELEASE.md) section 8b. Purchases only work from a build installed through Play, never a sideloaded APK.

## 5. Before the language and call checks

Deploy in this order, then install the new build: `firebase deploy --only firestore:rules --project ormma-prod`, then `firebase deploy --only functions --project ormma-prod`. The rules go first because the app saves each member's language to their user record. Then set the parent's call language in Parent details, and check one call and one missed-dose push in that language ([GO-LIVE.md](GO-LIVE.md)).

## 6. After testing

Closed testing next (a personal developer account needs 12 testers for 14 days before Production), then Production with a staged rollout (about 10 percent first). Before pressing Production, tick [PRELAUNCH-CHECKLIST.md](PRELAUNCH-CHECKLIST.md).

Keep billing healthy first: a past-due Google Cloud billing account stops real SMS, Cloud Functions and the scheduled jobs.
