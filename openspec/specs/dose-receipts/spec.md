# dose-receipts Specification

## Purpose
TBD - created by archiving change prototype-full-parity. Update Purpose after archive.

## Requirements

### Requirement: Dose cards on Today
The Today screen SHALL show one card per scheduled time for each parent, in time order. Dose events of the same parent with the same scheduled time SHALL share one card that lists their medicines joined by " + " (for example "Metformin 500mg + Amlodipine 5mg"). Each card SHALL show the clock time in the parent's timezone, a period name derived from that local time (Morning from 05:00, Afternoon from 12:00, Evening from 17:00, Night from 21:00 until 05:00), and the medicine pill appearance of each medicine when one is set.

#### Scenario: Two medicines at one time
- **WHEN** a parent has two dose events at 08:30 for different medicines
- **THEN** one card is shown, named Morning, listing both medicines joined by " + "

#### Scenario: Period names
- **WHEN** doses are at 08:30, 13:30 and 21:00
- **THEN** their cards are named Morning, Afternoon and Night

### Requirement: Status badge wording
Each card SHALL show one badge. A card whose events are all `taken` SHALL read "Taken on time" followed by the time taken when it was taken within 30 minutes before or after the scheduled time, otherwise "Taken" followed by the time taken. A card with any `missed`, `no_answer` or `not_taken` event SHALL read "Not confirmed". A card with `calling` SHALL read "Calling now", with `unclear` SHALL read "Unclear", and otherwise "Scheduled for" followed by the scheduled time. Times SHALL use the parent's timezone.

#### Scenario: On time
- **WHEN** a dose scheduled at 08:30 was resolved as taken at 08:34
- **THEN** the badge reads "Taken on time · 8:34 AM"

#### Scenario: Late
- **WHEN** a dose scheduled at 13:30 was resolved as taken at 14:20
- **THEN** the badge reads "Taken · 2:20 PM"

#### Scenario: Missed
- **WHEN** a dose is `missed`
- **THEN** the badge reads "Not confirmed"

#### Scenario: Scheduled
- **WHEN** a dose scheduled at 21:00 has not happened yet
- **THEN** the badge reads "Scheduled for 9:00 PM"

### Requirement: Confirmation note block
A card whose events carry a `confirmationNote` SHALL show that note in its own block under the medicines. The note SHALL be shown exactly as stored, without edits or additions.

#### Scenario: Note present
- **WHEN** a taken dose has a confirmation note
- **THEN** the card shows the note text unchanged

#### Scenario: No note
- **WHEN** a dose has no confirmation note
- **THEN** no note block is shown

### Requirement: Read receipts
When a member opens Today, the app SHALL ask a callable function to record, for each dose event of that day that the member has not yet seen, `seenBy.{uid}` with the server time. The function SHALL never overwrite an existing entry, SHALL check membership and consent visibility, and SHALL write nothing for events the member may not read. A card SHALL show "Seen by" followed by the names and times of members who have seen it, other than the viewer, in time order.

#### Scenario: First view
- **WHEN** Meera opens Today and has not seen a dose
- **THEN** `seenBy` gains her uid with the server time
- **AND** Rahul's card shows "Seen by Meera 9:10 AM"

#### Scenario: Second view
- **WHEN** Meera opens Today again
- **THEN** her original time is unchanged

#### Scenario: Non-member
- **WHEN** a user who is not a member calls the function
- **THEN** it fails with permission-denied and writes nothing

### Requirement: Hero next-dose line
The hero card SHALL show "Next: " followed by the combined medicine names and the time of the next pending card, or no next line when none is pending.

#### Scenario: Next dose
- **WHEN** the next pending card is Atorvastatin 10mg at 21:00
- **THEN** the hero shows "Next: Atorvastatin 10mg at 9:00 PM"

### Requirement: Mark as taken on a scheduled card
A card with a pending dose SHALL offer "Mark as taken" to owners and editors only, using the existing family override rules, and SHALL NOT offer it to viewers.

#### Scenario: Viewer
- **WHEN** a viewer opens a card with a pending dose
- **THEN** no "Mark as taken" action is shown

### Requirement: Dose card shapes
A dose card SHALL have a 24 px radius and 16 px padding, a 24 px timeline dot (white check on primary for taken, white alert on coral for missed, clock inside a dashed 2 px muted border for scheduled), a 15 px semibold period name, a 13 px medium medicine line, an 11 px semibold status badge and an 11 px muted read-receipt line. The pill appearance chip SHALL have a 16 px radius, 12 px medium text and the tint background.

#### Scenario: Taken card
- **WHEN** a dose card is taken
- **THEN** its dot is a primary circle with a white check and its badge uses the tint background with tint ink text

#### Scenario: Scheduled card
- **WHEN** a dose card is scheduled
- **THEN** its dot has a dashed 2 px muted border with a clock icon and its badge uses the neutral chip

### Requirement: Confirmation note label
The confirmation note block SHALL have the canvas background, a 16 px radius and 12 px padding, and SHALL show the fixed label "Confirmation note" in 10 px uppercase semibold muted text above the note body. The label is a fixed template and carries no advice or judgement.

#### Scenario: Note with label
- **WHEN** a taken card has a confirmation note
- **THEN** the label reads "Confirmation note" in uppercase above the note text

#### Scenario: No note
- **WHEN** a card has no confirmation note
- **THEN** neither the block nor the label is shown
