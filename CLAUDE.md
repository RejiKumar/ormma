# Ormma: project context for Claude Code

Ormma is a voice-first, local-language care coordination app for elderly parents and their children in other cities.
The system phones the parent at medicine times, captures the reply, and updates a family app.

## Stack (do not change without asking)
- Mobile: React Native (TypeScript, Expo or bare, ask me at Stage 0), React Navigation
- Backend: Firebase (Auth, Firestore, Storage, Cloud Functions v2 in TypeScript, Cloud Scheduler, FCM)
- Region: asia-south1 (Mumbai) for Firestore, Storage and Functions
- Voice: Google Cloud Speech-to-Text and Text-to-Speech
- Telephony: Exotel (outbound calls, DTMF)
- AI: Claude API, called ONLY from Cloud Functions
  - Haiku 5.5 (`claude-haiku-5-5`) for transcript structuring and summaries
  - Sonnet 5.5 (`claude-sonnet-5-5`) for prescription photo reading

## Hard rules
1. The Claude API key and Exotel credentials live in Firebase secrets (Secret Manager). Never in the app, never in git.
2. Every Firestore access path is governed by `openspec/specs/access-control/spec.md`. Any change to `firestore.rules` needs emulator tests.
3. Medical safety rules in `openspec/specs/medical-safety/spec.md` apply to every prompt, screen and notification.
4. All AI output is validated against a schema before being written. Invalid output goes to a review state, never silently saved.
5. Call-flow code must be idempotent (see `openspec/specs/call-flow/spec.md`).
6. No health data in logs. Log IDs and statuses only, never transcripts or values.
7. Phone numbers are stored in E.164 format.

## Workflow
- Work follows OpenSpec: `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.
- Work on one stage at a time from `PROMPTS.md`. The stage text is the description given to `/opsx:propose`.
- Specs live in `openspec/specs/`, one folder per capability, listed below. The old numbered files are kept only at git tag `specs-v1-pre-openspec`; `docs/spec-migration-map.md` maps each old section to its capability.
- Proposals must list requirement changes under "Spec changes" (see `openspec/config.yaml`). Wait for my OK on a proposal before `/opsx:apply`.
- Write tests for functions and rules. Run them before saying a stage is done.
- Keep a `docs/DECISIONS.md` with one line per non-obvious decision.
- If a spec is unclear or conflicts with the request, ask me. Do not guess.

## Specs index
All under `openspec/specs/<capability>/spec.md`:
- data-model (old spec 01)
- access-control (old spec 02)
- dose-event-lifecycle, call-flow, grouped-calls, missed-dose-alerts (old spec 03)
- medical-safety, trend-flagging (old spec 04)
- consent, data-protection (old spec 05)
- ai-contracts, reply-structuring, prescription-reading, weekly-summary (old spec 06)
