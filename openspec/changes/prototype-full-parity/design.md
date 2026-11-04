## Context

The previous change gave the app the prototype's layout plus presence, escalation, contacts and digest. What is still different is content. Most of it is display of data the app already has (confirmation note, resolved time, call policy, members, call sessions); the rest needs small optional fields. Members documents, doseEvents server fields and `callSessions` stay closed to clients, so new member and receipt data goes through callables, as presence did.

## Goals / Non-Goals

**Goals:** every screen reads like the prototype with real data; optional fields so nothing existing breaks; no loosening of existing rules beyond the listed fields; no health data in logs.

**Non-Goals:** a demo-mode switcher; server-side translation of the digest; WhatsApp sending from the server; changing how calls are placed.

## Decisions

1. **Optional fields on existing documents.** `city`, `prescriber`, `refillDue` on the parent; `frequencyText`, `pillDescription`, `purpose` on medicines; `note` on contacts. They are added to the existing rule allow-lists with length checks. The earlier contact shape said "no other keys"; this change adds `note` to the allowed keys and updates that rule and its tests.
2. **Member profile and preferences through callables.** `setMemberProfile` and `setNotifyPrefs` act on the caller's own member document (uid from auth, never from the payload), validate lengths and booleans, and write only those fields. Members stay server-write-only in rules, so no rule loosening and no way to edit someone else.
3. **Read receipts through `markDosesSeen`.** The app calls it on Today focus with the event ids it displays. The function checks membership and consent visibility per event, and writes `seenBy.<uid>` only where the entry is absent, using a field-path update so it cannot overwrite. The write is batched (at most 30 events per call). Names for the "Seen by" line come from the members listener already used by presence.
4. **Card grouping and wording on the device.** Events are grouped by `scheduledFor`, period and badge text are pure functions with unit tests. "On time" means resolved within 30 minutes after the scheduled time (a constant in one place). `resolvedAt` is added to the Today events hook.
5. **Protocol computed from the call policy.** The Escalation tab builds the list from `callPolicy` and the dose time: Call 1 at the time, retries at the gap, the caregiver alert at `missedAfterMinutes`. In the missed state the live attempts from `getDoseEscalation` replace the dimmed protocol. No new server call is needed.
6. **Call history callable.** `getCallHistory` reads the last N `callSessions` and `familyCalls` for the parent, applies the consent visibility rule, and returns `{ kind, atMs, outcome, durationSec, byUid? }` only. Duration is `endedAt - startedAt`. Same outcome mapping as the escalation callable.
7. **Preferences honoured at delivery, not at alert creation.** Alert documents and idempotency are untouched. The push sender asks which members to include: it reads each member's `notify`, drops those who opted out or are in quiet hours for non-urgent types, and keeps everyone for `urgent`. The member list and timezone are read in the same place the sender already reads tokens.
8. **Evening digest on a 15-minute schedule.** Running every 15 minutes with a per-parent local-time check and a `lastDigestDate` guard is idempotent and avoids one cron per timezone. Parents with no events that day are skipped; members with `summary` false are skipped. The text comes from one shared pure function (same template the Today card uses, English on the server).
9. **Copy to clipboard.** `@react-native-clipboard/clipboard` is a native module and would need a new APK. The Share sheet already offers "Copy" on Android, but the prototype has a dedicated button. Option chosen: use `expo-clipboard` only if a native rebuild is acceptable; otherwise keep Share. Because a release build is needed anyway before the Play upload, the design adopts `expo-clipboard` and flags the rebuild.
10. **Dependency on the previous change.** Archive `family-companion-parity` before applying this, so its requirements are in the main specs. This change adds requirements rather than editing those.

## Risks / Trade-offs

- **Many new documents fields to keep consistent in rules, export and delete.** Mitigation: one list of fields per document in rules, covered by emulator tests and the mutation check.
- **Read receipts reveal when a member looked.** Mitigation: visible only to members of the same parent, listed in the privacy policy and data safety answers, one time per event, deleted with the parent.
- **Evening digest depends on Cloud Scheduler and FCM tokens.** Mitigation: idempotent, ids and counts only in logs, skipped when there are no tokens.
- **English-only server digest.** Family members using other app languages see English in the evening push. Accepted for now; the in-app card follows the app language.
- **Native rebuild for clipboard.** The dev client and the release build need a rebuild after adding `expo-clipboard`.

## Migration Plan

Additive and optional. Deploy functions first (callables, scheduler, sender change), then rules, then the app. Old clients ignore the new fields. Rollback: remove the scheduler job and the app features; stored fields are ignored.

## Open Questions

- Is 30 minutes the right "on time" window?
- Should the evening digest follow each member's language later (needs a language field on members)?
- Should "Primary" be the owner only, or a flag an owner can give to another member (proposed: owner only)?
