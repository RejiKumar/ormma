# Tasks

## 1. Tokens and typography

- [x] 1.1 `tokens.ts`: set the supplied light palette (canvas, ink, muted, border, surface, primary, tint, tint ink, neutral chip, coral, coral tint); add text-safe shades where a supplied pair is below 4.5:1 and keep the exact values for fills, dots, icons and borders
- [x] 1.2 `tokens.ts`: add `radius.chip = 16`, elevation levels 0 to 4 (primary-tinted level 2, toast level 3), and the screen type scale sizes from the design-system spec
- [x] 1.3 Dark theme: same shapes and sizes, own colours, hairline borders, no shadows
- [x] 1.4 `Text.tsx`: add a numeric option using `fontVariant: ["tabular-nums"]` and apply it to times, counters, dates and durations
- [x] 1.5 `contrast.test.ts`: declare every new text, icon and graphic pair for both themes and make sure the suite passes; keep `designRules.test.ts` coral allowlist unchanged

## 2. Shared components

- [x] 2.1 Press feedback: shared hook or wrapper with scale 0.97, 150 ms transform and 200 ms shadow, instant under Reduce Motion; use it in `Button` and `Card`
- [x] 2.2 `Button`: primary, secondary and quiet styles from the tokens; the 42 px digest pill; 48 dp minimum kept
- [x] 2.3 `Card`, `StatusChip` and badges: 24 px radius, 1 px border, level 1 elevation, 11 px semibold badge text, tint and neutral chip backgrounds
- [x] 2.4 `Banner` and the toast: ink background, white 14 px medium text, radius 16, padding 12 by 16, level 3 elevation, announced to assistive technology

## 3. Screens

- [x] 3.1 App bar: 18 px bold brand, location pill (tint background, 12 px medium, 6 px status dot, coral only while a dose is missed)
- [x] 3.2 Today hero: gradient `#2D5A4C` to `#204237`, radius 24, padding 20, 76 px ring with 15 px semibold counter, 22/28 title, 12/16 subtitle, "See what Ormma tried" in the primary tint style
- [x] 3.3 Presence bar: white card, 12 px padding, initials avatars (viewer primary, others tint), 11/15 muted text, "I called" in the neutral style
- [x] 3.4 Dose cards: 24 px dots, 15 px period name, 13 px medicine line, 11 px badges, chip radius 16, note block with the "Confirmation note" label (add the fixed string to the catalogue), 11 px receipts
- [x] 3.5 Digest card: 15 px title, 12 px subtitle, preview box on the neutral chip (radius 16, 13/20), 42 px pill buttons for Copy and Share
- [x] 3.6 Medicines tab: title 18 and subtitle 12, medicine name 15, dose line 12, pill chip 11 medium
- [x] 3.7 Escalation tab: step title 14 semibold, step meta 12 muted, call buttons as 12 px semibold primary text on pills, contact name 14 medium
- [x] 3.8 Bottom navigation: 64 dp plus inset, 1 px top border, 11 px medium labels, tint pill (radius 16, padding 6 by 14) on the active tab, 6 px coral alert dot

## 4. Safety, docs and tests

- [x] 4.1 Wording review: the only new string is "Confirmation note"; confirm no advice or judgement words and that the catalogue test passes
- [x] 4.2 Update component tests that assert labels or styles; add tests for the press scale (with and without Reduce Motion), the note label and the tab bar height and pill
- [x] 4.3 Append decisions to `docs/DECISIONS.md` (adjusted text shades, no `cv11`, coral rule kept, tag omitted, prototype-only modules skipped)
- [x] 4.4 `npm run lint`, `npm run typecheck`, `npm test`

## 5. Verification

- [x] 5.1 Run on `flutter_emulator` in light and dark: Today, Medicines, Escalation and Family at normal and large font scale; fix clipping, padding or contrast issues found
- [x] 5.2 Commit to `main`
