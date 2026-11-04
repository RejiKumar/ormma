# Proposal

## Why

The user supplied a module-by-module design system for "Ormma — Family Care Companion" (typography, colours, radii, shadows, elevation, navigation, toast, press feedback). The app already follows the earlier prototype's layout and content, but its tokens differ in many values (canvas, ink, border, muted ink, radii, type sizes, nav height). Aligning tokens and components to the supplied values makes the app and the design agree in one place, without changing behaviour.

## What Changes

- Replace the light-theme colour tokens with the supplied palette: canvas `#F8F7F4`, ink `#1A2421`, muted ink `#6B7470`, border `#E5E2DC`, surface `#FFFFFF`, primary `#2D5A4C`, tint `#EBF1EE`, tint ink `#1C3B32`, neutral chip `#EDEAE4`, coral `#C85A32`, coral tint `#FCEEE8`. Where a supplied pair fails WCAG AA for text (coral text on coral tint is 3.73:1, muted ink on the neutral chip is 4.01:1), the supplied colour stays for fills, dots, icons and borders, and a darker shade of the same hue is used for text.
- Inter with tabular numerals (`tnum`, `cv11`) for times, counters and dates.
- Restyle by module: header and location pill, hero card (gradient, 76 px ring, 22/28 title), presence bar, dose cards (radius 24, padding 16, 24 px timeline dots, 11 px badges, pill chip radius 16, "Confirmation note" block, 11 px read receipts), digest card (preview box, 42 px pill button), Medicines typography, Escalation typography and call buttons, bottom navigation (64 px, pill active tab radius 16, 6 px alert dot), toast banner, press feedback (scale 0.97, 150 ms transform, 200 ms shadow) and elevation levels 0 to 4.
- Decisions taken with the user: the coral rule stays (coral only for the missed status, the urgent banner, the app bar status dot while a dose is missed and the Escalation alert dot, so "See what Ormma tried" and "I called" use primary and neutral styles); the "Visual match · Sonnet 5.5" tag is not built; pronoun-free wording and the Copy and Share buttons stay; the phone frame (module 1) and the Normal Day / Missed Morning toggle (module 3) are prototype-only and are skipped.
- The dark theme gets the same shapes, sizes and elevation rules with its own colours, and keeps passing the contrast test.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `design-system`: new requirements for the supplied palette and the text-colour rule, coral usage, tabular numerals, shapes and elevation levels 0 to 4, press feedback, bottom navigation, toast banner and the screen type scale.
- `dose-receipts`: dose card shapes (24 px dot, badge and receipt sizes) and a fixed "Confirmation note" label above the note.

## Impact

- Code: `mobile/src/design/tokens.ts`, `fonts.ts`, `Text.tsx`, `motion.ts`; components `Button`, `Card`, `Badge`, `AppHeader`, `DoseCardView`, `DigestCard`, `PresenceBar`, `ContactsBlock`, `ProtocolCard`, the tab bar in `navigation/AppTabs.tsx`, and the banner component; one new i18n string for the note label.
- Tests: contrast pairs in `design/contrast.test.ts`, the coral allowlist in `design/designRules.test.ts` (list of files may grow by none), and component tests that assert labels.
- No Firestore, Functions, data or dependency changes.
