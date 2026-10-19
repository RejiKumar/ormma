# design-system Specification

## Purpose
Defines the visual language, tokens, components, motion and accessibility rules of the Ormma mobile app (warm, calm clarity), so every screen is built from the same parts and follows the medical-safety presentation rules.

## Requirements

### Requirement: Design tokens
The app SHALL define all colours, the type scale, spacing, radius, elevation and motion durations as tokens in one module, and screens and components SHALL use the tokens instead of literal values. The light palette SHALL start from background #FBF7F2, surface #FFFFFF, ink #1F2A2E, primary #0F6B6B and accent #F2A93B, adjusted only as needed to pass the contrast requirement.

#### Scenario: Token source
- **WHEN** a component needs a colour, font size, spacing, radius, elevation or duration
- **THEN** it reads it from the theme tokens

#### Scenario: Status colours
- **WHEN** the tokens are defined
- **THEN** they include status colours for taken, pending, missed, unclear and calling, each with a foreground, a background and an icon colour

### Requirement: Light, dark and system themes
The app SHALL provide a light theme (the default) and a separately designed dark theme, and a "system" option that follows the operating system setting. The chosen option SHALL be remembered on the device and SHALL apply without restarting the app.

#### Scenario: Default
- **WHEN** the app starts for the first time
- **THEN** the light theme is used

#### Scenario: System option
- **WHEN** the preference is "system" and the operating system switches between light and dark
- **THEN** the app switches theme accordingly

#### Scenario: Remembered choice
- **WHEN** the user picks a theme option and restarts the app
- **THEN** the same option is applied

### Requirement: Contrast
Every text and background pair and every icon and graphic pair defined in the tokens of both themes SHALL meet WCAG 2.x AA: a contrast ratio of at least 4.5:1 for text, and at least 3:1 for large text, icons and meaningful graphics. An automated test SHALL compute the ratios and fail below these thresholds.

#### Scenario: Contrast test
- **WHEN** the test suite runs
- **THEN** the ratio of every declared pair in the light and the dark theme is computed with the WCAG relative luminance formula
- **AND** the test fails if any text pair is below 4.5:1 or any large text, icon or graphic pair is below 3:1

#### Scenario: Large text
- **WHEN** a text style is 24 px or larger, or 18.67 px or larger and bold
- **THEN** it is treated as large text for the 3:1 threshold, and no other style is

### Requirement: Latin and Indic typography
The app SHALL use a Latin sans (Inter) for English and Noto Sans Malayalam, Noto Sans Tamil and Noto Sans Devanagari for ml-IN, ta-IN and hi-IN text, with the other script font as fallback. An automated test SHALL check, with real strings in ml, ta, hi and en, that every character is covered by the chosen font or by the Latin font.

#### Scenario: Glyph coverage
- **WHEN** the test checks the real sample strings of each language against the bundled font files
- **THEN** every non-space character has a glyph in the font chosen for that language or in the Latin font

#### Scenario: Script fonts
- **WHEN** the language is ml-IN, ta-IN or hi-IN
- **THEN** text uses the Noto Sans font of that script

### Requirement: Line height per script
Each text style SHALL define line heights per script, taller for Malayalam, Tamil and Devanagari than for Latin, so that stacked marks and conjuncts are not clipped.

#### Scenario: Line height lookup
- **WHEN** a text style is resolved for ml, ta, hi or en
- **THEN** its line height is at least the Latin line height, and for ml, ta and hi it is larger

### Requirement: OS font scale
Text SHALL respect the operating system font scale, up to a documented maximum multiplier, and components SHALL grow with larger text instead of clipping it.

#### Scenario: Scaled text
- **WHEN** the operating system font scale is increased
- **THEN** text grows with it up to the maximum multiplier
- **AND** buttons, chips and list items keep their text visible by growing in height

### Requirement: Internationalisation
Every user-visible string SHALL come from the translation catalogue by key, with English complete and Malayalam, Tamil and Hindi catalogues supported with fallback to English. Screens and components SHALL contain no hard-coded user-visible strings, enforced by lint.

#### Scenario: English now
- **WHEN** the app language is English
- **THEN** all strings resolve from the English catalogue

