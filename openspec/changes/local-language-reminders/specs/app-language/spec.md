# Spec Delta

## Purpose
Defines which languages the family app and its push notifications support, how a person chooses theirs, and how a parent's call language is set, so that a person who reads only Malayalam, Tamil or Hindi can use Ormma and understand its reminders.

## ADDED Requirements

### Requirement: App language
The app SHALL be available in English, Malayalam, Tamil and Hindi, with every screen string translated. It SHALL follow the phone's language when that is one of the four, and English otherwise. Settings SHALL offer an App language choice that overrides this and is remembered. A string missing from a catalogue SHALL fall back to English, and a test SHALL fail when a catalogue lacks a key that English has.

#### Scenario: Follows the phone
- **WHEN** the phone's language is Malayalam and the person has made no choice
- **THEN** the app is shown in Malayalam

#### Scenario: Override
- **WHEN** the person chooses Tamil in Settings
- **THEN** the app is shown in Tamil, and stays Tamil after a restart

#### Scenario: Unsupported phone language
- **WHEN** the phone's language is none of the four
- **THEN** the app is shown in English

#### Scenario: No untranslated string
- **WHEN** a key exists in the English catalogue
- **THEN** the Malayalam, Tamil and Hindi catalogues contain it, or the build's test fails

### Requirement: Notification language
A push notification SHALL be written in the language of the member who receives it, using that member's stored language, and in English when the member has none. The wording rules (no advice, no judgement, neutral wording, urgent wording unchanged in meaning) SHALL hold in every language.

#### Scenario: Member language
- **WHEN** a missed-dose alert goes to a member whose language is Malayalam
- **THEN** the notification text is in Malayalam

#### Scenario: Two members, two languages
- **WHEN** the same alert goes to one Tamil and one Hindi member
- **THEN** each receives it in their own language

#### Scenario: No language set
- **WHEN** a member has chosen no language
- **THEN** the notification is in English

### Requirement: Parent call language
An owner SHALL be able to change a parent's call language after the parent is created, in Parent details, which SHALL show the current language. Allowed values are English, Malayalam, Tamil and Hindi. The new language applies from the next call.

#### Scenario: Change the call language
- **WHEN** an owner changes a parent from English to Malayalam
- **THEN** the next call to that parent is spoken in Malayalam

#### Scenario: Not an owner
- **WHEN** an editor or viewer opens Parent details
- **THEN** the language is shown and cannot be changed

### Requirement: Translated wording is reviewed
A translated string SHALL NOT ship as the default for a language until a fluent speaker has reviewed it, and the wording and design tests SHALL run for every language.

#### Scenario: Wording tests run for every language
- **WHEN** the wording tests run
- **THEN** they check the English, Malayalam, Tamil and Hindi catalogues
