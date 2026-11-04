// family-companion-parity: emergencyContacts on the parent, the familyCalls collection and
// members.lastSeenAt (access-control "parents client update fields", "familyCalls path rule",
// "members lastSeenAt is server-written").
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc } from "firebase/firestore";
import {
  asUser,
  at,
  consent,
  createEnv,
  EDITOR,
  memberDoc,
  OUTSIDER,
  OWNER,
  PARENT,
  parentDoc,
  put,
  T1,
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
  await put(env, [
    [`parents/${PARENT}`, parentDoc()],
    [`parents/${PARENT}/members/${OWNER}`, memberDoc("owner", "Rahul")],
    [`parents/${PARENT}/members/${EDITOR}`, memberDoc("editor", "Meera")],
    [`parents/${PARENT}/members/${VIEWER}`, memberDoc("viewer", "Yadav")],
  ]);
});

const parentRef = (uid: string) => doc(asUser(env, uid), `parents/${PARENT}`);
const contact = (over: Record<string, unknown> = {}) => ({
  label: "Sreeja",
  kind: "neighbour",
  phone: "+919876500001",
  ...over,
});

describe("emergencyContacts on the parent", () => {
  it("an owner can set up to 3 valid contacts and clear them", async () => {
    await assertSucceeds(updateDoc(parentRef(OWNER), { emergencyContacts: [contact()] }));
    await assertSucceeds(
      updateDoc(parentRef(OWNER), {
        emergencyContacts: [contact(), contact({ kind: "clinic", label: "Dr. Nair" }), contact({ label: "Anil" })],
      }),
    );
    await assertSucceeds(updateDoc(parentRef(OWNER), { emergencyContacts: [] }));
  });

  it("four contacts are denied", async () => {
    await assertFails(
      updateDoc(parentRef(OWNER), { emergencyContacts: [contact(), contact(), contact(), contact()] }),
    );
  });

  it("an unknown kind, an extra key, a bad phone or a bad label is denied", async () => {
    await assertFails(updateDoc(parentRef(OWNER), { emergencyContacts: [contact({ kind: "friend" })] }));
    await assertFails(updateDoc(parentRef(OWNER), { emergencyContacts: [contact({ other: "x" })] }));
    await assertFails(updateDoc(parentRef(OWNER), { emergencyContacts: [contact({ phone: "9876500001" })] }));
    await assertFails(updateDoc(parentRef(OWNER), { emergencyContacts: [contact({ label: "" })] }));
    await assertFails(updateDoc(parentRef(OWNER), { emergencyContacts: [contact({ label: "x".repeat(41) })] }));
  });

  it("an editor, a viewer and an outsider cannot change contacts", async () => {
    for (const uid of [EDITOR, VIEWER, OUTSIDER]) {
      await assertFails(updateDoc(parentRef(uid), { emergencyContacts: [contact()] }));
    }
  });

  it("every member can read the contacts", async () => {
    await put(env, [[`parents/${PARENT}`, parentDoc({ emergencyContacts: [contact()] as never })]]);
    for (const uid of [OWNER, EDITOR, VIEWER]) {
      await assertSucceeds(getDoc(parentRef(uid)));
    }
    await assertFails(getDoc(parentRef(OUTSIDER)));
  });
});

describe("familyCalls", () => {
  const callPath = `parents/${PARENT}/familyCalls/${OWNER}_202610011800`;
  const callDoc = { byUid: OWNER, at: at(18) };

  beforeEach(async () => {
    await put(env, [[callPath, callDoc]]);
  });

  it("members can read a family call and list the collection", async () => {
    for (const uid of [OWNER, EDITOR, VIEWER]) {
      await assertSucceeds(getDoc(doc(asUser(env, uid), callPath)));
      await assertSucceeds(getDocs(collection(asUser(env, uid), `parents/${PARENT}/familyCalls`)));
    }
  });

  it("a non-member cannot read", async () => {
    await assertFails(getDoc(doc(asUser(env, OUTSIDER), callPath)));
  });

  it("no client can create, update or delete one", async () => {
    for (const uid of [OWNER, EDITOR, VIEWER]) {
      const db = asUser(env, uid);
      await assertFails(setDoc(doc(db, `parents/${PARENT}/familyCalls/new_${uid}`), callDoc));
      await assertFails(updateDoc(doc(db, callPath), { at: at(19) }));
      await assertFails(deleteDoc(doc(db, callPath)));
    }
  });

  it("after revocation a non-owner reads only calls dated before revokedAt; the owner reads all", async () => {
    await put(env, [
      [`parents/${PARENT}`, parentDoc({ consent: consent({ status: "revoked", revokedAt: T1 }) })],
      [`parents/${PARENT}/familyCalls/old`, { byUid: OWNER, at: at(50) }],
      [`parents/${PARENT}/familyCalls/late`, { byUid: OWNER, at: at(150) }],
    ]);
    await assertSucceeds(getDoc(doc(asUser(env, VIEWER), `parents/${PARENT}/familyCalls/old`)));
    await assertFails(getDoc(doc(asUser(env, VIEWER), `parents/${PARENT}/familyCalls/late`)));
    await assertSucceeds(getDoc(doc(asUser(env, OWNER), `parents/${PARENT}/familyCalls/late`)));
  });
});

describe("members.lastSeenAt", () => {
  it("no client can write lastSeenAt on any member document", async () => {
    for (const uid of [OWNER, EDITOR, VIEWER]) {
      const ref = doc(asUser(env, uid), `parents/${PARENT}/members/${uid}`);
      await assertFails(updateDoc(ref, { lastSeenAt: at(5) }));
    }
  });

  it("members can read each other's lastSeenAt", async () => {
    await put(env, [[`parents/${PARENT}/members/${OWNER}`, { ...memberDoc("owner", "Rahul"), lastSeenAt: at(5) }]]);
    await assertSucceeds(getDoc(doc(asUser(env, VIEWER), `parents/${PARENT}/members/${OWNER}`)));
  });
});
