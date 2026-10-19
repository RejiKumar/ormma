# Proposal

## Why

Stages 2 to 4 build every screen of the app. Without one shared visual language and component set, each screen would invent its own colours, fonts, motion and status display, and the medical-safety presentation rules (no judgement colours on health readings, status never by colour alone, visible disclaimer) would be re-implemented, and re-broken, screen by screen. The design system is inserted before Stage 2 so all screens use it.

## What Changes

- New `mobile/src/design/`: tokens (colours for a light and a separately designed dark theme, type scale, spacing, radius, elevation, motion durations), theme provider with light (default), dark and system options remembered on the device, script-aware typography (Inter plus Noto Sans Malayalam, Tamil, Devanagari) with per-script line heights and OS font scale support, and motion helpers (Reanimated springs, Reduce Motion, haptics).
- New `mobile/src/i18n/`: i18next scaffolding, English catalogue now, ml, ta and hi catalogues supported with fallback to English, and a lint rule that bans hard-coded user-visible strings in screens and components.
- New components: Button, Card, StatusChip, DoseRing, ParentCard, Avatar, ListItem, Banner, DisclaimerFooter, EmptyState, Skeleton, plus the foundation pieces they need (themed Text, Icon set drawn with SVG, Screen layout with the bottom primary-action slot and the disclaimer footer).
- Bottom tab navigation scaffold and a dev-only component gallery screen; the placeholder screen from Stage 0 is rebuilt on the design system.
- Automated checks: WCAG AA contrast for every declared text, large text and icon pair in both themes (fails below 4.5:1, or 3:1 for large text and icons), glyph coverage of real ml, ta, hi and en strings against the bundled fonts, and React Native Testing Library tests for each component.
- Libraries are added with `expo install` at the versions the installed SDK pins; choices are recorded in `docs/DECISIONS.md`.

Spec changes: one new capability, `design-system`; no requirement of any existing capability is changed. The presentation rules it contains restate and apply `medical-safety` (neutral readings, disclaimer) and add the coral-only-for-missed-and-urgent colour rule.

## Capabilities

### New Capabilities
- `design-system`: tokens, themes, contrast, Indic typography, i18n, layout and navigation, core components, status display, neutral readings, disclaimer, motion and Reduce Motion, component tests.

### Modified Capabilities
None.

## Impact

- `mobile/` gains dependencies: react-native-reanimated and react-native-worklets, react-native-svg, expo-haptics, expo-font, expo-localization, @react-native-async-storage/async-storage, i18next, react-i18next, @expo-google-fonts packages for Inter and the three Noto Sans scripts, and dev dependency fontkit for the glyph test.
- New ESLint rule for `mobile/src`, new mobile tests, `docs/design-system.md`.
- No Firebase, functions, rules or backend change.

## Out of scope

- Real screens and flows (Stages 2 to 4 use this system).
- Translations into Malayalam, Tamil and Hindi: they need native-speaker review before shipping, so only the infrastructure and English ship now.
- A native build, store assets, an app icon redesign.
- Brand logo and illustration.
