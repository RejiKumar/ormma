import { SCHEDULE_FIELDS, scheduleChanged } from "./generateOnMedicine";

const medicine = {
  name: "Vitamin",
  doseText: "1",
  times: ["20:18"],
  startDate: "2026-11-13",
  endDate: null,
  active: true,
  confirmedByHuman: true,
};

describe("scheduleChanged", () => {
  it("is true for a new medicine", () => {
    expect(scheduleChanged(undefined, medicine)).toBe(true);
  });

  it("is false for a deletion and for a write with nothing", () => {
    expect(scheduleChanged(medicine, undefined)).toBe(false);
    expect(scheduleChanged(undefined, undefined)).toBe(false);
  });

  it.each([
    ["a time added", { times: ["20:18", "21:30"] }],
    ["a time changed", { times: ["20:45"] }],
    ["a time removed", { times: [] }],
    ["the start date", { startDate: "2026-11-14" }],
    ["the end date", { endDate: "2026-12-01" }],
    ["deactivated", { active: false }],
    ["no longer confirmed", { confirmedByHuman: false }],
  ])("is true when %s", (_name, patch) => {
    expect(scheduleChanged(medicine, { ...medicine, ...patch })).toBe(true);
  });

  it.each([
    ["the name", { name: "Vitamin D" }],
    ["the dose", { doseText: "2 tablets" }],
    ["a display note", { purpose: "Bones" }],
    ["nothing", {}],
  ])("is false when only %s changed", (_name, patch) => {
    expect(scheduleChanged(medicine, { ...medicine, ...patch })).toBe(false);
  });

  it("treats the same times in the same order as unchanged, and a missing end date as null", () => {
    expect(scheduleChanged({ ...medicine, times: ["20:18", "21:30"] }, { ...medicine, times: ["20:18", "21:30"] })).toBe(false);
    expect(scheduleChanged({ ...medicine, endDate: undefined as never }, { ...medicine, endDate: null })).toBe(false);
  });

  it("lists exactly the fields that decide the events", () => {
    expect([...SCHEDULE_FIELDS].sort()).toEqual(["active", "confirmedByHuman", "endDate", "startDate", "times"]);
  });
});
