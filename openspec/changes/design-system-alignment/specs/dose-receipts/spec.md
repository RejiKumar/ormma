## ADDED Requirements

### Requirement: Dose card shapes
A dose card SHALL have a 24 px radius and 16 px padding, a 24 px timeline dot (white check on primary for taken, white alert on coral for missed, clock inside a dashed 2 px muted border for scheduled), a 15 px semibold period name, a 13 px medium medicine line, an 11 px semibold status badge and an 11 px muted read-receipt line. The pill appearance chip SHALL have a 16 px radius, 12 px medium text and the tint background.

#### Scenario: Taken card
- **WHEN** a dose card is taken
- **THEN** its dot is a primary circle with a white check and its badge uses the tint background with tint ink text

#### Scenario: Scheduled card
- **WHEN** a dose card is scheduled
- **THEN** its dot has a dashed 2 px muted border with a clock icon and its badge uses the neutral chip

### Requirement: Confirmation note label
The confirmation note block SHALL have the canvas background, a 16 px radius and 12 px padding, and SHALL show the fixed label "Confirmation note" in 10 px uppercase semibold muted text above the note body. The label is a fixed template and carries no advice or judgement.

#### Scenario: Note with label
- **WHEN** a taken card has a confirmation note
- **THEN** the label reads "Confirmation note" in uppercase above the note text

#### Scenario: No note
- **WHEN** a card has no confirmation note
- **THEN** neither the block nor the label is shown
