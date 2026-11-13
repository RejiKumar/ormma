/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles */

import { getDb } from "../db";
import {
  confirmPrescriptionMedicineHandler,
  isOwnPrescriptionPath,
  resolveBucket,
  scanPrescriptionHandler,
} from "./index";
import { createPrescriptionReview, scanPrescriptionImage } from "./scan";

jest.mock("./scan");
// The handler reads its database through getDb(); hand it the test double so no real Firestore is needed.
jest.mock("../db");

interface DbOptions {
  role?: "owner" | "editor" | "viewer" | null;
  rxStatus?: string | null;
}

function makeDb({ role = "owner", rxStatus = "pending_review" }: DbOptions = {}) {
  const set = jest.fn().mockResolvedValue(undefined);
  const rxSet = jest.fn().mockResolvedValue(undefined);
  const db: any = {
    doc: jest.fn((path: string) => {
      if (path.includes("prescriptions/")) {
        return {
          set: rxSet,
          get: async () => ({ exists: rxStatus !== null, data: () => ({ status: rxStatus }) }),
        };
      }
      return {
        get: async () => ({ exists: role !== null, data: () => ({ role }) }),
      };
    }),
    collection: () => ({ doc: () => ({ set, id: "m1" }) }),
  };
  (getDb as jest.Mock).mockReturnValue(db);
  return { set, rxSet };
}

const goodMedicine = { name: "Metformin", doseText: "500mg", frequencyText: null, times: ["08:00"] };
const confirmReq = (over: Record<string, unknown> = {}, uid: string | null = "uid1") =>
  ({
    auth: uid ? { uid } : undefined,
    data: { parentId: "p1", prescriptionId: "rx1", medicine: goodMedicine, startDate: "2026-11-13", ...over },
  }) as any;

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return "no-error";
};

describe("confirmPrescriptionMedicine", () => {
  it("creates a prescription_scan medicine confirmed by the human, with the given times and date", async () => {
    const { set, rxSet } = makeDb();
    const result = await confirmPrescriptionMedicineHandler(confirmReq());
    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0][0]).toMatchObject({
      name: "Metformin",
      doseText: "500mg",
      times: ["08:00"],
      startDate: "2026-11-13",
      source: "prescription_scan",
      confirmedByHuman: true,
      prescriptionId: "rx1",
      createdBy: "uid1",
    });
    expect(rxSet).toHaveBeenCalledWith({ status: "confirmed" }, { merge: true });
    expect(result.medicineId).toBeDefined();
  });

  it("is unauthenticated when signed out", async () => {
    makeDb();
    expect(await codeOf(confirmPrescriptionMedicineHandler(confirmReq({}, null)))).toBe("unauthenticated");
  });

  it("is permission-denied for a viewer and for a non-member", async () => {
    makeDb({ role: "viewer" });
    expect(await codeOf(confirmPrescriptionMedicineHandler(confirmReq()))).toBe("permission-denied");
    makeDb({ role: null });
    expect(await codeOf(confirmPrescriptionMedicineHandler(confirmReq()))).toBe("permission-denied");
  });

  it("is invalid-argument without a name, a time or a start date, and never defaults them", async () => {
    const { set } = makeDb();
    const bad: Record<string, unknown>[] = [
      { medicine: { ...goodMedicine, name: "  " } },
      { medicine: { ...goodMedicine, times: null } },
      { medicine: { ...goodMedicine, times: [] } },
      { medicine: { ...goodMedicine, times: ["8am"] } },
      { medicine: { ...goodMedicine, times: ["25:00"] } },
      { startDate: undefined },
      { startDate: "13-11-2026" },
      { parentId: "../x" },
    ];
    for (const over of bad) {
      expect(await codeOf(confirmPrescriptionMedicineHandler(confirmReq(over)))).toBe("invalid-argument");
    }
    expect(set).not.toHaveBeenCalled();
  });

  it("is failed-precondition when the prescription is missing or discarded", async () => {
    const { set } = makeDb({ rxStatus: null });
    expect(await codeOf(confirmPrescriptionMedicineHandler(confirmReq()))).toBe("failed-precondition");
    makeDb({ rxStatus: "discarded" });
    expect(await codeOf(confirmPrescriptionMedicineHandler(confirmReq()))).toBe("failed-precondition");
    expect(set).not.toHaveBeenCalled();
  });
});

