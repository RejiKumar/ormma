import { medicineNoLongerCalls } from "./medicineGate";
import { zonedTimeToMs } from "./time";

const IST = "Asia/Kolkata";
const at = (time: string) => zonedTimeToMs("2026-11-13", time, IST)!;
const medicine = { active: true, confirmedByHuman: true, times: ["20:18", "21:30"] };

describe("medicineNoLongerCalls", () => {
  it("is false while the medicine is active, confirmed and lists the time", () => {
    expect(medicineNoLongerCalls(medicine, at("20:18"), IST)).toBe(false);
    expect(medicineNoLongerCalls(medicine, at("21:30"), IST)).toBe(false);
  });

  it("is true when the time was removed, the medicine deactivated or no longer confirmed", () => {
    expect(medicineNoLongerCalls({ ...medicine, times: ["21:30"] }, at("20:18"), IST)).toBe(true);
    expect(medicineNoLongerCalls({ ...medicine, active: false }, at("20:18"), IST)).toBe(true);
    expect(medicineNoLongerCalls({ ...medicine, confirmedByHuman: false }, at("20:18"), IST)).toBe(true);
  });

  it("reads the time in the parent's time zone", () => {
    expect(medicineNoLongerCalls(medicine, at("20:18"), "UTC")).toBe(true);
  });

  it("is false when the medicine cannot be found, so existing behaviour is kept", () => {
    expect(medicineNoLongerCalls(undefined, at("20:18"), IST)).toBe(false);
  });
});
