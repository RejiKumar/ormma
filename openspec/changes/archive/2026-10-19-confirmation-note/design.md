# Design

## Context

Stages 4 to 8 (dispatcher, Exotel, speech-to-text, reply structuring) are not built yet; Stage 1 delivered the data model, security rules and `shared/types.ts`. `design_spec.md` layer 3 wants a family-facing line of what the parent said. Decision (2026-10-19): no voice clips; a generated confirmation note instead, in the family's language.

## Decisions

- **Field lives on `doseEvent`, not `callSession`.** The feed reads events directly; `callSessions` is a server-write-only operational record, not the family-facing one. Grouped calls replicate the same note to each event.
- **Family language = `parents.language`** — the family-configured language, the same notion `weekly-summary` already uses. One generation pass, one stored field, served to every member; no per-viewer regeneration.
- **Paraphrase, not quotation.** Haiku must not render fake quotes; the medical-safety "never fill in missing values from the model's own knowledge" rule carries over into the note rule (only what was said, one sentence, no advice/judgement).
- **`null` is first-class.** The review path (invalid JSON or confidence below the existing 0.6 threshold) never writes a partial note, and a note never changes a dose status — status still follows `tookMedicine` alone.
- **No `firestore.rules` change.** The client-update rule diffs `affectedKeys().hasOnly([...])`, so a server-written field neither breaks nor widens client updates. Two emulator tests pin this instead (write-denied, and status-update-while-note-present allowed).
- **Stored indefinitely as structured adherence data**, like `resolvedAt` — it is a derived fact about the call, not a transcript; the data-minimisation rule (transcripts only for `needsReview`) is untouched.
- **Contract-first sequencing.** The zod schema and prompt text land with Stage 8 against this spec; this change fixes the contract, the shared type and the rules coverage now so no later stage invents its own field name or semantics.

## Risks / Trade-offs

- Paraphrase can drift from verbatim fidelity → accepted; verbatim would require transcript retention and consent surface.
- One language for a multilingual household → matches the `weekly-summary` precedent; revisit if members actually split languages.
- Stage 8 could let note generation influence status → the spec separates them explicitly (note follows validation; status follows `tookMedicine`); add a test when Stage 8 lands.
- Idempotency: replayed webhooks must not append duplicates → deterministic event IDs plus server-only writes mean the same note overwrites itself with the same value; no list, no array append.
