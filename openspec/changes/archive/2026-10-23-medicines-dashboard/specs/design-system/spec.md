# Spec Delta

## Purpose

The dashboard renders today's dose events, whose stored status can be any of the seven dose-event-lifecycle states. The design tokens must therefore cover `not_taken` and `no_answer` as well, so every event gets its own icon, label and colour (never colour alone, coral stays missed-only).

## MODIFIED Requirements

### Requirement: Design tokens
The app SHALL define all colours, the type scale, spacing, radius, elevation and motion durations as tokens in one module, and screens and components SHALL use the tokens instead of literal values. The light palette SHALL start from background #FAF7F2, surface #FFFFFF, ink #1F2A2E, primary #2D5A4C and accent #F2A93B, adjusted only as needed to pass the contrast requirement, and borders SHALL be a subdued warm neutral that separates cards from the background without a hard line. The status colours, the coral rule (coral only for the missed status and the urgent banner) and the neutral reading style are unchanged by this palette.

#### Scenario: Token source
- **WHEN** a component needs a colour, font size, spacing, radius, elevation or duration
- **THEN** it reads it from the theme tokens

#### Scenario: Status colours
- **WHEN** the tokens are defined
- **THEN** they include status colours for taken, pending, missed, unclear, calling, not_taken and no_answer, each with a foreground, a background and an icon colour
- **AND** no colour of the not_taken or no_answer status equals a coral colour of the missed status or the urgent banner

### Requirement: Status display
Every dose status (taken, pending, missed, unclear, calling now, not taken, and no answer) SHALL be shown with an icon, a text label and its status colour, never by colour alone.

#### Scenario: StatusChip content
- **WHEN** a StatusChip is rendered for any status
- **THEN** it contains an icon, a label from the translation catalogue, and the colours of that status

#### Scenario: Accessible name
- **WHEN** a screen reader reads a StatusChip
- **THEN** it announces the label text

#### Scenario: All seven dose statuses
- **WHEN** a StatusChip is rendered once for each of taken, pending, missed, unclear, calling, not_taken and no_answer
- **THEN** each chip shows that status's own icon, its own catalogue label and its own status colours
