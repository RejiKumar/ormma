# Proposal: Alerts, missed doses and push notifications

## Why

Dose events currently retry and go missed, but the family is never told. The missed-dose-alerts and
medical-safety specs require one fixed-template alert per missed dose or group, an immediate urgent
alert for emergency words, FCM delivery to every member, and a family app where an alert can be read,
acted on, or used to call the parent.

## What Changes

- `functions/src/schedule/missedDose.ts`: a minute `missedDoseChecker` that uses the existing pure
  `missed_check` transition, groups events by `(parentId, scheduledFor)`, and marks a group missed in
  one transaction. It sets `alertSent` on every member in the same transaction, so a rerun or a
  duplicate scheduler tick can never send a second alert.
- `functions/src/alerts/templates.ts`: fixed English templates (standard, group "did not confirm
  all", system failure, urgent) with the parent's name and local clock inserted. No medicine names,
  doses or readings.
- `functions/src/alerts/fcm.ts`: resolves member tokens from `users/{uid}.fcmTokens`, sends one
  multicast message and removes tokens FCM reports as unregistered/invalid.
- `functions/src/alerts/createAlert.ts`: writes the `alerts` document and delivers the push; used by
  the missed-dose checker and by the urgent path.
- `functions/src/reply/processReply.ts`: the Stage 7/8 wiring. It runs the urgent keyword check first
  (creating the urgent alert before the model), structures the transcript, and only then applies a
  dose status when `canApplyDoseStatus` is true. It does not store transcripts.
- `functions/src/schedule/dispatch.ts`: records whether the last attempt failed at the provider, so
  the missed alert can use the distinct system-failure wording.
- Mobile: an Alerts tab, push-token registration, mark-as-read (append own uid per the rules),
  "Call now" (`tel:`) and "Mark as taken" (owner/editor family confirmation). Urgent alerts show the
  emergency-services prompt.
- Shared types and data model: `AlertType` gains `urgent`; dose events gain the server-written
  `lastDispatchFailure` flag.

## Spec changes

- `missed-dose-alerts`: ADDED the system-failure alert variant (distinct text, same once-only rule);
  ADDED the fixed-template builder requirement (name and local times only); MODIFIED delivery to
  state that the alert is written in the same transaction that sets `alertSent`.
- `medical-safety`: ADDED the urgent alert creation path and the app's emergency-services prompt.
- `data-model`: MODIFIED `AlertType` to include `urgent`; ADDED the server-written
  `lastDispatchFailure` dose-event flag; MODIFIED the alert write rule to require `type: "urgent"`
  for urgent alerts.

## Impact

- Adds `@react-native-firebase/messaging` to the mobile app and a manual mock for tests.
- Live push needs a real FCM-enabled dev build and device; unit tests use an injected sender.
- The alert templates and urgent wording remain a doctor/pharmacist launch gate.
- `processReply` still has no audio endpoint because Exotel has no speech-recognition applet; it is
  the unit-tested orchestration point for the future voice capture path.
