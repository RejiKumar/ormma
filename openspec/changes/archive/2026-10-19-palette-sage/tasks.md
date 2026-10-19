# Tasks

Constraints: token structure and token names unchanged; no new dependencies; no component file changes; every colour pair must pass the contrast test; the coral rule must remain untouched.

## 1. Palette remap

- [x] 1.1 Remap `mobile/src/design/tokens.ts`: light background `#FAF7F2`, primary `#2D5A4C`, primaryTint `#E8F0EC`, border `#EBE6DD`, focus a dark sage; re-hue the dark theme primary and tints to a lifted sage distinct from `#86D9A8`. Verify `contrast.test.ts` and `designRules.test.ts` pass, adjusting `inkMuted` or any failing pair only as needed to hold 4.5:1 / 3:1.
- [x] 1.2 Update the palette table in `docs/design-system.md` and add the decision to `docs/DECISIONS.md`. Verify the doc lists the new values and the full test suite still passes.

## 2. Close

- [x] 2.1 Run `npm run lint`, `npm run typecheck`, `npm test` and the Android Metro export (`npx expo export --platform android`). Verify all pass; archive the change (`openspec archive palette-sage`) and verify `openspec validate --specs` still reports all specs valid.
