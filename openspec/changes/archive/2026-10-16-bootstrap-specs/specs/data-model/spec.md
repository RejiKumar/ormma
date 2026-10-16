# Spec Delta

## Purpose

Defines the Firestore collections, their fields, the indexes needed and the retention rules for Ormma. Migrated verbatim from specs/01-data-model.md (status: draft v1).

## ADDED Requirements

### Requirement: Timestamps and display timezone
The following SHALL hold: All timestamps are Firestore Timestamps in UTC. Display timezone is Asia/Kolkata unless a parent overrides.

#### Scenario: Timestamp storage
- **WHEN** a timestamp is stored in any collection
- **THEN** it is a Firestore Timestamp in UTC
- **AND** the display timezone is Asia/Kolkata unless a parent overrides

### Requirement: users document
The collection `users/{uid}` SHALL have these fields:
- displayName: string
- phone: string (E.164)
- fcmTokens: string[]
- createdAt: timestamp

(Family members only. Parents do not have accounts in v1; they are reached by phone.)

#### Scenario: User document shape
- **WHEN** a family member's user document is created
- **THEN** it has displayName, phone in E.164 format, fcmTokens and createdAt
- **AND** parents do not have accounts in v1

### Requirement: parents document fields
The collection `parents/{parentId}` SHALL have these fields:
- name: string
- phone: string (E.164)
- language: "ml-IN" | "ta-IN" | "hi-IN" | "en-IN"
- timezone: string (default "Asia/Kolkata")
- createdBy: uid
- active: boolean
- createdAt: timestamp

#### Scenario: Parent identity fields
- **WHEN** a parent document is created
- **THEN** its phone is in E.164 format and its language is one of "ml-IN", "ta-IN", "hi-IN", "en-IN"
- **AND** its timezone defaults to "Asia/Kolkata"

### Requirement: parents callPolicy field
The document `parents/{parentId}` SHALL have this field:
- callPolicy: { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60, quietHours: { start: "22:00", end: "06:00" } }

#### Scenario: Call policy values
- **WHEN** a parent document is read
- **THEN** callPolicy is { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60, quietHours: { start: "22:00", end: "06:00" } }

### Requirement: parents consent field
The document `parents/{parentId}` SHALL have this field:
- consent: { status: "pending" | "granted" | "revoked", grantedAt, revokedAt: timestamp | null (set at the FIRST revocation and never overwritten; used by the visibility rule in spec 02), regrantedAt: timestamp | null (set when consent is granted again after a revocation; cleared on a further revocation. v1 limitation: only one revoke and re-grant cycle is modelled, see spec 02), method: "call_voice" | "call_dtmf" | "family_attested", policyVersion: string, sharedWith: "all_members" }

(Where this text says "spec 02", it refers to the capability `access-control`.)

#### Scenario: First revocation timestamp
- **WHEN** consent is revoked for the first time
- **THEN** consent.revokedAt is set
- **AND** consent.revokedAt is never overwritten afterwards

#### Scenario: Re-grant timestamp
- **WHEN** consent is granted again after a revocation
- **THEN** consent.regrantedAt is set
- **AND** it is cleared on a further revocation

### Requirement: members document
The collection `parents/{parentId}/members/{uid}` SHALL have these fields:
- role: "owner" | "editor" | "viewer"
- addedBy: uid
- addedAt: timestamp

(Document ID = member uid. Rules use this for access checks.)

#### Scenario: Member document ID
- **WHEN** a member document is created for a user
- **THEN** its document ID equals the member uid

### Requirement: medicines document identity and schedule fields
The collection `parents/{parentId}/medicines/{medicineId}` SHALL have these fields:
- name: string (as printed on the prescription)
- doseText: string (free text, e.g. "1 tablet after food"; never interpreted by AI)
- times: string[] (HH:mm local, e.g. ["08:00","20:00"])
- startDate: date string, endDate: date string | null
- active: boolean

#### Scenario: doseText is never interpreted
- **WHEN** a medicine's doseText is stored
- **THEN** it is free text, never interpreted by AI

### Requirement: medicines document source and confirmation fields
The collection `parents/{parentId}/medicines/{medicineId}` SHALL also have these fields:
- source: "manual" | "prescription_scan"
- confirmedByHuman: boolean (must be true before scheduling calls)
- prescriptionId: string | null
- createdBy: uid, createdAt: timestamp

#### Scenario: Scheduling needs human confirmation
- **WHEN** a medicine has confirmedByHuman not true
- **THEN** calls are not scheduled for it

### Requirement: doseEvents identity and status fields
The collection `parents/{parentId}/doseEvents/{eventId}` SHALL have these fields:
- eventId = `${medicineId}_${yyyyMMddHHmm}` (deterministic, for idempotency)
- medicineId: string
- scheduledFor: timestamp
- status: "pending" | "calling" | "taken" | "not_taken" | "no_answer" | "unclear" | "missed"
- attempts: number
- lastCallSid: string | null

#### Scenario: Deterministic event ID
- **WHEN** a doseEvent is created for a medicine and time
- **THEN** its eventId is `${medicineId}_${yyyyMMddHHmm}`

