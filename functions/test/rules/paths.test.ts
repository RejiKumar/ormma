// Tests for every access-control path rule beyond the numbered tests, including the Stage 1
// refinements (terminal states, shapes, deletes). Names start with the requirement they cover.
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
  prescriptionDoc,
  put,
  seed,
  T1,
  T2,
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
  await seed(env);
});

const p = (rest: string) => `parents/${PARENT}/${rest}`;
const familyResolve = (uid: string, status: "taken" | "not_taken" = "taken") => ({
  status,
  resolvedBy: "family",
  resolvedByUid: uid,
  resolvedAt: serverTimestamp(),
});

describe("users path rule / users document shape", () => {
  it("a user reads and writes only their own users document", async () => {
    const data = { displayName: "A", phone: "+919800000009", fcmTokens: [], createdAt: at(0) };
    await assertSucceeds(setDoc(doc(asUser(env, EDITOR), `users/${EDITOR}`), data));
    await assertSucceeds(getDoc(doc(asUser(env, EDITOR), `users/${EDITOR}`)));
    await assertFails(getDoc(doc(asUser(env, VIEWER), `users/${EDITOR}`)));
    await assertFails(setDoc(doc(asUser(env, VIEWER), `users/${EDITOR}`), data));
    await assertFails(getDoc(doc(asUser(env, OWNER), `users/${EDITOR}`)));
  });

  it("the phone must be E.164 and only data-model fields are allowed", async () => {
    const ok = { displayName: "A", phone: "+919800000009", fcmTokens: [], createdAt: at(0) };
    const ref = doc(asUser(env, EDITOR), `users/${EDITOR}`);
    await assertFails(setDoc(ref, { ...ok, phone: "9800000009" }));
    await assertFails(setDoc(ref, { ...ok, phone: "+0123456789" }));
    await assertFails(setDoc(ref, { ...ok, phone: "+91 98000 00009" }));
    await assertFails(setDoc(ref, { ...ok, role: "owner" }));
    await assertSucceeds(setDoc(ref, ok));
  });
});

describe("parents path rule / parents client update fields", () => {
  it("members read the parent; non-members do not", async () => {
    for (const uid of [OWNER, EDITOR, VIEWER]) {
      await assertSucceeds(getDoc(doc(asUser(env, uid), `parents/${PARENT}`)));
    }
    await assertFails(getDoc(doc(asUser(env, OUTSIDER), `parents/${PARENT}`)));
  });

  it("only the owner updates, and only whitelisted fields with valid values", async () => {
    const ref = (uid: string) => doc(asUser(env, uid), `parents/${PARENT}`);
    await assertSucceeds(
      updateDoc(ref(OWNER), { name: "Amma K", active: false, language: "ta-IN" }),
    );
    await assertSucceeds(updateDoc(ref(OWNER), { phone: "+919811111111" }));
    await assertFails(updateDoc(ref(EDITOR), { name: "x" }));
    await assertFails(updateDoc(ref(VIEWER), { name: "x" }));
    await assertFails(updateDoc(ref(OUTSIDER), { name: "x" }));
    await assertFails(updateDoc(ref(OWNER), { createdBy: EDITOR }));
    await assertFails(updateDoc(ref(OWNER), { createdAt: at(5) }));
    await assertFails(updateDoc(ref(OWNER), { phone: "12345" }));
    await assertFails(updateDoc(ref(OWNER), { language: "fr-FR" }));
    await assertFails(updateDoc(ref(OWNER), { extra: 1 }));
  });

  it("the owner may change callPolicy (per-parent defaults) but only with a valid shape", async () => {
    const ref = doc(asUser(env, OWNER), `parents/${PARENT}`);
    const policy = {
      retryCount: 3,
      retryGapMinutes: 15,
      missedAfterMinutes: 90,
      quietHours: { start: "21:00", end: "07:00" },
    };
    await assertSucceeds(updateDoc(ref, { callPolicy: policy }));
    await assertFails(updateDoc(ref, { callPolicy: { ...policy, retryCount: "3" } }));
    await assertFails(updateDoc(ref, { callPolicy: { ...policy, retryCount: -1 } }));
    await assertFails(updateDoc(ref, { callPolicy: { retryCount: 1 } }));
  });
});

