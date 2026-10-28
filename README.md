# Ormma

Voice-first, local-language care coordination app for elderly parents and their children in other cities. Phones the parent at medicine times, captures replies, and updates a family app.

## Stack
- Mobile: React Native (TypeScript, Expo dev client), React Navigation
- Backend: Firebase (Auth, Firestore, Storage, Cloud Functions v2 in TypeScript), Cloud Scheduler, FCM
- Region: asia-south1 (Mumbai)
- Voice: Google Cloud Speech-to-Text and Text-to-Speech
- Telephony: Exotel
- AI: Claude API (Haiku 5.5 for structuring/summaries, Sonnet 5.5 for prescription reading)

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase CLI
- Android SDK/Java for Android builds
- Expo CLI

### Setup
1. Clone the repo
2. Install dependencies
   ```bash
   cd functions && npm install
   cd ../mobile && npm install
   ```
3. Configure Firebase
   - Copy `.firebaserc.example` to `.firebaserc` and set project
   - Add `google-services.json` and `GoogleService-Info.plist` for mobile
4. Set secrets in Firebase Secret Manager (Claude, Exotel, etc.)
5. Run emulators
   ```bash
   firebase emulators:start
   ```
6. Run mobile app
   ```bash
   cd mobile && npx expo start --dev-client
   ```

## Scripts
- `firebase emulators:start` - Run Firebase emulators
- `cd functions && npm test` - Run function tests
- `cd mobile && npx tsc --noEmit` - Type check mobile
- `cd mobile && npm test` - Run mobile tests

## Documentation
- [Specs](openspec/specs/) - OpenSpec capability specifications
- [Workflow](PROMPTS.md) - Stage-by-stage development prompts
- [Decisions](docs/DECISIONS.md) - Project decisions log
- [Incident Runbook](docs/INCIDENT.md) - Incident response

## License
Private - All rights reserved


## Deployment
- Staging: npm run deploy:staging
- Production: npm run deploy:prod

## Monitoring
- Logs: Firebase Functions logs (asia-south1)
- Alerts: via FCM/missed-dose alerts
