import {
  buildMissedDoseMessage,
  buildUrgentMessage,
  formatAlertClock,
} from "./templates";

const IST = "Asia/Kolkata";
const at = (iso: string): number => Date.parse(iso);

describe("alert templates", () => {
  it("formats the parent's local clock in 12-hour time", () => {
    expect(formatAlertClock(at("2026-10-23T14:30:00Z"), IST)).toBe("8:00 PM");
    expect(formatAlertClock(at("2026-10-23T02:05:00Z"), IST)).toBe("7:35 AM");
    expect(formatAlertClock(at("2026-10-23T06:30:00Z"), IST)).toBe("12:00 PM");
  });

  it("uses the standard wording with the parent name and local times only", () => {
    const message = buildMissedDoseMessage({
      parentName: "Amma",
      scheduledFor: at("2026-10-23T14:30:00Z"),
      lastAttemptAt: at("2026-10-23T14:35:00Z"),
      timeZone: IST,
      variant: "standard",
    });
    expect(message).toBe(
      "Amma has not confirmed the 8:00 PM tablets. Last attempt at 8:05 PM. Please check.",
    );
    expect(message).not.toMatch(/mg|tablet name|Metformin/i);
  });

  it("has distinct group and system-failure variants", () => {
    const base = {
      parentName: "Amma",
      scheduledFor: at("2026-10-23T14:30:00Z"),
      lastAttemptAt: at("2026-10-23T14:35:00Z"),
      timeZone: IST,
    };
    expect(buildMissedDoseMessage({ ...base, variant: "group_not_all" })).toBe(
      "Amma did not confirm all of the 8:00 PM tablets. Please follow up.",
    );
    expect(buildMissedDoseMessage({ ...base, variant: "system_failure" })).toBe(
      "We could not complete the call to Amma about the 8:00 PM tablets. Please check.",
    );
  });

  it("falls back to a neutral name and the urgent wording is fixed", () => {
    expect(
      buildMissedDoseMessage({
        parentName: "  ",
        scheduledFor: at("2026-10-23T14:30:00Z"),
        lastAttemptAt: at("2026-10-23T14:35:00Z"),
        timeZone: IST,
        variant: "standard",
      }),
    ).toContain("The parent has not confirmed");
    expect(buildUrgentMessage("Amma")).toBe(
      "Amma mentioned something urgent. Please call them now.",
    );
  });
});
