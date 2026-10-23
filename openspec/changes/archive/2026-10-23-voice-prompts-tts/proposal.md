# Proposal: voice prompts with Text-to-Speech

## Why

Test calls in Stage 5 collected DTMF, but the parent heard no prompt: the Exotel flow was only a
Greeting → Gather → Passthru skeleton. The call-flow spec requires a fixed script in the parent's
language, and medical-safety forbids free-form speech. Stage 6 adds the fixed templates, Google TTS,
cost-saving audio caching, and the endpoint Exotel uses to fetch each prompt.

## What Changes

- `functions/src/voice/templates.ts`: one editable file with every spoken line for ml-IN, ta-IN,
  hi-IN and en-IN (greeting, single question, grouped question, closing, consent). Placeholders are
  limited to the parent's name, the time-of-day word and member names for consent.
- `functions/src/voice/tts.ts`: Google Cloud TTS client (injectable HTTP) and a private Storage
  cache keyed by `sha256(language, voice, text, encoding)`. Identical prompts are synthesised once.
- `functions/src/voice/prompt.ts`: authenticated `voicePrompt` (returns the URL of the cached audio
  for a call/session) and `voiceAudio` (streams the cached MP3 to Exotel) HTTP handlers.
- Secrets: `GOOGLE_TTS_API_KEY` (restricted to the TTS API), `VOICE_PROMPT_TOKEN` (shared callback
  token) and `VOICE_AUDIO_BASE_URL` (public base URL of `voiceAudio`).
- Docs: dashboard flow applet URLs and the native-speaker review gate in `docs/SETUP.md`.

No Firestore schema, rules or index changes. Audio is generated speech, never a call recording.

## Spec changes

- `call-flow`: ADDED fixed-template, TTS cache and dynamic prompt endpoint requirements.
- `data-protection`: ADDED generated-prompt-audio handling (private cache, no call audio).

## Impact

- The Exotel dashboard needs the new prompt URLs; native speakers must review the templates (launch
  gate in medical-safety). Live audio playback needs the manual Exotel setup from Stage 5.
- Emulator and unit tests use fake TTS/Storage clients; no Google credentials are needed locally.
