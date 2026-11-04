// prototype-full-parity: parent display fields, medicine display fields, contact note, and the
// server-only fields (member profile and preferences, seenBy).
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import {
  asUser,
  at,
  createEnv,
  doseEvent,
  EDITOR,
  medicineDoc,
  memberDoc,
  OUTSIDER,
  OWNER,
  PARENT,
  parentDoc,
  put,
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
    [`parents/${PARENT}/medicines/m1`, medicineDoc()],
    [`parents/${PARENT}/doseEvents/e1`, doseEvent({ scheduledFor: at(10) })],
  ]);
});

const parentRef = (uid: string) => doc(asUser(env, uid), `parents/${PARENT}`);
const medicineRef = (uid: string) => doc(asUser(env, uid), `parents/${PARENT}/medicines/m1`);

describe("parent display fields", () => {
  it("an owner can set city, prescriber and refillDue, and clear refillDue", async () => {
    await assertSucceeds(
      updateDoc(parentRef(OWNER), { city: "Thrissur", prescriber: "Dr. Nair", refillDue: "2026-11-02" }),
    );
    await assertSucceeds(updateDoc(parentRef(OWNER), { refillDue: null }));
  });

  it("too long values or a bad date are denied", async () => {
    await assertFails(updateDoc(parentRef(OWNER), { city: "x".repeat(41) }));
    await assertFails(updateDoc(parentRef(OWNER), { prescriber: "x".repeat(61) }));
    await assertFails(updateDoc(parentRef(OWNER), { refillDue: "2 Nov" }));
    await assertFails(updateDoc(parentRef(OWNER), { city: 7 }));
  });

  it("an editor, a viewer and an outsider cannot change them", async () => {
    for (const uid of [EDITOR, VIEWER, OUTSIDER]) {
      await assertFails(updateDoc(parentRef(uid), { city: "Thrissur" }));
    }
  });

  it("lastDigestDate is server-only", async () => {
    await assertFails(updateDoc(parentRef(OWNER), { lastDigestDate: "2026-11-04" }));
  });
});

describe("emergency contact note", () => {
  const contact = (note?: unknown) => ({
    label: "Sreeja",
    kind: "neighbour",
    phone: "+919876500001",
    ...(note === undefined ? {} : { note }),
  });

  it("allows a note up to 60 characters and denies a longer or non-string note", async () => {
    await assertSucceeds(updateDoc(parentRef(OWNER), { emergencyContacts: [contact("2 min walk from Amma")] }));
    await assertSucceeds(updateDoc(parentRef(OWNER), { emergencyContacts: [contact("x".repeat(60))] }));
    await assertFails(updateDoc(parentRef(OWNER), { emergencyContacts: [contact("x".repeat(61))] }));
    await assertFails(updateDoc(parentRef(OWNER), { emergencyContacts: [contact(5)] }));
  });
});

describe("medicine display fields", () => {
  const withFields = (over: Record<string, unknown>) => ({ ...medicineDoc(), ...over });

  it("an editor can save frequencyText, pillDescription and purpose", async () => {
    await assertSucceeds(
      setDoc(
        medicineRef(EDITOR),
        withFields({
          frequencyText: "Twice daily · morning and afternoon, after food",
          pillDescription: "Small round white tablet in silver strip",
          purpose: "Sugar",
        }),
      ),
    );
  });

  it("too long text or a wrong type is denied", async () => {
    await assertFails(setDoc(medicineRef(EDITOR), withFields({ frequencyText: "x".repeat(81) })));
    await assertFails(setDoc(medicineRef(EDITOR), withFields({ pillDescription: "x".repeat(81) })));
    await assertFails(setDoc(medicineRef(EDITOR), withFields({ purpose: "x".repeat(41) })));
    await assertFails(setDoc(medicineRef(EDITOR), withFields({ purpose: 3 })));
  });

  it("an unknown extra field is still denied, and a viewer cannot write", async () => {
    await assertFails(setDoc(medicineRef(EDITOR), withFields({ notes: "x" })));
    await assertFails(setDoc(medicineRef(VIEWER), withFields({ purpose: "Sugar" })));
  });
});

describe("server-only fields", () => {
  it("no client can write member profile or preferences", async () => {
    for (const uid of [OWNER, EDITOR, VIEWER]) {
      const ref = doc(asUser(env, uid), `parents/${PARENT}/members/${uid}`);
      await assertFails(updateDoc(ref, { relationship: "Son" }));
      await assertFails(updateDoc(ref, { city: "Bengaluru" }));
      await assertFails(updateDoc(ref, { notify: { missed: false, summary: true, quiet: false } }));
    }
  });

  it("no client can write seenBy on a dose event", async () => {
    for (const uid of [OWNER, EDITOR]) {
      const ref = doc(asUser(env, uid), `parents/${PARENT}/doseEvents/e1`);
      await assertFails(updateDoc(ref, { seenBy: { [uid]: at(11) } }));
    }
  });
});
