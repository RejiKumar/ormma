# Spec Delta

## ADDED Requirements

### Requirement: Fixed spoken templates
Every spoken line SHALL come from `functions/src/voice/templates.ts`, a single editable file with
greeting, single question, grouped question, closing and consent scripts for ml-IN, ta-IN, hi-IN and
en-IN. Only the parent's name, the time-of-day word and the consent member names MAY be
interpolated. No model output or free-form text SHALL ever be spoken.

#### Scenario: Script language
- **WHEN** a prompt is built
- **THEN** it uses the parent's language and the fixed template for its kind
- **AND** the only substitutions are the parent's name, the local time-of-day word and member names

#### Scenario: Grouped call question
- **WHEN** a call covers more than one event
- **THEN** the grouped question is used, with the time-of-day word following the scheduled time
- **AND** a single event uses the single-medicine question

#### Scenario: No advice
- **WHEN** any template is spoken
- **THEN** it contains no medical advice, judgement or model-generated text

### Requirement: Text-to-speech cache
Prompt audio SHALL be synthesised by Google Cloud Text-to-Speech in the parent's language, as MP3 at
8000 Hz mono, and cached privately in Storage under a SHA-256 hash of the language, voice, text and
encoding. A cache hit SHALL skip synthesis, and identical prompts SHALL reuse the same object and URL.

#### Scenario: Cache miss
- **WHEN** a prompt text has no cached object
- **THEN** it is synthesised once, stored under `tts/{hash}.mp3`, and served from there

#### Scenario: Cache hit
- **WHEN** the same language and text are requested again
- **THEN** no Text-to-Speech call is made and the existing object is served

### Requirement: Dynamic prompt endpoint
An authenticated `voicePrompt` endpoint SHALL accept Exotel's GET/HEAD request with `CallSid`,
`CustomField` (parent id) and a dashboard-static kind, resolve the call session, and return
`text/plain` containing one absolute `voiceAudio` URL for the cached audio. HEAD SHALL return the
same headers without a body. A wrong token SHALL return 401 before any read; an unknown session or
kind SHALL return 404; codes only.

#### Scenario: Greeting request
- **WHEN** Exotel requests the greeting for a session
- **THEN** the response is the cached greeting audio URL in the parent's language

#### Scenario: Missing session
- **WHEN** the CallSid does not resolve to a session under the given parent
- **THEN** the endpoint returns 404 and synthesises nothing

### Requirement: Audio playback endpoint
An authenticated `voiceAudio` endpoint SHALL serve the private cached MP3 for a 64-hex id with
`Content-Type: audio/mpeg` and immutable caching, and SHALL return 404 for an unknown id. URLs SHALL
contain no parent name, phone number or medicine text.

#### Scenario: Play cached audio
- **WHEN** Exotel fetches a valid audio id with the shared token
- **THEN** it receives the MP3 bytes and can play them

#### Scenario: Unknown audio
- **WHEN** the id is missing from Storage
- **THEN** the endpoint returns 404 without exposing bucket details
