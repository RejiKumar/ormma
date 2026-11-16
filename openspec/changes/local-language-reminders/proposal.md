# Proposal

## Why

Requested by the user on 2026-11-16 (not in the BRD): most people who use Ormma in India will not read or understand English, so reminders must work in their own language. An audit of the current code shows what is and is not localized:

- **Phone calls to the parent** are already available in English, Malayalam, Tamil and Hindi, in the parent's chosen language. (The test parent was created in English.)
- **The family app** is English only: the Malayalam, Tamil and Hindi catalogues exist but are empty (0 of 435 strings), so every screen falls back to English.
- **Push notifications** to family members (missed-dose alerts, the evening digest and the rest) are written in English with no language choice.
- **The legal pages** are English only.

## What changes

- **Translate the app** into Malayalam, Tamil and Hindi (all 435 current strings), with the app following the phone's language by default and a choice in Settings to override it.
- **Push notifications in the member's language.** Each family member's chosen language decides the language of the alerts and digests they receive.
- **Parent call language is easier to set and fix.** The language for calls is chosen when adding a parent today; allow changing it afterwards in Parent details, and make the default visible, because a parent's number cannot be edited and a wrong language should not require deleting the parent.
- **Safety and wording rules carry over.** Every translated string follows the medical-safety wording rules (no advice, no judgement, urgent wording unchanged in meaning), and the existing wording tests run for every language.

Out of scope as stated below: any other language, legal page translation, voice or accent changes.

## Capabilities

### New Capabilities
- `app-language`: the app's language choice and which text is translated, in the app and in push notifications.

### Modified Capabilities
- `access-control`: a member's language preference is stored on their own record (expected, to be confirmed in design).
- `settings`: an App language choice.

## Spec changes

| Requirement | Old behaviour | New behaviour | Spec file |
| --- | --- | --- | --- |
| App language (new) | English only | English, Malayalam, Tamil and Hindi; follows the phone, overridable in Settings | `app-language` |
| Notification language (new) | English | Each member's alerts and digests are in that member's language | `app-language` |
| Parent call language (new) | Chosen only when the parent is added | Editable later in Parent details, with the current language shown | `app-language` |
| Settings sections | No language row | An App language row | `settings` |
| Member record (expected) | No language field | An optional language field, writable only by the member | `access-control` |

`firestore.rules` is expected to change (a language field on the member's own user document and on the parent's language), with emulator tests; to be confirmed in design.

## Open questions

- **Translation quality.** Machine-drafted translations of health reminder wording must be reviewed by a fluent speaker of each language before release; who reviews them?
- **Fonts.** Malayalam, Tamil and Devanagari text needs fonts that render correctly on every phone; the font setup is checked in design.
- **Legal pages and store listing** stay English unless the user asks.
- **Language for family members of a parent in another language**: each member keeps their own app language; the parent's language is only for calls.

## Out of scope

Languages other than English, Malayalam, Tamil and Hindi; translating the privacy policy and terms; changing the spoken prompts or voices; right-to-left layout.

## Impact

App (catalogues, a language setting, Parent details), server (notification templates and the recipient's language), rules and tests, docs.