describe("members path rule", () => {
  it("members read members documents; nobody writes them; non-members do not read", async () => {
    await assertSucceeds(getDoc(doc(asUser(env, VIEWER), p(`members/${OWNER}`))));
    await assertSucceeds(getDocs(collection(asUser(env, VIEWER), p("members"))));
    await assertFails(getDoc(doc(asUser(env, OUTSIDER), p(`members/${OWNER}`))));
    for (const uid of [OWNER, EDITOR, VIEWER]) {
      const db = asUser(env, uid);
      await assertFails(setDoc(doc(db, p("members/newuser")), memberDoc("viewer", "N")));
      await assertFails(updateDoc(doc(db, p(`members/${VIEWER}`)), { role: "owner" }));
      await assertFails(deleteDoc(doc(db, p(`members/${VIEWER}`))));
    }
  });
});

describe("medicines path rule / medicines document shape", () => {
  it("owner and editor create and update; delete is denied; viewers and outsiders read per membership", async () => {
    for (const uid of [OWNER, EDITOR]) {
      const db = asUser(env, uid);
      await assertSucceeds(
        setDoc(doc(db, p(`medicines/m-${uid}`)), medicineDoc({ createdBy: uid })),
      );
      await assertSucceeds(updateDoc(doc(db, p(`medicines/m-${uid}`)), { active: false }));
      await assertFails(deleteDoc(doc(db, p(`medicines/m-${uid}`))));
    }
    await assertSucceeds(getDoc(doc(asUser(env, VIEWER), p(`medicines/m-${EDITOR}`))));
    await assertFails(getDoc(doc(asUser(env, OUTSIDER), p(`medicines/m-${EDITOR}`))));
  });

  it("shape: valid enums, createdBy is the creator, createdBy and createdAt never change, no extra fields", async () => {
    const db = asUser(env, EDITOR);
    const ref = (id: string) => doc(db, p(`medicines/${id}`));
    await assertFails(setDoc(ref("a"), medicineDoc({ source: "voice" as never })));
    await assertFails(setDoc(ref("b"), medicineDoc({ createdBy: OWNER })));
    await assertFails(setDoc(ref("c"), { ...medicineDoc(), extra: true }));
    await assertFails(setDoc(ref("d"), medicineDoc({ name: "" })));
    await assertFails(setDoc(ref("e"), medicineDoc({ times: "08:00" as never })));
    await assertSucceeds(setDoc(ref("f"), medicineDoc()));
    await assertFails(updateDoc(ref("f"), { createdBy: OWNER }));
    await assertFails(updateDoc(ref("f"), { createdAt: at(7) }));
    await assertFails(updateDoc(ref("f"), { source: "prescription_scan2" }));
  });

  it("a medicine from a prescription scan can be written unconfirmed and confirmed by an editor", async () => {
    const db = asUser(env, EDITOR);
    const scan = medicineDoc({ source: "prescription_scan", confirmedByHuman: false });
    await assertSucceeds(setDoc(doc(db, p("medicines/scan")), scan));
    await assertSucceeds(updateDoc(doc(db, p("medicines/scan")), { confirmedByHuman: true }));
  });
});

describe("doseEvents read / client updates and terminal states / client deletes", () => {
  beforeEach(async () => {
    await put(env, [
      [p("doseEvents/pending1"), doseEvent()],
      [p("doseEvents/taken1"), doseEvent({ status: "taken", resolvedBy: "dtmf" })],
      [p("doseEvents/missed1"), doseEvent({ status: "missed", missedAt: at(11) })],
    ]);
  });

  it("members read doseEvents; non-members do not", async () => {
    for (const uid of [OWNER, EDITOR, VIEWER]) {
      await assertSucceeds(getDoc(doc(asUser(env, uid), p("doseEvents/pending1"))));
    }
    await assertFails(getDoc(doc(asUser(env, OUTSIDER), p("doseEvents/pending1"))));
  });

  it("taken is terminal for clients; missed only becomes taken; non-terminal becomes taken or not_taken", async () => {
    const db = asUser(env, EDITOR);
    await assertFails(
      updateDoc(doc(db, p("doseEvents/taken1")), familyResolve(EDITOR, "not_taken")),
    );
    await assertFails(updateDoc(doc(db, p("doseEvents/taken1")), familyResolve(EDITOR, "taken")));
    await assertFails(
      updateDoc(doc(db, p("doseEvents/missed1")), familyResolve(EDITOR, "not_taken")),
    );
    await assertSucceeds(
      updateDoc(doc(db, p("doseEvents/missed1")), familyResolve(EDITOR, "taken")),
    );
    await assertSucceeds(
      updateDoc(doc(db, p("doseEvents/pending1")), familyResolve(EDITOR, "not_taken")),
    );
    await assertSucceeds(
      updateDoc(doc(db, p("doseEvents/pending1")), familyResolve(EDITOR, "taken")),
    );
  });

  it("clients cannot change server-only fields or create or delete doseEvents", async () => {
    const db = asUser(env, OWNER);
    const ref = doc(db, p("doseEvents/pending1"));
    for (const extra of [
      { attempts: 1 },
      { alertSent: true },
      { lastCallSid: "x" },
      { groupConfirmed: true },
      { missedAt: at(1) },
      { scheduledFor: at(1) },
      { medicineId: "other" },
    ]) {
      await assertFails(updateDoc(ref, { ...familyResolve(OWNER), ...extra }));
    }
    await assertFails(setDoc(doc(db, p("doseEvents/new1")), doseEvent()));
    await assertFails(deleteDoc(ref));
    await assertFails(deleteDoc(doc(db, p("doseEvents/missed1"))));
  });

  it("a status update passes on a doseEvent that already carries a server confirmationNote; clients cannot write the note", async () => {
    await put(env, [
      [p("doseEvents/noted1"), doseEvent({ confirmationNote: "She said she took the tablets." })],
    ]);
    const db = asUser(env, EDITOR);
    await assertSucceeds(
      updateDoc(doc(db, p("doseEvents/noted1")), familyResolve(EDITOR, "taken")),
    );
    await assertFails(
      updateDoc(doc(db, p("doseEvents/noted1")), {
        ...familyResolve(EDITOR),
        confirmationNote: "edited by client",
      }),
    );
    await assertFails(
      updateDoc(doc(db, p("doseEvents/noted1")), { confirmationNote: null }),
    );
  });
});

