import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";
import type {
  AlertDoc,
  Consent,
  DoseEventDoc,
  HealthLogDoc,
  MedicineDoc,
  MemberDoc,
  ParentDoc,
  PrescriptionDoc,
  Role,
} from "../../../shared/types";

export const PROJECT_ID = "demo-ormma";
const ROOT = path.resolve(__dirname, "../../..");

export const PARENT = "p1";
export const OTHER_PARENT = "p2";
export const OWNER = "owner1";
export const EDITOR = "editor1";
export const VIEWER = "viewer1";
export const OUTSIDER = "outsider1";

export type Actor = typeof OWNER | typeof EDITOR | typeof VIEWER | typeof OUTSIDER;

export async function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: fs.readFileSync(process.env.RULES_FILE ?? path.join(ROOT, "firestore.rules"), "utf8"),
    },
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: fs.readFileSync(
        process.env.STORAGE_RULES_FILE ?? path.join(ROOT, "storage.rules"),
        "utf8",
      ),
    },
  });
}

/** Authenticated Firestore handle for a uid. */
export const asUser = (env: RulesTestEnvironment, uid: string) =>
  env.authenticatedContext(uid).firestore();

// ---------- time ----------
const BASE = Date.UTC(2026, 9, 1, 0, 0, 0); // 2026-10-01T00:00:00Z
const HOUR = 60 * 60 * 1000;
/** A Firestore Timestamp `h` hours after a fixed base time. */
export const at = (h: number): Timestamp => Timestamp.fromMillis(BASE + h * HOUR);

/** Times used by the consent visibility tests. */
export const T1 = at(100); // first revocation
export const T2 = at(200); // re-grant
export const T3 = at(300); // later (second) revocation

// ---------- document builders ----------
export function consent(over: Partial<Consent> = {}): Consent {
  return {
    status: "granted",
    grantedAt: at(0),
    revokedAt: null,
    regrantedAt: null,
    method: "call_dtmf",
    policyVersion: "v1",
    sharedWith: "all_members",
    ...over,
  };
}

export function parentDoc(over: Partial<ParentDoc> = {}): ParentDoc {
  return {
    name: "Amma",
    phone: "+919876543210",
    language: "ml-IN",
    timezone: "Asia/Kolkata",
    createdBy: OWNER,
    active: true,
    callPolicy: {
      retryCount: 2,
      retryGapMinutes: 10,
      missedAfterMinutes: 60,
      quietHours: { start: "22:00", end: "06:00" },
    },
    consent: consent(),
    createdAt: at(0),
    ...over,
  };
}

export function memberDoc(role: Role, name: string): MemberDoc {
  return { role, addedBy: OWNER, addedAt: at(0), displayName: name };
}

export function medicineDoc(over: Partial<MedicineDoc> = {}): MedicineDoc {
  return {
    name: "Metformin",
    doseText: "1 tablet after food",
    times: ["08:00", "20:00"],
    startDate: "2026-10-01",
    endDate: null,
    active: true,
    source: "manual",
    confirmedByHuman: true,
    prescriptionId: null,
    createdBy: EDITOR,
    createdAt: at(0),
    ...over,
  };
}

export function doseEvent(over: Partial<DoseEventDoc> = {}): DoseEventDoc {
  return {
    medicineId: "m1",
    scheduledFor: at(10),
    status: "pending",
    attempts: 0,
    lastCallSid: null,
    missedAt: null,
    resolvedAt: null,
    resolvedByUid: null,
    resolvedBy: null,
    alertSent: false,
    groupConfirmed: false,
    confirmationNote: null,
    lastCallAt: null,
    reminderAt: null,
    lastDispatchFailure: false,
    ...over,
  };
}

export function healthLog(over: Partial<HealthLogDoc> = {}): HealthLogDoc {
  return {
    type: "note",
    values: { text: "knee pain" },
    source: "family",
    rawTranscriptRef: null,
    needsReview: false,
    createdAt: at(10),
    ...over,
  };
}

export function alertDoc(over: Partial<AlertDoc> = {}): AlertDoc {
  return {
    type: "missed_dose",
    message: "Amma has not confirmed the 8:00 PM tablets. Last attempt at 8:20 PM. Please check.",
    relatedEventId: null,
    createdAt: at(10),
    readBy: [],
    ...over,
  };
}

export function prescriptionDoc(over: Partial<PrescriptionDoc> = {}): PrescriptionDoc {
  return {
    storagePath: `prescriptions/${PARENT}/rx1.jpg`,
    status: "pending_review",
    extracted: null,
    uploadedBy: EDITOR,
    createdAt: at(0),
    ...over,
  };
}

// ---------- seeding (rules disabled) ----------
export interface SeedOptions {
  /** Consent map of parent p1. */
  consent?: Consent;
  /** Roles that exist as members of p1. Default: owner, editor, viewer. */
  members?: Partial<Record<Actor, Role>>;
}

/** Parent p1 with an owner, an editor and a viewer; outsider owns a separate parent p2. */
export async function seed(env: RulesTestEnvironment, opts: SeedOptions = {}): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `parents/${PARENT}`), parentDoc({ consent: opts.consent ?? consent() }));
    const members = opts.members ?? { [OWNER]: "owner", [EDITOR]: "editor", [VIEWER]: "viewer" };
    for (const [uid, role] of Object.entries(members)) {
      await setDoc(doc(db, `parents/${PARENT}/members/${uid}`), memberDoc(role, uid));
    }
    await setDoc(doc(db, `parents/${OTHER_PARENT}`), parentDoc({ createdBy: OUTSIDER }));
    await setDoc(
      doc(db, `parents/${OTHER_PARENT}/members/${OUTSIDER}`),
      memberDoc("owner", OUTSIDER),
    );
    await setDoc(doc(db, `users/${OWNER}`), {
      displayName: "Owner",
      phone: "+919800000001",
      fcmTokens: [],
      createdAt: at(0),
    });
  });
}

/** Write documents with rules disabled. `entries` are [path, data]. */
export async function put(
  env: RulesTestEnvironment,
  entries: Array<[string, object]>,
): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [p, data] of entries) await setDoc(doc(db, p), data);
  });
}
