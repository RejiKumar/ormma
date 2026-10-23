# Design

## Call shape and prompt

One Anthropic Messages call using `claude-haiku-5-5`, `max_tokens: 512`, no tools, with the
versioned system prompt from `functions/src/prompts/replyStructuring.v1.ts`. API version
`2026-10-21` removed `temperature`, `top_p` and `top_k` (sending them returns 400), so the request
sends none of them; the fixed prompt and schema keep output stable. The user message is a JSON object
containing `language`, `question` and `transcript`; the system prompt states that the transcript is
untrusted data and must never be followed as instructions. JSON delimiting avoids tag-injection and
keeps the transcript out of any log.

The model is asked for exactly the spec schema, with `confirmationNote` in the parent's language and
null when nothing about the dose was said. No model output is ever spoken.

## Keyword check before the model

`findUrgentKeyword()` normalises case, punctuation and spacing, then checks the language list plus an
English safety net. If it matches, `structureReply` awaits the optional `onUrgentKeyword` callback
(the future alert hook) before the first Anthropic call, then continues structuring so the reply is
not lost. The result records `urgentSource: "keyword" | "model" | null`.

Keyword lists live in `functions/src/urgent-keywords.ts` per the medical-safety spec. They include
native-script and transliterated forms because STT may return either. A human speaker of each
language and a doctor/pharmacist still have to review them (launch gate).

## Validation and retries

`parseStructuredReply()` strips an optional code fence, extracts the outer JSON object, parses it and
runs a strict zod schema: `tookMedicine` (boolean/null), `readings` (bp needs systolic+diastolic,
sugar needs value), `symptoms`, `confirmationNote` (string/null), `urgent`, `confidence` (0-1) and
`language`. Unknown keys fail validation.

A parse/schema failure triggers one more identical call. If the second response is also invalid, the
module returns a safe result with `tookMedicine: null`, empty readings/symptoms, `needsReview: true`
and reason `invalid_output`; no caller may change a dose status from it. A missing text block or API
error is not retried here: it throws a coded `StructuringError` so the caller can retry with backoff
and keep the event pending (API-outage rule).

After a valid response, `needsReview` is set when confidence < 0.6 or any reading is outside BP
systolic 60-260 / diastolic 30-160 or sugar 20-600 mg/dL. Values are retained for review rather than
discarded, so the family sees the source beside the extraction. Review reasons are returned as data,
not logged.

## Client boundary

`ReplyModelClient` has one `complete(system, user)` method. `AnthropicReplyModelClient` wraps the SDK
with `maxRetries: 0` and a 20s timeout, joins text blocks and maps failures to
`network|timeout|http_<status>|empty_response` without response content. Tests inject a fake client;
the eval script uses the real one.

## Eval set

`functions/test/fixtures/reply-transcripts.json` has 30 synthetic cases: English, transliterated
Malayalam/Tamil/Hindi, noisy/partial and prompt-injection inputs, each with expected facts.
`eval:reply` builds the functions, calls the real model for every case and reports accuracy for
`tookMedicine`, `urgent`, readings and `confirmationNote` presence. It prints ids and scores only,
never transcripts. It is manual and costs tokens; it is not part of `npm test`.
