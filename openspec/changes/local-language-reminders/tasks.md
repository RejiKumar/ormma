# Tasks

## 1. Language setting and catalogues

- [x] 1.1 Add the App language setting (the four languages in their own scripts, Phone language, remembered). Verify: app tests for follow the phone, override, restart and an unsupported phone language.
- [x] 1.2 Draft the Malayalam, Tamil and Hindi catalogues for every English key, and add the completeness test (no missing key, no unexplained identical-to-English value). Verify: the test fails when a key is removed and passes when complete.
- [x] 1.3 Run the wording and design guards over every language. Verify: they pass for all four catalogues.
- [ ] 1.4 Check layout and fonts in each script on the phone for the main screens. Verify: screenshots with no clipped or broken text.

## 2. Notifications

- [x] 2.1 Store the member's language on their own user document (rule and emulator tests so only the member can write it, and only the four values). Verify: rules tests for allowed and denied writes.
- [x] 2.2 Give the push templates a language, with an English fallback per line, and pick the recipient's language when sending. Verify: unit and emulator tests for one language, two members in two languages, and no language set.

## 3. Parent call language

- [x] 3.1 Show and change the parent's call language in Parent details (owner only), with the rule and tests. Verify: app and rules tests; the next call uses the new language.

## 4. Review and verification

- [ ] 4.1 Have each language reviewed by a fluent speaker before it becomes the default. Verify: the review is recorded in `docs/DECISIONS.md`.
- [x] 4.2 Run function and app tests, the emulator and rules suites, typecheck, lint and `openspec validate local-language-reminders`. Verify: all pass.
- [ ] 4.3 On the phone: switch the language and read the main screens, receive one push in Malayalam, and receive a call in Malayalam. Verify: screenshots, the push text and the call heard.
