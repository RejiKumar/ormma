import { createPrescriptionReview } from "./scan";
import { confirmPrescriptionMedicineHandler } from "./index";

jest.mock("./scan");

describe("prescription handlers", () => {
  it("confirmPrescriptionMedicine creates medicine with prescription_scan and confirmedByHuman true", async () => {
    const set = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);
    const db: any = {
      doc: (path: string) => ({
        get: async () => ({
          exists: path.includes("members/uid1"),
          data: () => ({ role: "owner" }),
        }),
      }),
      collection: () => ({
        doc: () => ({ set }),
      }),
    };
    db.doc = jest.fn((path: string) => {
      if (path.includes("prescriptions/")) return { set: update };
      return {
        get: async () => ({
          exists: path.includes("members/uid1"),
          data: () => ({ role: "owner" }),
        }),
      };
    });

    const result = await confirmPrescriptionMedicineHandler({
      auth: { uid: "uid1" },
      data: {
        parentId: "p1",
        prescriptionId: "rx1",
        medicine: { name: "Metformin", doseText: "500mg", frequencyText: null, times: ["08:00"] },
      },
    } as any);

    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0][0]).toMatchObject({
      name: "Metformin",
      source: "prescription_scan",
      confirmedByHuman: true,
      prescriptionId: "rx1",
      createdBy: "uid1",
    });
    expect(update).toHaveBeenCalledWith({ status: "confirmed" }, { merge: true });
    expect(result.medicineId).toBeDefined();
  });
});
