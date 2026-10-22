import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import type { InviteDoc, MemberDoc, Role, UserDoc } from "../../shared/types";
import { getDb } from "./db";
import {
  DEFAULT_INVITE_TTL_DAYS,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  MAX_INVITE_TTL_DAYS,
  generateInviteCode,
  resolveMemberDisplayName,
} from "./validation";

export interface CreateInvitePayload {
  parentId: string;
  role: string;
  ttlDays?: number;
}

export interface RedeemInvitePayload {
  code: string;
}

function isAlreadyExists(error: unknown): boolean {
  const code = (error as { code?: number | string } | null)?.code;
  return code === 6 || code === "already-exists";
}

export async function createInviteHandler(
  request: CallableRequest<CreateInvitePayload>,
  codeGen: () => string = generateInviteCode,
): Promise<{ code: string; expiresAt: string }> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const { parentId, role, ttlDays } = request.data ?? ({} as CreateInvitePayload);
  if (typeof parentId !== "string" || parentId.length === 0) {
    throw new HttpsError("invalid-argument", "parentId is required.");
  }
  if (role !== "editor" && role !== "viewer") {
    throw new HttpsError("invalid-argument", "role must be editor or viewer.");
  }
  let ttl = DEFAULT_INVITE_TTL_DAYS;
  if (ttlDays !== undefined && ttlDays !== null) {
    if (
      typeof ttlDays !== "number" ||
      !Number.isInteger(ttlDays) ||
      ttlDays < 1 ||
      ttlDays > MAX_INVITE_TTL_DAYS
    ) {
      throw new HttpsError("invalid-argument", "ttlDays must be an integer between 1 and 7.");
    }
    ttl = ttlDays;
  }

  const db = getDb();
  const parentSnap = await db.doc(`parents/${parentId}`).get();
  if (!parentSnap.exists) throw new HttpsError("not-found", "Parent not found.");

  const memberSnap = await db.doc(`parents/${parentId}/members/${uid}`).get();
  if ((memberSnap.data() as MemberDoc | undefined)?.role !== "owner") {
    throw new HttpsError("permission-denied", "Only the owner can create invites.");
  }

  const expiresAt = Timestamp.fromMillis(Date.now() + ttl * 24 * 60 * 60 * 1000);
  const invite: InviteDoc = {
    parentId,
    role: role as Role,
    createdBy: uid,
    expiresAt,
    usedBy: null,
  };

  let code = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = codeGen();
    try {
      await db.doc(`invites/${candidate}`).create(invite);
      code = candidate;
      break;
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
    }
  }
  if (!code) throw new HttpsError("internal", "Could not allocate an invite code.");

  console.log(
    `createInvite ok uid=${uid} parentId=${parentId} role=${role} status=created code=${code}`,
  );
  return { code, expiresAt: expiresAt.toDate().toISOString() };
}

export async function redeemInviteHandler(
  request: CallableRequest<RedeemInvitePayload>,
): Promise<{ parentId: string; role: Role }> {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const rawCode = request.data?.code;
  if (typeof rawCode !== "string") {
    throw new HttpsError("invalid-argument", "code is required.");
  }
  const code = rawCode.trim().toUpperCase();
  if (
    code.length !== INVITE_CODE_LENGTH ||
    [...code].some((ch) => !INVITE_CODE_ALPHABET.includes(ch))
  ) {
    throw new HttpsError("invalid-argument", "Invite code is not in the expected format.");
  }

  const db = getDb();
  const result = await db.runTransaction(async (tx) => {
    const inviteRef = db.doc(`invites/${code}`);
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists) throw new HttpsError("not-found", "This invite code is not valid.");
    const invite = inviteSnap.data() as InviteDoc;
    if (invite.usedBy !== null) {
      throw new HttpsError("failed-precondition", "This invite code was already used.");
    }
    if (invite.expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError("failed-precondition", "This invite code has expired.");
    }

    const memberRef = db.doc(`parents/${invite.parentId}/members/${uid}`);
    const memberSnap = await tx.get(memberRef);
    if (memberSnap.exists) {
      throw new HttpsError("failed-precondition", "You are already a member of this family.");
    }

    const userSnap = await tx.get(db.doc(`users/${uid}`));
    const user = userSnap.data() as UserDoc | undefined;
    const tokenPhone = (request.auth?.token as { phone_number?: unknown } | undefined)
      ?.phone_number;
    const displayName = resolveMemberDisplayName(user, tokenPhone);

    tx.update(inviteRef, { usedBy: uid });
    const member: MemberDoc = {
      role: invite.role,
      addedBy: invite.createdBy,
      addedAt: Timestamp.now(),
      displayName,
    };
    tx.set(memberRef, member);
    return { parentId: invite.parentId, role: invite.role };
  });

  console.log(
    `redeemInvite ok uid=${uid} parentId=${result.parentId} role=${result.role} code=${code} status=redeemed`,
  );
  return result;
}
