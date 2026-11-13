# Tasks

## 1. Shared generation

- [ ] 1.1 Extract the per-parent planning and create-if-absent step of `generateDoseEventsHandler` into a function that takes a list of medicines, and have the daily run use it. Verify: the existing generation unit and emulator tests pass unchanged.

## 2. The trigger

- [ ] 2.1 Add a pure check for which medicine changes matter (created, or `times`, `startDate`, `endDate`, `active` or `confirmedByHuman` changed; not deleted). Verify: unit tests for each field, a display-only edit, a deletion and a create.
- [ ] 2.2 Add the handler that re-reads the medicine and parent, checks eligibility and the call gate, plans that medicine only and creates the missing events. Verify: emulator tests for a new medicine, the same write twice, a second time added, a time removed, deactivation, a past time today, calling off, an inactive parent and a display-only edit.
- [ ] 2.3 Wire the trigger in `functions/src/index.ts` (Firestore write trigger, asia-south1, the call secrets). Verify: typecheck, lint and a test that the function declares the call secrets.
- [ ] 2.4 Prove the trigger and the daily run do not clash. Verify: an emulator test where the daily run executes after the trigger and creates nothing new, and the reverse.

## 3. Checks and docs

- [ ] 3.1 Check that a pending event left behind by a removed time or a deactivated medicine does not raise a missed-dose alert after the dispatcher skips it. Verify: a test through the missed-dose checker; if it would alert, fix it there and say so in the decisions file.
- [ ] 3.2 Update `docs/DECISIONS.md` and the note in the release docs that same-day medicines no longer wait for 00:30. Verify: the docs read correctly.

## 4. Verification

- [ ] 4.1 Run function unit tests, emulator tests, typecheck, lint and `openspec validate generate-on-medicine-change`. Verify: all pass.
- [ ] 4.2 On the phone after deploying: add a medicine with a dose a few minutes ahead and watch the log. Verify: the event is created within seconds with no Cloud Scheduler run, and the call is placed at the dose time.
