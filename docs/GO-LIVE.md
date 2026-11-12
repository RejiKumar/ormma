# Going live: the exact order

Two phases. You can do phase 1 today, upload to Google Play, and do phase 2 whenever Exotel is ready. Nothing false is shown in between.

## Phase 1: publish the app while calls are not yet on (now)

The server has calling **off** by default. While it is off:

- no dose events are created, no call is placed, no missed-dose alert or evening digest is sent;
- the family app shows one calm note on Today: "Check-in calls will start soon.";
- sign-in, adding parents and medicines, invites and the rest of the app work as normal.

Steps:

1. Deploy the backend (this is the first deploy that includes these protections):
   ```bash
   cd functions
   npm run build
   cd ..
   firebase deploy --only functions,firestore:indexes,firestore:rules,storage --project ormma-prod
   ```
   Wait until the indexes show as Enabled in Firebase, then check **Functions** shows every function healthy.
2. Do **not** set `CALL_PROVIDER` yet. Leave it unset.
3. Upload the app to Play Console (`docs/PLAY-UPLOAD.md`) and test it from Internal testing.
4. Fix the Google Cloud billing account so it stays active (it stops SMS and the whole backend when it lapses).

## Phase 2: switch real calls on (after the Exotel recharge)

Do these in this order.

1. **Exotel account.** KYC and DLT finished, a virtual number (ExoPhone) assigned.
2. **Build the call flow** in the Exotel dashboard as described in `docs/EXOTEL-FLOW.md`.
3. **Set the secrets** (each command asks for the value; it never goes in git or the app):
   ```bash
   firebase functions:secrets:set EXOTEL_ACCOUNT_SID --project ormma-prod
   firebase functions:secrets:set EXOTEL_API_KEY --project ormma-prod
   firebase functions:secrets:set EXOTEL_API_TOKEN --project ormma-prod
   firebase functions:secrets:set EXOTEL_CALLER_ID --project ormma-prod
   firebase functions:secrets:set EXOTEL_FLOW_URL --project ormma-prod
   firebase functions:secrets:set EXOTEL_WEBHOOK_URL --project ormma-prod
   firebase functions:secrets:set EXOTEL_WEBHOOK_TOKEN --project ormma-prod
   firebase functions:secrets:set VOICE_PROMPT_TOKEN --project ormma-prod
   firebase functions:secrets:set VOICE_AUDIO_BASE_URL --project ormma-prod
   firebase functions:secrets:set GOOGLE_TTS_API_KEY --project ormma-prod
   firebase functions:secrets:set GOOGLE_STT_API_KEY --project ormma-prod
   firebase functions:secrets:set ANTHROPIC_API_KEY --project ormma-prod
   ```
   Test the Google keys first with `node functions/scripts/try-speech.mjs` (see the top of that file).
4. **Choose the go-live moment** and write both settings to `functions/.env.ormma-prod` (this file is ignored by git):
   ```
   CALL_PROVIDER=exotel
   CALLS_LIVE_FROM=2026-12-01T09:00:00+05:30
   ```
   Use a time a few minutes ahead. A dose scheduled before it is never called and never alerted.
5. **Redeploy** so the functions pick the settings and secrets up:
   ```bash
   firebase deploy --only functions --project ormma-prod
   ```
6. **Clear anything created while testing.** First a dry run, then apply, using the same time as `CALLS_LIVE_FROM`:
   ```bash
   cd functions
   npm run build
   node scripts/clear-prelive-events.mjs --project ormma-prod --before 2026-12-01T09:00:00+05:30
   node scripts/clear-prelive-events.mjs --project ormma-prod --before 2026-12-01T09:00:00+05:30 --apply
   ```
7. **Place one test call to your own phone.** Add yourself as a parent with a medicine due in a few minutes, and check:
   - the greeting and question are spoken in your language;
   - answering by voice marks the dose taken, and pressing 1 also works;
   - Today in the app stops showing the "calls will start soon" note.
   If a spoken answer is not applied, read `docs/EXOTEL-FLOW.md` section "Two things to check at the first test call".
8. **Remove the test access.** Firebase Auth: delete the test phone numbers. Project settings, your Android app: delete the debug SHA-1 and SHA-256 fingerprints (keep the upload key and the Play app-signing ones).
9. **Onboard the first families.**

## Checks you can repeat any time

- **Is calling on?** Open the app: the "calls will start soon" note on Today means it is off.
- **Is anything running while off?** The logs show `calling is off` lines from the scheduled functions, and no other writes.
- **Speech services:** `node functions/scripts/try-speech.mjs`.
