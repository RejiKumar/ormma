# Design

## Context

Expo SDK 58 (React Native 0.88, React 19.3), `mobile/` with React Navigation, jest-expo and React Native Testing Library 14 (async `render`). `expo/bundledNativeModules.json` pins: react-native-reanimated 4.7.1, react-native-worklets 0.13.0, react-native-svg 15.16.0, expo-haptics ~58.0.6, expo-font ~58.0.8, expo-localization ~58.0.4, @react-native-async-storage/async-storage 2.2.0. The Stage 0 app is one placeholder screen. See proposal.md for scope.

## Goals / Non-Goals

**Goals:** warm, calm clarity; every colour pair proven accessible by a test; real Indic text renders in a font that has the glyphs; the safety rules are built into the components so screens cannot violate them by accident.

**Non-Goals:** screens, translations, brand artwork.

## Decisions

- **Folder layout.** `src/design/` (tokens, theme, typography, motion, contrast helpers), `src/components/`, `src/i18n/`, `src/navigation/`, `src/screens/`. Components import only from `src/design`, `src/i18n` and each other.
- **Tokens are plain TypeScript objects** (`lightTheme`, `darkTheme`) with the same shape, so a component reads `useTheme().colors.surface`. The dark theme is designed separately, not an inversion: lifted primary, softened status colours, a warm dark neutral background. The light start values are #FBF7F2, #FFFFFF, #1F2A2E, #0F6B6B, #F2A93B and are adjusted only where the contrast test requires.
- **Accent is decorative or carries dark ink.** #F2A93B on the cream background is about 2:1, so amber is used for fills, rings and highlights with `inkOnAccent` text, never as text on the background.
- **Status colours.** taken (green), pending (neutral slate), missed (coral), unclear (violet), calling (primary teal). Each status has foreground, background and icon colours and a distinct icon, so colour is never the only signal. Coral exists only as the missed status and the urgent banner. Health readings use a neutral `reading` style (surface alt plus ink) with no status colour.
- **Contrast test** (`contrast.test.ts`) computes WCAG relative luminance for a declared list of pairs per theme (`contrastPairs(theme)` lives with the tokens), classifying each as text, large text or graphic. A second assertion fails if a foreground token exists that no pair covers, so a new colour cannot skip the check. Large text means 24 px or larger, or 18.67 px or larger and bold.
- **Fonts: Inter, static weights.** `@expo-google-fonts` ships per-weight TTFs, not variable axes; React Native on Android does not apply variable axes reliably, so static instances of Inter (400, 500, 600, 700) and Noto Sans Malayalam, Tamil and Devanagari (400, 500, 700) are loaded with `expo-font`. Inter over Plus Jakarta Sans: neutral metrics, tabular figures for times and counts, and it pairs with the Noto scripts; the warmth comes from colour, radius and spacing.
- **Script selection by language, system fallback for the rest.** The Text component picks the font family of the current language (Inter for en, a Noto script for ml, ta, hi). A string that mixes in Latin digits or names relies on the platform's per-glyph fallback; the glyph test therefore requires every character to be covered by the language font or by Inter, which is the pair the platform would fall back between.
- **Glyph coverage test** reads the bundled TTFs with fontkit and checks real strings (a sample sentence and key words per language, including conjuncts such as ക്ഷ and ന്ത, ligature-heavy Tamil, and Devanagari with matras). The strings are test fixtures, not shipped UI text.
- **Line heights per script** are tokens: a multiplier of 1.4 for Latin, 1.6 for Devanagari, 1.65 for Tamil and 1.75 for Malayalam, applied to each text style's font size.
- **Font scale.** `allowFontScaling` stays on and `maxFontSizeMultiplier` is capped at 2 through the Text component; components use `minHeight`, never fixed heights, so they grow.
- **i18n.** i18next with react-i18next and expo-localization. Language is the device language if it is ml, ta, hi or en, else en, and can be changed later by Stage 2 settings. `en.json` is complete; `ml.json`, `ta.json`, `hi.json` start empty and fall back to English, because UI translations must be reviewed by native speakers and are not machine-generated. A test checks the non-English catalogues only use keys that exist in `en.json`. A lint rule (`no-restricted-syntax`) bans non-whitespace JSX text and literal `title`, `label`, `placeholder`, `accessibilityLabel`, `accessibilityHint` props in `mobile/src/screens` and `mobile/src/components` (the dev gallery and tests are exempt).
- **Icons.** A small `Icon` component draws a fixed set of stroke icons with react-native-svg (check, clock, x-circle, question, phone, plus, chevron, home, pill, bell, people). No icon font to load, consistent stroke weight, themeable colour.
- **Motion.** `src/design/motion.ts` defines spring presets tuned so each settles in 150 to 300 ms (stiffness and damping computed from the target duration, verified by a test that simulates the spring). DoseRing fill, StatusChip morph and checkmark use Reanimated shared values; `ReduceMotion.System` plus an `AccessibilityInfo` check turns them into immediate changes. The calling pulse is the only repeating animation and is replaced by a static ring under Reduce Motion. Skeleton is a static placeholder that fades in once (no shimmer loop). Haptics: `expo-haptics` light impact on confirmation only, never in a loop.
- **Navigation.** Bottom tabs from `@react-navigation/bottom-tabs` styled with the tokens (tab bar items at least 48 dp, labels from i18n). Tabs in this change are placeholders (Today, Medicines, Family); Stages 3 and 4 fill them. The gallery tab is registered only when `__DEV__` is true.
- **Screen layout.** `Screen` provides safe-area padding, scrolling, a bottom slot for the single primary action and always renders `DisclaimerFooter`.
- **Persistence.** Theme preference in AsyncStorage under `ormma.theme` (device-local, not health data).
- **Testing.** RNTL tests per component (content, accessibility role and name, states, 48 dp target, Reduce Motion behaviour with Reanimated's jest setup), plus the contrast, glyph, i18n parity and motion duration tests, all in the normal `npm test`.

## Risks / Trade-offs

- [Platform glyph fallback differs between devices] -> the glyph test limits strings to what the two bundled fonts cover; no reliance on system fonts for Indic scripts.
- [Reanimated 4 and worklets need the Babel plugin in jest and builds] -> `babel-preset-expo` adds it; verified by the component tests and by bundling with Metro.
- [Large Indic fonts increase app size] -> only three weights per script are bundled.
- [Static weights mean no variable-axis tuning] -> acceptable for v1.
- [Lint rule false positives on legitimate literals] -> limited to JSX text and a short list of props; dev gallery and tests exempt.
