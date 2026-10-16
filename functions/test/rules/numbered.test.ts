// The numbered tests of the access-control "Rules test suite" requirement (Rules test 1 to 16).
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  alertDoc,
  asUser,
  at,
  consent,
  createEnv,
  doseEvent,
  EDITOR,
  healthLog,
  medicineDoc,
  memberDoc,
  OUTSIDER,
  OWNER,
  PARENT,
  parentDoc,
  put,
  seed,
  T1,
  T2,
  T3,
  VIEWER,
} from "./helpers";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

const familyResolve = (uid: string, status: "taken" | "not_taken" = "taken") => ({
  status,
  resolvedBy: "family",
  resolvedByUid: uid,
  resolvedAt: serverTimestamp(),
});

/** Documents dated at hour offsets, for healthLogs (createdAt), alerts (createdAt), doseEvents (scheduledFor). */
async function seedDated(hours: number[]): Promise<void> {
  const entries: Array<[string, object]> = [];
  for (const h of hours) {
    entries.push([`parents/${PARENT}/healthLogs/log${h}`, healthLog({ createdAt: at(h) })]);
    entries.push([`parents/${PARENT}/alerts/alert${h}`, alertDoc({ createdAt: at(h) })]);
    entries.push([`parents/${PARENT}/doseEvents/ev${h}`, doseEvent({ scheduledFor: at(h) })]);
  }
  await put(env, entries);
}

const kinds = (h: number) => [
  `parents/${PARENT}/healthLogs/log${h}`,
  `parents/${PARENT}/alerts/alert${h}`,
  `parents/${PARENT}/doseEvents/ev${h}`,
];

async function expectReadable(uid: string, hours: number[], readable: boolean) {
  const db = asUser(env, uid);
  for (const h of hours) {
    for (const p of kinds(h)) {
      await (readable ? assertSucceeds(getDoc(doc(db, p))) : assertFails(getDoc(doc(db, p))));
    }
  }
}