describe("scanPrescription", () => {
  const scanReq = (over: Record<string, unknown> = {}, uid: string | null = "uid1") =>
    ({ auth: uid ? { uid } : undefined, data: { parentId: "p1", storagePath: "prescriptions/p1/a.jpg", ...over } }) as any;

  beforeEach(() => {
    process.env.FIREBASE_STORAGE_BUCKET = "bucket";
    (scanPrescriptionImage as jest.Mock).mockResolvedValue({
      ok: true,
      extracted: { doctor: null, date: null, medicines: [{ name: "A" }], overallConfidence: 0.9 },
    });
    (createPrescriptionReview as jest.Mock).mockResolvedValue("rx9");
  });

  it("reads the parent's own image and returns the count", async () => {
    makeDb({ role: "editor" });
    const result = await scanPrescriptionHandler(scanReq(), "key");
    expect(result).toMatchObject({ prescriptionId: "rx9", status: "pending_review", medicineCount: 1 });
  });

  it("uses typed codes for signed out, viewer and malformed calls", async () => {
    makeDb();
    expect(await codeOf(scanPrescriptionHandler(scanReq({}, null), "key"))).toBe("unauthenticated");
    expect(await codeOf(scanPrescriptionHandler(scanReq({ storagePath: 5 }), "key"))).toBe("invalid-argument");
    makeDb({ role: "viewer" });
    expect(await codeOf(scanPrescriptionHandler(scanReq(), "key"))).toBe("permission-denied");
  });

  it("refuses another parent's image and reads nothing", async () => {
    makeDb();
    (scanPrescriptionImage as jest.Mock).mockClear();
    expect(await codeOf(scanPrescriptionHandler(scanReq({ storagePath: "prescriptions/p2/a.jpg" }), "key"))).toBe("invalid-argument");
    expect(scanPrescriptionImage).not.toHaveBeenCalled();
  });
});

describe("isOwnPrescriptionPath", () => {
  it("accepts only the parent's own folder", () => {
    expect(isOwnPrescriptionPath("p1", "prescriptions/p1/a.jpg")).toBe(true);
    expect(isOwnPrescriptionPath("p1", "prescriptions/p1/")).toBe(false);
    expect(isOwnPrescriptionPath("p1", "prescriptions/p2/a.jpg")).toBe(false);
    expect(isOwnPrescriptionPath("p1", "prescriptions/p1/../p2/a.jpg")).toBe(false);
    expect(isOwnPrescriptionPath("p1", "/prescriptions/p1/a.jpg")).toBe(false);
    expect(isOwnPrescriptionPath("p1", "prescriptions/p1\\a.jpg")).toBe(false);
    expect(isOwnPrescriptionPath("p1", "transcripts/p1/a.jpg")).toBe(false);
  });
});

describe("resolveBucket", () => {
  it("prefers the plain variables, then the bucket in FIREBASE_CONFIG", () => {
    expect(resolveBucket({ FIREBASE_STORAGE_BUCKET: "a" } as never)).toBe("a");
    expect(resolveBucket({ STORAGE_BUCKET: "b" } as never)).toBe("b");
    expect(
      resolveBucket({ FIREBASE_CONFIG: JSON.stringify({ projectId: "p", storageBucket: "p.firebasestorage.app" }) } as never),
    ).toBe("p.firebasestorage.app");
  });

  it("is null when nothing names a bucket or the config is not JSON", () => {
    expect(resolveBucket({} as never)).toBeNull();
    expect(resolveBucket({ FIREBASE_CONFIG: "not json" } as never)).toBeNull();
    expect(resolveBucket({ FIREBASE_CONFIG: "{}" } as never)).toBeNull();
  });
});
