import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import type { UserDoc } from "../../../shared/types";

// FCM boundary for family alerts. Tokens live in users/{uid}.fcmTokens; invalid tokens are removed
// from every user that holds them. Logs carry ids and counts only.

export const FCM_MULTICAST_LIMIT = 500;

export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface PushResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}

export interface PushSender {
  sendMulticast(tokens: string[], message: PushMessage): Promise<PushResult>;
}

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

export function isInvalidTokenError(code: string | undefined): boolean {
  return code !== undefined && INVALID_TOKEN_CODES.has(code);
}

export function chunkTokens(tokens: string[], size = FCM_MULTICAST_LIMIT): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += size) chunks.push(tokens.slice(i, i + size));
  return chunks;
}

export class AdminPushSender implements PushSender {
  async sendMulticast(tokens: string[], message: PushMessage): Promise<PushResult> {
    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    for (const chunk of chunkTokens(tokens)) {
      const response = await getMessaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title: message.title, body: message.body },
        data: message.data,
      });
      successCount += response.successCount;
      failureCount += response.failureCount;
      response.responses.forEach((result, index) => {
        if (!result.success && isInvalidTokenError(result.error?.code)) {
          invalidTokens.push(chunk[index]);
        }
      });
    }

    return { successCount, failureCount, invalidTokens };
  }
}

export interface MemberTokens {
  /** Tokens to send to, de-duplicated. */
  tokens: string[];
  /** Token -> the users that hold it, for pruning. */
  owners: Map<string, string[]>;
}

/** Reads the parent's member documents and each member's user document. */
export async function resolveMemberTokens(db: Firestore, parentId: string): Promise<MemberTokens> {
  const membersSnap = await db.collection(`parents/${parentId}/members`).get();
  const owners = new Map<string, string[]>();

  for (const member of membersSnap.docs) {
    const userSnap = await db.doc(`users/${member.id}`).get();
    if (!userSnap.exists) continue;
    const data = userSnap.data() as UserDoc | undefined;
    const tokens = Array.isArray(data?.fcmTokens) ? data.fcmTokens : [];
    for (const token of tokens) {
      if (typeof token !== "string" || token.length === 0) continue;
      const uids = owners.get(token) ?? [];
      if (!uids.includes(member.id)) uids.push(member.id);
      owners.set(token, uids);
    }
  }

  return { tokens: [...owners.keys()], owners };
}

/** Removes invalid tokens from the user documents that hold them. */
export async function pruneInvalidTokens(
  db: Firestore,
  invalidTokens: string[],
  owners: Map<string, string[]>,
): Promise<number> {
  const byUid = new Map<string, string[]>();
  for (const token of invalidTokens) {
    for (const uid of owners.get(token) ?? []) {
      const tokens = byUid.get(uid) ?? [];
      tokens.push(token);
      byUid.set(uid, tokens);
    }
  }

  let removed = 0;
  for (const [uid, tokens] of byUid) {
    await db.doc(`users/${uid}`).update({ fcmTokens: FieldValue.arrayRemove(...tokens) });
    removed += tokens.length;
  }
  return removed;
}

export interface DeliverPushResult {
  tokens: number;
  sent: number;
  failed: number;
  removedTokens: number;
}

/** Sends one alert to every member of the parent. Never throws for an empty token list. */
export async function deliverAlertPush(
  db: Firestore,
  parentId: string,
  message: PushMessage,
  sender: PushSender,
): Promise<DeliverPushResult> {
  const { tokens, owners } = await resolveMemberTokens(db, parentId);
  if (tokens.length === 0) {
    console.info("alerts: no push tokens", { parentId });
    return { tokens: 0, sent: 0, failed: 0, removedTokens: 0 };
  }

  const result = await sender.sendMulticast(tokens, message);
  const removedTokens = await pruneInvalidTokens(db, result.invalidTokens, owners);
  console.info("alerts: push complete", {
    parentId,
    tokens: tokens.length,
    sent: result.successCount,
    failed: result.failureCount,
    removedTokens,
  });
  return {
    tokens: tokens.length,
    sent: result.successCount,
    failed: result.failureCount,
    removedTokens,
  };
}
