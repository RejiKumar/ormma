# Ormma: Mobile UI/UX Design Specification & Architecture

**Document Version:** 1.0.0  
**Target Platform:** React Native / Expo (Caregiver Mobile App)  
**Target Audience:** Remote adult child caring for elderly parents from another city/country  
**Backend & AI Integration:** Firebase (asia-south1), Claude API (Haiku 5.5 & Sonnet 5.5), Exotel Telephony

---

## 1. Executive Summary & Emotional Thesis

### 1.1 The Emotional Problem

Adult children living in metropolitan hubs (Bangalore, Mumbai, Dubai, London) experience chronic background guilt and anxiety regarding their aging parents' health in their hometowns. Existing health applications fail because they are either:

1. **Clinical & Alarming:** Saturate users with red notification badges, medical jargon, and rigid adherence charts that heighten panic.
2. **Surveillance-Oriented:** Make elderly parents feel monitored and infantilized, causing resistance and skipped check-ins.

### 1.2 Ormma's Experience Thesis

Ormma delivers **"3-Second Peace of Mind"** without imposing app friction on the parent:

- **Zero app barrier for the parent:** Elders interact strictly via familiar, warm outbound phone calls in Malayalam or their native tongue.
- **Warm companion aesthetic for the child:** Calming visuals, conversational updates, and authentic audio snippets replace clinical alarmism.
- **Coordinated caregiving:** Siblings and family members share visibility, eliminating double-calling and communication gaps.

---

## 2. Design System & Visual Foundation

### 2.1 Color Palette

The color system moves away from sterile hospital whites and harsh emergency reds toward organic, comforting domestic tones.

| Token Name               | Hex Code  | Semantic Role                                            |
| :----------------------- | :-------- | :------------------------------------------------------- |
| **Canvas Cream**         | `#FAF7F2` | Primary screen background, warm paper-like surface       |
| **Card Surface**         | `#FFFFFF` | Elevated containers, cards, and modals                   |
| **Sage Peace (Primary)** | `#2D5A4C` | Brand color, status on-track indicators, primary buttons |
| **Soft Sage**            | `#E8F0EC` | Background tint for completed states and positive chips  |
| **Clay / Terracotta**    | `#C86D51` | Warm accent, retry notices, gentle pending attention     |
| **Deep Forest (Text)**   | `#192E26` | Primary high-contrast body and heading text              |
| **Muted Slate**          | `#6B7C75` | Timestamps, secondary labels, metadata                   |
| **Amber Caution**        | `#E09F3E` | Postponed doses, temple/outing reschedule states         |
| **Border Subdued**       | `#EBE6DD` | Card dividers, subtle container borders                  |

### 2.2 Typography Hierarchy

- **Headings (Display):** High-clarity rounded sans or warm serif (e.g., Plus Jakarta Sans or Fraunces) for comforting editorial titles.
- **Body & Numbers:** Inter or SF Pro with tabular figures (`tnum`) for reliable time and medication count alignment.
- **Regional Language Support:** Full glyph support for Malayalam script (e.g., Manjari or Noto Sans Malayalam) with 1.3x baseline height adjustments for legibility.

### 2.3 Iconography & Voice Waveforms

- Rounded, organic iconography (Lucide style) with 2px stroke width.
- Interactive audio waveform bars rendered with dynamic heights and soft pill borders, animating gracefully during playback.

---

## 3. Screen Architecture & Core Flows

### 3.1 Screen 1: The Caregiver Daily Reassurance Feed (Home)

#### A. Top Hero Status Card ("Status Ring")

- **Purpose:** Answers the single core question within 3 seconds of app launch: _"Is Amma okay today?"_
- **Visual Representation:**
  - Clean card with a gentle sage border and soft breathing glow.
  - Avatar of the parent with a live status ring.
  - Headline: **"Amma is on track today"**
  - Subtext: _"2 of 3 doses confirmed • Last confirmed at 1:35 PM"_
  - Action pill: **"Call Amma directly"** (one-tap dialer bypass).

#### B. Chronological Medication Timeline

Divided into three predictable daily routines rather than clinical hours:

1. **Morning Routine (8:30 AM)** — Post-breakfast medications.
2. **Afternoon Routine (1:30 PM)** — Post-lunch medications.
3. **Night Routine (9:00 PM)** — Post-dinner / bedtime medications.

#### C. The Dose Card Anatomy

Each dose card contains five integrated layers:

1. **Time & Routine Header:** E.g., `Morning • 8:30 AM` with a pill badge showing medication count (`2 tablets`).
2. **Medication List:** Visual pill descriptors (e.g., _Sugar tablet (Glimepiride 1mg)_, _BP capsule_).
3. **Claude Haiku Parsed Note:** Conversational summary derived from call transcript:
   > _"Called at 8:32 AM. Amma confirmed: 'Took the sugar tablet after tea and idli.'"_
