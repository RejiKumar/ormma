import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { asUser, createEnv, OWNER, OUTSIDER, seed } from "./helpers";

/**
 * How the mobile app lists "my parents": rules deny any collection query whose results cannot be
 * proven member-readable (bare list, field filters), so the client queries known ids with a
 * documentId 'in' clause. Documented in docs/DECISIONS.md (#57).
 */
describe("parents listing queries", () => {
  let env: Awaited<ReturnType<typeof createEnv>>;

  beforeAll(async () => {
    env = await createEnv();
    await seed(env);
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("denies a bare parents list", async () => {
    const owner = asUser(env, OWNER);
    await assertFails(getDocs(collection(owner, "parents")));
  });

  it("denies a parents list filtered by createdBy", async () => {
    const owner = asUser(env, OWNER);
    await assertFails(getDocs(query(collection(owner, "parents"), where("createdBy", "==", OWNER))));
  });

  it("allows a documentId in query over ids the caller is a member of", async () => {
    const owner = asUser(env, OWNER);
    await assertSucceeds(
      getDocs(query(collection(owner, "parents"), where(documentId(), "in", ["p1"]))),
    );
  });

  it("denies a documentId in query that includes an id the caller is not a member of", async () => {
    const owner = asUser(env, OWNER);
    await assertFails(
      getDocs(query(collection(owner, "parents"), where(documentId(), "in", ["p1", "p2"]))),
    );
  });

  it("denies a documentId in query for a parent the caller is not a member of", async () => {
    const outsider = asUser(env, OUTSIDER);
    await assertFails(getDocs(query(collection(outsider, "parents"), where(documentId(), "in", ["p1"]))));
  });
});
