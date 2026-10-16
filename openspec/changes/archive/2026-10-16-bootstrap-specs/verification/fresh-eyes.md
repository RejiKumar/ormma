# Fresh-eyes comparison: bootstrap-specs

Six independent reviewers, one per old file. Each saw only that old file and its new capability files (not the ledger, design, proposal or other specs), and was read-only. Findings below are summarised from their reports. "Fixed" means the delta spec was corrected (the old `specs/` files were never touched). "Accepted" means kept as is, with the reason.

Totals: 26 findings across the six reviews, none in DROPPED or SOFTENED, 0 changes to any requirement's source text. 22 fixed, 4 accepted (plus 2 low-severity wording notes accepted).

## specs/01-data-model.md -> data-model (6 findings)

| # | Finding | Disposition |
|---|---|---|
| 1 | Scenario "Transcript is a reference" added a condition ("from a voice reply") and made a non-null path look mandatory | Fixed: now "WHEN rawTranscriptRef is set THEN it holds a path in Storage, not inline text" |
| 2 | Scenario "System actor" turned a type into a behaviour rule | Fixed: now restates the type, "actor is a uid or "system"" |
| 3 | Scenario "Unused invite" inferred a meaning of "redeemed" | Fixed: now "usedBy is a uid or null" |
| 4 | Scenario "Call policy values" stated the values as invariants | Fixed: now quotes the source field line unchanged. The same ambiguity (fixed value or default) exists in the source and is not resolved here |
| 5 | Scenario "User document shape" said no user document exists for a parent | Fixed: now "parents do not have accounts in v1" |
| 6 | "(See also `data-protection` ...)" pointer in Retention is outside the permitted edits | Accepted: the user approved keeping duplicated content (01/05 retention and delete-parent) in both places with a cross-reference. The pointer adds no rule. |

## specs/02-security-rules.md -> access-control (3 findings, 2 notes)

| # | Finding | Disposition |
|---|---|---|
| 1 | Scenario "Role table" said "exactly", making the table an exhaustive list | Fixed: now "the role has the permissions shown in the role table" |
| 2 | Scenario "Member reads doseEvents" was unconditional and contradicted the consent visibility rule | Fixed: now "doseEvents are read by members", the source wording |
| 3 | Scenario "Override limits" stated the override without its conditions | Fixed: now restates the source sentence with its own "may" and "never" wording |
| n1 | "doseEvents everything else server-only" is a bare fragment that depends on its heading | Accepted: the source bullet is split by sentence so each stays verbatim; the requirement name carries the referent |
| n2 | Scenario "Query without the where clause" uses "the same" without an antecedent | Accepted: faithful to the source sentence, which uses the same wording |

## specs/03-call-flow.md -> dose-event-lifecycle, call-flow, grouped-calls, missed-dose-alerts (6 findings)

| # | Finding | Disposition |
|---|---|---|
| 1 | Family override test 4 gloss named "Rules test 11 of `access-control`" inside the scenario | Fixed: scenario keeps the source words; the mapping is a separate parenthetical in the approved gloss form |
| 2 | Scenario "Grouped row" restricted the rule to groups resolved by a grouped call | Fixed: now "the family app shows grouped events" |
| 3 | Scenario "Alert text" restricted the standard template to single events, contradicting the no-answer group variant | Fixed: now "a missed-dose alert is created" |
| 4 | Pointer sentence added to "Call script step 2 question" | Fixed: removed; the ledger records where the grouped question went |
| 5 | Scenarios "Greeting" and "Capture" added triggers ("the call is answered", "the parent replies") | Fixed: now "the call script is spoken" and "a reply is captured" |
| 6 | "Call script language" turns a section heading into a requirement | Accepted: the heading parenthetical is the only statement of the rule that the script is spoken in the parent's language via TTS |

## specs/04-medical-safety.md -> medical-safety, trend-flagging (3 findings)

| # | Finding | Disposition |
|---|---|---|
| 1 | Scenario "Disclaimer" implied the disclaimer appears whenever the app is shown | Fixed: now "WHEN the disclaimer is included THEN it is a visible disclaimer: ..." |
| 2 | Scenario "Reading wording" broadened "say" to "displayed or relayed" | Fixed: now "the app says anything about a reading" |
| 3 | Scenario "Increase above threshold" put the general threshold rule inside a THEN | Fixed: split into two scenarios; the threshold-config rule is its own scenario |

## specs/05-consent-dpdp.md -> consent, data-protection (5 findings, borderline one accepted)

| # | Finding | Disposition |
|---|---|---|
| 1 | "Legal review" puts the "Not legal advice" disclaimer under a SHALL lead-in | Accepted: it is one source line whose second sentence ("Have a lawyer review before launch") is an obligation; the text is unchanged |
| 2 | Scenario "Before launch" added "because this is not legal advice" | Fixed: removed |
| 3 | Gloss on the visibility rule added "which states the same rule" | Fixed: removed; gloss now only names the capability |
| 4 | Scenario "Runbook" added a launch trigger | Fixed: now "the incident runbook is maintained" |
| 5 | Scenario "Who has access" invented a trigger; "Privacy notice" WHEN was awkward | Fixed: both reworded without added triggers |

## specs/06-ai-contracts.md -> ai-contracts, reply-structuring, prescription-reading, weekly-summary (3 findings)

| # | Finding | Disposition |
|---|---|---|
| 1 | Scenario "Urgent reply" added a causal "because" | Fixed: now uses the source parenthetical "(do not wait for model; keyword match runs first)" |
| 2 | Scenario "Token counts" tied logging to each AI call completing | Fixed: now "token counts are logged" |
| 3 | The three model headings ("Reply structuring (Haiku 5.5)" etc.) became SHALL requirements | Accepted: the headings are the only place the spec names the model versions, and the stack in CLAUDE.md states the same models. Flagged to the user. The same applies to the trend-flagging heading. |

## After the fixes

Ledger, counts and token check were rerun and pass (see `ledger.txt`, `counts.txt`, `tokens.txt`). `openspec validate bootstrap-specs` passes (see `validate.txt`).
