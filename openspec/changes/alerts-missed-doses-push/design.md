# Design

## Missed-dose checker

`missedDoseChecker` runs every minute. It queries the `doseEvents` collection group for non-terminal
statuses (`pending`, `no_answer`, `unclear`, `not_taken`) whose `scheduledFor` is at or before now,
loads the parent policy and re-evaluates the pure `missed_check` transition. A run plans groups from
the events that would actually go missed, keyed by `(parentId, scheduledFor)`.

Each group is applied in one Firestore transaction:

1. Re-read every event in the group.
2. Re-run `missed_check`; an event that is no longer eligible is left untouched.
3. If no event in the group still goes missed, do nothing.
4. If any event already has `alertSent: true`, only mark the remaining events missed (no new alert).
5. Otherwise mark every member missed and set `alertSent: true` in the same transaction, and create
   exactly one `alerts` document. This is the once-only guarantee: another tick sees `missed` and
   stops, and a concurrent tick loses the transaction on the `alertSent` write.

Push delivery happens after the transaction commits joins. A failed push does not roll back the
alert, and `alertSent` stays true so a later run cannot send a duplicate. Invalid tokens are removed
from `users/{uid}.fcmTokens`.

## Alert wording

All wording is fixed; only the parent's name and local clock times are interpolated.

- Standard: `<name> has not confirmed the <time> tablets. Last attempt at <time>. Please check.`
- Group pressed 2: `<name> did not confirm all of the <time> tablets. Please follow up.`
- System failure: `We could not complete the call to <name> about the <time> tablets. Please check.`
- Urgent: `<name> mentioned something urgent. Please call them now.`

The group variant is chosen when the group has more than one event and any member has
`groupConfirmed: true` (set only by pressing 2). The system-failure variant is chosen when any member
has `lastDispatchFailure: true`, written by the dispatcher when the provider throws. No medicine
name, dose or reading ever appears.

## Provider boundary and idempotency

`PushSender` is an interface (`sendMulticast(tokens, message)`), implemented with
`firebase-admin/messaging` and injected in tests. `createMissedDoseAlert` takes the transaction and
the push sender separately, so the alert document is committed before FCM is called.

The urgent path reuses the same alert writer but not the once-only missed rule: an urgent word is
immediate and does not wait for the model. `processReply` passes `onUrgentKeyword` to
`structureReply`, which fires before the Anthropic request.

## Mobile

`usePushRegistration` requests permission, reads the FCM token, appends it to the signed-in user's
`fcmTokens` with `arrayUnion`, and keeps it fresh on token rotation. Only token and status codes are
logged.

The Alerts tab lists the same consent-bounded stream as the dashboard, with a 30-day window. Each row
shows the alert type and message. Unread alerts offer "Mark as read", which appends the caller's uid
to `readBy` exactly as the rules require. Missed-dose alerts to owners/editors offer "Mark as taken"
(the family-confirmation transition) and "Call now" (`tel:`). Urgent alerts show the coral urgent
banner with a prompt to call local emergency services.

The app is read-only for viewers: the intervention buttons are hidden for them.
