import {
  DATE_PATTERN,
  TIME_PATTERN,
  cleanedTimes,
  medicineCreatePayload,
  medicineUpdatePayload,
  newMedicineId,
  validateMedicineDraft,
  type MedicineDraft,
} from "./medicineInput";

const validDraft: MedicineDraft = {
  name: " Metformin ",
  doseText: " 1 tablet ",
  times: ["08:00", " 20:30 ", ""],
  startDate: "2026-10-22",
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
    });
  });

  it("limits edits to the four form fields", () => {
    expect(medicineUpdatePayload(validDraft)).toEqual({
      name: "Metformin",
      doseText: "1 tablet",
      times: ["08:00", "20:30"],
      startDate: "2026-10-22",
    });
  });

  it("generates a fresh id each time", () => {
    const a = newMedicineId();
    const b = newMedicineId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(8);
  });
});
