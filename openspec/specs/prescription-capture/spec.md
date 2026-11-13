# prescription-capture Specification

## Purpose
Defines how a family member scans a prescription in the app, reviews what was read and confirms each medicine, so medicines can be added with less typing and nothing is ever scheduled without a person checking it on screen.

## Requirements

### Requirement: Scan entry
The Medicines tab and the Add medicine screen SHALL offer a "Scan prescription" action to owners and editors of the parent, and SHALL NOT show it to viewers. The action SHALL open Google's document scanner. When scanning is not available on the phone, the app SHALL say so in one calm sentence and manual entry SHALL still work.

#### Scenario: Owner or editor
- **WHEN** an owner or editor opens the Medicines tab for a parent
- **THEN** the Scan prescription action is shown

#### Scenario: Viewer
- **WHEN** a viewer opens the Medicines tab
- **THEN** no scan action is shown

#### Scenario: Scanner not available
- **WHEN** the phone cannot run the scanner
- **THEN** the app says scanning is not available on this phone and offers manual entry

### Requirement: Upload and reading
After the scanner returns a page, the app SHALL upload the image to `prescriptions/{parentId}/` in Storage and ask the server to read it. While this runs the app SHALL show a calm progress state with the disclaimer visible. The image, the extracted text and any medicine detail SHALL NOT be logged.

#### Scenario: Scan completes
- **WHEN** the scanner returns a page and the upload and reading succeed
- **THEN** the review screen opens with what was read

#### Scenario: Scanner cancelled
- **WHEN** the person closes the scanner without a page
- **THEN** nothing is uploaded and the app returns to where it was

#### Scenario: Upload or reading fails
- **WHEN** the upload or the reading fails
- **THEN** a neutral message says the prescription could not be read and offers Try again and Enter by hand, and nothing is saved

#### Scenario: Nothing found
- **WHEN** the reading finds no medicine
- **THEN** a neutral message says no medicine was found and offers Scan again and Enter by hand

### Requirement: Review before anything is scheduled
The review screen SHALL list every extracted medicine as an editable card with its name, dose, frequency and times, with the name shown exactly as read and never corrected. A medicine marked illegible or with confidence below 0.5 SHALL carry a neutral "Check this one" marker. Times and the start date SHALL be required and SHALL start empty: the system SHALL NOT fill in a time or date the prescription did not state. Nothing SHALL be scheduled until a person confirms that medicine on this screen.

#### Scenario: Cards
- **WHEN** the review opens for a prescription with three medicines
- **THEN** three editable cards are shown, each with the name as read

#### Scenario: Unclear reading
- **WHEN** a medicine is marked illegible
- **THEN** its card shows the neutral "Check this one" marker and no warning colour

#### Scenario: No time stated
- **WHEN** a medicine has no time in the prescription
- **THEN** its time field is empty and Confirm stays disabled until a valid time is entered

#### Scenario: Nothing scheduled early
- **WHEN** the review screen is open and no Confirm has been pressed
- **THEN** no medicine exists for this prescription

### Requirement: Confirm and discard each medicine
Each card SHALL have Confirm and Discard. Confirm SHALL create the medicine with the values on the card as a prescription-scan medicine, confirmed by that person. Discard SHALL remove the card without creating anything. When every card is confirmed or discarded, the review SHALL end and the uploaded image SHALL be deleted from Storage.

#### Scenario: Confirm one
- **WHEN** the person confirms a card with a name and a valid time
- **THEN** the medicine is created and the card shows as confirmed

#### Scenario: Discard one
- **WHEN** the person discards a card
- **THEN** no medicine is created for it

#### Scenario: All done
- **WHEN** every card is confirmed or discarded
- **THEN** the review ends, the image is deleted and the Medicines tab shows the new medicines

#### Scenario: Leaving early
- **WHEN** the person leaves the review with cards still open
- **THEN** the app asks before leaving, and leaving creates nothing for those cards

### Requirement: Wording and accessibility
All text SHALL come from the translation catalogue, SHALL NOT advise on, comment on or judge a dose, medicine or reading, and SHALL keep the disclaimer "This app does not provide medical advice." visible. Every control SHALL be at least 48 dp, and the screens SHALL fit 800x1280 and 1080x2400 without clipping.

#### Scenario: Disclaimer
- **WHEN** any scan or review screen is shown
- **THEN** the disclaimer is visible
