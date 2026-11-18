# Pre-launch checklist

Links: [Play Console](https://play.google.com/console) · [Firebase console](https://console.firebase.google.com/project/ormma-prod/overview) · [Functions and logs](https://console.cloud.google.com/functions/list?project=ormma-prod) · [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=ormma-prod) · guides: [RELEASE.md](RELEASE.md), [PLAY-UPLOAD.md](PLAY-UPLOAD.md), [GO-LIVE.md](GO-LIVE.md)

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

## Subscriptions and settings
- [ ] Play subscription products `ormma_family_monthly` (₹299) and `ormma_family_yearly` (₹2,999) created and active (docs/RELEASE.md section 8b)
- [ ] `PLAY_SERVICE_ACCOUNT_JSON` secret set; the service account has Play Console permissions; `playBillingEvents` topic test notification received
- [ ] On a physical phone from the Internal testing track: buy, cancel, refund and restore all work; the plan row in Settings and the limits follow
- [ ] Exotel's real per-call price recorded here: ____. The Free plan now calls every dose time (decision 187), so check the cost of a Free family per day; the plans differ in parents and members only
- [ ] Build 1.0.1 (versionCode 3) uploaded to Internal testing; Play shows the version you expect (docs/PLAY-UPLOAD.md)
- [ ] `firestore:rules` deployed before the 1.0.1 app reaches users (the app writes `users/{uid}.language`), then functions
- [ ] A call in Malayalam, Tamil or Hindi answered, and a missed-dose push and the 8 PM digest received in that language
- [ ] Malayalam, Tamil and Hindi wording (app, pushes, call script) reviewed by a fluent speaker of each; reviewers recorded in docs/DECISIONS.md
- [ ] Layout checked on the phone in each script (Today, Medicines, Alerts, Family, Settings)
- [ ] Privacy policy and terms (docs/PRIVACY-POLICY.md, docs/TERMS.md) reviewed by a lawyer, published, URLs set in `mobile/src/legal/legalConfig.ts` and Play Console, `node scripts/build-legal.mjs` run
- [ ] In-app account deletion tested (refuses while owning a parent; works for a member)

## Pilot measures from the BRD (ormma-family-companion-brd.md)
- [ ] NFR-2.1 Load time: on a mid-range Android phone with the network throttled to 4G, cold-open the app and time from tapping the icon to the first dose card on Today. Five runs; the median must be at most 1.2 s. Record the phone model and the numbers here.
- [ ] NFR-2.2 Call timing: after one pilot day, list `callSessions` and compute `startedAt` minus the matching dose event's `scheduledFor`. Every call must start at or after the scheduled time, and the 95th percentile must be at most 60 s. Record the numbers here. (The dispatcher runs every minute; a unit test and an emulator test cover the rule, only the pilot proves the real figure.)
- [ ] Daily dose confirmation (KPI): at least 92 percent of doses confirmed within 45 minutes across the pilot (count `taken` events whose `resolvedAt` is within 45 minutes of `scheduledFor`).
- [ ] Escalation resolution (KPI): time from a family alert to the caregiver's first tap on a Call button under 15 minutes in the pilot.
