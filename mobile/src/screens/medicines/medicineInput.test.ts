import {
  DATE_PATTERN,
  TIME_PATTERN,
  cleanedTimes,
  medicineCreatePayload,
  medicineUpdatePayload,
  newMedicineId,
  validateMedicineDraft,
  prefillFromLastMedicine,
  type MedicineDraft,
} from "./medicineInput";

const validDraft: MedicineDraft = {
  name: " Metformin ",
  doseText: " 1 tablet ",
  times: ["08:00", " 20:30 ", ""],
  startDate: "2026-10-22",
  frequencyText: " Twice daily, after food ",
  pillDescription: "Small round white tablet",
  purpose: "Sugar",
};

describe("medicineInput", () => {
  it("accepts 24-hour times and ISO dates only", () => {
    expect(TIME_PATTERN.test("08:00")).toBe(true);
    expect(TIME_PATTERN.test("23:59")).toBe(true);
    expect(TIME_PATTERN.test("24:00")).toBe(false);
    expect(TIME_PATTERN.test("8:00")).toBe(false);
    expect(DATE_PATTERN.test("2026-10-22")).toBe(true);
    expect(DATE_PATTERN.test("22-10-2026")).toBe(false);
  });

  it("drops blank time rows before validating and storing", () => {
    expect(cleanedTimes(validDraft)).toEqual(["08:00", "20:30"]);
    expect(validateMedicineDraft(validDraft)).toBeNull();
    expect(validateMedicineDraft({ ...validDraft, times: ["", " "] })).toBe("noTimes");
  });

  it("returns the first failing rule in display order", () => {
    expect(validateMedicineDraft({ ...validDraft, name: "  " })).toBe("nameRequired");
    expect(validateMedicineDraft({ ...validDraft, times: ["7:5"] })).toBe("invalidTime");
    expect(validateMedicineDraft({ ...validDraft, startDate: "today" })).toBe("invalidDate");
  });

  it("builds the human-confirmed manual create payload the rules accept", () => {
    expect(medicineCreatePayload(validDraft, "u1", "NOW")).toEqual({
      name: "Metformin",
      doseText: "1 tablet",
      times: ["08:00", "20:30"],
      startDate: "2026-10-22",
      endDate: null,
      active: true,
      source: "manual",
      confirmedByHuman: true,
      prescriptionId: null,
      createdBy: "u1",
      createdAt: "NOW",
      frequencyText: "Twice daily, after food",
      pillDescription: "Small round white tablet",
      purpose: "Sugar",
    });
  });

  it("limits edits to the form fields", () => {
    expect(medicineUpdatePayload(validDraft)).toEqual({
      name: "Metformin",
      doseText: "1 tablet",
      times: ["08:00", "20:30"],
      startDate: "2026-10-22",
      frequencyText: "Twice daily, after food",
      pillDescription: "Small round white tablet",
      purpose: "Sugar",
    });
  });

  it("accepts display text up to 1000 characters and the former 40 and 80 limits", () => {
    expect(validateMedicineDraft({ ...validDraft, purpose: "x".repeat(1000) })).toBeNull();
    expect(validateMedicineDraft({ ...validDraft, frequencyText: "x".repeat(81) })).toBeNull();
    expect(validateMedicineDraft({ ...validDraft, pillDescription: "x".repeat(81) })).toBeNull();
  });

  it("rejects display text that is too long", () => {
    expect(validateMedicineDraft({ ...validDraft, purpose: "x".repeat(1001) })).toBe("textTooLong");
    expect(validateMedicineDraft({ ...validDraft, frequencyText: "x".repeat(1001) })).toBe("textTooLong");
    expect(validateMedicineDraft({ ...validDraft, pillDescription: "x".repeat(1001) })).toBe("textTooLong");
  });

  it("generates a fresh id each time", () => {
    const a = newMedicineId();
    const b = newMedicineId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(8);
  });
});

describe("prefillFromLastMedicine", () => {
  const base = { doseText: "", times: ["08:00"], startDate: "2026-11-13", frequencyText: "", pillDescription: "", purpose: "" };

  it("is null without medicines", () => {
    expect(prefillFromLastMedicine([], "2026-11-13")).toBeNull();
  });

  it("copies everything but the name from the most recently created medicine", () => {
    const filled = prefillFromLastMedicine(
      [
        { ...base, createdAtMs: 1, doseText: "old", purpose: "old" },
        { ...base, createdAtMs: 9, doseText: "500mg", times: ["08:00", "20:00"], purpose: "Sugar" },
      ],
      "2026-11-13",
    );
    expect(filled).toMatchObject({ name: "", doseText: "500mg", times: ["08:00", "20:00"], purpose: "Sugar" });
  });

  it("uses today for a past start date and keeps a future one", () => {
    expect(prefillFromLastMedicine([{ ...base, createdAtMs: 1, startDate: "2020-01-01" }], "2026-11-13")?.startDate).toBe("2026-11-13");
    expect(prefillFromLastMedicine([{ ...base, createdAtMs: 1, startDate: "2027-01-01" }], "2026-11-13")?.startDate).toBe("2027-01-01");
  });
});
