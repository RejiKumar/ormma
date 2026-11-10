import { screen } from "@testing-library/react-native";
import { AccessibilityInfo, Text } from "react-native";
import { stackTransition } from "../navigation/transitions";
import { renderApp } from "../test-utils";
import { FADE_IN_MS, FadeIn, fadeStartOpacity } from "./FadeIn";

describe("FadeIn", () => {
  it("renders its children", async () => {
    await renderApp(
      <FadeIn testID="fade">
        <Text>content</Text>
      </FadeIn>,
    );
    expect(screen.getByText("content")).toBeTruthy();
    expect(screen.getByTestId("fade")).toBeTruthy();
  });

  it("starts fully visible under Reduce Motion and transparent otherwise", () => {
    expect(fadeStartOpacity(true)).toBe(1);
    expect(fadeStartOpacity(false)).toBe(0);
  });

  it("still renders its content when the device asks for reduced motion", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    await renderApp(
      <FadeIn testID="fade">
        <Text>content</Text>
      </FadeIn>,
    );
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("uses a duration inside the 150 to 300 ms range", () => {
    expect(FADE_IN_MS).toBeGreaterThanOrEqual(150);
    expect(FADE_IN_MS).toBeLessThanOrEqual(300);
  });
});

describe("stackTransition", () => {
  it("fades for a short, in-range time", () => {
    const options = stackTransition(false);
    expect(options.animation).toBe("fade");
    expect(options.animationDuration).toBeGreaterThanOrEqual(150);
    expect(options.animationDuration).toBeLessThanOrEqual(300);
  });

  it("does not animate under Reduce Motion", () => {
    expect(stackTransition(true)).toEqual({ animation: "none" });
  });
});
