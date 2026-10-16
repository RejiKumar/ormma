# Spec Delta

## MODIFIED Requirements

### Requirement: parents callPolicy field
The document `parents/{parentId}` SHALL have this field:
- callPolicy: { retryCount: number, retryGapMinutes: number, missedAfterMinutes: number, quietHours: { start: "HH:mm", end: "HH:mm" } }
- The default values are { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60, quietHours: { start: "22:00", end: "06:00" } }. They are per-parent defaults: an owner may change them for one parent (see the parents path rule in `access-control`).

#### Scenario: Call policy values
- **WHEN** a parent is created
- **THEN** callPolicy has the default values { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60, quietHours: { start: "22:00", end: "06:00" } }

#### Scenario: Per-parent call policy
- **WHEN** an owner changes callPolicy for one parent
- **THEN** only that parent's values change and the defaults for other parents are unaffected

### Requirement: members document
The collection `parents/{parentId}/members/{uid}` SHALL have these fields:
- role: "owner" | "editor" | "viewer"
- addedBy: uid
- addedAt: timestamp
- displayName: string (copied by the function at create/invite acceptance; `users/{uid}` stays self-only)

(Document ID = member uid. Rules use this for access checks.)

#### Scenario: Member display name
- **WHEN** the function creates a member document at parent creation or invite acceptance
- **THEN** displayName is copied into it
- **AND** `users/{uid}` stays self-only

#### Scenario: Member document ID
- **WHEN** a member document is created for a user
- **THEN** its document ID equals the member uid

### Requirement: prescriptions document
The collection `parents/{parentId}/prescriptions/{prescriptionId}` SHALL have these fields:
- storagePath: string
- status: "pending_review" | "confirmed" | "rejected"
- extracted: { doctor: string | null, date: string | null, medicines: [{ name: string, doseText: string | null, frequencyText: string | null, times: string[] | null, confidence: number, illegible: boolean }], overallConfidence: number } (the output schema of `prescription-reading`)
- uploadedBy: uid, createdAt: timestamp

#### Scenario: Extracted schema
- **WHEN** a prescription document stores an extraction
- **THEN** `extracted` uses the `prescription-reading` output schema, with nullable doseText, frequencyText and times, illegible per medicine, and overallConfidence

#### Scenario: Prescription status values
- **WHEN** a prescription document is created
- **THEN** its status is one of "pending_review", "confirmed", "rejected"

### Requirement: Retention
The following SHALL hold:
- Raw audio is never stored. Transcripts are stored only when needsReview is true, in Storage under `transcripts/review/`, and deleted when the review is resolved or after 30 days, whichever comes first.
- Deleting a parent deletes all subcollections (Cloud Function using recursive delete).

(See also `data-protection` for the same topics.)

#### Scenario: Transcript retention
- **WHEN** a transcript exists
- **THEN** it exists only because needsReview is true, under `transcripts/review/` in Storage
- **AND** it is deleted when the review is resolved or after 30 days, whichever comes first

#### Scenario: Raw audio
- **WHEN** a call is processed
- **THEN** raw audio is never stored

#### Scenario: Parent deletion
- **WHEN** a parent is deleted
- **THEN** all subcollections are deleted by a Cloud Function using recursive delete