#### Scenario: Missing translation
- **WHEN** a key is missing in the ml, ta or hi catalogue
- **THEN** the English string is shown

#### Scenario: Hard-coded string
- **WHEN** a screen or component contains literal user-visible text in JSX
- **THEN** lint fails

### Requirement: Layout and navigation
The app SHALL use bottom tab navigation, bento-style cards with rounded geometry, one primary action per screen placed in the thumb zone at the bottom, and touch targets of at least 48 dp.

#### Scenario: Tabs
- **WHEN** the main app is shown
- **THEN** navigation is a bottom tab bar whose items are at least 48 dp high

#### Scenario: Primary action
- **WHEN** a screen has a primary action
- **THEN** it is the only primary-styled button and it is placed at the bottom of the screen

#### Scenario: Touch targets
- **WHEN** any pressable component is rendered
- **THEN** its touch area is at least 48 dp by 48 dp

### Requirement: Screen layout
Every screen SHALL be built on a Screen layout that provides safe areas, scrolling, a bottom slot for the primary action, and the disclaimer footer.

#### Scenario: Disclaimer on screens
- **WHEN** a screen is rendered with the Screen layout
- **THEN** the disclaimer "This app does not provide medical advice." is visible on it

### Requirement: Core components
The design system SHALL provide Button, Card, StatusChip, DoseRing, ParentCard, Avatar, ListItem, Banner, DisclaimerFooter, EmptyState and Skeleton components, built from the tokens, plus a component gallery screen that exists only in development builds.

#### Scenario: Component set
- **WHEN** the design system is imported
- **THEN** all eleven components are available

#### Scenario: Gallery in production
- **WHEN** the app runs outside development (`__DEV__` is false)
- **THEN** the component gallery screen is not registered

### Requirement: Status display
Every dose status (taken, pending, missed, unclear, and calling now) SHALL be shown with an icon, a text label and its status colour, never by colour alone.

#### Scenario: StatusChip content
- **WHEN** a StatusChip is rendered for any status
- **THEN** it contains an icon, a label from the translation catalogue, and the colours of that status

#### Scenario: Accessible name
- **WHEN** a screen reader reads a StatusChip
- **THEN** it announces the label text

### Requirement: Neutral presentation of health readings
The app SHALL NOT colour or label a health reading as good, bad, normal, safe or dangerous. Readings SHALL use a neutral style, and the coral colour SHALL be used only for missed doses and urgent alerts.

#### Scenario: Reading style
- **WHEN** a health reading is displayed
- **THEN** it uses the neutral reading style and no status colour or judgement label

#### Scenario: Coral
- **WHEN** the coral colour tokens are used
- **THEN** only the missed status and the urgent banner use them

### Requirement: Visible disclaimer
The disclaimer "This app does not provide medical advice." SHALL be visible through the DisclaimerFooter, with text from the translation catalogue and passing the contrast requirement.

#### Scenario: Footer
- **WHEN** DisclaimerFooter is rendered
- **THEN** it shows the disclaimer text from the catalogue

### Requirement: Motion
Animations SHALL use Reanimated springs that settle within 150 to 300 ms: the DoseRing fill, the StatusChip morph between statuses, a checkmark confirmation, and light haptic feedback on confirmation. The only continuous animation SHALL be a gentle pulse for "calling now". Skeleton placeholders SHALL NOT loop.

#### Scenario: Spring durations
- **WHEN** the motion tokens are read
- **THEN** every spring configuration is defined to settle within 150 to 300 ms

#### Scenario: Looping
- **WHEN** a component animates
- **THEN** only the "calling now" pulse repeats

### Requirement: Reduce Motion
When the operating system Reduce Motion setting is on, the app SHALL replace animations with immediate state changes and SHALL show the "calling now" indicator without pulsing.

#### Scenario: Reduce Motion on
- **WHEN** Reduce Motion is enabled
- **THEN** the DoseRing, StatusChip and checkmark change state without animation
- **AND** the "calling now" indicator is static

### Requirement: Component tests
Each component SHALL have tests with React Native Testing Library for its content, accessibility and states, and the contrast and glyph coverage checks SHALL run in the normal test suite.

#### Scenario: Test coverage
- **WHEN** the mobile tests run
- **THEN** every component of the core set has at least one test that passes
