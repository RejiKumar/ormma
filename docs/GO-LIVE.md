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
2b. **Anthropic credit.** Claude Console shows an organization balance; at $0.00 the API refuses every request (status 400), so prescription reading, spoken-reply structuring and the weekly summary all fail. Add funds and turn on auto-reload, and check under Keys that `ANTHROPIC_API_KEY` belongs to the same organization.
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

## Using Twilio instead of Exotel

If Exotel is not available to you, `CALL_PROVIDER=twilio` runs the same calls through Twilio. Phase 1 is
unchanged. In phase 2, follow `docs/TWILIO-FLOW.md` in place of the Exotel steps (account, secrets, settings,
deploy, test call). Note that Twilio calls India from a foreign number, so the parent sees an international caller id.

## Checks you can repeat any time

- **Readiness:** `npm run check:go-live` (or `node scripts/check-go-live.mjs`). It checks the 12 secrets exist, the settings file, that the call functions are deployed and that the public endpoints answer and refuse a request without a token. It changes nothing and cannot read secret values, so a placeholder still shows as set: the test call in step 7 is what proves the Exotel values.
- **Is calling on?** Open the app: the "calls will start soon" note on Today means it is off.
- **Is anything running while off?** The logs show `calling is off` lines from the scheduled functions, and no other writes.
- **Speech services:** `node functions/scripts/try-speech.mjs`.
