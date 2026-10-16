// Storage rules: "Storage rules for prescriptions" and "Storage rules for transcripts".
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { createEnv, EDITOR, OUTSIDER, OWNER, PARENT, seed, VIEWER } from "./helpers";

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await seed(env);
});

const MB = 1024 * 1024;
const png = new Uint8Array([137, 80, 78, 71]);
const imgPath = `prescriptions/${PARENT}/rx1.png`;
const store = (uid: string) => env.authenticatedContext(uid).storage();

async function putFile(path: string, bytes: Uint8Array, contentType: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), path), bytes, { contentType });
  });
}

describe("Storage rules for prescriptions", () => {
  it("owner and editor upload an image; viewers, non-members and anonymous users cannot", async () => {
    await assertSucceeds(
      uploadBytes(ref(store(EDITOR), imgPath), png, { contentType: "image/png" }),
    );
    await assertSucceeds(
      uploadBytes(ref(store(OWNER), `prescriptions/${PARENT}/rx2.png`), png, {
        contentType: "image/jpeg",
      }),
    );
    await assertFails(
      uploadBytes(ref(store(VIEWER), `prescriptions/${PARENT}/v.png`), png, {
        contentType: "image/png",
      }),
    );
    await assertFails(
      uploadBytes(ref(store(OUTSIDER), `prescriptions/${PARENT}/o.png`), png, {
        contentType: "image/png",
      }),
    );
    await assertFails(
      uploadBytes(
        ref(env.unauthenticatedContext().storage(), `prescriptions/${PARENT}/u.png`),
        png,
        {
          contentType: "image/png",
        },
      ),
    );
  });

  it("images only: other content types are denied", async () => {
    for (const contentType of ["application/pdf", "text/plain", "application/octet-stream"]) {
      await assertFails(
        uploadBytes(ref(store(EDITOR), `prescriptions/${PARENT}/x.bin`), png, { contentType }),
      );
    }
  });

  it("max 10 MB: exactly 10 MB is allowed, one byte more is denied", async () => {
    await assertSucceeds(
      uploadBytes(
        ref(store(EDITOR), `prescriptions/${PARENT}/big-ok.png`),
        new Uint8Array(10 * MB),
        {
          contentType: "image/png",
        },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(store(EDITOR), `prescriptions/${PARENT}/big-bad.png`),
        new Uint8Array(10 * MB + 1),
        {
          contentType: "image/png",
        },
      ),
    );
  });

  it("only owner and editor of that parent can read; a member of another parent cannot write here", async () => {
    await putFile(imgPath, png, "image/png");
    await assertSucceeds(getBytes(ref(store(EDITOR), imgPath)));
    await assertSucceeds(getBytes(ref(store(OWNER), imgPath)));
    await assertFails(getBytes(ref(store(VIEWER), imgPath)));
    await assertFails(getBytes(ref(store(OUTSIDER), imgPath)));
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), imgPath)));
    // outsider owns parent p2 only
    await assertSucceeds(
      uploadBytes(ref(store(OUTSIDER), "prescriptions/p2/own.png"), png, {
        contentType: "image/png",
      }),
    );
    await assertFails(
      uploadBytes(ref(store(OUTSIDER), `prescriptions/${PARENT}/own.png`), png, {
        contentType: "image/png",
      }),
    );
  });

  it("a removed member loses Storage access immediately", async () => {
    await putFile(imgPath, png, "image/png");
    await assertSucceeds(getBytes(ref(store(EDITOR), imgPath)));
    await env.withSecurityRulesDisabled(async (ctx) => {
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(ctx.firestore(), `parents/${PARENT}/members/${EDITOR}`));
    });
    await assertFails(getBytes(ref(store(EDITOR), imgPath)));
  });
});

describe("Storage rules for transcripts and everything else", () => {
  it("no client can read or write /transcripts/*, not even the owner", async () => {
    await putFile("transcripts/review/t1.txt", new Uint8Array([1]), "text/plain");
    for (const uid of [OWNER, EDITOR, VIEWER, OUTSIDER]) {
      await assertFails(getBytes(ref(store(uid), "transcripts/review/t1.txt")));
      await assertFails(
        uploadBytes(ref(store(uid), "transcripts/review/t2.txt"), new Uint8Array([1]), {
          contentType: "text/plain",
        }),
      );
    }
    await assertFails(
      getBytes(ref(env.unauthenticatedContext().storage(), "transcripts/review/t1.txt")),
    );
  });

  it("paths outside the rules are denied", async () => {
    await assertFails(
      uploadBytes(ref(store(OWNER), "other/x.png"), png, { contentType: "image/png" }),
    );
    await assertFails(uploadBytes(ref(store(OWNER), "x.png"), png, { contentType: "image/png" }));
  });
});
