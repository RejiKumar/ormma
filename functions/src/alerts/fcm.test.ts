import type { Firestore } from "firebase-admin/firestore";
import {
  chunkTokens,
  deliverAlertPush,
  isInvalidTokenError,
  type PushResult,
  type PushSender,
} from "./fcm";

describe("invalid token classification", () => {
  it("recognises the FCM codes that mean the token is gone", () => {
    expect(isInvalidTokenError("messaging/registration-token-not-registered")).toBe(true);
    expect(isInvalidTokenError("messaging/invalid-registration-token")).toBe(true);
    expect(isInvalidTokenError("messaging/invalid-argument")).toBe(true);
    expect(isInvalidTokenError("messaging/server-unavailable")).toBe(false);
    expect(isInvalidTokenError(undefined)).toBe(false);
  });

  it("chunks multicast batches at 500 tokens", () => {
    const tokens = Array.from({ length: 1201 }, (_, i) => `t${i}`);
    expect(chunkTokens(tokens).map((chunk) => chunk.length)).toEqual([500, 500, 201]);
  });
});

interface FakeDb {
  db: Firestore;
  updates: Array<{ path: string; data: Record<string, unknown> }>;
}

function fakeDb(tokensByUid: Record<string, string[]>): FakeDb {
  const updates: Array<{ path: string; data: Record<string, unknown> }> = [];
  const db = {
    collection: (path: string) => ({
      get: async () => ({
        docs: Object.keys(tokensByUid).map((uid) => ({ id: uid, ref: { path: `${path}/${uid}` } })),
      }),
    }),
    doc: (path: string) => {
      const uid = path.split("/")[1];
      return {
        get: async () => ({
          exists: tokensByUid[uid] !== undefined,
          data: () => ({ fcmTokens: tokensByUid[uid] ?? [] }),
        }),
        update: async (data: Record<string, unknown>) => {
          updates.push({ path, data });
        },
      };
    },
  };
  return { db: db as unknown as Firestore, updates };
}

const sender = (result: PushResult): PushSender & { sendMulticast: jest.Mock } => ({
  sendMulticast: jest.fn().mockResolvedValue(result),
});

describe("deliverAlertPush", () => {
  it("sends to every member token once and prunes invalid tokens from their owners", async () => {
    const { db, updates } = fakeDb({ u1: ["t1", "shared"], u2: ["t2", "shared"] });
    const push = sender({ successCount: 2, failureCount: 1, invalidTokens: ["shared"] });

    const result = await deliverAlertPush(
      db,
      "p1",
      { title: "Missed dose", body: "Amma has not confirmed.", data: { type: "missed_dose" } },
      push,
    );

    expect(push.sendMulticast).toHaveBeenCalledTimes(1);
    expect(push.sendMulticast.mock.calls[0][0].sort()).toEqual(["shared", "t1", "t2"]);
    expect(result).toMatchObject({ tokens: 3, sent: 2, failed: 1, removedTokens: 2 });
    expect(updates.map((update) => update.path).sort()).toEqual(["users/u1", "users/u2"]);
  });

  it("does not call the sender when no member has a token", async () => {
    const { db } = fakeDb({ u1: [] });
    const push = sender({ successCount: 0, failureCount: 0, invalidTokens: [] });

    const result = await deliverAlertPush(db, "p1", { title: "t", body: "b", data: {} }, push);

    expect(push.sendMulticast).not.toHaveBeenCalled();
    expect(result.tokens).toBe(0);
  });
});
