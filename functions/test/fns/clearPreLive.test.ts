import { initializeApp, getApps } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { clearPreLiveEvents } from "../../src/maintenance/clearPreLive";

beforeAll(() => {
  if (getApps().length === 0) initializeApp({ projectId: "demo-ormma" });
});

const db = () => getFirestore();
let seq = 0;
const unique = (prefix: string): string => `${prefix}_${(seq += 1)}${Math.random().toString(36).slice(2, 8)}`;
const LIVE = Date.parse("2026-12-01T09:00:00+05:30");

async function seed() {
  const parentId = unique("parent");
  await db().doc(`parents/${parentId}`).set({ name: "Amma", active: true });
  const put = (id: string, ms: number, status: string) =>
    db().doc(`parents/${parentId}/doseEvents/${id}`).set({ scheduledFor: Timestamp.fromMillis(ms), status });
  await put("old1", LIVE - 86_400_000, "pending");
  await put("old2", LIVE - 3_600_000, "missed");
  await put("new1", LIVE + 3_600_000, "pending");
  return parentId;
}
const ids = async (parentId: string) => (await db().collection(`parents/${parentId}/doseEvents`).get()).docs.map((d) => d.id).sort();

describe("clearPreLiveEvents (emulator)", () => {
  it("a dry run counts the older events by status and deletes nothing", async () => {
    const parentId = await seed();
    const result = await clearPreLiveEvents({ db: db(), beforeMs: LIVE, apply: false });
    expect(result.found).toBeGreaterThanOrEqual(2);
    expect(result.deleted).toBe(0);
    expect(result.byStatus.pending).toBeGreaterThanOrEqual(1);
    expect(result.byStatus.missed).toBeGreaterThanOrEqual(1);
    expect(await ids(parentId)).toEqual(["new1", "old1", "old2"]);
  });

  it("with apply it deletes only the events scheduled before the instant", async () => {
    const parentId = await seed();
    const result = await clearPreLiveEvents({ db: db(), beforeMs: LIVE, apply: true });
    expect(result.deleted).toBeGreaterThanOrEqual(2);
    expect(await ids(parentId)).toEqual(["new1"]);
  });

  it("running it again finds nothing more for that parent", async () => {
    const parentId = await seed();
    await clearPreLiveEvents({ db: db(), beforeMs: LIVE, apply: true });
    await clearPreLiveEvents({ db: db(), beforeMs: LIVE, apply: true });
    expect(await ids(parentId)).toEqual(["new1"]);
  });

  it("returns counts only, never names or phone numbers", async () => {
    await seed();
    const text = JSON.stringify(await clearPreLiveEvents({ db: db(), beforeMs: LIVE, apply: false }));
    expect(text).not.toContain("Amma");
    expect(text).not.toMatch(/\+91\d+/);
  });
});
