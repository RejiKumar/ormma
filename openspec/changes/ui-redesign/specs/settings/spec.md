# Spec Delta

Requested by the user on 2026-11-12: the Appearance section is not important and is removed, Sign out moves to an icon in the app bar, and the Delete account wording says plainly that it is permanent.

## MODIFIED Requirements

### Requirement: Settings entry
The Family tab SHALL show a Settings row that opens a Settings screen with three sections in this order: Account, Privacy policy, Terms and conditions. The app SHALL keep its four tabs.

#### Scenario: Open
- **WHEN** a member taps Settings in Family
- **THEN** the Settings screen shows the three sections

#### Scenario: No appearance section
- **WHEN** the Settings screen is shown
- **THEN** it has no Appearance section and no Light, Dark or System choice

### Requirement: Account section
The Account section SHALL show the member's phone number (read only), let the member edit their display name, show the current plan with a link to the Subscription screen, and offer Delete account. It SHALL NOT offer Sign out, which is in the app bar. The display name SHALL be saved through the existing server path and shown to other members as before.

#### Scenario: Sign out
- **WHEN** the Account section is shown
- **THEN** it has no Sign out button, because Sign out is the icon in the app bar

#### Scenario: Name
- **WHEN** the member saves a new display name
- **THEN** other members see the new name

### Requirement: Account deletion
Delete account SHALL ask for confirmation, and the confirmation SHALL say in plain words that it deletes the member's profile and place in every family, that it cannot be undone, and that other members keep their data. A server function SHALL then delete the member's own data: their memberships, profile, entitlement document and unused invites they created, and then the sign-in account. The function SHALL refuse while the member is the owner of any parent and SHALL tell them to delete those parents first. It SHALL NOT delete other members' data. The screen SHALL say that a Google Play subscription is cancelled in Google Play and link there.

#### Scenario: Owns a parent
- **WHEN** a member who owns a parent confirms Delete account
- **THEN** nothing is deleted and the app lists the parents to delete first

#### Scenario: Member only
- **WHEN** a member who owns no parent confirms Delete account
- **THEN** their data is deleted, they are signed out, and other members keep their data

#### Scenario: Wording
- **WHEN** the Delete account confirmation is shown
- **THEN** it says the deletion cannot be undone

## ADDED Requirements

### Requirement: Sign out from the app bar
The app bar shown on every signed-in screen SHALL have a sign-out icon button at its right end, with the accessible name "Sign out" and a touch target of at least 48 dp. Pressing it SHALL ask for confirmation and then end the session and show the sign-in screen. The icon SHALL use the muted ink colour, not coral.

#### Scenario: Visible everywhere
- **WHEN** any signed-in screen is shown, including a screen with no parent yet
- **THEN** the sign-out icon is at the right end of the app bar

#### Scenario: Confirm
- **WHEN** the member presses the icon and confirms
- **THEN** the session ends and the sign-in screen is shown

#### Scenario: Cancel
- **WHEN** the member presses the icon and cancels
- **THEN** the member stays signed in

## REMOVED Requirements

### Requirement: Appearance section
**Reason**: The choice between Light, Dark and System was judged not important by the user (2026-11-12). The app follows the phone's setting instead.
**Migration**: A choice saved by an earlier build is ignored. The theme follows the operating system.
