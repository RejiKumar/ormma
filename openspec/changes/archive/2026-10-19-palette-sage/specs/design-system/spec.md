# Spec Delta

## Purpose

Re-hues the shipped light and dark palettes to the warm companion direction of the mobile design specification, without changing any token name, semantic role or safety rule.

## MODIFIED Requirements

### Requirement: Design tokens
The app SHALL define all colours, the type scale, spacing, radius, elevation and motion durations as tokens in one module, and screens and components SHALL use the tokens instead of literal values. The light palette SHALL start from background #FAF7F2, surface #FFFFFF, ink #1F2A2E, primary #2D5A4C and accent #F2A93B, adjusted only as needed to pass the contrast requirement, and borders SHALL be a subdued warm neutral that separates cards from the background without a hard line. The status colours, the coral rule (coral only for the missed status and the urgent banner) and the neutral reading style are unchanged by this palette.

#### Scenario: Token source
- **WHEN** a component needs a colour, font size, spacing, radius, elevation or duration
- **THEN** it reads it from the theme tokens

#### Scenario: Status colours
- **WHEN** the tokens are defined
- **THEN** they include status colours for taken, pending, missed, unclear and calling, each with a foreground, a background and an icon colour
