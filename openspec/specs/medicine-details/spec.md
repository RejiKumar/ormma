# medicine-details Specification

## Purpose
TBD - created by archiving change prototype-full-parity. Update Purpose after archive.

## Requirements

### Requirement: Medicine display fields
A medicine MAY carry `frequencyText` (up to 80 characters, for example "Twice daily · morning and afternoon, after food"), `pillDescription` (up to 80 characters, for example "Small round white tablet in silver strip") and `purpose` (up to 40 characters, for example "Sugar"). They are entered by the family, stored as given, shown as given, and never interpreted, translated or corrected by the system. The Add and Edit medicine forms SHALL offer all three as optional text fields.

#### Scenario: Entered text is shown as entered
- **WHEN** a member saves a medicine with purpose "Sugar"
- **THEN** the Medicines tab shows a tag "For Sugar"

#### Scenario: Optional
- **WHEN** a medicine has none of these fields
- **THEN** the card shows only the name, dose and times

#### Scenario: Too long
- **WHEN** a member enters more than the allowed length
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
