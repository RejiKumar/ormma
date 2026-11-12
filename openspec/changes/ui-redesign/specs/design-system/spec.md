# Spec Delta

## ADDED Requirements

### Requirement: Illustrations
The app SHALL draw its illustrations as vector graphics from the repository, using only colours from the theme tokens, so they adapt to the light and the dark theme without separate image files. Every illustration SHALL carry a short text description for screen readers or be marked decorative, SHALL contain no text, no medical imagery, no depiction of illness or injury and no coral, and SHALL pass the 3:1 graphic contrast rule against its background in both themes.

#### Scenario: Theme colours
- **WHEN** an illustration is rendered in the light and in the dark theme
- **THEN** every colour it uses comes from the theme tokens and its graphic pairs meet 3:1

#### Scenario: No coral
- **WHEN** the design rules test scans the illustration sources
- **THEN** no illustration uses a coral token

#### Scenario: Screen reader
- **WHEN** a screen reader reaches an illustration
- **THEN** it reads a short description from the catalogue, or skips the illustration when it is decorative

### Requirement: Screen transitions and content fade
Moving between screens of a stack SHALL use a short transition of 150 to 300 ms, and a skeleton placeholder SHALL be replaced by its content with a cross-fade of the same duration. Both SHALL change immediately, without animation, when Reduce Motion is on, and neither SHALL repeat.

#### Scenario: Content replaces skeleton
- **WHEN** data finishes loading for a screen that showed a skeleton
- **THEN** the content cross-fades in within 300 ms

#### Scenario: Reduce Motion
- **WHEN** Reduce Motion is on
- **THEN** screens and content change with no transition or fade

### Requirement: Dark theme on redesigned screens
Every screen and component added or changed by the redesign SHALL be reviewed in the dark theme: cards use a hairline border and no shadow, illustrations use dark-theme token colours, and every new text and graphic pair SHALL be declared in the contrast pairs of both themes.

#### Scenario: Declared pairs
- **WHEN** a new foreground token is added
- **THEN** it appears in the declared contrast pairs of both themes, and the contrast test fails if it does not

#### Scenario: Card in the dark theme
- **WHEN** a redesigned card renders in the dark theme
- **THEN** it has a hairline border and no shadow

### Requirement: Screen titles are not repeated
A screen opened from a tab SHALL show its title once, in the navigation header. The page content SHALL NOT repeat the same text as a heading directly under the header. Subtitles and section headings with different text are allowed.

#### Scenario: One title
- **WHEN** a screen such as Add a parent, Invite, Emergency contacts, Parent details, Enter invite code, Add medicine, Edit medicine, or a legal document is opened
- **THEN** its title appears in the header and is not repeated as a heading in the page

## MODIFIED Requirements

### Requirement: Core components
The design system SHALL provide Button, Card, StatusChip, DoseRing, ParentCard, Avatar, ListItem, Banner, DisclaimerFooter, EmptyState, Skeleton and IllustrationFrame components, built from the tokens. EmptyState SHALL accept an optional illustration and an optional primary action.

#### Scenario: Component set
- **WHEN** the design system is imported
- **THEN** all twelve components are available

#### Scenario: Empty state with illustration and action
- **WHEN** EmptyState is rendered with an illustration and an action
- **THEN** it shows the illustration above the title and description, and the action below them

### Requirement: Coral usage
Coral SHALL be used only for the missed status (badge, timeline dot and icon), the urgent banner, the app bar status dot while a dose is missed and the alert dot that signals an unread urgent or missed-dose alert (on the Alerts tab, or on the header bell when the Insights tab replaces it). Actions such as "See what Ormma tried" and "I called" SHALL use the primary or neutral button styles.

#### Scenario: Action buttons
- **WHEN** the hero shows "See what Ormma tried" or the presence bar shows "I called <name>"
- **THEN** they use the primary tint or neutral style, not coral

#### Scenario: Automated rule
- **WHEN** the design rules test scans the source
- **THEN** coral tokens are used only by the files that show the missed status, the urgent banner, the app bar dot and the alert dot

### Requirement: Bottom navigation
The bottom navigation SHALL be 64 dp high with a surface background and a 1 px top border. Tab labels SHALL be 11 px medium. The active tab SHALL show its icon and label in the primary colour inside a primary tint pill with a 16 px radius, and inactive tabs SHALL use the muted colour. Each tab SHALL stay at least 48 dp for touch. The tabs SHALL be Today, Medicines, Alerts and Family. While an unread urgent or missed-dose alert exists, a 6 px coral dot SHALL be shown on the Alerts tab. If the user approves replacing Escalation with Insights, the tabs SHALL be Today, Medicines, Insights and Family, and the 6 px coral dot SHALL move to a bell in the app header that opens the Alerts screen.

#### Scenario: Active tab
- **WHEN** the Medicines tab is active
- **THEN** its icon and label are primary on a tint pill and the other tabs are muted

#### Scenario: Alert dot
- **WHEN** an unread missed-dose alert exists
- **THEN** a 6 px coral dot is drawn over the Alerts icon, or over the header bell when the Insights tab is present, with the same accessible label as before

### Requirement: Screen type scale
Headings, labels and captions on the tab screens (Today, Medicines, Alerts or Insights, and Family) SHALL follow these sizes: brand 18 bold, hero title 22 over 28 with -0.4 letter spacing, hero subtitle 12 over 16, section heading 16 semibold, card heading 15 semibold, note body 14 over 21, chip 12 medium, badge and receipt 11, tag 10 uppercase semibold with 0.5 letter spacing. Sizes SHALL still scale with the operating system font scale.

#### Scenario: Hero title
- **WHEN** the hero card shows its title
- **THEN** it is 22 over 28 semibold with -0.4 letter spacing, in white

#### Scenario: Font scale
- **WHEN** the system font size is raised
- **THEN** these sizes grow and no text is clipped

### Requirement: Light, dark and system themes
The app SHALL provide a light theme and a separately designed dark theme, and SHALL follow the operating system setting. There SHALL be no in-app control to choose a theme, and no theme choice SHALL be stored. The theme SHALL be known on the first rendered frame, so the app never shows one theme and then switches to the other.

#### Scenario: Default
- **WHEN** the app starts for the first time and the operating system is in light mode
- **THEN** the light theme is used, and the dark theme is used when the operating system is in dark mode

#### Scenario: System option
- **WHEN** the operating system switches between light and dark while the app is open
- **THEN** the app switches theme accordingly

#### Scenario: Remembered choice
- **WHEN** the user restarts the app
- **THEN** the theme again follows the operating system, because no choice is stored and the Settings screen offers no theme control
