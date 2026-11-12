# Play upload sheet: Ormma 1.0.0 (versionCode 1)

The bundle: `release/ormma-1.0.0-vc1.aab` (a copy of `mobile/android/app/build/outputs/bundle/release/app-release.aab`).
Package `com.ormma.app`, minSdk 24, targetSdk 36, production Firebase config (`ormma-prod`), signed with the upload key
(SHA-256 `91:8F:54:A8:1E:C5:10:E8:3A:73:74:FB:A0:66:35:95:5E:97:00:9C:F1:E2:E1:38:9F:6C:04:86:D4:D1:01:69`).

Every later upload needs a higher `versionCode` in `mobile/app.json`. This full guide is `docs/RELEASE.md` section 8; this sheet is the short path.

## 1. First upload to Internal testing

1. Play Console, Create app: name Ormma, App, Free, accept the declarations. (One-time developer fee and identity verification if not done.)
2. Testing, Internal testing, Testers: create a list with your Google account emails, save.
3. Internal testing, Create new release. When asked about Play App Signing, accept it (the default).
4. Upload `release/ormma-1.0.0-vc1.aab`. Release name `1.0.0 (1)`. Release notes: "First internal build."
5. Next, Save, then Start rollout to Internal testing. (Play may ask you to finish App content first; see section 3.)
6. Open the Testers tab, copy the opt-in link, open it on a phone signed in with a tester account, and install from Play.

## 2. Right after the first upload (needed for real SMS sign-in)

Play re-signs the app with its own key, so the upload key's fingerprints no longer match what users run.

1. Play Console, your app, Test and release, Setup, App signing (older consoles: Setup, App integrity). Copy the **App signing key certificate** SHA-1 and SHA-256.
2. Firebase console, `ormma-prod`, Project settings, Your apps, `com.ormma.app`, Add fingerprint: add both. Keep the upload-key pair too.
3. Download the new `google-services.json` and replace `mobile/google-services.prod.json` with it.
4. Raise `versionCode` to 2 in `mobile/app.json`, run `.\scripts\release-build.ps1`, upload that build to Internal testing.
5. On the phone, install from the Play link and sign in with a real number (not a Firebase test number). This is the test that matches real users.

## 3. App content (required before Production, and before wider tracks)

Privacy policy URL; App access (give the Firebase test number and its fixed code); Ads: no; Content rating questionnaire; Target audience 18+; Data safety (table in `docs/RELEASE.md`); Health apps declaration (not a medical device, no medical advice). Then Store listing: title, short and full description, 512x512 icon, 1024x500 feature graphic, at least 2 phone screenshots.

## 4. Subscriptions

Monetize, Subscriptions: `ormma_family_monthly` at Rs 299 and `ormma_family_yearly` at Rs 2,999, base plans active. Details and the service account, Pub/Sub topic and licence testers are in `docs/RELEASE.md` section 8b.

## 5. After testing

Closed testing next (a personal developer account needs 12 testers for 14 days before Production), then Production with a staged rollout. Before pressing Production, tick `docs/PRELAUNCH-CHECKLIST.md`.

Keep billing healthy first: a past-due Google Cloud billing account stops real SMS, Cloud Functions and the scheduled jobs.
