# Proposal: Claude reply structuring

## Why

Stages 5-7 capture DTMF and transcribe voice replies, but nothing turns a transcript into the facts
the app stores. The reply-structuring and medical-safety specs require one Haiku call with a fixed
prompt, schema validation, a retry once, plausibility checks, and an urgent-keyword check that runs
before the model.

## What Changes

- `functions/src/prompts/replyStructuring.v1.ts`: versioned system prompt and user-message builder
  (transcript is JSON data, never instructions), with the exact output schema.
- `functions/src/reply/schema.ts`: zod schema for the structured reply plus plausibility helpers.
- `functions/src/urgent-keywords.ts`: per-language urgent word list and a normalised matcher, used
  before the model.
- `functions/src/reply/replyStructuring.ts`: Anthropic SDK client (`claude-haiku-5-5`, small max
  tokens, no sampling parameters because API 2026-10-21 removed them), two attempts on invalid
  JSON/schema, review flags for low confidence and implausible readings, and an urgent callback that
  fires before the model call.
- `functions/src/reply/config.ts`: `ANTHROPIC_API_KEY` secret and client factory.
- `functions/test/fixtures/reply-transcripts.json`: 30 transcripts (English, transliterated
  Malayalam/Tamil/Hindi, noisy, partial, prompt-injection) with expected facts.
- `functions/scripts/eval-reply-structuring.mjs` and `npm --prefix functions run eval:reply`: report
  per-field accuracy against the fixtures using the real API (manual, needs a key).
- Docs: secret setup, native-speaker/doctor review gates, eval instructions.

No Firestore writes or endpoint yet; `processReply` integration is Stage 9. The module never changes
a dose status itself.

## Spec changes

- `reply-structuring`: ADDED urgent pre-check ordering, result review metadata and prompt/version
  settings requirements.
- `ai-contracts`: MODIFIED the common call rules to omit sampling parameters, which API version
  2026-10-21 rejects; ADDED the reply-structuring evaluation fixture set and script.

## Impact

- Adds `@anthropic-ai/sdk` and `zod` to functions.
- Live eval costs API calls and needs `ANTHROPIC_API_KEY`; unit tests mock the client.
- The urgent-keyword lists and the `confirmationNote` wording need native-speaker and
  doctor/pharmacist review before real-family rollout (launch gate).
