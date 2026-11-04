## ADDED Requirements

### Requirement: Supplied palette and text colours
The light theme SHALL use this palette: canvas `#F8F7F4`, ink `#1A2421`, muted ink `#6B7470`, border `#E5E2DC`, surface `#FFFFFF`, primary `#2D5A4C`, primary tint `#EBF1EE`, tint ink `#1C3B32`, neutral chip `#EDEAE4`, coral `#C85A32` and coral tint `#FCEEE8`. These values SHALL be used as given for backgrounds, borders, dots, icons and graphics. Where a palette text colour on its background is below 4.5:1, the token for text on that background SHALL be a darker shade of the same hue that passes the contrast test, and the unchanged value SHALL still be used for the non-text parts.

#### Scenario: Backgrounds and borders
- **WHEN** a screen renders in the light theme
- **THEN** its canvas is `#F8F7F4`, cards are `#FFFFFF` with a `#E5E2DC` border and the neutral chip is `#EDEAE4`

#### Scenario: Muted text on the neutral chip
- **WHEN** muted text is shown on the neutral chip
- **THEN** its colour is a shade of `#6B7470` that reaches 4.5:1 on `#EDEAE4`

#### Scenario: Coral text
- **WHEN** the Not confirmed badge text is shown on the coral tint
- **THEN** the text colour reaches 4.5:1 on `#FCEEE8` and the dot, icon and border use `#C85A32`

### Requirement: Coral usage
Coral SHALL be used only for the missed status (badge, timeline dot and icon), the urgent banner, the app bar status dot while a dose is missed and the Escalation tab alert dot. Actions such as "See what Ormma tried" and "I called" SHALL use the primary or neutral button styles.

#### Scenario: Action buttons
- **WHEN** the hero shows "See what Ormma tried" or the presence bar shows "I called <name>"
- **THEN** they use the primary tint or neutral style, not coral

#### Scenario: Automated rule
- **WHEN** the design rules test scans the source
- **THEN** coral tokens are used only by the files that show the missed status, the urgent banner, the app bar dot and the alert dot

### Requirement: Tabular numerals
Times, counters, dates and durations SHALL be drawn with Inter tabular numerals (`tnum`) and the `cv11` feature where the platform supports font feature settings, so digits keep a fixed width.

#### Scenario: Digits line up
- **WHEN** two dose times are shown one above the other
- **THEN** each digit has the same width

### Requirement: Shapes and elevation
Cards SHALL have a 24 px radius, chips and nested blocks a 16 px radius and pills a full radius. Elevation SHALL be one of five levels: 0 none, 1 small card shadow, 2 hero shadow tinted with the primary colour, 3 toast shadow, 4 reserved for modal surfaces. Shadow colours SHALL come from the tokens, and the dark theme SHALL use a hairline border instead of a shadow.

#### Scenario: Card
- **WHEN** a card renders in the light theme
- **THEN** it has a 24 px radius, a 1 px border and the level 1 elevation

#### Scenario: Dark theme
- **WHEN** the dark theme is active
- **THEN** cards use a hairline border and no shadow

### Requirement: Press feedback
Every button, pill and pressable card SHALL scale to 0.97 while pressed, animating the transform over 150 ms and the shadow over 200 ms, and SHALL not animate when Reduce Motion is on.

#### Scenario: Press
- **WHEN** the user presses and holds a button
- **THEN** it is drawn at 0.97 scale and returns to full size on release

#### Scenario: Reduce Motion
- **WHEN** the operating system asks to reduce motion
- **THEN** the scale change is applied without animation

### Requirement: Bottom navigation
The bottom navigation SHALL be 64 dp high with a surface background and a 1 px top border. Tab labels SHALL be 11 px medium. The active tab SHALL show its icon and label in the primary colour inside a primary tint pill with a 16 px radius, and inactive tabs SHALL use the muted colour. The Escalation tab SHALL show a 6 px coral dot while an unread urgent or missed-dose alert exists. Each tab SHALL stay at least 48 dp for touch.

#### Scenario: Active tab
- **WHEN** the Medicines tab is active
- **THEN** its icon and label are primary on a tint pill and the other tabs are muted

#### Scenario: Alert dot
- **WHEN** an unread missed-dose alert exists
- **THEN** a 6 px coral dot is drawn over the Escalation icon

### Requirement: Toast banner
Transient messages SHALL appear in a banner with the ink colour as background, white 14 px medium text, a 16 px radius, 12 px by 16 px padding and the level 3 elevation, and SHALL be announced to assistive technology.

#### Scenario: Confirmation toast
- **WHEN** an action confirms with a short message
- **THEN** it appears in the banner and is announced to assistive technology

### Requirement: Screen type scale
Headings, labels and captions on the Today, Medicines, Escalation and Family tabs SHALL follow these sizes: brand 18 bold, hero title 22 over 28 with -0.4 letter spacing, hero subtitle 12 over 16, section heading 16 semibold, card heading 15 semibold, note body 14 over 21, chip 12 medium, badge and receipt 11, tag 10 uppercase semibold with 0.5 letter spacing. Sizes SHALL still scale with the operating system font scale.

#### Scenario: Hero title
- **WHEN** the hero card shows its title
- **THEN** it is 22 over 28 semibold with -0.4 letter spacing, in white

#### Scenario: Font scale
- **WHEN** the system font size is raised
- **THEN** these sizes grow and no text is clipped
