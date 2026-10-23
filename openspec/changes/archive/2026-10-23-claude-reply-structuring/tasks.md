# Tasks

- [x] Add the versioned prompt and user-message builder.
- [x] Add the zod schema, plausibility ranges and safe invalid result.
- [x] Add the per-language urgent keyword list and normalised matcher.
- [x] Implement the Anthropic client and `structureReply` with retry-once, low-confidence and
      implausible-reading review flags, and the pre-model urgent callback.
- [x] Add `ANTHROPIC_API_KEY` secret/config (no endpoint yet).
- [x] Unit-test valid, invalid twice, retry success, low confidence, implausible values, urgent
      keyword ordering, model urgent, prompt injection, client settings and coded errors.
- [x] Add 30 fixtures and the manual eval script; test the fixture set shape.
- [x] Document the secret, eval and review gates.
