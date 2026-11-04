# Pre-launch checklist
- [ ] Secrets configured in Secret Manager
- [ ] Firestore/Storage rules deployed
- [ ] Functions deployed to asia-south1
- [ ] Emulators tested with rules
- [ ] Pilot family onboarded (scripts/onboard-pilot.js)
- [ ] Incident runbook reviewed (docs/INCIDENT.md)
- [ ] Consent flow tested (voice/DTMF/app)
- [ ] Export/delete tested for owner

- [ ] Real `google-services.json` for com.ormma.app in `mobile/` (see docs/RELEASE.md)
- [ ] Upload key created and `mobile/keystore.properties` set; `bundleRelease` builds
- [ ] Privacy policy published and linked in Play Console; Data safety and Health apps forms done
- [ ] Presence and emergency contacts mentioned in the privacy policy

## Pilot measures from the BRD (ormma-family-companion-brd.md)
- [ ] NFR-2.1 Load time: on a mid-range Android phone with the network throttled to 4G, cold-open the app and time from tapping the icon to the first dose card on Today. Five runs; the median must be at most 1.2 s. Record the phone model and the numbers here.
- [ ] NFR-2.2 Call timing: after one pilot day, list `callSessions` and compute `startedAt` minus the matching dose event's `scheduledFor`. Every call must start at or after the scheduled time, and the 95th percentile must be at most 60 s. Record the numbers here. (The dispatcher runs every minute; a unit test and an emulator test cover the rule, only the pilot proves the real figure.)
- [ ] Daily dose confirmation (KPI): at least 92 percent of doses confirmed within 45 minutes across the pilot (count `taken` events whose `resolvedAt` is within 45 minutes of `scheduledFor`).
- [ ] Escalation resolution (KPI): time from a family alert to the caregiver's first tap on a Call button under 15 minutes in the pilot.