describe("healthLogs path rule / healthLogs client create shape", () => {
  it("owner and editor create a family log with createdAt equal to the server time; viewers cannot", async () => {
    const now = { ...healthLog(), createdAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(asUser(env, EDITOR), p("healthLogs/a")), now));
    await assertSucceeds(setDoc(doc(asUser(env, OWNER), p("healthLogs/b")), now));
    await assertFails(setDoc(doc(asUser(env, VIEWER), p("healthLogs/c")), now));
    await assertFails(setDoc(doc(asUser(env, OUTSIDER), p("healthLogs/d")), now));
  });

  it("denies voice logs, backdated createdAt, transcript refs, bad types, extra fields, updates and deletes", async () => {
    const db = asUser(env, EDITOR);
    const base = { ...healthLog(), createdAt: serverTimestamp() };
    await assertFails(setDoc(doc(db, p("healthLogs/v")), { ...base, source: "voice" }));
    await assertFails(setDoc(doc(db, p("healthLogs/s")), { ...base, source: "prescription_scan" }));
    await assertFails(setDoc(doc(db, p("healthLogs/t")), { ...base, createdAt: at(5) }));
    await assertFails(
      setDoc(doc(db, p("healthLogs/r")), { ...base, rawTranscriptRef: "transcripts/review/x" }),
    );
    await assertFails(setDoc(doc(db, p("healthLogs/y")), { ...base, type: "mood" }));
    await assertFails(setDoc(doc(db, p("healthLogs/x")), { ...base, extra: 1 }));
    await assertFails(setDoc(doc(db, p("healthLogs/n")), { ...base, values: "text" }));
    await assertSucceeds(setDoc(doc(db, p("healthLogs/ok")), base));
    await assertFails(updateDoc(doc(db, p("healthLogs/ok")), { needsReview: true }));
    await assertFails(deleteDoc(doc(db, p("healthLogs/ok"))));
  });

  it("members read logs", async () => {
    await put(env, [[p("healthLogs/l1"), healthLog()]]);
    for (const uid of [OWNER, EDITOR, VIEWER]) {
      await assertSucceeds(getDoc(doc(asUser(env, uid), p("healthLogs/l1"))));
    }
    await assertFails(getDoc(doc(asUser(env, OUTSIDER), p("healthLogs/l1"))));
  });
});

describe("callSessions and auditLogs path rule / invites path rule", () => {
  it("nobody, including the owner, can read or write callSessions, auditLogs and invites", async () => {
    await put(env, [
      [p("callSessions/s1"), { callSid: "c1" }],
      ["auditLogs/a1", { actor: "system" }],
      ["invites/CODE1234", { parentId: PARENT, role: "viewer", usedBy: null }],
    ]);
    for (const uid of [OWNER, EDITOR, VIEWER, OUTSIDER]) {
      const db = asUser(env, uid);
      for (const path of [p("callSessions/s1"), "auditLogs/a1", "invites/CODE1234"]) {
        await assertFails(getDoc(doc(db, path)));
        await assertFails(setDoc(doc(db, path), { x: 1 }));
        await assertFails(deleteDoc(doc(db, path)));
      }
      await assertFails(getDocs(collection(db, "invites")));
    }
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "invites/CODE1234")));
  });
});

