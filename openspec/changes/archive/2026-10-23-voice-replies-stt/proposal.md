# Proposal: voice replies with Speech-to-Text

## Why

Stage 6 plays the fixed questions, but the only reply channel is DTMF. The call-flow spec allows an
optional voice answer and requires that unclear speech falls back to the DTMF prompt instead of being
guessed. Stage 7 adds the Speech-to-Text adapter that later stages will call from `processReply`.

## What Changes

- `functions/src/voice/stt.ts`: Google Cloud Speech-to-Text client (injectable HTTP), per-language
  phone-oriented model selection, MP3/8 kHz input, transcript plus confidence, and a pure result
  interpreter that classifies empty/silence, low confidence and usable answers.
- `functions/src/voice/config.ts`: `GOOGLE_STT_API_KEY` secret and a factory that returns null when
  STT is not configured.
- Tests with mocked HTTP covering a usable answer, empty result, low confidence (including a
  different language), long silence, missing confidence, multiple results, API errors and timeouts.
- Docs: the new secret and the manual live-call verification note.

Audio is accepted as an in-memory `Buffer` only. Nothing is written to Storage/Firestore and no
transcript is logged. There is no new HTTP endpoint in this stage; Stage 8 wires the adapter into
`processReply`.

## Spec changes

- `call-flow`: ADDED speech-to-text transcription, DTMF fallback classification and in-memory audio
  requirements.

No Firestore schema, rules or index changes.

## Impact

- Low-confidence or empty answers are returned with a non-ok status; callers must fall back to the
  DTMF prompt and must never derive a dose status from a non-ok result.
- Malayalam and Tamil have no Google telephony model; they use `latest_short`. English (India) and
  Hindi use `telephony_short`. A live-call check is still required before rollout.
