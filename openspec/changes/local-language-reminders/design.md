# Design

## Context

See proposal.md. Observed: `i18n` supports `en`, `ml`, `ta` and `hi`, picks the phone's language with a fallback to English, and the three non-English catalogues contain no keys. The voice templates already have all four languages. The push templates in `functions/src/alerts/templates.ts` take no language. Parent language is stored as a tag (`en-IN`, `ml-IN`, `ta-IN`, `hi-IN`) and used by the call scripts.

## Goals / Non-Goals

**Goals:** the app and its notifications are usable by a person who reads only Malayalam, Tamil or Hindi; the call language is easy to set and correct.

**Non-Goals:** other languages, translating legal text, changing voices.

## Decisions

1. **One catalogue per language with a completeness test.** Fill `ml.json`, `ta.json` and `hi.json` with every key of `en.json`. A test fails when a key is missing or identical to English where it should not be (a short allow-list for words that are the same, such as "OK" or proper names), so a new English string can never ship untranslated.
2. **Review before release.** Translations are drafted, then reviewed by a fluent speaker per language. Until reviewed they are marked draft in the decision log and are not shipped as the default.
3. **App language.** Follows the phone's language when it is one of the four, else English; an App language row in Settings overrides and is remembered on the device and on the member's own record.
4. **Notification language from the recipient.** The member's language is stored on their `users/{uid}` document (new optional field, written only by that member) and read by the server when it builds a push. Missing means English. The templates take a language and fall back to English for any missing line.
5. **Parent call language.** Editable in Parent details by an owner; the current language is shown there. The change takes effect for the next call. Allowed values stay the four tags.
6. **Fonts.** Use the system font for Indic scripts unless a rendering check shows a problem; the glyph tests already guard the bundled fonts.
7. **Wording safety.** The existing wording and design tests run against every locale (no advice, no judgement, no urgency or pressure, urgent wording unchanged in meaning).

## Risks / Trade-offs

- **Machine-drafted health wording** could mislead. Mitigation: human review, the wording tests, and neutral fixed templates.
- **Longer text in some scripts** can overflow. Mitigation: the layout rules and tests already used for long text, plus a screenshot pass in each language.
- **Rules change.** A language field on user documents needs a rule and emulator tests.

## Migration Plan

Deploy the rules and functions first (the field is optional), then the app. Existing members default to the phone language in the app and to English in notifications until they choose.

## Open Questions

- Who reviews each language, and when.
- Whether the Hindi and other catalogues should be released one at a time.
