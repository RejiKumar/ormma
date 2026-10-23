# Design

## Templates (the one file native speakers edit)

`templates.ts` owns every spoken string as a `Record<Language, Record<PromptKind, string>>`. Kinds:
`greeting`, `question_single`, `question_grouped`, `closing`, `consent`. Interpolation is a plain
`{{name}}`, `{{timeOfDay}}` or `{{members}}` replacement; there is no model, no free text and no
per-call wording. `timeOfDayWord()` maps the local scheduled hour to morning (05–11), afternoon
(12–16), evening (17–20) or night. English keeps the exact call-flow/grouped-calls sentences;
translations are flagged unreviewed until native speakers sign off.

The consent script names the family members who will see the data and why, then "press 1 to agree".
The question lines also include "press 9 to stop reminders" so revocation is reachable on any call.
Closing is a thank-you only; no medical advice.

## TTS and cache

`GoogleTtsClient` posts to `https://texttospeech.googleapis.com/v1/text:synthesize?key=…` with the
language code, a standard female voice per language (`ml-IN-Standard-A`, `ta-IN-Standard-A`,
`hi-IN-Standard-A`, `en-IN-Standard-A`), MP3 at 8000 Hz mono (Exotel's requirement) and a slightly
slower speaking rate. The API key is a Firebase secret; errors are codes only.

`PromptAudioService` hashes `version + language + voice + text + encoding` with SHA-256 and stores
`tts/{hash}.mp3` in the default Storage bucket with `audio/mpeg` and immutable cache headers. A hit
skips Google; a miss synthesises, then saves. Writes are idempotent because the hash names the
content. Storage stays private: only the token-checked `voiceAudio` endpoint reads it.

## HTTP endpoints

- `voicePrompt` (`GET`/`HEAD`, token in query): Exotel's dynamic Greeting/Question/Closing/Consent
  URL. It receives `CallSid` and `CustomField` (parent id) plus a dashboard-static `kind`. It reads
  the session and parent, builds the fixed text, ensures the audio exists, and returns
  `text/plain` with one absolute `voiceAudio?...&id={hash}` URL per line. `HEAD` returns the same
  headers and no body, as Exotel requires. Unknown session/unknown kind → 404; bad token → 401;
  unconfigured TTS → 503 (code only).
- `voiceAudio` (`GET`/`HEAD`, token in query): validates a 64-hex id, downloads `tts/{id}.mp3` and
  returns it with `Content-Type: audio/mpeg`, immutable caching, and no other data. Missing object
  → 404. The URL is stable, so Exotel's own audio cache and ours both help.

No parent name, phone or medicine text appears in a URL, query string or log line. The token is
compared with `timingSafeEqual` before any read.

## Rejected alternatives

- Let Exotel's own TTS read the text: no Google TTS, no shared cache, and pronunciation control is
  worse; the stack explicitly uses Google TTS.
- Public Storage URLs: generated audio contains the parent's name; the bucket stays private.
- Signed Storage URLs: they change per request, defeating Exotel's URL-keyed audio cache; the token
  endpoint is stable and revocable by rotating one secret.
- Pre-synthesising inside the dispatcher: not needed because the cache is warm after a language's
  fixed lines exist and the question variants are few; avoids coupling dispatch to Google.

## Tests

Unit: template completeness/phrases/no placeholders/no judgement words; time-of-day mapping; hash and
cache hit/miss with fake client+store; Google request shape and error codes with mocked HTTP.
Emulator: `voicePrompt` auth/HEAD/unknown/grouped-vs-single/closing/consent and `voiceAudio`
auth/404/hit with a fake store, so no Storage or Google emulator is required.
