# Business Requirements Document (BRD)
## Project: Ormma — Family Care Companion
**Document Version:** 1.0  
**Status:** Approved for Implementation  
**Product Category:** Digital Health & Remote Elder Care Coordination  
**Target Audience:** Long-Distance Family Caregivers & Aging Parents  

---

## 1. Executive Summary

### 1.1 Project Vision
**Ormma** (Malayalam for "memory / remembrance") is a voice-first, dignified care coordination platform engineered for adult children managing the daily health and well-being of aging parents living independently from afar. Unlike intrusive surveillance cameras or clinical medication apps that elders struggle to navigate, Ormma uses gentle, automated conversational voice check-ins in the parent's native language and translates those interactions into a peaceful daily reassurance feed for the extended family.

### 1.2 Business Objectives
1. **Reduce Caregiver Anxiety:** Eliminate daily uncertainty regarding whether elderly parents have taken time-critical medications (hypertension, diabetes, cardiac).
2. **Preserve Elder Dignity:** Replace repetitive interrogation calls ("Did you take your pills?") with warm, natural conversational interactions ("How was your morning tea?").
3. **Prevent Caregiver Fatigue & Family Friction:** Provide a shared single source of truth for all siblings, eliminating duplicate check-in calls and confusion.
4. **Safety Net Escalation:** Ensure automated detection of missed routines within a 60-minute window, routing alerts directly to family and local neighborhood contacts.

---

## 2. Problem Statement & Market Need

### 2.1 The Problem
- **Geographic Distance:** Tens of millions of diaspora professionals live in Tier-1 cities or overseas while their aging parents live independently in their hometowns.
- **Medication Adherence Risks:** Chronic conditions (e.g., Type 2 Diabetes, Hypertension) require strict medication compliance. Missed doses or accidental double-dosing lead to avoidable hospitalizations.
- **App Friction for Elders:** Most elderly parents do not use complex mobile apps or remember to click digital checkboxes.
- **Family Coordination Gaps:** Sibling A calls at 9:00 AM; Sibling B calls at 11:00 AM asking the exact same questions. No central visibility exists.

### 2.2 User Personas

| Persona | Role | Key Pain Points & Needs |
| :--- | :--- | :--- |
| **Primary Caregiver (e.g., Rahul)** | Son working in Bangalore / Dubai | Constantly anxious during work hours; needs passive, high-confidence reassurance that Amma took her morning and evening doses on time. |
| **Secondary Caregiver (e.g., Meera)** | Daughter / Sibling | Wants visibility into whether Rahul already called so she doesn't overwhelm their mother with duplicate queries. |
| **Elder Parent (e.g., Amma)** | 72-year-old mother in Thrissur | Independent, feels patronized by clinical tracking devices; responds happily to normal voice phone calls in Malayalam. |
| **Local Support Network (e.g., Sreeja / Dr. Nair)** | Neighbor / Family Physician | First-line physical responder if Amma fails to pick up her phone or reports acute distress. |

---

## 3. Scope of the System

### 3.1 In-Scope (Phase 1 MVP)
- Automated conversational outbound voice check-in engine for scheduled medication doses.
- Speech-to-text and AI extraction of confirmation status, subjective well-being, and conversational context.
- Mobile Reassurance Feed app for family members (iOS & Android responsive web / PWA).
- Chronological dose timeline with conversational snippets and pill visual descriptions.
- Family presence coordination ("Who is viewing", "I called Amma" log, read receipts).
- One-click WhatsApp family digest generator.
- Multi-tier Escalation Protocol (Retry 1 at 10m -> Retry 2 at 20m -> Caregiver Alert at 60m).
- Local emergency contact directory.

### 3.2 Out-of-Scope (Future Releases)
- Hardware dispenser integrations.
- In-app payment processing for pharmacy delivery (Phase 2).
- Video camera monitoring or biometric wearable streaming.

---

## 4. Functional Requirements

### 4.1 Daily Reassurance Feed ("Today" Module)
- **FR-1.1 Daily Progress Metric:** The app must display a daily circular progress ring showing confirmed doses versus scheduled doses (e.g., `2/3`).
- **FR-1.2 Real-Time Status Heading:** Dynamic status summary (e.g., "Amma is on track today" vs. "Amma hasn't confirmed her morning dose").
- **FR-1.3 Chronological Timeline:** Dose entries grouped by Morning (8:30 AM), Afternoon (1:30 PM), and Night (9:00 PM).
- **FR-1.4 Dose Status Badges:** Visual status badge on each card:
  - `Taken on time · [Timestamp]`
  - `Scheduled for [Timestamp]`
  - `Not confirmed / Missed`
