# Twilio: run the check-in calls on Twilio instead of Exotel

Use this when Exotel is not available to you (for example it asks for business documents you do not have).
Exactly one provider is active at a time, chosen by `CALL_PROVIDER` (`exotel` or `twilio`). Switching back is one
setting and a redeploy.

## Read this first

- **The parent sees an international number.** Twilio can call India only from a non-Indian number, so the phone
  shows a foreign caller id. Many elderly people do not answer those. Test with a real parent before relying on it.
- **A Twilio trial account** can call only phone numbers you have verified, and plays a short trial message before
  the call. That is fine for the end-to-end test, not for families.
- **Rules and cost.** Confirm Twilio's current rate card for calls to India, and confirm yourself that automated
  calls to Indian numbers from abroad are allowed under the current TRAI rules.
- **No dashboard flow.** Unlike Exotel, there is nothing to build in Twilio's dashboard. The call script is returned
  by our `twilioVoice` function, one step per request.

## 1. Twilio account

1. Sign up at https://www.twilio.com with your email and a card. Verify your own mobile number when asked.
2. **Console → Phone Numbers → Buy a number** (a US number is typical) that can make voice calls. On a trial
   account you get one trial number. Note it in E.164 form, for example `+1…`.
3. **Console → Account info** shows the **Account SID** and the **Auth Token**. Keep them private. They go into
   Firebase secrets only, never into chat, git or the app.
4. On a trial account: **Verified Caller IDs** must include the number you will call (your own phone).

## 2. Secrets and settings

```
firebase functions:secrets:set TWILIO_ACCOUNT_SID --project ormma-prod
firebase functions:secrets:set TWILIO_AUTH_TOKEN --project ormma-prod
firebase functions:secrets:set TWILIO_FROM_NUMBER --project ormma-prod
```

`TWILIO_FROM_NUMBER` is the Twilio number from step 1, in E.164 form. The voice and AI secrets (`VOICE_PROMPT_TOKEN`,
`VOICE_AUDIO_BASE_URL`, `GOOGLE_TTS_API_KEY`, `GOOGLE_STT_API_KEY`, `ANTHROPIC_API_KEY`) are the same ones Exotel uses.

Then write `functions/.env.ormma-prod` (ignored by git):

```
CALL_PROVIDER=twilio
TWILIO_PUBLIC_BASE_URL=https://asia-south1-ormma-prod.cloudfunctions.net
CALLS_LIVE_FROM=2026-12-01T09:00:00+05:30
```

`TWILIO_PUBLIC_BASE_URL` must be the public address of the functions, with no trailing slash. Twilio signs requests
for this exact address, and we check the signature against it.

## 3. Deploy and check

```
firebase deploy --only functions --project ormma-prod
npm run check:go-live
```

The check reads `CALL_PROVIDER` from the settings file and verifies the Twilio secrets, the settings, that
`twilioVoice` and `twilioStatus` are deployed, and that they refuse an unsigned request. It cannot read secret values.
All functions that read the call secrets now also declare the Twilio ones, so the deploy asks for them if they do
not exist yet: set them first (step 2) so it does not stop to prompt.

## 4. How a call runs

1. The dispatcher starts the call with Twilio's Calls API. Twilio rings the parent.
2. When the parent answers, Twilio fetches `twilioVoice?step=greeting&parentId=<id>`: the greeting plays, then the
   question.
3. The question is a keypad prompt (1 yes, 2 not yet, 9 stop). A key press is applied and the closing plays.
4. If no key is pressed, a recording of up to 8 seconds is taken, turned into text, structured and applied once. If
   it cannot be used, nothing is guessed: the question plays once more with the keypad only, then the closing.
5. Twilio reports the call status to `twilioStatus` (answered, completed, busy, no-answer, failed, canceled).
6. The recording is deleted at Twilio after it has been processed. Audio and text are never stored or logged here.

Every request is checked with Twilio's `X-Twilio-Signature` before anything is read or written. A repeated or
late callback changes nothing.

## 5. The test call (trial account)

1. Add yourself as a parent with your own verified number, a medicine due a few minutes after `CALLS_LIVE_FROM`.
2. Watch: `firebase functions:log --project ormma-prod`.
3. Answer. After Twilio's trial message you should hear the greeting and the question.
4. Run it twice: once answer by voice, once press 1. Check the dose becomes taken in the app, and the call session
   shows completed.
5. In the Twilio Console → Monitor → Logs → Calls, confirm the call and that the recording is gone.
6. The function log must show only ids and statuses: no number, no name, no medicine, no text.

## 6. Switching back

Set `CALL_PROVIDER=exotel` in `functions/.env.ormma-prod` and redeploy. Nothing else changes.

## If something does not work

| Symptom | Likely cause |
| --- | --- |
| The call rings but is silent or hangs up at once | `twilioVoice` answered 403: `TWILIO_PUBLIC_BASE_URL` does not match the address, or the auth token is wrong |
| `/twilioVoice` answers 503 | The Twilio secrets or `TWILIO_PUBLIC_BASE_URL` are not set on the function |
| Calls are never placed | Calling is off: see the "calling is off" lines in the log for the missing setting names |
| The trial call fails to connect | The number is not in Verified Caller IDs |
| A spoken answer is never applied | Check the `voiceReply` and `twilioVoice` log lines for a status code; a recording that Twilio has not made available yet is retried once |
