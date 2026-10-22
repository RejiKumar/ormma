# Tasks

Constraints: no change to `firestore.rules` or `firestore.indexes.json`; region asia-south1 only; phone numbers validated/stored in E.164; no health data in logs (ids and statuses only); no secrets in git (platform config files gitignored); all new UI strings go through i18n (`en.json`) so lint stays green; tokens only, no literal colours; medical-safety disclaimer stays on screens via `Screen`.

## 1. Callables in functions/

- [x] 1.1 Implement `createParent` (callable): validates name, E.164 phone, language ∈ ml-IN/ta-IN/hi-IN/en-IN; writes `parents/{parentId}` with `consent.status = "pending"` plus the owner `members/{uid}` (displayName copied from the caller's `users/{uid}`, fallback phone) in one batch; returns parentId. Verify with a test asserting parent and member exist together and the validation failures reject.
- [x] 1.2 Implement `createInvite` (callable): rejects non-owners; 8-char unambiguous code (no 0/O/1/I) as the `invites/{code}` document id, role "editor" | "viewer", createdBy = caller, expiresAt = now + 7 days (caller may pass a shorter TTL), usedBy null; retries on idempotent collision. Verify tests: owner succeeds, non-owner rejected, document shape correct.
- [x] 1.3 Implement `redeemInvite` (callable) per the spec: one transaction rejecting unknown code, expired, `usedBy` set, caller already a member; success sets usedBy = caller and creates the member doc (role from invite, addedBy = invite.createdBy, addedAt now, displayName from `users/{uid}` with phone fallback). Verify tests: expired, reused, wrong user (already member), success, and two concurrent redemptions where exactly one wins.
- [x] 1.4 Wire the scripts: function tests run under `firebase emulators:exec --only firestore` with a dedicated npm script (`npm run test:fns` at the repo root), callable handlers invoked with a mocked `{ auth: { uid } }` context; plain `npm test` stays emulator-free (decision #36) and runs the pure validation tests. Verify `npm run test:fns` (18 tests) and `npm test` (functions + mobile) both pass.

## 2. Mobile: Firebase and auth shell

- [x] 2.1 Add `@react-native-firebase/app`, `auth`, `firestore`, `functions` with npm; add the config plugins to the Expo app config; gitignore `google-services.json` and `GoogleService-Info.plist` and add `.dist.example` placeholders. Verify `npx expo-doctor` passes and `npm run typecheck` stays green.
- [x] 2.2 Add a Jest manual mock for `@react-native-firebase/*` so no test touches native code. Verify `npm test` in `mobile/` passes unchanged (281+ tests).
- [x] 2.3 Build `AuthProvider` (`onAuthStateChanged`) and switch the root navigator: signed out → auth stack (Login, Otp), signed in → the existing tabs. On first sign-in create `users/{uid}` if missing (phone in E.164, fcmTokens [], createdAt now). Verify with component tests using the mock: unauthenticated shows Login, authenticated shows tabs.

## 3. Screens (tokens + i18n only)

- [x] 3.1 Login and OTP screens: phone entry defaulting to +91 with E.164 validation, Firebase phone verification, OTP entry with resend cooldown, error states (invalid number, too-many-requests) as i18n strings. Verify tests for validation and the i18n lint rule.
- [x] 3.2 Add-parent screen: name, E.164 phone, language picker over the four languages (each shown in its own script) → `createParent` → refresh list. Verify tests: payload shape, validation, error surface.
- [x] 3.3 Parent list screen: realtime listener over `parents`, empty state, primary "Add a parent" action, and the consent `pending` banner (existing `Banner` info variant, i18n string "Calls start after consent is granted") on each pending parent. Verify component test: banner renders only while status is pending.
- [x] 3.4 Invite-a-sibling screen (owner): pick role editor|viewer → `createInvite` → show the code with copy instructions; Accept-an-invite screen: code entry → `redeemInvite` with distinct i18n error messages for expired / already used / already a member / unknown code. Verify tests map each rejection to its message.

## 4. Docs and decisions

- [x] 4.1 Document the manual console prerequisites in `docs/SETUP.md` (enable Phone auth, register apps, Android SHA-1/SHA-256, place the platform files) and add the `docs/DECISIONS.md` entries: RN Firebase over the JS SDK, invite code format and 7-day TTL, "wrong user" = already a member, platform config files gitignored.

## 5. Close

- [x] 5.1 Run `npm run lint`, `npm run typecheck`, `npm test` (root: functions + mobile + rules via their scripts), `npx expo-doctor` and the Android Metro export (`npx expo export --platform android`). Verify all pass; archive the change (`openspec archive auth-invites`) syncing the access-control delta, and verify `openspec validate --specs` reports all specs valid.
