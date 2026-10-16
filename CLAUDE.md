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
2. Every Firestore access path is governed by `specs/02-security-rules.md`. Any change to `firestore.rules` needs emulator tests.
3. Medical safety rules in `specs/04-medical-safety.md` apply to every prompt, screen and notification.
4. All AI output is validated against a schema before being written. Invalid output goes to a review state, never silently saved.
5. Call-flow code must be idempotent (see `specs/03-call-flow.md`).
6. No health data in logs. Log IDs and statuses only, never transcripts or values.
7. Phone numbers are stored in E.164 format.

## Workflow
- Work on one stage at a time from `PROMPTS.md`.
- For stages touching specs/ areas: propose first (plan, files, edge cases), wait for my approval, then implement.
- Write tests for functions and rules. Run them before saying a stage is done.
- Keep a `docs/DECISIONS.md` with one line per non-obvious decision.
- If a spec is unclear or conflicts with the request, ask me. Do not guess.

## Specs index
- specs/01-data-model.md
- specs/02-security-rules.md
- specs/03-call-flow.md
- specs/04-medical-safety.md
- specs/05-consent-dpdp.md
- specs/06-ai-contracts.md
