# Spec Delta

## Purpose
Defines the Insights tab: a calm, read-only view of how the last seven days went for each parent, built only from data the signed-in member can already read, and never advising or judging.

## ADDED Requirements

### Requirement: Insights tab
The app SHALL provide an Insights tab that shows, for each parent the signed-in member belongs to, the last seven days of the parent's dose history: the number of doses taken out of the number scheduled and a per-day strip of the seven days. The tab SHALL NOT state which time of day doses were missed, because the medical-safety rules forbid commenting on dose timing. The tab SHALL be read-only and SHALL use only dose events and alerts the member can already read under the consent visibility rule.

#### Scenario: Seven days with history
- **WHEN** a member opens Insights for a parent with dose events on the last seven days
- **THEN** it shows the taken count out of the scheduled count and one entry per day for those seven days, each marked with an icon and a label, not by colour alone

#### Scenario: No timing commentary
- **WHEN** the Insights tab is rendered for any parent
- **THEN** it shows counts and per-day entries only, and no sentence about which time of day doses were missed

#### Scenario: Consent window
- **WHEN** part of the seven days falls outside the period the member may see under the consent visibility rule
- **THEN** those days are shown as not available, and no count includes them

### Requirement: Weekly summary and trend alerts in Insights
When the member can see a `weekly_summary` or `trend_flag` alert for the parent, Insights SHALL show the latest of each as received, with its date. Their text SHALL be shown exactly as the system produced it, with the disclaimer "This app does not provide medical advice." visible on the screen. When none exists, the section SHALL be omitted, not shown empty.

#### Scenario: Latest summary
- **WHEN** a `weekly_summary` alert exists in the visible window
- **THEN** its text and date are shown in the Insights tab

#### Scenario: None yet
- **WHEN** no `weekly_summary` or `trend_flag` alert exists
- **THEN** the section is not shown and no error or placeholder warning appears

### Requirement: Neutral wording and styling
Insights SHALL NOT call a percentage, a day or a pattern good, bad, safe, normal, worrying or improving, SHALL NOT advise on doses, timing or medicines, and SHALL NOT use coral except for the missed status icon already defined for doses. Percentages and counts SHALL be shown as numbers in the neutral reading style.

#### Scenario: No judgement words
- **WHEN** the English catalogue strings of the Insights tab are scanned
- **THEN** none contains the words good, bad, safe, normal, worrying, improving, should or recommend

#### Scenario: Coral
- **WHEN** the Insights tab is rendered
- **THEN** coral appears only on the missed status icon of a day entry

### Requirement: Insights with no data
When a parent has no dose history in the window, Insights SHALL show the calm empty state naming what is missing, with at most one action (add a medicine for owners), and SHALL NOT show zero percentages.

#### Scenario: New parent
- **WHEN** a parent has no dose events in the last seven days
- **THEN** the tab shows the empty state and no percentage or count

### Requirement: Insights performance and privacy
Insights SHALL compute its figures on the device from already-readable data, SHALL NOT write anything, SHALL NOT send new data to any service, and SHALL NOT log counts, slots, names or values.

#### Scenario: No writes and no logs
- **WHEN** the Insights tab loads
- **THEN** no database write occurs and no log line contains a count, a slot, a name or a value