describe("Rules test suite", () => {
  it("Rules test 1: an unauthenticated user cannot read anything", async () => {
    await seed(env);
    await put(env, [
      [`parents/${PARENT}/medicines/m1`, medicineDoc()],
      [`parents/${PARENT}/healthLogs/l1`, healthLog()],
      [`parents/${PARENT}/doseEvents/e1`, doseEvent()],
      [`parents/${PARENT}/alerts/a1`, alertDoc()],
    ]);
    const db = env.unauthenticatedContext().firestore();
    for (const p of [
      `parents/${PARENT}`,
      `parents/${PARENT}/members/${OWNER}`,
      `parents/${PARENT}/medicines/m1`,
      `parents/${PARENT}/healthLogs/l1`,
      `parents/${PARENT}/doseEvents/e1`,
      `parents/${PARENT}/alerts/a1`,
      `users/${OWNER}`,
    ]) {
      await assertFails(getDoc(doc(db, p)));
    }
    await assertFails(getDocs(collection(db, `parents/${PARENT}/medicines`)));
  });

  it("Rules test 2: a signed-in non-member cannot read a parent, its medicines, or its logs", async () => {
    await seed(env);
    await put(env, [
      [`parents/${PARENT}/medicines/m1`, medicineDoc()],
      [`parents/${PARENT}/healthLogs/l1`, healthLog()],
    ]);
    // outsider owns a different parent (p2) but is not a member of p1
    const db = asUser(env, OUTSIDER);
    await assertFails(getDoc(doc(db, `parents/${PARENT}`)));
    await assertFails(getDoc(doc(db, `parents/${PARENT}/medicines/m1`)));
    await assertFails(getDoc(doc(db, `parents/${PARENT}/healthLogs/l1`)));
    await assertFails(getDocs(collection(db, `parents/${PARENT}/medicines`)));
  });

  it("Rules test 3: a viewer can read but cannot write medicines", async () => {
    await seed(env);
    await put(env, [[`parents/${PARENT}/medicines/m1`, medicineDoc()]]);
    const db = asUser(env, VIEWER);
    await assertSucceeds(getDoc(doc(db, `parents/${PARENT}/medicines/m1`)));
    await assertFails(
      setDoc(doc(db, `parents/${PARENT}/medicines/m2`), medicineDoc({ createdBy: VIEWER })),
    );
    await assertFails(updateDoc(doc(db, `parents/${PARENT}/medicines/m1`), { active: false }));
  });

  it("Rules test 4: an editor can write medicines but cannot add members", async () => {
    await seed(env);
    const db = asUser(env, EDITOR);
    await assertSucceeds(
      setDoc(doc(db, `parents/${PARENT}/medicines/m2`), medicineDoc({ createdBy: EDITOR })),
    );
    await assertFails(
      setDoc(doc(db, `parents/${PARENT}/members/newuser`), memberDoc("viewer", "New")),
    );
  });

  it("Rules test 5: a client cannot write consent, callSessions or auditLogs", async () => {
    await seed(env);
    for (const uid of [OWNER, EDITOR, VIEWER, OUTSIDER]) {
      const db = asUser(env, uid);
      await assertFails(
        updateDoc(doc(db, `parents/${PARENT}`), { consent: consent({ status: "revoked" }) }),
      );
      await assertFails(updateDoc(doc(db, `parents/${PARENT}`), { "consent.status": "revoked" }));
      await assertFails(setDoc(doc(db, `parents/${PARENT}/callSessions/s1`), { callSid: "x" }));
      await assertFails(getDoc(doc(db, `parents/${PARENT}/callSessions/s1`)));
      await assertFails(setDoc(doc(db, "auditLogs/a1"), { actor: uid }));
      await assertFails(getDoc(doc(db, "auditLogs/a1")));
    }
  });

  it("Rules test 6: a removed member loses access immediately", async () => {
    await seed(env);
    await put(env, [[`parents/${PARENT}/medicines/m1`, medicineDoc()]]);
    const viewer = asUser(env, VIEWER);
    await assertSucceeds(getDoc(doc(viewer, `parents/${PARENT}`)));
    await assertSucceeds(getDoc(doc(viewer, `parents/${PARENT}/medicines/m1`)));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), `parents/${PARENT}/members/${VIEWER}`));
    });
    await assertFails(getDoc(doc(viewer, `parents/${PARENT}`)));
    await assertFails(getDoc(doc(viewer, `parents/${PARENT}/medicines/m1`)));
  });

  it('Rules test 7: a client cannot set a doseEvent status to "missed" or "taken" with resolvedBy "dtmf"', async () => {
    await seed(env);
    await put(env, [[`parents/${PARENT}/doseEvents/e1`, doseEvent()]]);
    const db = asUser(env, EDITOR);
    const ref = doc(db, `parents/${PARENT}/doseEvents/e1`);
    await assertFails(
      updateDoc(ref, {
        status: "taken",
        resolvedBy: "dtmf",
        resolvedByUid: EDITOR,
        resolvedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(ref, {
        status: "missed",
        resolvedBy: "dtmf",
        resolvedByUid: EDITOR,
        resolvedAt: serverTimestamp(),
      }),
    );
    await assertFails(updateDoc(ref, { ...familyResolve(EDITOR), status: "missed" }));
  });

  it("Rules test 8: owner or editor can override missed to taken (family, own uid) but not change missedAt or move taken back to missed", async () => {
    await seed(env);
    for (const uid of [OWNER, EDITOR]) {
      await put(env, [
        [
          `parents/${PARENT}/doseEvents/missed1`,
          doseEvent({ status: "missed", missedAt: at(11), attempts: 3, alertSent: true }),
        ],
      ]);
      const ref = doc(asUser(env, uid), `parents/${PARENT}/doseEvents/missed1`);
      // allowed: missed -> taken, resolvedBy family, resolvedByUid own uid
      await assertSucceeds(updateDoc(ref, familyResolve(uid)));
      // after the override: missedAt cannot be changed
      await assertFails(updateDoc(ref, { ...familyResolve(uid), missedAt: at(99) }));
      // taken cannot move back to missed
      await assertFails(updateDoc(ref, { ...familyResolve(uid), status: "missed" }));
    }
    // missedAt cannot be changed in the same update as the override either
    await put(env, [
      [`parents/${PARENT}/doseEvents/missed2`, doseEvent({ status: "missed", missedAt: at(11) })],
    ]);
    await assertFails(
      updateDoc(doc(asUser(env, EDITOR), `parents/${PARENT}/doseEvents/missed2`), {
        ...familyResolve(EDITOR),
        missedAt: at(99),
      }),
    );
  });

  it("Rules test 9: after revocation an editor or viewer cannot read data dated at or after revokedAt, can read older data, and the owner reads all", async () => {
    await seed(env, { consent: consent({ status: "revoked", revokedAt: T1 }) });
    await seedDated([50, 100, 150]); // before T1 (hour 100), at T1, after T1
    for (const uid of [EDITOR, VIEWER]) {
      await expectReadable(uid, [50], true);
      await expectReadable(uid, [100, 150], false);
    }
    await expectReadable(OWNER, [50, 100, 150], true);
  });

  it('Rules test 10: before revocation (status "granted" or "pending") the visibility rule changes nothing for any member', async () => {
    for (const status of ["granted", "pending"] as const) {
      await env.clearFirestore();
      await seed(env, { consent: consent({ status }) });
      await seedDated([50, 100, 150]);
      for (const uid of [OWNER, EDITOR, VIEWER]) await expectReadable(uid, [50, 100, 150], true);
    }
  });

  it('Rules test 11: a viewer cannot change a missed doseEvent to "taken" (or change any doseEvent)', async () => {
    await seed(env);
    await put(env, [
      [`parents/${PARENT}/doseEvents/missed1`, doseEvent({ status: "missed", missedAt: at(11) })],
      [`parents/${PARENT}/doseEvents/pending1`, doseEvent()],
    ]);
    const db = asUser(env, VIEWER);
    await assertFails(
      updateDoc(doc(db, `parents/${PARENT}/doseEvents/missed1`), familyResolve(VIEWER)),
    );
    await assertFails(
      updateDoc(doc(db, `parents/${PARENT}/doseEvents/pending1`), familyResolve(VIEWER)),
    );
    await assertFails(updateDoc(doc(db, `parents/${PARENT}/doseEvents/pending1`), { attempts: 5 }));
  });

  it("Rules test 12: a client update with resolvedByUid missing or different from request.auth.uid is denied", async () => {
    await seed(env);
    await put(env, [[`parents/${PARENT}/doseEvents/e1`, doseEvent()]]);
    const ref = doc(asUser(env, EDITOR), `parents/${PARENT}/doseEvents/e1`);
    await assertFails(
      updateDoc(ref, { status: "taken", resolvedBy: "family", resolvedAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(ref, familyResolve(OWNER))); // another member's uid
    await assertFails(updateDoc(ref, { ...familyResolve(EDITOR), resolvedByUid: null }));
    await assertSucceeds(updateDoc(ref, familyResolve(EDITOR)));
  });

  it("Rules test 13: with revokedAt = T1 and regrantedAt = T2, editor and viewer read data before T1 and at or after T2, not from T1 up to T2; the owner reads all", async () => {
    await seed(env, { consent: consent({ status: "granted", revokedAt: T1, regrantedAt: T2 }) });
    // hours: 50 (before T1), 100 (= T1), 150 (between), 200 (= T2), 250 (after T2)
    await seedDated([50, 100, 150, 200, 250]);
    for (const uid of [EDITOR, VIEWER]) {
      await expectReadable(uid, [50, 200, 250], true);
      await expectReadable(uid, [100, 150], false);
    }
    await expectReadable(OWNER, [50, 100, 150, 200, 250], true);
  });

  it("Rules test 14: after a second revocation (first revokedAt = T1 kept, regrantedAt null) editor and viewer read only data before T1; the owner reads all", async () => {
    await seed(env, { consent: consent({ status: "revoked", revokedAt: T1, regrantedAt: null }) });
    // hours: 50 (before T1), 250 (between T2 and the later revocation T3 = hour 300), 350 (after T3)
    expect(T3.toMillis()).toBeGreaterThan(T2.toMillis());
    await seedDated([50, 250, 350]);
    for (const uid of [EDITOR, VIEWER]) {
      await expectReadable(uid, [50], true);
      await expectReadable(uid, [250, 350], false);
    }
    await expectReadable(OWNER, [50, 250, 350], true);
  });

  it("Rules test 15: a client cannot create a parent document directly", async () => {
    await seed(env);
    for (const uid of [OWNER, OUTSIDER, "brandnew"]) {
      const db = asUser(env, uid);
      await assertFails(setDoc(doc(db, "parents/p9"), parentDoc({ createdBy: uid })));
    }
    // not even together with an owner member document
    const db = asUser(env, "brandnew");
    await assertFails(setDoc(doc(db, "parents/p9/members/brandnew"), memberDoc("owner", "x")));
  });

  it("Rules test 16: a viewer cannot write confirmedByHuman: true on a medicine; an owner or editor can", async () => {
    await seed(env);
    await put(env, [
      [
        `parents/${PARENT}/medicines/scan1`,
        medicineDoc({ source: "prescription_scan", confirmedByHuman: false }),
      ],
    ]);
    const path = `parents/${PARENT}/medicines/scan1`;
    await assertFails(updateDoc(doc(asUser(env, VIEWER), path), { confirmedByHuman: true }));
    await assertFails(
      setDoc(
        doc(asUser(env, VIEWER), `parents/${PARENT}/medicines/scan2`),
        medicineDoc({ source: "prescription_scan", confirmedByHuman: true, createdBy: VIEWER }),
      ),
    );
    await assertSucceeds(updateDoc(doc(asUser(env, EDITOR), path), { confirmedByHuman: true }));
    await assertSucceeds(
      setDoc(
        doc(asUser(env, OWNER), `parents/${PARENT}/medicines/scan3`),
        medicineDoc({ source: "prescription_scan", confirmedByHuman: true, createdBy: OWNER }),
      ),
    );
  });
});
