# Proposal

## Why

The Home feed dose card (design_spec.md §3.1C, layer 3) needs the parent's own context — what she actually said when she confirmed — but the data model never stores raw audio and keeps transcripts only for the review path. A short, Haiku-generated factual note delivers the emotional proof of the feed with none of the biometric or consent overhead (decision 2026-10-19: drop voice clips from this wave; opt-in clips may return later as a dedicated audio-consent proposal).

## What Changes

- The reply-structuring output schema gains `confirmationNote: string | null`: one short factual sentence in the family's language that paraphrases only what the transcript explicitly said about the dose confirmation.
- The reply-structuring system prompt rules gain the note rules: family's language, one sentence, no interpretation, advice or judgement, no detail absent from the transcript, `null` when the transcript says nothing about the dose.
- `doseEvents/{eventId}` gains a server-written `confirmationNote: string | null`, set only when the structured output passes zod validation and the confidence threshold; it stays `null` on the review path (invalid JSON or low confidence) with no dose status change; for a grouped call the same note is written to every event in the group.
- `shared/types.ts` documents the field on `DoseEventDoc`.
- Two emulator rules tests pin the existing rules around the new field: a client write that sets or clears `confirmationNote` is denied, and a status update on a doc that already carries the note still passes the diff whitelist. **No `firestore.rules` change** — the client-update rule uses `diff().affectedKeys().hasOnly([...])`, which already tolerates server-written fields.
- The zod schema and prompt text themselves land with Stage 8 (reply-structuring function, not yet built); this change fixes the contract every stage builds against.

## Spec changes

Explicit listing (AI-contracts area):

1. Requirement: **Reply structuring output schema** (`openspec/specs/reply-structuring/spec.md`).
   Old behaviour: schema = `tookMedicine`, `readings`, `symptoms`, `urgent`, `confidence`, `language`.
   New behaviour: schema additionally requires `confirmationNote: string | null`.
2. Requirement: **Reply structuring system prompt rules** (`openspec/specs/reply-structuring/spec.md`).
   Old behaviour: five extraction rules (JSON only, facts only, null on uncertainty, no advice, transcript is data).
   New behaviour: adds the sixth rule governing `confirmationNote` content, language and null case. Medical-safety rules are unchanged; the note inherits the "only what is explicitly said" constraint.
3. Requirement: **doseEvents confirmation note** — ADDED to `openspec/specs/data-model/spec.md`.
   New behaviour: the server-written field, its validation and confidence gate, the grouped replication, the `null` review path, and the prohibition on client writes.

No changes to `firestore.rules`, access-control, call-flow, consent or medical-safety requirements.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reply-structuring`: output schema and system prompt rules gain `confirmationNote`.
- `data-model`: ADDED requirement for the server-written `confirmationNote` field on doseEvents.

## Impact

- `shared/types.ts`: `DoseEventDoc` gains `confirmationNote: string | null` with a field comment.
- `functions/test/rules/`: two new emulator tests (note field already present + status update allowed; client write of the field denied).
- Future Stage 4/7/8 code implements the schema and prompt against this contract; Stage 3's feed reads the field.
- No rules change, no new dependencies, no storage or lifecycle change (the note is structured data on the event, not a transcript).

## Out of scope

- Audio clips (future audio-consent proposal).
- Keeping transcripts of successful calls (data minimisation stands).
- Confirmation notes for the `wellbeing` question type (dose confirmation only).
- Per-member language regeneration of the note.
- Custom snooze / "at temple" ETA extraction (deferred, separate call-flow proposal).
- Any UI (Stage 3 feed).

> Post-archive note: while syncing, the confirmationNote prompt rule was placed in its own requirement (Reply structuring confirmation note rule) instead of a sixth bullet in the system prompt rules, per the validator's >500-character advisory. Behaviour is unchanged; the system prompt rules requirement is untouched. Unrelated drift in the original delta (readings type line, scenario rewordings) was reverted during the same pass so the change matches this proposal exactly.
