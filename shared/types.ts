// Types only. No runtime exports: mobile/ and functions/ consume this with `import type`.
// Source of truth: openspec/specs/data-model/spec.md (as reconciled by decisions #3, #6, #32).

/**
 * Minimal structural Firestore Timestamp. Both the Admin SDK and the client SDK Timestamp
 * classes satisfy it, so `shared/` needs no SDK import. All timestamps are UTC.
 */
export interface Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

/** Phone number in E.164 format, for example "+919876543210". */
export type E164Phone = string;

/** Firebase Auth uid. */
export type Uid = string;

// ---------- enums ----------
export type Language = "ml-IN" | "ta-IN" | "hi-IN" | "en-IN";
export type Role = "owner" | "editor" | "viewer";
export type ConsentStatus = "pending" | "granted" | "revoked";
export type ConsentMethod = "call_voice" | "call_dtmf" | "family_attested";
export type MedicineSource = "manual" | "prescription_scan";
export type DoseStatus =
  "pending" | "calling" | "taken" | "not_taken" | "no_answer" | "unclear" | "missed";
export type ResolvedBy = "dtmf" | "voice" | "family";
export type HealthLogType = "bp" | "sugar" | "symptom" | "note";
export type HealthLogSource = "voice" | "family" | "prescription_scan";
export type CallSessionStatus = "initiated" | "answered" | "completed" | "failed" | "no_answer";
export type PrescriptionStatus = "pending_review" | "confirmed" | "rejected";
export type AlertType =
  "missed_dose" | "unclear_reply" | "no_answer" | "trend_flag" | "weekly_summary";

// ---------- users/{uid} ----------
/** Family members only. Parents do not have accounts in v1; they are reached by phone. */
export interface UserDoc {
  displayName: string;
  phone: E164Phone;
  fcmTokens: string[];
  createdAt: Timestamp;
}

// ---------- parents/{parentId} ----------
export interface QuietHours {
  /** "HH:mm" in the parent's timezone. */
  start: string;
  /** "HH:mm" in the parent's timezone. */
  end: string;
}

/** Per-parent values. Defaults: retryCount 2, retryGapMinutes 10, missedAfterMinutes 60, quiet hours 22:00 to 06:00. */
export interface CallPolicy {
  retryCount: number;
  retryGapMinutes: number;
  missedAfterMinutes: number;
  quietHours: QuietHours;
}

export interface Consent {
  status: ConsentStatus;
  grantedAt: Timestamp | null;
  /** Set at the FIRST revocation and never overwritten; used by the visibility rule. */
  revokedAt: Timestamp | null;
  /** Set when consent is granted again after a revocation; cleared on a further revocation. */
  regrantedAt: Timestamp | null;
  method: ConsentMethod | null;
  policyVersion: string | null;
  sharedWith: "all_members";
}

export interface ParentDoc {
  name: string;
  phone: E164Phone;
  language: Language;
  /** Default "Asia/Kolkata". */
  timezone: string;
  createdBy: Uid;
  active: boolean;
  callPolicy: CallPolicy;
  consent: Consent;
  createdAt: Timestamp;
}

// ---------- parents/{parentId}/members/{uid} (document ID = member uid) ----------
export interface MemberDoc {
  role: Role;
  addedBy: Uid;
  addedAt: Timestamp;
  /** Copied by the function at create/invite acceptance; users/{uid} stays self-only. */
  displayName: string;
}

// ---------- parents/{parentId}/medicines/{medicineId} ----------
export interface MedicineDoc {
  /** As printed on the prescription. */
  name: string;
  /** Free text, never interpreted by AI. */
  doseText: string;
  /** "HH:mm" local times. */
  times: string[];
  /** Date string "YYYY-MM-DD". */
  startDate: string;
  endDate: string | null;
  active: boolean;
  source: MedicineSource;
  /** Must be true before scheduling calls. */
  confirmedByHuman: boolean;
  prescriptionId: string | null;
  createdBy: Uid;
  createdAt: Timestamp;
}

// ---------- parents/{parentId}/doseEvents/{eventId} ----------
/** eventId = `${medicineId}_${yyyyMMddHHmm}` (deterministic, for idempotency). */
export interface DoseEventDoc {
  medicineId: string;
  scheduledFor: Timestamp;
  status: DoseStatus;
  attempts: number;
  lastCallSid: string | null;
  /** Set once when the event goes missed; never cleared, even after a family override to taken. */
  missedAt: Timestamp | null;
  resolvedAt: Timestamp | null;
  /** Uid of the family member who resolved it in the app; null when resolved by dtmf or voice. */
  resolvedByUid: Uid | null;
  resolvedBy: ResolvedBy | null;
  alertSent: boolean;
  /** True only when resolved by a grouped call. */
  groupConfirmed: boolean;
  /** Server-written by reply structuring: one short factual sentence in the family's language; null on the review path. Clients may not write it. */
  confirmationNote: string | null;
}

// ---------- parents/{parentId}/healthLogs/{logId} ----------
export interface BloodPressureValues {
  systolic: number;
  diastolic: number;
}
export interface TextValues {
  text: string;
}
export type HealthLogValues = BloodPressureValues | TextValues | Record<string, unknown>;

export interface HealthLogDoc {
  type: HealthLogType;
  values: HealthLogValues;
  source: HealthLogSource;
  /** Path in Storage, NOT inline text. */
  rawTranscriptRef: string | null;
  needsReview: boolean;
  createdAt: Timestamp;
}

// ---------- parents/{parentId}/callSessions/{sessionId} (server-write only) ----------
export interface CallSessionDoc {
  callSid: string;
  /** One entry for a single-medicine call, several for a grouped call. */
  doseEventIds: string[];
  status: CallSessionStatus;
  dtmfInput: string | null;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
}

// ---------- parents/{parentId}/prescriptions/{prescriptionId} ----------
/** One medicine in the prescription-reading output schema. */
export interface ExtractedMedicine {
  name: string;
  doseText: string | null;
  frequencyText: string | null;
  times: string[] | null;
  confidence: number;
  illegible: boolean;
}

export interface ExtractedPrescription {
  doctor: string | null;
  date: string | null;
  medicines: ExtractedMedicine[];
  overallConfidence: number;
}

export interface PrescriptionDoc {
  storagePath: string;
  status: PrescriptionStatus;
  extracted: ExtractedPrescription | null;
  uploadedBy: Uid;
  createdAt: Timestamp;
}

// ---------- parents/{parentId}/alerts/{alertId} ----------
export interface AlertDoc {
  type: AlertType;
  /** Template text; contains no raw health values beyond what the family needs. */
  message: string;
  relatedEventId: string | null;
  createdAt: Timestamp;
  readBy: Uid[];
}

// ---------- invites/{code} (server-only) ----------
export interface InviteDoc {
  parentId: string;
  role: Role;
  createdBy: Uid;
  expiresAt: Timestamp;
  usedBy: Uid | null;
}

// ---------- auditLogs/{id} (server-only) ----------
export interface AuditLogDoc {
  actor: Uid | "system";
  action: string;
  parentId: string;
  at: Timestamp;
}