describe("prescriptions path rule / prescriptions client create and update", () => {
  it("owner and editor create a pending_review prescription; viewers cannot; members read", async () => {
    await assertSucceeds(
      setDoc(doc(asUser(env, EDITOR), p("prescriptions/r1")), prescriptionDoc()),
    );
    await assertFails(
      setDoc(
        doc(asUser(env, VIEWER), p("prescriptions/r2")),
        prescriptionDoc({ uploadedBy: VIEWER }),
      ),
    );
    await assertFails(
      setDoc(
        doc(asUser(env, EDITOR), p("prescriptions/r3")),
        prescriptionDoc({ status: "confirmed" }),
      ),
    );
    await assertFails(
      setDoc(
        doc(asUser(env, EDITOR), p("prescriptions/r4")),
        prescriptionDoc({ uploadedBy: OWNER }),
      ),
    );
    await assertFails(
      setDoc(doc(asUser(env, EDITOR), p("prescriptions/r5")), { ...prescriptionDoc(), extra: 1 }),
    );
    for (const uid of [OWNER, EDITOR, VIEWER]) {
      await assertSucceeds(getDoc(doc(asUser(env, uid), p("prescriptions/r1"))));
    }
    await assertFails(getDoc(doc(asUser(env, OUTSIDER), p("prescriptions/r1"))));
  });

  it("only owner or editor change status, and nothing else; deletes are denied", async () => {
    await put(env, [[p("prescriptions/r1"), prescriptionDoc()]]);
    const ref = (uid: string) => doc(asUser(env, uid), p("prescriptions/r1"));
    await assertFails(updateDoc(ref(VIEWER), { status: "confirmed" }));
    await assertFails(updateDoc(ref(OUTSIDER), { status: "confirmed" }));
    await assertFails(updateDoc(ref(EDITOR), { status: "bogus" }));
    await assertFails(updateDoc(ref(EDITOR), { storagePath: "elsewhere" }));
    await assertFails(updateDoc(ref(EDITOR), { status: "confirmed", uploadedBy: OWNER }));
    await assertSucceeds(updateDoc(ref(EDITOR), { status: "confirmed" }));
    await assertSucceeds(updateDoc(ref(OWNER), { status: "rejected" }));
    await assertFails(deleteDoc(ref(OWNER)));
  });
});

describe("alerts path rule", () => {
  beforeEach(async () => {
    await put(env, [[p("alerts/a1"), alertDoc()]]);
  });

  it("a member appends only their own uid to readBy", async () => {
    const ref = (uid: string) => doc(asUser(env, uid), p("alerts/a1"));
    await assertSucceeds(updateDoc(ref(VIEWER), { readBy: arrayUnion(VIEWER) }));
    await assertFails(updateDoc(ref(VIEWER), { readBy: arrayUnion(VIEWER) })); // already read
    await assertFails(updateDoc(ref(EDITOR), { readBy: [OWNER, EDITOR] })); // someone else's uid
    await assertFails(updateDoc(ref(EDITOR), { readBy: [] })); // removing
    await assertFails(updateDoc(ref(EDITOR), { readBy: arrayUnion(EDITOR), message: "edited" }));
    await assertFails(updateDoc(ref(OUTSIDER), { readBy: arrayUnion(OUTSIDER) }));
  });

  it("members read alerts; clients cannot create or delete alerts", async () => {
    for (const uid of [OWNER, EDITOR, VIEWER]) {
      await assertSucceeds(getDoc(doc(asUser(env, uid), p("alerts/a1"))));
    }
    await assertFails(getDoc(doc(asUser(env, OUTSIDER), p("alerts/a1"))));
    await assertFails(setDoc(doc(asUser(env, OWNER), p("alerts/a2")), alertDoc()));
    await assertFails(deleteDoc(doc(asUser(env, OWNER), p("alerts/a1"))));
  });
});

