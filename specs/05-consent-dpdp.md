# Spec 05: Consent and Data Protection (India DPDP Act oriented)

Not legal advice. Have a lawyer review before launch.

## Consent
- A parent record starts with consent.status = "pending". No calls or health logging until "granted".
- Granting methods:
  1. Voice or DTMF consent during a first call: a plain-language script in the parent's language naming who will see the data (the listed family members) and why. "Press 1 to agree."
  2. Family-attested (fallback): an owner confirms the parent has agreed. Record method = "family_attested" and show a warning that voice consent is preferred.
- Store policyVersion with the consent. Re-ask when the policy changes.

## Revocation
- The parent can say or press a key on any call to stop calls and sharing ("Press 9 to stop reminders"). Status becomes "revoked" immediately.
- Owner can revoke from the app.
- On revocation: set `consent.revokedAt`, stop calls, hide new data from non-owners, offer export and deletion.
- Visibility rule (enforced in Firestore rules, spec 02): data created before `revokedAt` stays visible to existing members. Data dated at or after `revokedAt` is visible to owners only. Editors and viewers lose access to it.
- The owner decides what happens to the older data: export it, or delete the parent record.

## Data minimisation
- Do not store raw audio. Process in memory only.
- Transcripts: store only when needed for review, in Storage with a 30-day lifecycle.
- Send Claude only the text it needs. No names, phone numbers, or addresses in prompts; use "the parent".
- Do not log health values or transcripts in Cloud Logging.

## Rights
- Export: callable function returns a parent's data as JSON for owners.
- Delete: callable function recursively deletes the parent and storage files, and writes an auditLog entry that keeps no health data.

## Transparency
- Privacy notice in the app and a short spoken version available on a call.
- Family members see who else has access.

## Breach readiness
- Maintain a short incident runbook in `docs/INCIDENT.md`.
