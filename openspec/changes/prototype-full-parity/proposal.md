## Why

The Family Companion prototype (`docs/prototype/ormma-family-companion.html`) is the agreed look and behaviour of the app. After the first parity change, the app has the layout but not the prototype's content: the Today cards lack period names, taken times, notes and read receipts; Medicines lacks frequency, pill appearance and purpose; Escalation only appears when something is missed; Family has no caregiver details, notification settings or call history. Matching the prototype needs a small set of new fields and three new server functions, so it goes through a reviewed change.

## What Changes

- **App bar:** the pill reads "Amma · Thrissur" (new optional `parent.city`).
- **Today:** one card per scheduled time, named Morning, Afternoon, Evening or Night from the parent's local time. Doses at the same time combine into one card ("Metformin 500mg + Amlodipine 5mg"). Each card shows the status badge ("Taken on time · 8:34 AM", "Taken · 1:36 PM", "Not confirmed", "Scheduled"), the pill appearance tag, the existing `confirmationNote`, and read receipts ("Seen by Rahul 8:42 AM · Meera 9:10 AM"). Scheduled doses keep "Mark as taken" for owners and editors. The hero subtitle reads "Next: Atorvastatin at 9:00 PM". The digest card shows the prototype wording with "Copy update for WhatsApp" (clipboard) beside Share.
- **Medicines:** "Amma's medicines · 3 active", cards with name and dose, Active badge, frequency text, pill appearance, "For Sugar" purpose tag, and a footer "Prescribed by Dr. Nair · refill due 2 Nov". New optional medicine fields `frequencyText`, `pillDescription`, `purpose`; new optional parent fields `prescriber` and `refillDue`; the Add and Edit medicine forms get the three medicine fields; owners edit the parent fields on the Family tab.
- **Escalation:** the check-in protocol is always shown (Call 1, Retry 1, Retry 2 at the parent's `callPolicy` gaps, and the caregiver alert at `missedAfterMinutes`), with a calm "Nothing to escalate today" card when no dose is missed and the live attempts when one is. Contacts show an initial avatar, label, a short note ("2 min walk from Amma", new `contact.note`) and a Call button.
- **Family:** "Caregiver circle · 3 members" with avatar, name, "Son · Bengaluru · Primary" (new `member.relationship` and `member.city`, owner shown as Primary) and a presence badge. A Notifications card with three real toggles per member (missed-dose alerts, evening summary at 8 PM, quiet hours 10 PM to 6 AM), stored as `member.notify` and honoured by push delivery and a new scheduled evening digest. A Call history list of Ormma calls (answered with duration, or unanswered) and family calls.
- **Server:** four new callables (`markDosesSeen`, `setMemberProfile`, `setNotifyPrefs`, `getCallHistory`), one new scheduled function (`sendEveningDigest`), and a change to push delivery so it respects each member's preferences. Alert documents are still created exactly as today.

Out of scope: changing how calls are placed or retried; WhatsApp sending from the server (the digest is shared by the member); translating the server-side digest beyond English; a "demo mode" switcher; parent-facing screens; AI-generated text of any kind.

**Order dependency:** this change builds on `family-companion-parity` (escalation view, presence, digest, emergency contacts). That change should be archived first so its requirements are in the main specs; this one adds new requirements instead of editing those.

## Capabilities

### New Capabilities
- `dose-receipts`: how Today groups, names and labels doses, the on-time rule, and per-member read receipts.
- `medicine-details`: the optional display fields on medicines, parents and emergency contacts, and where they are shown and edited.
- `check-in-protocol-view`: the always-visible protocol on the Escalation tab.
- `family-circle`: caregiver profile, presence badge wording, notification preferences and call history.
- `evening-digest`: the scheduled evening summary and the wording of the shareable digest.

### Modified Capabilities
- `access-control`: new owner-editable parent fields, medicine fields, callable-only writes for member profile, preferences and read receipts.
- `data-model`: the new fields and `seenBy`.
- `data-protection`: new fields in export and delete, preferences as personal data.
- `medical-safety`: wording rules for the new texts.
- `missed-dose-alerts`: delivery respects preferences and quiet hours, never for urgent alerts.

## Spec changes

| Spec file | Requirement | Old behaviour | New behaviour |
| --- | --- | --- | --- |
| `access-control` | parents client update fields | Owner changes a fixed list of parent fields | Also `city`, `prescriber`, `refillDue` (added as a separate requirement) |
| `access-control` | medicines document shape | Fixed medicine fields | Also optional `frequencyText`, `pillDescription`, `purpose` with length limits |
| `access-control` | members path rule | Members writable only by functions | Unchanged; `relationship`, `city`, `notify` are written only by the new callables, and a client write is denied |
| `access-control` | doseEvents client updates | Clients may not write server fields | `seenBy` added to the server-only fields |
| `data-model` | parents, medicines, members, doseEvents | No such fields | New optional fields as above |
| `data-protection` | Export right, Delete right | Covers current data | Also the new fields; `notify` and `seenBy` included |
| `medical-safety` | Prohibited behaviour | Fixed templates | Digest, protocol and call-history wording are fixed templates; pill appearance, purpose and frequency are family-entered text shown as entered, never interpreted |
| `missed-dose-alerts` | Alert delivery | Push goes to every member | Push respects `notify.missed` and quiet hours; urgent alerts are always delivered; the alert document is created for everyone either way |
| `call-flow`, `consent` | none | none | No change. Call placement, retries and consent behave as today |

## Impact

- **Backend:** four callables and one scheduled function in `functions/src`, a change to `alerts/fcm` and `alerts/createAlert` delivery, export and delete additions.
- **Rules and tests:** `firestore.rules` (parent, medicine and contact fields, `seenBy` server-only), emulator tests, mutation-check updates, `docs/rules-test-coverage.md`.
- **Mobile:** Today, Medicines (list and forms), Escalation, Family, the app bar, i18n strings, tests.
- **Privacy:** notification preferences, caregiver city and relationship, and read receipts are personal data about members; they are visible only to members of the same parent, included in export and deleted with the parent.
- **Operations:** a new scheduled function at 20:00 per parent timezone; Cloud Scheduler job to be created on deploy.