describe("Client deletes denied", () => {
  it("the owner cannot delete a parent, medicine, doseEvent, healthLog, prescription or alert", async () => {
    await put(env, [
      [p("medicines/m1"), medicineDoc()],
      [p("doseEvents/e1"), doseEvent()],
      [p("healthLogs/l1"), healthLog()],
      [p("prescriptions/r1"), prescriptionDoc()],
      [p("alerts/a1"), alertDoc()],
    ]);
    const db = asUser(env, OWNER);
    for (const path of [
      `parents/${PARENT}`,
      p("medicines/m1"),
      p("doseEvents/e1"),
      p("healthLogs/l1"),
      p("prescriptions/r1"),
      p("alerts/a1"),
    ]) {
      await assertFails(deleteDoc(doc(db, path)));
    }
  });
});

describe("Deny by default and membership", () => {
  it("paths that no rule matches are denied, even for the owner", async () => {
    await put(env, [
      ["somethingElse/x", { a: 1 }],
      [p("unknownSub/x"), { a: 1 }],
    ]);
    const db = asUser(env, OWNER);
    await assertFails(getDoc(doc(db, "somethingElse/x")));
    await assertFails(setDoc(doc(db, "somethingElse/y"), { a: 1 }));
    await assertFails(getDoc(doc(db, p("unknownSub/x"))));
    await assertFails(setDoc(doc(db, p("unknownSub/y")), { a: 1 }));
  });

  it("membership of one parent grants nothing on another parent", async () => {
    await put(env, [["parents/p2/medicines/m1", medicineDoc({ createdBy: OUTSIDER })]]);
    await assertFails(getDoc(doc(asUser(env, OWNER), "parents/p2/medicines/m1")));
    await assertSucceeds(getDoc(doc(asUser(env, OUTSIDER), "parents/p2/medicines/m1")));
  });

  it("a parent without a consent map fails closed for dated data of non-owners", async () => {
    const noConsent: Record<string, unknown> = { ...parentDoc() };
    delete noConsent.consent;
    await put(env, [
      [`parents/${PARENT}`, noConsent],
      [p("healthLogs/l1"), healthLog()],
    ]);
    await assertFails(getDoc(doc(asUser(env, VIEWER), p("healthLogs/l1"))));
  });
});

describe("Visibility check mechanics (list queries)", () => {
  const seedDated = async () =>
    put(
      env,
      [50, 100, 150, 200, 250].flatMap((h) => [
        [p(`healthLogs/l${h}`), healthLog({ createdAt: at(h) })],
        [p(`alerts/a${h}`), alertDoc({ createdAt: at(h) })],
        [p(`doseEvents/e${h}`), doseEvent({ scheduledFor: at(h) })],
      ]) as Array<[string, object]>,
    );

  const lists = (db: ReturnType<typeof asUser>) => [
    ["healthLogs", "createdAt", collection(db, p("healthLogs"))] as const,
    ["alerts", "createdAt", collection(db, p("alerts"))] as const,
    ["doseEvents", "scheduledFor", collection(db, p("doseEvents"))] as const,
  ];

  it("before revocation a non-owner can list without any date filter", async () => {
    await seedDated();
    for (const [, , col] of lists(asUser(env, VIEWER))) await assertSucceeds(getDocs(col));
  });

  it("after revocation a non-owner list without the where clause is denied, and with it is allowed", async () => {
    await env.clearFirestore();
    await seed(env, { consent: consent({ status: "revoked", revokedAt: T1 }) });
    await seedDated();
    for (const uid of [EDITOR, VIEWER]) {
      for (const [, field, col] of lists(asUser(env, uid))) {
        await assertFails(getDocs(col));
        const res = await assertSucceeds(getDocs(query(col, where(field, "<", T1))));
        expect(res.size).toBe(1); // only the document dated hour 50
        await assertFails(getDocs(query(col, where(field, "<=", T1))));
        await assertFails(getDocs(query(col, where(field, ">=", at(50)))));
      }
    }
    for (const [, , col] of lists(asUser(env, OWNER))) {
      const res = await assertSucceeds(getDocs(col));
      expect(res.size).toBe(5);
    }
  });

  it("after a re-grant a non-owner can list data before T1 and data from T2 on, but not an unconstrained or spanning list", async () => {
    await env.clearFirestore();
    await seed(env, { consent: consent({ revokedAt: T1, regrantedAt: T2 }) });
    await seedDated();
    for (const [, field, col] of lists(asUser(env, VIEWER))) {
      await assertFails(getDocs(col));
      await assertSucceeds(getDocs(query(col, where(field, "<", T1))));
      const later = await assertSucceeds(getDocs(query(col, where(field, ">=", T2))));
      expect(later.size).toBe(2); // hours 200 and 250
      await assertFails(getDocs(query(col, where(field, ">=", T1))));
    }
  });
});
