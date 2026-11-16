# Tasks

## 1. Server

- [x] 1.1 Make the Free plan's call-time limit unlimited and keep the paused-parent rule. Verify: unit tests for `limitsFor` and the gate (five dose times on Free all allowed, a second parent still paused, paid and grace unchanged).
- [x] 1.2 Clear a stale `callSkipped: "plan"` flag when the dispatcher claims the event. Verify: an emulator test with a pending flagged event that becomes called and then, if unanswered, is reported missed.
- [x] 1.3 Emulator tests across the dispatcher and the missed-dose checker. Verify: five dose times on a free parent are all called; a paused parent is still skipped and never alerted.

## 2. App wording

- [x] 2.1 Update the catalogue text and the Plans comparison so nothing says Free has a call-time limit, and limit the "no check-in call" note to a paused parent. Verify: app tests for the comparison, the upgrade sheet and the dose card note; the wording guard passes.

## 3. Docs and verification

- [x] 3.1 Update `docs/DECISIONS.md` and the go-live notes. Verify: they read correctly.
- [x] 3.2 Run function unit tests, emulator tests (in band), app tests, typecheck, lint and `openspec validate remove-free-call-limit`. Verify: all pass.
- [ ] 3.3 After deploying, check with five dose times on the test parent that every one is called and notified. Verify: the dispatcher log shows five calls and the phone rings for each.
