# Tasks

- [x] Add the STT adapter: per-language model map, MP3/8 kHz request, timeout and code-only errors.
- [x] Add pure result interpretation for ok / low confidence / empty (silence).
- [x] Add the `GOOGLE_STT_API_KEY` secret and optional client factory.
- [x] Unit-test a usable answer, empty result, low confidence, wrong language, long silence, missing
      confidence, multiple results, oversized audio, HTTP failure and timeout with mocked HTTP.
- [x] Document the secret and manual live-call verification.
