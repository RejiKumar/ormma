#!/usr/bin/env node
// Seeds the local Firebase emulators with demo data for the signed-in device:
//   npm run emulators        (in one terminal)
//   npm run seed             (in another)
// It reads `users/*` over the Firestore emulator REST API, and per user creates two parents
// (the user is the owner member), medicines, today's dose events in every status and recent alerts.
// With no users it seeds `demo-user` and prints how to sign in as that account.
// Health values in this script are template-style demo text only (no real readings).

const PROJECT = "demo-ormma";
const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const BASE = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const IST_OFFSET_MIN = 330;

const str = (value) => ({ stringValue: value });
const int = (value) => ({ integerValue: String(value) });
const bool = (value) => ({ booleanValue: value });
const nullValue = () => ({ nullValue: null });
const timestamp = (ms) => ({ timestampValue: new Date(ms).toISOString() });
const array = (values) => ({ arrayValue: { values } });
const map = (fields) => ({ mapValue: { fields } });

function fail(message) {
  console.error(`seed: ${message}`);
  process.exit(1);
}

async function request(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    // The emulator honours the admin bypass token: rules do not apply to seeding.
    headers: { "content-type": "application/json", authorization: "Bearer owner" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) fail(`${method} ${path} failed (${response.status}): ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

/** PATCH with an update mask so re-running the seed overwrites cleanly. */
async function setDoc(path, fields) {
  const mask = Object.keys(fields)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  return request("PATCH", `/${path}?${mask}`, { fields });
}

async function getDoc(path) {
  const response = await fetch(`${BASE}/${path}`, { headers: { authorization: "Bearer owner" } });
  if (response.status === 404) return null;
  if (!response.ok) fail(`GET ${path} failed (${response.status})`);
  return response.json();
}

/** All document ids in `users`, via runQuery. */
async function listUserIds() {
  const rows = await request("POST", ":runQuery", {
    structuredQuery: { from: [{ collectionId: "users" }] },
  });
  return (rows ?? [])
    .filter((row) => row.document)
    .map((row) => row.document.name.split("/").pop());
}

/** Today's calendar date in Asia/Kolkata, as epoch ms for the given local hour/minute. */
function istToday(hour, minute = 0) {
  const local = new Date(Date.now() + IST_OFFSET_MIN * 60_000);
  return (
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour, minute) -
    IST_OFFSET_MIN * 60_000
  );
}

const PARENTS = [
  {
    key: "amma",
    name: "Amma",
    phoneNumber: "+919876500001",
    medicines: [
      { id: "seed-metformin", name: "Metformin", doseText: "1 tablet", times: ["08:00", "20:00"] },
      { id: "seed-amlodipine", name: "Amlodipine", doseText: "5 mg", times: ["09:00"] },
    ],
  },
  {
    key: "appa",
    name: "Appa",
    phoneNumber: "+919876500002",
    medicines: [
      { id: "seed-atorvastatin", name: "Atorvastatin", doseText: "1 tablet", times: ["21:00"] },
    ],
  },
];

const STATUSES = ["taken", "pending", "calling", "missed", "not_taken", "no_answer", "unclear"];
const STATUS_HOURS = [7, 10, 12, 14, 16, 18, 19];

async function seedParent(uid, parent) {
  const parentId = `seed-${uid}-${parent.key}`;
  const now = Date.now();
  const today = istToday(0);
  const consentedAt = now - 7 * 24 * 60 * 60 * 1000;

  await setDoc(`parents/${parentId}`, {
    name: str(parent.name),
    phoneNumber: str(parent.phoneNumber),
    language: str("ml-IN"),
    timezone: str("Asia/Kolkata"),
    consent: map({
      status: str("granted"),
      grantedAt: timestamp(consentedAt),
      revokedAt: nullValue(),
      regrantedAt: nullValue(),
    }),
    createdAt: timestamp(consentedAt),
  });
  await setDoc(`parents/${parentId}/members/${uid}`, {
    role: str("owner"),
    joinedAt: timestamp(consentedAt),
  });

  for (const medicine of parent.medicines) {
    const medicineId = `${parentId}-${medicine.id}`;
    await setDoc(`parents/${parentId}/medicines/${medicineId}`, {
      name: str(medicine.name),
      doseText: str(medicine.doseText),
      times: array(medicine.times.map(str)),
      startDate: str(new Date(today).toISOString().slice(0, 10)),
      endDate: nullValue(),
      active: bool(true),
      source: str("manual"),
      confirmedByHuman: bool(true),
      prescriptionId: nullValue(),
      createdBy: str(uid),
      createdAt: timestamp(now),
    });
  }

  let eventIndex = 0;
  for (const status of STATUSES) {
    eventIndex += 1;
    const medicine = parent.medicines[eventIndex % parent.medicines.length];
    const scheduledFor = istToday(STATUS_HOURS[STATUS_HOURS.length - 1 - (eventIndex % STATUS_HOURS.length)]);
    await setDoc(`parents/${parentId}/doseEvents/seed-e${eventIndex}`, {
      medicineId: str(`${parentId}-${medicine.id}`),
      scheduledFor: timestamp(scheduledFor),
      status: str(status),
      source: str("scheduler"),
      attemptCount: int(status === "pending" ? 0 : 1),
      createdAt: timestamp(today),
      updatedAt: timestamp(now),
    });
  }

  const alerts = [
    { id: "seed-a1", type: "missed_dose", message: "A dose was missed at 8pm.", ageMinutes: 90 },
    { id: "seed-a2", type: "no_answer", message: "A call was not answered at 9pm.", ageMinutes: 35 },
  ];
  for (const alert of alerts) {
    await setDoc(`parents/${parentId}/alerts/${alert.id}`, {
      type: str(alert.type),
      message: str(alert.message),
      relatedEventId: str("seed-e4"),
      createdAt: timestamp(now - alert.ageMinutes * 60_000),
      readBy: array([]),
    });
  }

  return { parentId, name: parent.name };
}

async function seedForUser(uid) {
  const parents = [];
  for (const parent of PARENTS) parents.push(await seedParent(uid, parent));
  return parents;
}

async function verify(uid, seeded) {
  for (const { parentId, name } of seeded) {
    const parentDoc = await getDoc(`parents/${parentId}`);
    if (!parentDoc) fail(`verify: parent ${parentId} missing`);

    const events = await request("GET", `/parents/${parentId}/doseEvents`);
    const eventCount = (events.documents ?? []).length;
    if (eventCount !== STATUSES.length) fail(`verify: ${parentId} has ${eventCount} dose events`);

    const alerts = await request("GET", `/parents/${parentId}/alerts`);
    const alertCount = (alerts.documents ?? []).length;
    if (alertCount < 2) fail(`verify: ${parentId} has ${alertCount} alerts`);

    const member = await getDoc(`parents/${parentId}/members/${uid}`);
    if (!member) fail(`verify: ${parentId} member ${uid} missing`);

    console.log(`  ${name}: ${parentId} (${eventCount} events, ${alertCount} alerts)`);
  }
}

async function main() {
  const userIds = await listUserIds();
  if (userIds.length === 0) {
    console.log("seed: no users found in the emulator; creating demo-user");
    await setDoc("users/demo-user", {
      displayName: str("Demo user"),
      phoneNumber: str("+919876500000"),
      fcmTokens: array([]),
      createdAt: timestamp(Date.now()),
    });
    userIds.push("demo-user");
  }

  console.log(`seed: emulator ${HOST} (project ${PROJECT})`);
  for (const uid of userIds) {
    console.log(`seed: user ${uid}`);
    const seeded = await seedForUser(uid);
    await verify(uid, seeded);
  }
  console.log("seed: done. Sign in with the demo phone +919876500000 and the code 123456 (auth emulator).");
  console.log("seed: Android emulator needs EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2 (see docs/SETUP.md).");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
