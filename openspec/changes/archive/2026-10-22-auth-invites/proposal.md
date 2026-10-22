# Proposal

## Why

Stage 2 (per `PROMPTS.md`): the data model, rules and design system exist, but there is no way into the app — no login, no parent, no family members. Phone-number login, parent creation and sibling invites are the front door for every later stage. Two invite behaviours this stage depends on are not requirements yet: the rules deny **all** client access to `invites/`, so generation must happen in a callable, but nothing says who may generate an invite or with what fields; and nothing requires redemption to reject expired, reused or wrong-user attempts even though the stage mandates tests for exactly those cases.

## What Changes

- **Mobile — auth:** Firebase phone-number login with `@react-native-firebase/auth` (OTP screens), an auth-aware root navigator (auth stack vs the existing tabs), and self-provisioning of `users/{uid}` at first sign-in (existing users-document shape, phone in E.164).
- **Mobile — family screens:** Add a parent (name, phone E.164, language picker over ml-IN / ta-IN / hi-IN / en-IN), parent list, Invite a sibling (shows a generated code), Accept an invite (code entry). A calm info banner shows `consent.status = "pending"` on a parent until consent is granted, explaining that calls start after consent. Large tap targets, tokens only, all strings via i18n (existing lint rules enforce this).
- **Functions — three callables** in `asia-south1`: `createParent` (parent + owner member in one batch — already required by the `access-control` parents path rule), `createInvite` (owner-only), `redeemInvite` (atomic redemption). Idempotent, logged by uid/parent/status only.
- **Functions — tests:** invite redemption for expired, reused and wrong-user cases, plus parent creation writing parent and owner member in one batch.
- **Spec changes:** two ADDED requirements in `access-control` (explicit listing below). No change to `firestore.rules` — `parents` create is already `if false`, `invites` is already deny-all, `members` writes are already callable-only, so no new rules tests are needed beyond keeping the existing 51 green.

## Spec changes

Requirement area: security rules / access control (`openspec/specs/access-control/spec.md`).

1. Requirement: **Invite creation callable** (ADDED).
   Old behaviour: no requirement — `invites` is deny-all for clients and only redemption is mentioned ("redeemed through a callable function"); how an invite comes into existence is unspecified.
   New behaviour: an owner of a parent may create an invite only through a callable Cloud Function; the function writes `invites/{code}` with parentId, role (editor or viewer), createdBy = caller, expiresAt and usedBy = null; clients still have no access to `invites/`.
2. Requirement: **Invite redemption behaviour** (ADDED).
   Old behaviour: no requirement beyond "redeemed through a callable function" — expiry, single use and caller eligibility are unspecified.
   New behaviour: the redemption callable rejects an unknown code, an expired invite, an already-redeemed invite, and a caller who is already a member of the target parent; on success it records `usedBy` and creates the member document (role from the invite, displayName copied from the caller's user document) in one atomic transaction, so concurrent redemptions let exactly one caller win.

The parents path rule (callable creates parent + owner member in one batch), consent "pending" initial state, members and users document shapes are already requirements and are implemented, not changed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `access-control`: two ADDED requirements — Invite creation callable, Invite redemption behaviour.

## Impact

- `mobile/`: new dependencies `@react-native-firebase/app`, `auth`, `firestore`, `functions` (npm + Expo config plugins; prebuild already used for dev builds), auth provider + root navigator restructure, four new screens, i18n keys, Jest mocks for the React Native Firebase modules.
- `functions/`: `createParent`, `createInvite`, `redeemInvite` callables with tests (Firestore emulator, same pattern as the rules suite); `index.ts` grows from the placeholder.
- Firebase console (manual, documented in `docs/SETUP.md`): enable the Phone provider, register the app, add Android SHA-1/SHA-256 and place `google-services.json` / `GoogleService-Info.plist` — these config files are gitignored, never committed.
- No `firestore.rules` change, no `firestore.indexes.json` change, no new region (asia-south1 default), no Claude API usage.
- Decision log: new `docs/DECISIONS.md` entries.

## Out of scope

- Consent granting beyond the pending banner (voice/DTMF consent call is Stage 6; family attestation UI is not in this stage's screens).
- Sibling coordination: read receipts, nudge, pause retries (decision #55, later change) and member role editing or removal — which is also where the "last owner" callable rule (decision #38) lands.
- Invite deep links or QR codes: v1 is a manually typed code; password/email auth; account deletion and export (Stage 12); alerts and dashboard reads (Stage 3).
