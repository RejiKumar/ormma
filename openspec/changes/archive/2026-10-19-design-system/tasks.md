# Tasks

Constraints: only libraries at the versions Expo SDK 58 pins (use `npx expo install`; check with `npx expo-doctor`); no change to any requirement of another capability; no hard-coded user-visible strings in screens or components.

## 1. Dependencies and test setup

- [x] 1.1 Add react-native-reanimated, react-native-worklets, react-native-svg, expo-haptics, expo-font, expo-localization, @react-native-async-storage/async-storage and @react-navigation/bottom-tabs with `npx expo install`, i18next, react-i18next and the @expo-google-fonts packages (Inter, Noto Sans Malayalam, Tamil, Devanagari) with npm, and fontkit as a dev dependency; verify `npx expo-doctor` passes, and record the resolved versions in docs/DECISIONS.md
- [x] 1.2 Configure Jest for Reanimated, SVG, haptics, AsyncStorage and navigation (setup file) and verify an existing test and a trivial animated component test pass

## 2. Tokens, themes and contrast

- [x] 2.1 Write `src/design/tokens.ts` (light and dark themes: colours incl. status and reading styles, type scale, spacing, radius, elevation, motion durations, contrast pairs) and `ThemeProvider` with light default, dark, system and AsyncStorage persistence; verify theme tests: default light, system follows the OS, choice persists across a remount
- [x] 2.2 Write the WCAG contrast test (relative luminance; 4.5:1 text, 3:1 large text and graphics; coverage check that every foreground token is in a pair); adjust colours until it passes, and verify it fails when a colour is deliberately lowered below the threshold (temporary change, then reverted)

## 3. Typography and scripts

- [x] 3.1 Load fonts with expo-font (Inter 400/500/600/700; Noto Sans Malayalam, Tamil, Devanagari 400/500/700) and write `Text` with script-aware family, per-script line heights and font scale cap; verify RNTL tests for family and line height per language and `maxFontSizeMultiplier`
- [x] 3.2 Write the glyph coverage test with real ml, ta, hi and en strings against the bundled TTFs (fontkit); verify it passes and that a character missing from both fonts makes it fail

## 4. Internationalisation

- [x] 4.1 Add i18n scaffolding (i18next, en catalogue, empty ml, ta, hi catalogues with English fallback, language detection) and tests for English strings, fallback, and catalogue key parity; verify they pass
- [x] 4.2 Add the ESLint rule banning hard-coded user-visible strings in `mobile/src/screens` and `mobile/src/components`; verify it fails on a temporary fixture with literal JSX text and a literal `title` prop and passes on the real code

## 5. Foundation and components

- [x] 5.1 Write Icon (SVG set), motion helpers (spring presets that settle in 150 to 300 ms, reduce-motion hook, haptics wrapper) and `Screen` (safe area, scroll, bottom primary-action slot, DisclaimerFooter); verify tests: spring settle times within 150 to 300 ms, Reduce Motion on gives immediate state, Screen shows the disclaimer
- [x] 5.2 Write Button, Card, Avatar, ListItem, Banner, EmptyState, Skeleton and DisclaimerFooter with RNTL tests (content, accessibility role and name, disabled and loading states, minimum 48 dp, no looping animation in Skeleton); verify they pass
- [x] 5.3 Write StatusChip (icon, label, colours for taken, pending, missed, unclear, calling; morph; calling pulse), DoseRing (SVG ring, animated fill, accessible label) and ParentCard; verify tests: every status renders an icon and a label, coral only for missed, the pulse is the only repeating animation and is static under Reduce Motion, ring progress values

## 6. Navigation, gallery and app wiring

- [x] 6.1 Write the bottom tab navigation (Today, Medicines, Family placeholders built on Screen), rebuild the placeholder screen on the design system, wire ThemeProvider and i18n in `App.tsx`, and add the gallery screen registered only when `__DEV__` is true; verify tests: tabs render with at least 48 dp items, gallery is registered in dev and absent when `__DEV__` is false
- [x] 6.2 Write `docs/design-system.md` (tokens, components, rules for screens: one primary action, neutral readings, coral only for missed and urgent, no hard-coded strings) and add the design decisions to docs/DECISIONS.md; verify the document lists every component

## 7. Close

- [x] 7.1 Run `npm run lint`, `npm run typecheck`, `npm test`, `npx expo-doctor` and a Metro export for Android; verify all pass; archive the change and verify `openspec validate --specs` passes

## Workflow follow-up

- Commit "Design system".
