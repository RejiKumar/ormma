# Design

## STT client

`GoogleSttClient` posts to `https://speech.googleapis.com/v1/speech:recognize?key=...` with
`encoding: MP3`, `sampleRateHertz: 8000`, the parent's language code and one model from a static map.
The API key is a Firebase secret (`GOOGLE_STT_API_KEY`), never sent to the app. The HTTP call has a
10 second timeout and accepts an injectable `fetch` for tests.

Models were checked against the Google Cloud STT v1 supported-languages table on 2026-10-23:

- `en-IN`, `hi-IN`: `telephony_short` (phone audio, short utterances).
- `ml-IN`, `ta-IN`: `latest_short` (phone-oriented telephony models are not offered for these
  languages; `latest_short` is the closest supported short-utterance model).

`useEnhanced` is not set: `telephony_short` is a model in its own right, and enabling the older
enhanced `phone_call` model would fail for Malayalam and Tamil.

## Result interpretation

The response is reduced to one alternative per result, transcripts are trimmed and joined, and the
confidence is the minimum across results (conservative, never overconfident). Results:

- `ok`: non-empty transcript with confidence >= 0.6. Only this status may be passed to structuring.
- `low_confidence`: non-empty transcript with confidence < 0.6, or a missing/non-numeric confidence.
  Wrong-language speech normally lands here. The transcript is returned so callers can store it for
  review if the spec later requires it, but it must not change a dose status.
- `empty`: no results, whitespace-only transcript, or an empty audio buffer. Long silence is this
  case. It is not an error and never means "not taken".

The pure `interpretRecognition` function owns these rules so they are unit-testable without HTTP.

## Memory and logging

`transcribe(audio, language)` takes a `Buffer`, does not retain or copy it beyond the request, and
writes nothing. Empty audio returns `empty` without calling Google; audio larger than 6 MiB is
rejected before the request (sync recognize limits). Errors carry a code only (`network`, `timeout`,
`invalid_json`, `invalid_response`, `audio_too_large`, `http_<status>`); transcripts and audio are
never put in an error message or log line.

## Wiring

This stage stops at the adapter. `createSttClient(env)` returns null when the key is absent, so the
future `processReply` can answer with a code instead of crashing. Stage 8 will bind `STT_SECRETS` to
the reply-processing function and branch to the DTMF prompt on any non-ok status.
