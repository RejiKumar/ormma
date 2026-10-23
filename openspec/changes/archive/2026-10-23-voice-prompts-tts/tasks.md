# Tasks

Constraints: no rules/index changes; secrets via `defineSecret`; no PII in logs or URLs; scripts are
the only spoken text; native-speaker review is a manual launch gate. Tests use fake TTS/Storage.

## 0. Artifacts

- [x] 0.1 Proposal, design, two deltas and tasks; `openspec validate voice-prompts-tts --strict` passes.

## 1. Templates and time words

- [x] 1.1 `functions/src/voice/templates.ts`: fixed ml-IN/ta-IN/hi-IN/en-IN greeting, single and grouped questions, closing and consent; strict placeholder substitution; time-of-day word. Verify: unit tests for every language/kind, exact English lines, grouped vs single, consent member names, no placeholders left, no judgement words.

## 2. TTS and cache

- [x] 2.1 `functions/src/voice/tts.ts`: Google TTS HTTP client (key secret, injectable fetch, coded errors) and `PromptAudioService` with SHA-256-keyed private Storage cache. Verify: mocked-HTTP request shape, non-2xx/missing audio errors, cache hit skips synthesis, stable hash, no text in error messages.
- [x] 2.2 `functions/src/voice/config.ts`: secret declarations (`GOOGLE_TTS_API_KEY`, `VOICE_PROMPT_TOKEN`, `VOICE_AUDIO_BASE_URL`) and factory functions. Verify: unconfigured states return codes, no secret values leak.

## 3. Endpoints

- [x] 3.1 `functions/src/voice/prompt.ts`: `voicePromptHandler` (token, GET/HEAD, session+parent lookup, kind selection, cached-audio URL text) and `voiceAudioHandler` (token, id validation, MP3 bytes). Verify: unit tests for validation/auth; emulator tests for every kind, unknown session, HEAD, audio hit/miss.
- [x] 3.2 Export `voicePrompt` and `voiceAudio` as `onRequest` with secrets bound; no PII in logs. Verify: entry test still loads.

## 4. Close

- [x] 4.1 `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:fns`, `npm run test:rules`; both OpenSpec validations pass.
- [x] 4.2 `docs/DECISIONS.md`: template review gate, TTS cache key/8 kHz, token endpoints vs signed URLs, no prewarm, API-key choice. `docs/SETUP.md`: TTS key secret, prompt/audio dashboard URLs, HEAD requirement, native-speaker review checklist.
- [x] 4.3 Archive and commit (`Stage 6: voice prompts and TTS cache`).
