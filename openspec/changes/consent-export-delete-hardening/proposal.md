# Proposal: Consent, export, delete, hardening

## Why
Need voice/DTMF consent flow with family-attested fallback, revocation in-app/by key, export (callable) for owners, recursive delete with audit entry, and hardening pass for auth checks, logs, unvalidated input, idempotency.

## What Changes
- Consent: handle first-call consent, record method/policyVersion, family-attested warning, revoke via app and DTMF (press 9), re-grant sets regrantedAt keeps revokedAt, enforce visibility rule.
- Export: callable `exportParentData` returns JSON for owners only.
- Delete: callable `deleteParent` recursively deletes parent data and storage files, writes auditLog with no health data.
- Hardening: review functions for missing auth, secrets in logs, health data in logs, unvalidated input, missing idempotency; fix high severity, list rest in docs/TODO-SECURITY.md.

## Spec changes
- `consent`: ADDED in-app revoke, export/delete offer on revocation, hardening expectations.
- `data-protection`: ADDED export/delete callable requirements and auditLog constraints.

## Impact
New callables, rules already cover access; need tests.
