# Design

## Context

Stage 0 (monorepo, Expo dev builds) and Stage 1 (data model, rules, rules tests, shared types) are shipped; `functions/src/index.ts` is a placeholder; `mobile/` has navigation with three tabs but no Firebase client, no auth and no Firestore reads. The rules already deny `parents` create and all `invites` access, and require member writes through callables — Stage 2 implements the door the specs already describe. Auth client (user decision 2026-10-19): `@react-native-firebase/auth`.

## Decisions

- **One native SDK family**: `@react-native-firebase/app` + `auth` + `firestore` + `functions` — phone OTP, reads and `httpsCallable` come from one module family; the JS `firebase` package is not added (its RN phone flow needs an invisible reCAPTCHA web view). Added with npm (not Expo-pinned), wired through Expo config plugins; `expo prebuild` regenerates the native projects. Jest gets a manual mock for the whole package so tests never touch native code.
- **Navigation**: the root navigator switches on auth state — signed out shows an auth stack (Login → OTP), signed in shows the existing tabs. Auth state comes from `onAuthStateChanged` in an `AuthProvider` context; no user-visible route names change for the tabs.
- **users/{uid} at first sign-in**: after OTP verification, the app creates `users/{uid}` if missing (displayName empty initially, phone from the verified credential in E.164, fcmTokens [], createdAt now) — self-write is already allowed by the rules.
- **Callables**: `createParent` (owner member in one batch — spec'd in the parents path rule), `createInvite` (owner-only; role editor|viewer; code = 8 chars from an unambiguous alphabet (no 0/O/1/I), collision retried in a transaction; default expiry 7 days), `redeemInvite` (transaction: unknown / expired / used / already-member all rejected; success sets usedBy and writes the member doc with displayName copied from `users/{uid}`, falling back to the phone number if displayName is absent). All log uid, parentId, invite-code hash-free id and status only — no names or numbers in logs.
- **"Wrong user" interpretation** (PROMPTS asks for a test of it): a caller who is already a member of the target parent — invites are bearer codes in v1 (any holder may redeem once), so the only ineligible caller beyond expiry/reuse is an existing member. Written into the spec scenario.
- **Consent banner**: `consent.status = "pending"` is already a spec'd initial state; the app shows the existing `Banner` info variant with a new i18n string ("Calls start after consent is granted") on the parent card/list until status ≠ pending. Banner text is UI, not a spec change; the catalogue test's judgement-word ban applies to it.
- **i18n**: all new strings are keys in `en.json` (ml/ta/hi stay empty per decision #43); the language picker offers exactly the four SUPPORTED_LANGUAGES with their native names shown in their own script.
- **Platform config files**: `google-services.json` and `GoogleService-Info.plist` are gitignored with `.dist` examples; the console steps (Phone provider, app registration, SHA-1/SHA-256) are written into `docs/SETUP.md` — they cannot be verified by tests, so they are documented as manual prerequisites.
- **Function tests**: callables are tested against the Firestore emulator (`FIRESTORE_EMULATOR_HOST`), the same `firebase emulators:exec` pattern as the rules suite, invoked directly with a mocked callable context (`{ auth: { uid } }`) — no auth emulator needed.

## Risks / Trade-offs

- Console-side phone auth setup (SHA fingerprints, billing for reCAPTCHA-free Android) can break login on-device while everything passes locally → documented in SETUP.md as the first thing to verify on hardware; auth itself is mocked in tests.
- Expo prebuild + React Native Firebase config plugins can drift from the Expo SDK → pin versions, run `expo-doctor` in close, and keep the dev-client rebuild step in the tasks.
- Bearer-code invites can be forwarded/screenshotted → acceptable for v1 (short expiry, single use, owner-only creation); deep links and scoped invites are out of scope.
- Redeem transaction reads the caller's `users/{uid}` doc for displayName → falls back to phone so redemption never fails on a missing profile field.
- Last-owner enforcement (decision #38) is absent until member removal exists — no path in this stage can delete members, so nothing is bypassable yet.
