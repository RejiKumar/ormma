# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
