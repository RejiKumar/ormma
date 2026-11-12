# Exotel call flow for Ormma

You build this flow once in the Exotel dashboard (a "call flow" or "app"). The server already has every endpoint it needs; this page says which step calls which URL. Replace `BASE` with `https://asia-south1-ormma-prod.cloudfunctions.net` and `TOKEN` with the value of `EXOTEL_WEBHOOK_TOKEN` (the prompt endpoints use `VOICE_PROMPT_TOKEN`).

Every call the server places carries two values Exotel sends back on every step: `CallSid` and `CustomField` (the parent id). Keep both on every URL.

## The flow, step by step

The question audio already says "Say yes or no, or press 1 for yes, 2 for no. Press 9 to stop reminders", so the keypad and the voice are offered together. Do not add a separate keypad prompt.

| # | Exotel step | What it does | URL it uses |
| --- | --- | --- | --- |
| 1 | Greeting (play audio from a URL) | Speaks the greeting in the parent's language | `BASE/voicePrompt?kind=greeting&token=<VOICE_PROMPT_TOKEN>` |
| 2 | Question (play audio from a URL) | Asks whether the medicines were taken | `BASE/voicePrompt?kind=question&token=<VOICE_PROMPT_TOKEN>` |
| 3 | Gather digits (about 5 seconds) | If a key is pressed, tell the server | callback `BASE/exotelWebhook?kind=gather&token=TOKEN`, then go to step 7 |
| 4 | **Record** (no key was pressed) | Records the spoken answer (about 8 seconds, stop on silence) and posts it | callback `BASE/voiceReply?token=TOKEN` |
| 5 | Branch on the answer: **200** | The spoken reply was used | go to step 7 |
| 6 | Branch on the answer: **422** (or any other answer) | The reply was not usable: play the question once more and gather digits only | `BASE/voicePrompt?kind=question&token=<VOICE_PROMPT_TOKEN>`, then gather as in step 3, then step 7 |
| 7 | Closing (play audio from a URL) | Speaks the closing line | `BASE/voicePrompt?kind=closing&token=<VOICE_PROMPT_TOKEN>` |
| 8 | Call status callback | Reports answered and finished | `BASE/exotelWebhook?kind=status&token=TOKEN` (the server already sends this when it places the call) |

The consent call uses `kind=consent` in step 1 instead and has no recording step.

## The spoken reply endpoint (step 4)

- Exotel posts `CallSid`, `CustomField` and `RecordingUrl`, with `token`.
- The server downloads the recording into memory, turns it into text with Google Speech-to-Text, structures it with Claude, applies the result once per `CallSid`, and answers within 8 seconds.
- **200** means the answer was applied (or was already applied). **422** means it was not usable: silence, unclear speech, low confidence, an unknown recording format, a timeout or a server problem. Nothing is guessed, no dose changes, and the flow asks once more with the keypad (step 6).
- The recording, the text and the model output are never stored or logged. Only status codes are.
- Recording format: MP3 and WAV (16-bit) are both accepted. Anything else is answered with 422.

## Two things to check at the first test call

These depend on your Exotel plan and cannot be tested before it is recharged:

1. **Branching on the answer.** If your flow can branch on 200 versus anything else, build steps 5 and 6 as above. If it cannot, always play the question once more with the keypad after the recording. The spoken answer is still applied when it was usable, and the keypad is then only a second chance.
2. **Recording format.** Place one call to your own phone, answer by voice, then look at the function log for `voiceReply`. A 422 with reason `unsupported_audio` means Exotel sent a format the server does not read; send me the content type shown in the Exotel dashboard for the recording.

## Settings summary

| Setting | Where | Value |
| --- | --- | --- |
| `EXOTEL_FLOW_URL` | secret | The URL of this flow |
| `EXOTEL_WEBHOOK_URL` | secret | `BASE/exotelWebhook` |
| `EXOTEL_WEBHOOK_TOKEN` | secret | The random string you made; the same value goes in the `token` of steps 3, 4 and 8 |
| `VOICE_PROMPT_TOKEN`, `VOICE_AUDIO_BASE_URL` | secrets | For the greeting, question and closing audio |
| `GOOGLE_STT_API_KEY`, `ANTHROPIC_API_KEY` | secrets | For the spoken reply |
| `CALL_PROVIDER` | function setting | `exotel` to switch real calls on |
| `CALLS_LIVE_FROM` | function setting | The moment you go live (ISO time); doses scheduled earlier are never called |

See `docs/GO-LIVE.md` for the order to do this in.
