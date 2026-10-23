# Proposal

## Why

Stages 0–2 delivered the data model, rules, auth, parents and invites, but the family app still cannot show or manage the one thing it exists for: the parent's medicines and today's dose status. Until the medicines screens and the dashboard are real, the app has no product surface beyond setup.

## What Changes

- Medicines screens for a parent: list, add, edit and deactivate. Fields per the data-model spec; viewers see no edit controls; manual additions are written with `confirmedByHuman: true`; deactivation flips `active` (clients never delete medicines).
- Family dashboard: today's dose events per member's parents with a status chip per event (pending, calling, taken, not_taken, no_answer, unclear, missed), a list of recent alerts, realtime listeners over Firestore, and the medical-safety disclaimer in the footer.
- Emulator seed script with sample parents, medicines, dose events and alerts so the UI can be seen without production data.

## Capabilities

### New Capabilities
- `dashboard`: what the family app shows for today — per-parent dose events with status chips, recent alerts, realtime refresh and the disclaimer footer, for every member role.

### Modified Capabilities
- `data-model`: add the manual-medicine creation semantics the stage requires — a client creates a medicine with `source: "manual"` and `confirmedByHuman: true` immediately, and deactivation sets `active: false` instead of deleting.
- `design-system`: extend the status tokens from five to all seven dose-event-lifecycle statuses (`not_taken`, `no_answer` added, each with its own colour triple, icon and catalogue label), so every dashboard event chip matches its stored status; coral stays missed-only.

## Spec changes

- `design-system`, requirement "Design tokens", scenario "Status colours": the status colour set grows from five (taken, pending, missed, unclear, calling) to seven by adding `not_taken` and `no_answer`, with an explicit coral-rule assertion for the new colours. Old: five status colour triples. New: seven.
- `design-system`, requirement "Status display": the enumerated dose statuses grow from five to seven, with a new scenario pinning one chip per status. Old: icon + label + colour for five statuses. New: same for all seven lifecycle states.
- `data-model`, requirements "Manual medicine creation semantics" and "Deactivation instead of deletion": ADDED (see specs/data-model/spec.md).
- `dashboard`: new capability (see specs/dashboard/spec.md). No changes to security rules, call flow, consent, AI contracts or medical safety areas.

## Impact

- Mobile: new medicine list/add/edit screens and the Today dashboard screen; Medicines and Today tabs replace placeholders; navigation types; i18n strings; component tests.
- Firestore: realtime listeners on `medicines`, `doseEvents` and `alerts` (member-readable today; the consent-visibility query for alerts must carry the spec's `where` clause or rules deny it).
- Tooling: new emulator seed script; no rules, indexes or function changes.
