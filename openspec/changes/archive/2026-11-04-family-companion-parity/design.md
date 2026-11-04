## Context

The app already shows Today (events, alerts) and Alerts (read, mark taken, call now) from direct Firestore reads. `callSessions` and `auditLogs` have no client access, members documents are written only by functions, and parent updates by owners are limited to a fixed field list. Callables live in `functions/src` in `asia-south1`; the mobile wrappers are in `mobile/src/family/callables.ts`. The digest, the Alerts dot and the contacts list need no new server read path. Call attempts and presence do.

## Goals / Non-Goals

**Goals:** the four prototype features with the smallest additions to the data model; rules and spec changes that a reviewer can read in one sitting; no new third-party services or native modules.

**Non-Goals:** changing how Ormma calls or retries; a call-attempt log written by the dispatcher; push notifications for presence; per-dose read receipts; live presence beyond a 2-minute window.

## Decisions

1. **Attempts through a read-only callable, not a new client-readable field.** `getDoseEscalation({ parentId, doseEventId })` reads `callSessions` where `doseEventIds` contains the event, orders them by `startedAt`, and returns `{ ordinal, startedAt, outcome }` plus the alert time from `alerts`. Alternative considered: have the dispatcher append an `attemptLog` to the dose event. That touches the idempotent call-flow path and widens a document clients read, so it was rejected. The callable keeps `callSessions` closed to clients (access-control unchanged) and returns no SID, DTMF or transcript reference. Outcome mapping: `completed` or `answered` with DTMF 1 or 2 is "answered", `no_answer` is "no answer", `failed` and `initiated` older than 15 minutes is "failed".
2. **Consent visibility in the callable.** It reuses the visibility check used for client list queries (`visibility.ts` on the app side, the same rule on the server in `family.ts`), so a member whose window excludes the dose date gets an empty list.
3. **Presence through a throttled callable.** `touchPresence({ parentId })` checks membership, and writes `members/{uid}.lastSeenAt` only if the stored value is older than 5 minutes (a transaction, so two devices cannot race). Chosen over a direct client write because the members path stays server-write-only. The app calls it from a focus effect on Today and ignores failures silently, so presence never blocks the screen.
4. **Family calls as a collection, not a field.** `logFamilyCall({ parentId })` writes `familyCalls/{uid}_{yyyyMMddHHmm}` with `set` and merge, which makes it idempotent within a minute. A log collection is used rather than `lastFamilyCallAt` on the parent so the parent update field list in rules is not widened and so the export can list who called when.
5. **Emergency contacts on the parent document.** Owner updates already pass through a field allow-list in `firestore.rules`; `emergencyContacts` is added there with a shape check (size, key set, kind enum, E.164 regex, label length). A subcollection was rejected as too heavy for at most 3 rows.
6. **Digest is a pure client function.** `buildDigest(parent, events, now)` returns the text from i18n templates; tests pin the exact strings. Sharing uses `Share.share`, so no native module and no APK rebuild. Medicine names are left out on purpose, which keeps the text inside the "no raw medical values" rule.
7. **Alerts dot in the tab bar.** A small hook counts unread `missed_dose` and `urgent` alerts using the existing `useAlerts` listeners, and the tab bar renders a dot with a reduced-motion-aware pulse. The coral colour rule (`designRules.test.ts`) allows `urgent` only in `Banner`, so the dot lives in its own component, `AlertDot`, which is added to that allowlist: it means exactly unread missed-dose or urgent alerts, which is the use coral is reserved for.

## Risks / Trade-offs

- **Presence looks like monitoring of family members.** Mitigation: one timestamp, shown only to members of that parent, named in the privacy notice, hidden without consent. Open question for the owner: whether members should be able to turn their own presence off.
- **Extra callable cold starts** (10 to 20 seconds on the emulator, shorter when deployed). Mitigation: all three calls are non-blocking in the UI, with a placeholder.
- **Escalation depends on `callSessions` being written for every attempt.** Where an attempt never reached a session (dispatch failure), the callable shows fewer rows than `attempts` on the event; the view then labels the gap as "not placed" using `attempts` and `lastDispatchFailure` from the event.
- **Third-party phone numbers (contacts) are new personal data.** Mitigation: owner-only edit, member-only read, included in export and delete, never logged.
- **Rules change.** Needs emulator tests and a mutation-check update; no existing rule is loosened except the owner field list for `emergencyContacts`.

## Migration Plan

Additive only. Deploy functions first, then rules, then the app. Existing parents have no `emergencyContacts` and members have no `lastSeenAt`; the UI handles both as empty. Rollback: remove the app features; the new fields are ignored by older clients.

## Open Questions

- Should emergency contacts be editable by editors, or owners only (proposed: owners only)?
- Should a member be able to hide their own presence (proposed: not in this change)?
- Is "viewing" within 2 minutes the right window, and should viewers of other parents' screens count (proposed: same parent only)?
