import { Timestamp } from "firebase-admin/firestore";
import { assertCanCreateParent } from "./subscription/limits";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import type { Consent, MemberDoc, ParentDoc, UserDoc } from "../../shared/types";
import { getDb } from "./db";
import {
  isSupportedLanguage,
  isValidE164,
  isValidName,
  resolveMemberDisplayName,
} from "./validation";

// Per-parent defaults, from the data-model spec (decision #32).
export const DEFAULT_CALL_POLICY: ParentDoc["callPolicy"] = {
  retryCount: 2,
  retryGapMinutes: 10,
  missedAfterMinutes: 60,
  quietHours: { start: "22:00", end: "06:00" },
};

export interface CreateParentPayload {
  name: string;
  phone: string;
  language: string;
}

export async function createParentHandler(
  request: CallableRequest<CreateParentPayload>,
): Promise<{ parentId: string }> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { name, phone, language } = request.data ?? ({} as CreateParentPayload);
  if (!isValidName(name)) {
    throw new HttpsError(
      "invalid-argument",
      "A non-empty name of at most 100 characters is required.",
    );
  }
  if (!isValidE164(phone)) {
    throw new HttpsError("invalid-argument", "phone must be in E.164 format.");
  }
  if (!isSupportedLanguage(language)) {
    throw new HttpsError("invalid-argument", "Unsupported language.");
  }

  await assertCanCreateParent(uid);
  const db = getDb();
  const userSnap = await db.doc(`users/${uid}`).get();
  const user = userSnap.data() as UserDoc | undefined;
  const tokenPhone = (request.auth?.token as { phone_number?: unknown } | undefined)?.phone_number;
  const displayName = resolveMemberDisplayName(user, tokenPhone);

  const consent: Consent = {
    status: "pending",
    grantedAt: null,
    revokedAt: null,
    regrantedAt: null,
    method: null,
    policyVersion: null,
    sharedWith: "all_members",
  };

  const parentRef = db.collection("parents").doc();
  const parent: ParentDoc = {
    name: name.trim(),
    phone,
    language,
    timezone: "Asia/Kolkata",
    createdBy: uid,
    active: true,
    callPolicy: DEFAULT_CALL_POLICY,
    consent,
    createdAt: Timestamp.now(),
  };
  const member: MemberDoc = {
    role: "owner",
    addedBy: uid,
    addedAt: Timestamp.now(),
    displayName,
  };

  const batch = db.batch();
  batch.set(parentRef, parent);
  batch.set(parentRef.collection("members").doc(uid), member);
  await batch.commit();

  console.log(`createParent ok uid=${uid} parentId=${parentRef.id} status=created`);
  return { parentId: parentRef.id };
}

export interface ListMyParentsResult {
  parentIds: string[];
}

/**
 * Parent ids the caller is a member of. The ids are device-local for offline-first privacy, so a
 * reinstall or a new phone would otherwise lose the family list; the app merges this result back
 * into local storage on startup.
 */
export async function listMyParentsHandler(request: CallableRequest): Promise<ListMyParentsResult> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const db = getDb();
  const parents = await db.collection("parents").get();
  const memberSnaps = await db.getAll(
    ...parents.docs.map((parent) => db.doc(`parents/${parent.id}/members/${uid}`)),
  );
  const parentIds = parents.docs.filter((_, index) => memberSnaps[index]?.exists).map((d) => d.id);
  return { parentIds };
}
