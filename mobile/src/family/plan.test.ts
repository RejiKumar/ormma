import { GRACE_MS, planOf } from "./plan";

const END = Date.UTC(2026, 11, 1);
const DAY = 86_400_000;

describe("planOf (display copy of the server rules)", () => {
  it("matches the server at the boundaries", () => {
    expect(planOf(null, END)).toBe("free");
    expect(planOf({ status: "active", expiresAtMs: END }, END - 1)).toBe("family");
    expect(planOf({ status: "cancelled", expiresAtMs: END }, END - 1)).toBe("family");
    expect(planOf({ status: "expired", expiresAtMs: END }, END + 3 * DAY)).toBe("family");
    expect(planOf({ status: "expired", expiresAtMs: END }, END + GRACE_MS)).toBe("free");
    expect(planOf({ status: "refunded", expiresAtMs: END + 30 * DAY }, END)).toBe("free");
    expect(planOf({ status: "expired", expiresAtMs: END }, END - DAY)).toBe("free");
  });
});
