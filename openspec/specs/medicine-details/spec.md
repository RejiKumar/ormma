# medicine-details Specification

## Purpose
TBD - created by archiving change prototype-full-parity. Update Purpose after archive.

## Requirements

### Requirement: Medicine display fields
A medicine MAY carry `frequencyText` (for example "Twice daily · morning and afternoon, after food"), `pillDescription` (for example "Small round white tablet in silver strip") and `purpose` (for example "Sugar"), each up to 1000 characters. They are entered by the family, stored as given, shown as given, and never interpreted, translated or corrected by the system. The Add and Edit medicine forms SHALL offer all three as optional text fields. Only the time field keeps a format check (HH:mm).

#### Scenario: Entered text is shown as entered
- **WHEN** a member saves a medicine with purpose "Sugar"
- **THEN** the Medicines tab shows a tag "For Sugar"

#### Scenario: Optional
- **WHEN** a medicine has none of these fields
- **THEN** the card shows only the name, dose and times

#### Scenario: Too long
- **WHEN** a member enters more than 1000 characters in one of these fields
- **THEN** the form stops the entry and the save is not attempted

### Requirement: Medicines tab layout
The Medicines tab SHALL show "<Parent>'s medicines" with the number of active medicines, then one card per medicine with the name and dose, an Active or Inactive badge, the frequency text, the pill appearance and the purpose tag. When a parent has a `prescriber` or `refillDue`, a footer SHALL read "Prescribed by <prescriber> · refill due <date>", showing only the parts that are set.

#### Scenario: Footer
- **WHEN** the parent has prescriber "Dr. Nair" and refill due 2026-11-02
- **THEN** the footer reads "Prescribed by Dr. Nair · refill due 2 Nov"

#### Scenario: Count
- **WHEN** three medicines are active and one is inactive
- **THEN** the heading shows "3 active"

### Requirement: Parent details
A parent MAY carry `city` (up to 40 characters), `prescriber` (up to 60 characters) and `refillDue` (a date, YYYY-MM-DD). Only owners SHALL edit them, from the Family tab. The app bar pill SHALL read "<Parent> · <city>" when a city is set, otherwise the parent's name alone.

#### Scenario: City in the pill
- **WHEN** the parent's city is "Thrissur"
- **THEN** the pill reads "Amma · Thrissur"

#### Scenario: Non-owner
- **WHEN** an editor or viewer opens the Family tab
- **THEN** no control to edit these fields is shown

### Requirement: Contact note
An emergency contact SHALL allow an optional `note` of up to 60 characters (for example "2 min walk from Amma"), and the app SHALL show it under the contact's label.

#### Scenario: Note shown
- **WHEN** a contact has a note
- **THEN** the escalation view shows it under the contact's name

### Requirement: Visual match tag
A medicine card SHALL show a neutral tag "Visual match" only when the medicine has `source` "prescription_scan", a `prescriptionId`, and `confirmedByHuman` true, that is, it was read from a prescription photo and a person confirmed it. The tag SHALL be a fixed label, SHALL NOT name an AI model, SHALL NOT claim the medicine is correct, and SHALL NOT use a status or coral colour. It does not appear for medicines the family typed in.

#### Scenario: Scanned and confirmed
- **WHEN** a medicine has source "prescription_scan", a prescriptionId and confirmedByHuman true
- **THEN** its card shows the tag "Visual match"

#### Scenario: Typed in
- **WHEN** a medicine has source "manual"
- **THEN** its card shows no such tag

#### Scenario: Not yet confirmed
- **WHEN** a scanned medicine has confirmedByHuman false
- **THEN** no tag is shown and no calls are scheduled for it

#### Scenario: No model name
- **WHEN** the tag is shown
- **THEN** no screen text or accessibility label names an AI model

### Requirement: Prefill from the last medicine
When a parent already has at least one medicine, the Add medicine form SHALL open with dose, frequency text, how it looks, purpose, times and start date copied from the medicine created most recently for that parent, and SHALL leave the name empty. The form SHALL show the note "Filled from the last medicine. Check before saving." with a Clear action that empties the copied fields. Every field SHALL stay editable. A start date in the past SHALL NOT be copied; today SHALL be used instead. The copied values SHALL be the family's own earlier entries, never generated, and a medicine SHALL be saved only when the person presses Save.

#### Scenario: Second medicine
- **WHEN** a parent has a medicine with dose "500mg", times 08:00 and 20:00 and purpose "Sugar", and a member opens Add medicine
- **THEN** the form shows those values, the name is empty and the note is shown

#### Scenario: Clear
- **WHEN** the member presses Clear
- **THEN** the copied fields are emptied (the start date returns to today) and the note disappears

#### Scenario: First medicine
- **WHEN** a parent has no medicine
- **THEN** the form opens empty and no note is shown

#### Scenario: Old start date
- **WHEN** the last medicine started on a past date
- **THEN** the start date in the form is today

#### Scenario: Never saved by itself
- **WHEN** the form is prefilled and the member leaves without pressing Save
- **THEN** no medicine is created
