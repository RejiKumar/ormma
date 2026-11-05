## Purpose
Defines the Settings screen reached from the Family tab: managing the account, choosing the appearance, and reading the privacy policy and the terms and conditions.

## ADDED Requirements

### Requirement: Settings entry
The Family tab SHALL show a Settings row that opens a Settings screen with four sections in this order: Account, Appearance, Privacy policy, Terms and conditions. The app SHALL keep its four tabs.

#### Scenario: Open
- **WHEN** a member taps Settings in Family
- **THEN** the Settings screen shows the four sections

### Requirement: Account section
The Account section SHALL show the member's phone number (read only), let the member edit their display name, show the current plan with a link to the Subscription screen, and offer Sign out and Delete account. Sign out SHALL ask for confirmation and then return to the sign-in screen. The display name SHALL be saved through the existing server path and shown to other members as before.

#### Scenario: Sign out
- **WHEN** the member confirms Sign out
- **THEN** the session ends and the sign-in screen is shown

#### Scenario: Name
- **WHEN** the member saves a new display name
- **THEN** other members see the new name

### Requirement: Account deletion
Delete account SHALL ask for confirmation, and a server function SHALL then delete the member's own data: their memberships, profile, entitlement document and unused invites they created, and then the sign-in account. The function SHALL refuse while the member is the owner of any parent and SHALL tell them to delete those parents first. It SHALL NOT delete other members' data. The screen SHALL say that a Google Play subscription is cancelled in Google Play and link there.

#### Scenario: Owns a parent
- **WHEN** a member who owns a parent confirms Delete account
- **THEN** nothing is deleted and the app lists the parents to delete first

#### Scenario: Member only
- **WHEN** a member who owns no parent confirms Delete account
- **THEN** their data is deleted, they are signed out, and other members keep their data

### Requirement: Appearance section
The Appearance section SHALL offer Light, Dark and System, mark the current choice, apply it at once, and remember it across restarts. Light is the default.

#### Scenario: Choose dark
- **WHEN** the member picks Dark
- **THEN** the app switches to the dark theme and keeps it after a restart

#### Scenario: System
- **WHEN** the member picks System and the operating system theme changes
- **THEN** the app follows it

### Requirement: Privacy policy and Terms and conditions
The Privacy policy and the Terms and conditions entries SHALL open an in-app reader with the full text, and a link to the hosted page. The in-app text SHALL match the published documents. The texts are fixed content and SHALL NOT give medical advice.

#### Scenario: Read in the app
- **WHEN** the member opens Privacy policy
- **THEN** the full text is shown with a link to the hosted page

#### Scenario: Offline
- **WHEN** the device is offline
- **THEN** the in-app text is still shown