4. **Interactive 5-Second Voice Clip:**
   - Play/Pause button with audio waveform preview.
   - Dual language subtitle snippet: Malayalam transcript + English translation.
   - Gives emotional proof of parent’s wellbeing and voice clarity.
5. **Sibling Presence Footer:**
   - Avatar stack showing which family members checked this dose.
   - Example: _"Seen by Rahul at 8:40 AM"_.

#### D. Sibling Coordination Actions

- When a dose is pending or postponed, siblings see a coordinated action drawer:
  - **[I Called Amma]** — Tapping this logs a shared note and pauses automated system retry calls for 30 minutes.
  - **[Nudge Sibling]** — Pings brother/sister if they are geographically closer.

#### E. One-Tap WhatsApp Digest Card

- Fixed at the bottom of the feed or accessible via header share icon.
- Formatted summary ready to copy or push directly into the family group:
  ```text
  🌿 Ormma Care Update — Amma (Monday, Oct 19)
  ✅ Morning: Confirmed at 8:32 AM (after tea)
  ✅ Afternoon: Confirmed at 1:35 PM
  ⏳ Night: Scheduled for 9:00 PM
  Consistency this week: 100% (14/14 on time)
  ```

---

### 3.2 Screen 2: Prescription Onboarding (Zero-Typing Camera Flow)

#### A. The Doctor's Prescription Scanner

- Camera view with document edge-detection guidelines.
- Direct upload to Claude Sonnet 5.5 (`claude-sonnet-5-5`) via Cloud Functions.
- Extraction schema parses:
  - Generic & Brand drug names.
  - Dosage strength (mg/mcg).
  - Food timing (`BEFORE_FOOD`, `AFTER_FOOD`).
  - Day frequency (Morning, Noon, Night).

#### B. Visual Pill Identification Mapping

- Doctors write pharmacological names; elderly parents identify medicines by tactile and visual cues.
- Setup flow prompts the child:
  - _“How does Amma describe this pill?”_
  - Options: Color (White, Yellow, Pink), Shape (Round, Oval, Capsule), Container (Strip, Bottle).
- When Exotel initiates the phone call, TTS prompts:
  > _“അമ്മാ, രാവിലത്തെ ആ ചെറിയ വെള്ള ഗുളിക കഴിച്ചോ?”_ (_“Amma, did you take that small white tablet for morning?”_)

---

### 3.3 Screen 3: Progressive Escalation & Anti-Panic Protocol

To prevent panic fatigue when calls go unanswered, Ormma implements a multi-tiered escalation timeline:

| Elapsed Time   | Trigger Event                    | App / System Action                                                                                      |
| :------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **T + 0 min**  | Scheduled time arrives           | Exotel initiates primary call to parent.                                                                 |
| **T + 15 min** | Unanswered or busy               | Exotel triggers second retry call. In-app status displays amber: _"Retry scheduled at T+15"_.            |
| **T + 30 min** | Intent postpone (e.g. at temple) | Haiku schedules custom snooze time; in-app feed displays: _"Amma at temple; rescheduling for 11:30 AM"_. |
| **T + 45 min** | 2 calls unanswered               | Silent push notification sent to primary caregiver: _"Morning call unreached. Tap to check in."_         |
| **T + 60 min** | Still unconfirmed                | Escalation modal unlocks secondary emergency contacts: _Neighbor, Family Doctor, Local Caretaker_.       |

---

## 4. Technical Architecture Alignment (OpenSpec)

Ormma's UI/UX strictly mirrors the architectural constraints defined in the engineering specs:

1. **Security & Secrets:** All telephony (Exotel) and Claude API calls are executed strictly within Firebase Cloud Functions v2 (`asia-south1`). The mobile UI only reads and writes to authenticated Firestore endpoints with strict rules.
2. **Schema Validation:** Transcripts from Google Cloud STT structured by Claude Haiku are validated against strict Zod schemas before appearing on the mobile timeline.
3. **Medical Safety:** The UI never diagnoses, adjusts dosage, or offers prescriptive advice. It functions exclusively as a communication and adherence coordination bridge.
4. **Idempotency:** Action buttons such as _"Mark as taken by caregiver"_ use idempotent Firestore transactions with unique event UUIDs to prevent double-logging across concurrent sibling sessions.

---

## 5. Prototype Validation Checklist

- [x] **Glanceability Test:** User can assess status in under 3 seconds without scrolling.
- [x] **Voice Relatability:** 5-second audio snippet plays seamlessly with visible animated waveform.
- [x] **Sibling Sync:** Status updates reflect immediately without conflicting sibling calls.
- [x] **Zero-Panic Alerting:** Missed calls are communicated with actionable next steps rather than emergency sirens.
- [x] **WhatsApp Loop:** Summary card copies cleanly formatted text to system clipboard.
