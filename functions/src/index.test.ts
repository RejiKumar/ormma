import { SUPPORTED_LANGUAGES } from "./index";

describe("functions entry", () => {
  it("loads", () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(4);
  });
});
