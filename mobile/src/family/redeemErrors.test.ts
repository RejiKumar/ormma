import { redeemErrorKey } from "./redeemErrors";

const error = (code: string, message = "x") => ({ code: `functions/${code}`, message });

describe("redeemErrorKey", () => {
  it("maps invalid-argument to invalidFormat", () => {
    expect(redeemErrorKey(error("invalid-argument"))).toBe("invalidFormat");
  });

  it("maps not-found to unknown", () => {
    expect(redeemErrorKey(error("not-found"))).toBe("unknown");
  });

  it("tells the failed-precondition trio apart by message (decision #58)", () => {
    expect(redeemErrorKey(error("failed-precondition", "This invite code was already used."))).toBe(
      "used",
    );
    expect(redeemErrorKey(error("failed-precondition", "This invite code has expired."))).toBe(
      "expired",
    );
    expect(
      redeemErrorKey(error("failed-precondition", "You are already a member of this family.")),
    ).toBe("alreadyMember");
  });

  it("falls back to failed for other failed-precondition messages", () => {
    expect(redeemErrorKey(error("failed-precondition", "Something else."))).toBe("failed");
  });

  it("falls back to failed for other codes and non-objects", () => {
    expect(redeemErrorKey(error("unauthenticated"))).toBe("failed");
    expect(redeemErrorKey(error("internal"))).toBe("failed");
    expect(redeemErrorKey(null)).toBe("failed");
    expect(redeemErrorKey(undefined)).toBe("failed");
    expect(redeemErrorKey("plain string")).toBe("failed");
  });

  it("matches codes with or without the functions/ prefix", () => {
    expect(redeemErrorKey({ code: "failed-precondition", message: "has expired" })).toBe("expired");
  });
});
