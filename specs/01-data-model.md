# Spec 01: Data Model (Firestore)

Status: draft v1. All timestamps are Firestore Timestamps in UTC. Display timezone is Asia/Kolkata unless a parent overrides.

## Collections

### users/{uid}
- displayName: string
- phone: string (E.164)
- fcmTokens: string[]
- createdAt: timestamp
(Family members only. Parents do not have accounts in v1; they are reached by phone.)

### parents/{parentId}
- name: string
- phone: string (E.164)
- language: "ml-IN" | "ta-IN" | "hi-IN" | "en-IN"
- timezone: string (default "Asia/Kolkata")
- createdBy: uid
- active: boolean
- callPolicy: { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60, quietHours: { start: "22:00", end: "06:00" } }
- consent: { status: "pending" | "granted" | "revoked", grantedAt, method: "call_voice" | "call_dtmf" | "family_attested", policyVersion: string, sharedWith: "all_members" }
- createdAt: timestamp

### parents/{parentId}/members/{uid}
- role: "owner" | "editor" | "viewer"
- addedBy: uid
- addedAt: timestamp
(Document ID = member uid. Rules use this for access checks.)

### parents/{parentId}/medicines/{medicineId}
- name: string (as printed on the prescription)
- doseText: string (free text, e.g. "1 tablet after food"; never interpreted by AI)
- times: string[] (HH:mm local, e.g. ["08:00","20:00"])
- startDate: date string, endDate: date string | null
- active: boolean
- source: "manual" | "prescription_scan"
- confirmedByHuman: boolean (must be true before scheduling calls)
- prescriptionId: string | null
- createdBy: uid, createdAt: timestamp

### parents/{parentId}/doseEvents/{eventId}
- eventId = `${medicineId}_${yyyyMMddHHmm}` (deterministic, for idempotency)
- medicineId: string
- scheduledFor: timestamp
- status: "pending" | "calling" | "taken" | "not_taken" | "no_answer" | "unclear" | "missed"
- attempts: number
- lastCallSid: string | null
- resolvedAt: timestamp | null
- resolvedBy: "dtmf" | "voice" | "family" | null
- alertSent: boolean

### parents/{parentId}/healthLogs/{logId}
- type: "bp" | "sugar" | "symptom" | "note"
- values: map (e.g. { systolic: 150, diastolic: 90 } or { text: "knee pain" })
- source: "voice" | "family" | "prescription_scan"
- rawTranscriptRef: string | null (path in Storage, NOT inline text)
- needsReview: boolean
- createdAt: timestamp

### parents/{parentId}/callSessions/{sessionId}
- callSid: string
- doseEventId: string | null
- status: "initiated" | "answered" | "completed" | "failed" | "no_answer"
- dtmfInput: string | null
- startedAt, endedAt: timestamp
- (Server-write only.)

### parents/{parentId}/prescriptions/{prescriptionId}
- storagePath: string
- status: "pending_review" | "confirmed" | "rejected"
- extracted: { medicines: [{ name, doseText, times[], confidence }], doctor: string|null, date: string|null }
- uploadedBy: uid, createdAt: timestamp

### parents/{parentId}/alerts/{alertId}
- type: "missed_dose" | "unclear_reply" | "no_answer" | "trend_flag" | "weekly_summary"
- message: string (template text; contains no raw health values beyond what the family needs)
- relatedEventId: string | null
- createdAt: timestamp
- readBy: uid[]

### invites/{code}
- parentId, role, createdBy, expiresAt, usedBy: uid | null

### auditLogs/{id}  (server-write only)
- actor: uid | "system", action: string, parentId: string, at: timestamp

## Indexes needed
- doseEvents: (status, scheduledFor) for the dispatcher
- healthLogs: (type, createdAt desc)
- alerts: (createdAt desc)

## Retention
- Raw audio is never stored. Transcripts stored only in Storage with a 30-day lifecycle rule, unless needsReview is true.
- Deleting a parent deletes all subcollections (Cloud Function using recursive delete).
