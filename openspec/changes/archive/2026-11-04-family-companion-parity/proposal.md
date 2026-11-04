## Why

The Family Companion prototype (`docs/prototype/ormma-family-companion.html`) promises four things the app does not do yet: a gentle escalation timeline when a dose is missed, a ready-to-send family update, a sense that the family is looking after the parent together, and a visible cue on the Alerts tab. Today and Medicines already follow the prototype's layout; these four are the remaining gap, and the first three need small, reviewed additions to the data model and access rules.

## What Changes

- **Escalation timeline (Alerts tab).** For a missed or unanswered dose, show the ordered Ormma call attempts (call 1, retry 1, retry 2) with time and outcome, the caregiver alert time, and the parent's emergency contacts with call buttons. Call attempts come from existing `callSessions` through a new read-only callable, because clients have no access to `callSessions` today and that does not change.
- **Emergency contacts.** New optional `emergencyContacts` on the parent: up to 3 entries of label, kind ("neighbour" or "clinic") and E.164 phone. Owners edit them from the Family tab; every member can see and call them.
- **WhatsApp digest (Today tab).** A card with a fixed-template plain-text update per parent (doses taken of total, next dose time, missed dose times) and a Share action using React Native `Share`. Built on the device from data the member can already read. No backend change.
- **Presence bar (Today tab).** Avatar initials of the family members plus text such as "Rahul is viewing" and "last call 6:10 PM yesterday". Needs a per-member `lastSeenAt` (server-written through a throttled callable) and a new `familyCalls` log.
- **"I called Amma" quick action.** A member taps it to log a manual family call, written through a callable into `parents/{parentId}/familyCalls`.
- **Alerts tab dot.** The Alerts tab icon shows a pulsing dot while there are unread `missed_dose` or `urgent` alerts. Client only; respects Reduce Motion.
- Export and delete cover the new data (`familyCalls`, `emergencyContacts`, `lastSeenAt`).

Out of scope: a new tab, push-notification changes, any AI-generated text, reading `callSessions` directly from the app, showing transcripts or health values, location sharing, per-viewer read receipts on individual doses, editing contacts for non-owners, and changes to how Ormma places or retries calls.

## Capabilities

### New Capabilities
- `escalation-view`: what a family member sees about the call attempts for a missed dose, the caregiver alert and the parent's emergency contacts.
- `family-presence`: member last-seen, the "viewing now" cue, and the manual family call log.
- `family-digest`: the fixed-template daily update a member can share.

### Modified Capabilities
- `access-control`: `parents` owner updates may also change `emergencyContacts`; `familyCalls` becomes a member-read, server-write collection; `members.lastSeenAt` is server-written only.
- `data-model`: adds `emergencyContacts` to parents, `lastSeenAt` to members and the `familyCalls` document.
- `data-protection`: export and delete include the new data; presence and call logs are retained only while the parent exists.
- `medical-safety`: digest and escalation wording are fixed templates; emergency contacts are relayed, never advised.

## Spec changes

| Spec file | Requirement | Old behaviour | New behaviour |
| --- | --- | --- | --- |
| `access-control` | parents client update fields | Owner may change only name, phone, language, timezone, active, callPolicy | Also `emergencyContacts` (at most 3, each with E.164 phone and kind "neighbour" or "clinic") |
| `access-control` | members path rule | Members read; writes only by Cloud Function | Unchanged; `lastSeenAt` is written only by the new presence callable, never by a client |
| `access-control` | familyCalls path rule (new) | Collection does not exist | Members read (subject to consent visibility); no client writes |
| `access-control` | callSessions path rule | No client access | Unchanged. The escalation callable reads on the member's behalf and returns only time and outcome |
| `data-model` | parents, members, familyCalls | No emergency contacts, last-seen or family call log | New fields and document as above |
| `data-protection` | Export right, Delete right, Access visibility | Export and delete cover existing collections | Also cover `familyCalls`, `emergencyContacts`, `lastSeenAt`; members can see who has access and when they were last active |
| `medical-safety` | Prohibited behaviour, emergency prompt | Fixed alert templates | Digest and escalation text are fixed templates with no raw values, medicine advice or interpretation; the emergency prompt stays on urgent alerts |
| `call-flow`, `missed-dose-alerts`, `consent` | none | none | No requirement change. Call placement, retries, alert creation and consent behave as today |

## Impact

- **Backend:** three callables in `functions/src` (`getDoseEscalation`, `touchPresence`, `logFamilyCall`), a small addition to export and delete, rules for `emergencyContacts` and `familyCalls`.
- **Rules and tests:** `firestore.rules` change with emulator tests (new cases in `docs/rules-test-coverage.md`) and mutation-check coverage.
- **Mobile:** Today (presence bar, digest card), Alerts (escalation view, tab dot), Family (emergency contacts editor), i18n strings, tests.
- **Privacy:** the contacts are third-party phone numbers, so they appear in the export and are deleted with the parent. Presence stores one timestamp per member, no location, and is hidden when consent is not granted.
- **Not touched:** Exotel, Claude, Speech and TTS code, secrets, call scheduling.
