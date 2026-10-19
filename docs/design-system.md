# Design system

Direction: warm, calm clarity. Light theme by default, a separately designed dark theme, and a "system" option. Bento-style cards, rounded geometry, one primary action per screen, bottom tab navigation, everything reachable in the thumb zone. Capability spec: `openspec/specs/design-system/spec.md`.

## Where things live

| Path                                     | What                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `mobile/src/design/tokens.ts`            | Colours (light and dark), type scale, spacing, radius, elevation, motion durations, declared contrast pairs |
| `mobile/src/design/ThemeProvider.tsx`    | `ThemeProvider`, `useTheme()`; options light, dark, system; remembered on the device (`ormma.theme`)        |
| `mobile/src/design/fonts.ts`, `Text.tsx` | Fonts per script, line heights, themed `Text`                                                               |
| `mobile/src/design/motion.ts`            | Spring presets, Reduce Motion, light haptic                                                                 |
| `mobile/src/design/contrast.ts`          | WCAG helpers used by the contrast test                                                                      |
| `mobile/src/i18n/`                       | i18next setup, typed catalogue keys, `locales/en.json` (and empty ml, ta, hi)                               |
| `mobile/src/components/`                 | The components below                                                                                        |
| `mobile/src/navigation/`                 | Bottom tabs and the route list (`getTabRoutes`)                                                             |
| `mobile/src/screens/gallery/`            | Dev-only component gallery                                                                                  |

## Components

| Component          | Use                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `Screen`           | Layout every screen uses: safe areas, scroll, bottom slot for the one primary action, disclaimer footer |
| `Button`           | `primary` (56 dp, one per screen), `secondary`, `quiet`; loading and disabled states                    |
| `Card`             | Bento card; `surface`, `alt`, `tinted`; pressable when given `onPress`                                  |
| `StatusChip`       | Dose status as icon + label + colour: taken, pending, missed, unclear, calling now (pulse)              |
| `DoseRing`         | SVG ring of doses taken out of total, animated fill, accessible progress value                          |
| `ParentCard`       | Avatar, name, next-dose summary, status chip and dose ring in one pressable card                        |
| `Avatar`           | Initials on a warm neutral tint (never a status colour)                                                 |
| `ListItem`         | Row at least 56 dp, optional chevron, leading and trailing content                                      |
| `Banner`           | `info` (calm teal) and `urgent` (coral, urgent alerts only), optional action                            |
| `DisclaimerFooter` | "This app does not provide medical advice." (shown by `Screen`)                                         |
| `EmptyState`       | Icon, title, description, optional action                                                               |
| `Skeleton`         | Static loading placeholder (fades in once, never loops)                                                 |
| `ConfirmCheck`     | Checkmark confirmation with a spring and one light haptic                                               |
| `ReadingValue`     | A health reading in the neutral style                                                                   |
| `Text`, `Icon`     | Themed text with script-aware font; SVG icon set                                                        |

## Rules for screens

1. Build every screen on `Screen`. It adds the disclaimer. A screen has at most one `primary` Button, passed as `primaryAction` so it sits at the bottom.
2. No hard-coded user-visible strings. Use `t("key")` and add the key to `src/i18n/locales/en.json`. Lint fails on literal JSX text and on literal `title`, `label`, `placeholder`, `accessibilityLabel`, `accessibilityHint`, `alt`, `description`, `text`, `message`, `subtitle`, `heading` props in `screens`, `components`, `navigation` and `design` (the gallery and tests are exempt).
3. Use tokens, never literal colours, sizes or durations: `const { theme } = useTheme()`.
4. Never colour or label a health reading as good, bad, normal, safe or dangerous. Show readings with `ReadingValue`. Coral is only for the missed status and the urgent banner. `designRules.test.ts` enforces this over the source and the English catalogue.
5. Every status shows an icon and a text label, not colour alone (`StatusChip`).
6. Touch targets are at least 48 dp. Use `minHeight`, never a fixed `height`, so larger text grows the component.
7. Only the "calling now" pulse may animate forever. Use `useMotion().springTo(...)` for springs so Reduce Motion is respected.
8. Pass the parent's language as `lang` to `Text` or `ListItem` for names written in another script; otherwise the font follows the content.

## Adding or changing a colour

Add the colour to both `lightColors` and `darkColors`, add every text and icon combination the components use to `contrastPairs()`, and run `npm test` in `mobile/`. The contrast test fails below 4.5:1 for text and 3:1 for large text (24 px, or 18.67 px bold) and for icons and graphics, and fails if a foreground token is in no pair.

## Fonts and languages

Inter for English; Noto Sans Malayalam, Tamil and Devanagari for ml, ta and hi. Static weights are bundled (Inter 400, 500, 600, 700; each script 400, 500, 700, with semibold using the bold file). Line heights per script: Latin 1.4, Devanagari 1.6, Tamil 1.65, Malayalam 1.75. `glyphs.test.ts` checks real strings against the bundled font files. ml, ta and hi catalogues are empty until native-speaker-reviewed translations exist; the English text is shown and rendered with Inter.

## Commands

From `mobile/`: `npm test` (all component, theme, contrast, glyph and i18n tests), `npm run typecheck`. From the repo root: `npm run lint`. The gallery tab appears in development builds only.