- **FR-1.5 Physical Pill Identification:** Each dose card must list physical visual attributes (e.g., "Small round white tablet in silver strip") to avoid brand/generic confusion.
- **FR-1.6 Conversational Note Callout:** Natural language summary extracted from Amma’s voice call (e.g., *"Amma confirmed taking sugar medicine after morning tea. Mentioned having puttu for breakfast"*).
- **FR-1.7 Read Receipts:** Display sibling read indicators (e.g., *"Seen by Rahul 8:42 AM · Meera 9:10 AM"*).

### 4.2 Family Presence & Coordination
- **FR-2.1 Active Viewer Indicator:** Avatar initial stack showing which family members have opened the app today.
- **FR-2.2 Call Logger:** Prominent button labeled `"I called Amma"` allowing caregivers to record manual check-ins and update the group timestamp.
- **FR-2.3 WhatsApp Family Digest:**
  - One-tap formatted summary generator ready to paste into family WhatsApp groups.
  - Direct deep link integration (`https://wa.me/?text=...`).

### 4.3 Prescription Catalog ("Medicines" Module)
- **FR-3.1 Prescription Directory:** Full list of active medications, dosages, frequency, and prescribing doctor.
- **FR-3.2 Visual Match Verification:** Pill visual match tags indicating AI model verification (e.g., *"Visual match · Sonnet 5.5"*).

### 4.4 Automated Escalation Protocol ("Escalation" Module)
- **FR-4.1 Failure-to-Answer Trigger:** If the parent does not answer the scheduled automated check-in, initiate the automated retry workflow:
  - *Call 1 (T+0 min):* Initial automated call.
  - *Retry 1 (T+10 min):* Secondary automated retry.
  - *Retry 2 (T+20 min):* Final automated retry.
  - *Family Alert (T+60 min):* Escalate to family dashboard with prominent terracotta alert banner.
- **FR-4.2 One-Touch Emergency Calling:** Instant tap-to-call buttons for:
  - Parent direct line.
  - Primary neighbor (e.g., Sreeja).
  - Family clinic (e.g., Dr. Nair's Clinic).

---

## 5. Non-Functional Requirements

### 5.1 Usability & Accessibility (UI/UX)
- **NFR-1.1 Visual Identity:** Calming, tactile palette using Deep Sage (`#2D5A4C`), Warm Cream (`#F8F7F4`), Soft Sage (`#EBF1EE`), and Terracotta (`#C85A32`).
- **NFR-1.2 Typography:** Strict use of Inter typeface with tabular figures enabled (`font-feature-settings: "tnum" 1`) for clean alignment of times and metrics.
- **NFR-1.3 Haptic & Tactile Feedback:** All actionable elements must provide instant micro-interaction feedback (`scale(0.97)` on active press).

### 5.2 Performance & Reliability
- **NFR-2.1 Load Time:** Screen initial load under 1.2 seconds on 4G mobile connections.
- **NFR-2.2 Voice Call Delivery:** Scheduled automated phone calls must dispatch within ±60 seconds of configured schedule time.

### 5.3 Privacy & Data Governance
- **NFR-3.1 Sensitive Health Data:** Medication regimens and transcribed conversation notes must be encrypted at rest (AES-256) and in transit (TLS 1.3).
- **NFR-3.2 Access Control:** Family circle is invite-only; phone numbers and home addresses are never exposed publicly.

---

## 6. Success Metrics & KPIs

| Metric | Target Goal | Measurement Method |
| :--- | :--- | :--- |
| **Daily Dose Adherence Confirmation** | > 92% confirmed doses within 45 mins | Automated call logs & manual fallback logs |
| **Caregiver Anxiety Reduction** | > 85% positive satisfaction rating | In-app 30-day caregiver sentiment survey |
| **Duplicate Check-in Reduction** | > 60% decrease in duplicate calls | Tracked via "I called Amma" and shared feed usage |
| **Escalation Resolution Time** | < 15 mins from alert trigger to caregiver action | Time elapsed from T+60m alert to outbound tap |

---

## 7. Release Roadmap

- **Milestone 1 (Current):** Interactive prototype and design validation (Ormma web companion feed).
- **Milestone 2:** Voice agent integration (outbound telephony with Malayalam speech synthesis and LLM extraction).
- **Milestone 3:** WhatsApp Business API integration for proactive notification pushes.
- **Milestone 4:** Multi-language support (Hindi, Tamil, Telugu, Kannada) and pharmacy refill integration.