### Requirement: doseEvents resolution fields
The collection `parents/{parentId}/doseEvents/{eventId}` SHALL also have these fields:
- missedAt: timestamp | null (set once when the event goes missed; never cleared, even after a family override to taken)
- resolvedAt: timestamp | null
- resolvedByUid: string | null (uid of the family member who resolved it in the app, including a missed -> taken override; null when resolved by dtmf or voice. Rules require it to equal request.auth.uid.)
- resolvedBy: "dtmf" | "voice" | "family" | null

#### Scenario: missedAt survives an override
- **WHEN** an event goes missed and a family member later overrides it to taken
- **THEN** missedAt was set once when it went missed
- **AND** missedAt is not cleared

#### Scenario: resolvedByUid values
- **WHEN** an event is resolved by dtmf or voice
- **THEN** resolvedByUid is null

### Requirement: doseEvents flag fields
The collection `parents/{parentId}/doseEvents/{eventId}` SHALL also have these fields:
- alertSent: boolean
- groupConfirmed: boolean (true only when resolved by a grouped call; see spec 03 "Grouped calls")

(Where this text says "spec 03 'Grouped calls'", it refers to the capability `grouped-calls`.)

#### Scenario: groupConfirmed
- **WHEN** an event is resolved by a grouped call
- **THEN** groupConfirmed is true
- **AND** it is true only in that case

### Requirement: healthLogs document
The collection `parents/{parentId}/healthLogs/{logId}` SHALL have these fields:
- type: "bp" | "sugar" | "symptom" | "note"
- values: map (e.g. { systolic: 150, diastolic: 90 } or { text: "knee pain" })
- source: "voice" | "family" | "prescription_scan"
- rawTranscriptRef: string | null (path in Storage, NOT inline text)
- needsReview: boolean
- createdAt: timestamp

#### Scenario: Transcript is a reference
- **WHEN** rawTranscriptRef is set
- **THEN** it holds a path in Storage, not inline text

### Requirement: callSessions document
The collection `parents/{parentId}/callSessions/{sessionId}` SHALL have these fields:
- callSid: string
- doseEventIds: string[] (one entry for a single-medicine call, several for a grouped call)
- status: "initiated" | "answered" | "completed" | "failed" | "no_answer"
- dtmfInput: string | null
- startedAt, endedAt: timestamp
- (Server-write only.)

#### Scenario: doseEventIds
- **WHEN** a call covers one medicine
- **THEN** doseEventIds has one entry
- **AND** a grouped call has several

### Requirement: prescriptions document
The collection `parents/{parentId}/prescriptions/{prescriptionId}` SHALL have these fields:
- storagePath: string
- status: "pending_review" | "confirmed" | "rejected"
- extracted: { medicines: [{ name, doseText, times[], confidence }], doctor: string|null, date: string|null }
- uploadedBy: uid, createdAt: timestamp

#### Scenario: Prescription status values
- **WHEN** a prescription document is created
- **THEN** its status is one of "pending_review", "confirmed", "rejected"

### Requirement: alerts document
The collection `parents/{parentId}/alerts/{alertId}` SHALL have these fields:
- type: "missed_dose" | "unclear_reply" | "no_answer" | "trend_flag" | "weekly_summary"
- message: string (template text; contains no raw health values beyond what the family needs)
- relatedEventId: string | null
- createdAt: timestamp
- readBy: uid[]

#### Scenario: Alert message content
- **WHEN** an alert is written
- **THEN** its message is template text that contains no raw health values beyond what the family needs

### Requirement: invites document
The collection `invites/{code}` SHALL have these fields:
- parentId, role, createdBy, expiresAt, usedBy: uid | null

#### Scenario: Unused invite
- **WHEN** an invites document is read
- **THEN** usedBy is a uid or null

### Requirement: auditLogs document
The collection `auditLogs/{id}` (server-write only) SHALL have these fields:
- actor: uid | "system", action: string, parentId: string, at: timestamp

#### Scenario: System actor
- **WHEN** an auditLogs document is read
- **THEN** actor is a uid or "system"

### Requirement: Indexes
The following indexes SHALL be provided:
- doseEvents: (status, scheduledFor) for the dispatcher
- healthLogs: (type, createdAt desc)
- alerts: (createdAt desc)

#### Scenario: Dispatcher index
- **WHEN** the dispatcher queries doseEvents by status and scheduledFor
- **THEN** the index (status, scheduledFor) exists

### Requirement: Retention
The following SHALL hold:
- Raw audio is never stored. Transcripts stored only in Storage with a 30-day lifecycle rule, unless needsReview is true.
- Deleting a parent deletes all subcollections (Cloud Function using recursive delete).

(See also `data-protection` for the same topics.)

#### Scenario: Raw audio
- **WHEN** a call is processed
- **THEN** raw audio is never stored

#### Scenario: Parent deletion
- **WHEN** a parent is deleted
- **THEN** all subcollections are deleted by a Cloud Function using recursive delete
