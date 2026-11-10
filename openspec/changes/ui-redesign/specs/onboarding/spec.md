# Spec Delta

## Purpose
Defines what a person sees the first time they open Ormma and what an account with no parent yet shows, so a new user understands the app and reaches a first parent without help.

## ADDED Requirements

### Requirement: Welcome intro on first launch
The app SHALL show a welcome intro of exactly three steps before the sign-in screen on the first launch on a device: what Ormma does, how the check-in calls work, and who can see what. The intro SHALL be skippable at every step, SHALL be shown once, and the fact that it was seen SHALL be remembered on the device and SHALL apply without signing in. The intro text SHALL come from the translation catalogue and SHALL contain no medical advice, no claim about a person's health and no pressure wording.

#### Scenario: First launch
- **WHEN** the app starts for the first time on a device
- **THEN** the first of three intro steps is shown before the sign-in screen

#### Scenario: Skip
- **WHEN** the user taps Skip on any step
- **THEN** the intro closes, the sign-in screen is shown and the intro is marked as seen

#### Scenario: Finish
- **WHEN** the user completes the third step
- **THEN** the sign-in screen is shown and the intro is marked as seen

#### Scenario: Not shown again
- **WHEN** the app starts after the intro was seen
- **THEN** it goes straight to sign-in, or to the main tabs for a signed-in user

#### Scenario: Wording
- **WHEN** the three intro steps are rendered
- **THEN** none of them advises on, comments on or promises anything about a dose, a medicine or a health reading
- **AND** the disclaimer "This app does not provide medical advice." is visible on every step

### Requirement: Intro accessibility and motion
Each intro step SHALL have a text equivalent for its illustration, SHALL be reachable with a screen reader in reading order, SHALL keep all controls at least 48 dp, and SHALL change step without animation when Reduce Motion is on.

#### Scenario: Screen reader
- **WHEN** a screen reader focuses an intro step
- **THEN** it reads the step title, the step text and then the Next or Skip control, and the illustration has a short description or is hidden as decorative

#### Scenario: Reduce Motion
- **WHEN** Reduce Motion is on and the user moves to the next step
- **THEN** the step changes immediately with no slide or fade

### Requirement: Replay the intro
The Settings screen SHALL offer a "Show welcome again" row that opens the intro again, and finishing or skipping it SHALL return to Settings.

#### Scenario: Replay
- **WHEN** a signed-in user taps "Show welcome again" in Settings
- **THEN** the three intro steps are shown, and finishing or skipping returns to Settings

### Requirement: First-parent checklist
While a signed-in user belongs to no parent, or is the owner of a parent that has no medicine yet, the Today tab SHALL show a checklist card with three items in this order: add a parent, add a medicine, invite family. Each item SHALL show whether it is done, and SHALL open the screen where it is done. The first item that is not done SHALL be the one primary action of the screen. Items SHALL be marked done only from data that already exists (a parent exists, a medicine exists, another member exists) and SHALL NOT write anything. Once an owned parent has at least one medicine, the checklist SHALL no longer be shown, whether or not family was invited.

#### Scenario: Brand-new account
- **WHEN** a user with no parent opens Today
- **THEN** the checklist card shows three items, none done, with "Add a parent" as the primary action

#### Scenario: Parent added, no medicine
- **WHEN** the user owns one parent that has no medicines
- **THEN** the checklist shows "Add a parent" as done and "Add a medicine" as the primary action

#### Scenario: First medicine added
- **WHEN** an owned parent has at least one medicine
- **THEN** the checklist is not shown on Today

#### Scenario: Member who is not an owner
- **WHEN** a user who only belongs to a parent as an editor or a viewer opens Today
- **THEN** no checklist is shown, because that user cannot add a parent's medicines or invite

#### Scenario: Read-only
- **WHEN** the checklist is shown
- **THEN** it performs no write to the database

### Requirement: Calm empty states
An empty state SHALL name what is missing, say in one sentence what will appear there, and offer at most one primary action that leads to the screen where the missing item is created. It SHALL NOT use urgent colour, warning wording or a count of what was missed.

#### Scenario: Empty Medicines
- **WHEN** a parent has no medicines
- **THEN** the Medicines tab shows an illustrated empty state, and the screen offers "Add a medicine" as its one primary action for members allowed to add one (owners and editors), and no action for members who are not

#### Scenario: Medicines with no parent
- **WHEN** the user belongs to no parent
- **THEN** the Medicines tab shows an illustrated empty state, and the screen offers "Add a parent" as its one primary action

#### Scenario: Neutral tone
- **WHEN** any empty state is rendered
- **THEN** it uses the neutral and primary styles and no coral
