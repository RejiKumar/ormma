# Tasks

- [ ] Add fixed alert templates and the local-clock formatter, with unit tests for every variant and
      for name/time interpolation only.
- [ ] Add the FCM sender boundary, member-token resolution and invalid-token pruning, with mocked
      send tests.
- [ ] Add the transactional missed-dose checker and scheduled export; test the once-only guarantee,
      group alerting and the system-failure variant.
- [ ] Record `lastDispatchFailure` on provider failure and initialize it on generation.
- [ ] Add the urgent alert path and `processReply` orchestration (urgent keyword before the model),
      with unit tests.
- [ ] Extend shared types and the data-model spec (`urgent` alert type, `lastDispatchFailure`).
- [ ] Mobile: add messaging, push registration and token storage.
- [ ] Mobile: add the Alerts tab/screen with mark-as-read, Call now, Mark as taken, viewer hiding and
      the urgent emergency prompt; test each action.
- [ ] Add i18n strings and update navigation tests.
- [ ] Update `docs/DECISIONS.md` and `docs/SETUP.md`.
- [ ] Run lint, typecheck, unit tests, emulator tests and `openspec validate`.
