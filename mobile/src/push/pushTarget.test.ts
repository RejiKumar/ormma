import { bannerFromMessage, pushTargetTab } from "./pushTarget";

describe("pushTargetTab", () => {
  it.each(["missed_dose", "unclear_reply", "no_answer", "trend_flag", "weekly_summary", "urgent"])(
    "opens Alerts for a %s alert",
    (type) => {
      expect(pushTargetTab({ type, parentId: "p1" })).toBe("Alerts");
    },
  );

  it("opens Today for the evening digest, unknown types and missing data", () => {
    expect(pushTargetTab({ type: "evening_digest" })).toBe("Today");
    expect(pushTargetTab({ type: "something_new" })).toBe("Today");
    expect(pushTargetTab({ type: 5 })).toBe("Today");
    expect(pushTargetTab(undefined)).toBe("Today");
  });
});

describe("bannerFromMessage", () => {
  it("uses the title and body the server sent, unchanged", () => {
    expect(
      bannerFromMessage({ notification: { title: " Missed dose ", body: "Dose not taken" }, data: { type: "missed_dose" } }),
    ).toEqual({ title: "Missed dose", body: "Dose not taken", data: { type: "missed_dose" } });
  });

  it("returns null when there is no text to show", () => {
    expect(bannerFromMessage({ data: { type: "urgent" } })).toBeNull();
    expect(bannerFromMessage({ notification: { title: " ", body: "" } })).toBeNull();
  });
});
