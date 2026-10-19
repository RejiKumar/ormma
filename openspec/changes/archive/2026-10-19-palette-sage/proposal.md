# Proposal

## Why

The mobile UI/UX design specification (`design_spec.md`) sets the product's emotional thesis — a warm companion, not a clinical tool — and the shipped palette's teal primary reads cooler than that thesis. Swapping the primary hue and surface tints at token level injects the warm companion feeling into every screen at once, with zero component churn, before Stages 2 to 4 build screens on the design system.

## What Changes

- Light theme: background `#FBF7F2` to warm cream `#FAF7F2`; primary `#0F6B6B` to sage `#2D5A4C`; primaryTint becomes the sage tint `#E8F0EC`; border `#E4DACB` becomes the subdued `#EBE6DD`; focus becomes a dark sage derived from the primary.
- Dark theme: primary and tints re-hued from teal to a lifted sage, designed by hand (not an inversion), following the same rule as the original dark theme.
- Semantics are untouched: token names and structure, ink `#1F2A2E`, surface `#FFFFFF`, accent `#F2A93B` with its amber-fill rule, the five status colours, the coral-only-for-missed-and-urgent rule and the neutral reading style all stand. `inkMuted` and any failing pair adjust only as the contrast requirement demands.
- The WCAG contrast test re-runs over every declared pair in both themes and decides the final values; the design-rules coral checks are unaffected.
- `docs/design-system.md` and `docs/DECISIONS.md` are updated with the new values.

## Spec changes

Requirement: **Design tokens** (`openspec/specs/design-system/spec.md`).
Old behaviour: the light palette starts from background `#FBF7F2`, surface `#FFFFFF`, ink `#1F2A2E`, primary `#0F6B6B` and accent `#F2A93B`, adjusted only as needed to pass the contrast requirement.
New behaviour: the light palette starts from background `#FAF7F2`, surface `#FFFFFF`, ink `#1F2A2E`, primary `#2D5A4C` and accent `#F2A93B`, adjusted only as needed to pass the contrast requirement, with borders as a subdued warm neutral that separates cards from the background without a hard line.
No other requirement of any capability changes: status semantics, the coral rule, motion, typography (Inter stays per decision #41), layout and components are untouched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-system`: the Design tokens requirement's light-theme start values and the border token.

## Impact

- `mobile/src/design/tokens.ts` only (light and dark values); no component, navigation, i18n, test-setup or dependency change.
- The contrast test and design-rules test re-run over the new values; `docs/design-system.md` and `docs/DECISIONS.md` updated.

## Out of scope

- Typography: Inter-only stands (decision #41); no Plus Jakarta Sans or Fraunces display headings.
- New semantic tokens (a clay "notice" token is deferred with the postponed status, which does not exist yet).
- Status colour redesign, the taken-green vs sage proximity is accepted for now and only revisited if it proves confusing on a device.
- App icon, brand artwork, component restyling, store assets.
