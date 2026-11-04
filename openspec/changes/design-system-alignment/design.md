# Design

## Context

Tokens live in `mobile/src/design/tokens.ts` (light and dark colour sets, spacing, radius, elevation, type scale). Components read them through `useTheme()`. Observed today: light canvas `#FAF7F2`, border `#EBE6DD`, ink `#1F2A2E`, muted ink `#506068`, radius `md 14 / lg 24`, tab bar `62 + inset`, pressed buttons fade (`opacity`), pressed cards fade, no `fontVariant`, springs in `motion.ts` for other animations. Coral is limited by `design/designRules.test.ts` to `AlertDot`, `AppHeader`, `Banner` and `tokens`. `design/contrast.test.ts` checks every declared text and icon pair in both themes against WCAG AA. See proposal.md for motivation and the user decisions.

## Goals / Non-Goals

**Goals:**
- One edit point (tokens) for palette, radius, elevation and type sizes, with components only reading tokens.
- Visual match to the supplied modules 2 and 4 to 12 in light theme; the same shapes in dark theme.
- No behaviour, data or string changes except one new fixed label ("Confirmation note").

**Non-Goals:**
- The phone frame (module 1), the Normal Day / Missed Morning toggle (module 3) and the "Visual match · Sonnet 5.5" tag.
- Changing the coral rule, pronoun-free wording, or Copy and Share buttons.
- New fonts or dependencies.

## Decisions

1. **Supplied colours for fills, adjusted shades for text.** Computed contrast: coral `#C85A32` on its tint `#FCEEE8` is 3.73:1 and on white 4.23:1, muted `#6B7470` on the chip `#EDEAE4` is 4.01:1 and on canvas 4.5:1 (borderline). The existing contrast test would fail these as text. Fills, dots, borders and icons keep the exact values (icons need 3:1 and pass); text tokens are darker shades of the same hue (missed text stays near the current `#9F3326`, muted-on-chip a slightly darker grey-green). Alternative considered: loosening the test for these pairs; rejected because the project requires AA.
2. **Coral stays restricted.** The hero button "See what Ormma tried" and the presence button "I called" use the primary tint and the neutral chip. The allowlist test stays as is; nothing new may import `colors.urgent`.
3. **Press feedback in one place.** A shared pressable wrapper (or a `usePressScale` hook) animates `transform: scale(0.97)` over 150 ms and the shadow opacity over 200 ms with Reanimated `withTiming`, honouring Reduce Motion (set instantly). `Button` and `Card` use it instead of opacity. The existing spring presets are kept for other motion.
4. **Tabular numerals** via `fontVariant: ["tabular-nums"]` on a `numeric` text option used for times, counters, dates and durations. React Native has no switch for the OpenType `cv11` feature, so `cv11` is not applied; this is recorded in docs/DECISIONS.md.
5. **Elevation levels** become tokens `elevation[0..4]` (iOS shadow props and Android `elevation`); the dark theme keeps hairline borders.
6. **Radii**: add `radius.chip = 16`; cards stay 24; pills 999.
7. **Bottom navigation**: height 64 plus the bottom inset, pill background `primaryTint` with radius 16 and padding 6 by 14 behind the active icon and label, 11 px medium labels, 6 px alert dot. Touch targets stay at least 48 dp.
8. **Dose card**: 24 px timeline dots; the confirmation note block gets the fixed label "Confirmation note" via the i18n catalogue (uppercase through style, not through the string), which the catalogue test must still accept.
9. **Dark theme**: reuse shapes and sizes; choose dark colours so the contrast test passes; no shadows.

## Risks / Trade-offs

- A darker text shade differs slightly from the supplied hex; mitigated by using the exact value for every non-text part and documenting it.
- Changing token values touches many screens at once; mitigated by token-only edits, existing component tests, and an emulator pass over the four tabs in light and dark.
- Text sizes of 10 and 11 px are small; they must scale with the system font size, and the screens are re-checked at 130 percent and 200 percent font scale for clipping.
- Reanimated press scaling on every card adds work per render; limited to pressable cards and buttons.
