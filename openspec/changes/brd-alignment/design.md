# Design

## Context

Observed today: `DoseCardView` reads `screens.today.badgeScheduled` ("Scheduled"); `DigestCard` has Copy and Share only; `ContactsBlock` lists the parent's emergency contacts and receives a `disabled` flag from `ProtocolCard`; medicine documents already have `source` (`manual` or `prescription_scan`), `confirmedByHuman` and `prescriptionId`, and the app only ever writes `source: "manual"`; the server callable `confirmPrescriptionMedicine` creates scan medicines, but no screen calls `scanPrescription` or that callable. Rules tests currently assert that an editor can create a `prescription_scan` medicine from the client and change `source`. The dispatcher runs every minute (`* * * * *`) and `dispatchDueCalls` selects events with `scheduledFor <= now`. See proposal.md for motivation and scope.

## Goals / Non-Goals

**Goals:**
- Close the four BRD gaps with the smallest changes, and make the two non-functional targets measurable.
- Make the Visual match tag impossible to forge from a client.

**Non-Goals:**
- A prescription scan screen, WhatsApp Business API, iOS or PWA, deleting parked code, new dependencies.

## Decisions

1. **Scheduled badge:** reuse the existing string key with a `{{time}}` parameter ("Scheduled for {{time}}") and pass `clock12(timezone, scheduledFor)`. Tests change from "Scheduled" to the new text.
2. **WhatsApp action:** build `https://wa.me/?text=${encodeURIComponent(text)}`; if the URL is longer than 2000 characters go straight to `Share.share`; otherwise `Linking.openURL(url)` and on rejection `Share.share`. No `canOpenURL` call (Android 11 package visibility would need a manifest `queries` entry; an https link always resolves to WhatsApp or the browser). Button label "Share on WhatsApp" in the catalogue, secondary style, compact like Copy and Share. Nothing is stored or logged.
3. **Parent direct line:** `ContactsBlock` gets an optional `parent` prop `{ name, phone }` and renders it first with the same row layout and the same `disabled` flag. A missing phone hides the row. The label reuses `escalation.contactCall`.
4. **Visual match tag:** a pure helper `isVisualMatch(medicine)` (`source === "prescription_scan" && confirmedByHuman && prescriptionId`) used by `MedicinesListScreen`; fixed catalogue string `screens.medicines.visualMatch` = "Visual match" in the neutral chip style (not coral, not a status colour, no model name, no extra accessibility text beyond the label). Honest limit: no screen creates scan medicines today, so the tag cannot appear in the running app until the scan screen exists.
5. **Rules tightening instead of a new field:** in `firestore.rules`, a create requires `source == 'manual'`, and an update requires `request.resource.data.source == resource.data.source` and the same for `prescriptionId`. The server (Admin SDK) bypasses rules, so `confirmPrescriptionMedicine` keeps working. `confirmedByHuman` stays editable by owner or editor so the existing confirm step is unchanged. Alternative considered: a new server-only `visualMatch` field; rejected as redundant with `source` plus `confirmedByHuman`.
6. **Dispatch timing:** no behaviour change. Add unit tests on `planCallGroups` for "not early" and "59 seconds late is eligible" and a spec requirement; real timing is measured in the pilot from `callSessions.startedAt - scheduledFor` (a documented Firestore query or a short script in `docs/PRELAUNCH-CHECKLIST.md`).
7. **NFR-2.1:** measured, not coded: cold open of Today on a mid-range Android phone with network throttled to 4G, from tap on the icon to the first dose card visible, five runs, median at most 1.2 s. If it fails, a follow-up change decides what to optimise.
8. **Parking:** `docs/DECISIONS.md` gets one line per decision: dormant weekly summary, trends and scanning; the four open changes deferred; the BRD platform wording versus the native app. No files are deleted and no function is un-exported.

## Risks / Trade-offs

- Tightening the rules can break a flow that wrote scan medicines from a client; mitigated by checking that no mobile code does, updating the emulator tests that asserted it, and re-running the rules mutation check.
- A tag nobody can see yet may look like unfinished work; stated plainly in the proposal and tasks, and covered by component tests with fixture medicines.
- Dispatch "within 60 s" depends on the scheduler and Exotel being healthy; the unit test proves eligibility only, the pilot measure proves the real number.
- "Visual match" can be read as "the AI confirmed it is correct"; the fixed label makes no such claim and the proposal keeps it off any dose or call wording.
