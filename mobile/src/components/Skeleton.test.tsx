import { AccessibilityInfo, StyleSheet } from "react-native";
import { screen, waitFor } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import { lightColors } from "../design/tokens";
import { renderApp } from "../test-utils";
import { Skeleton } from "./Skeleton";

afterEach(() => jest.restoreAllMocks());

describe("Skeleton", () => {
  it("is a static placeholder tinted with the alt surface colour, hidden from screen readers", async () => {
    await renderApp(<Skeleton testID="s" width={120} height={20} />);
    const el = screen.getByTestId("s", { includeHiddenElements: true });
    const style = StyleSheet.flatten(el.props.style);
    expect(style.backgroundColor).toBe(lightColors.surfaceAlt);
    expect(style.width).toBe(120);
    expect(style.height).toBe(20);
    expect(el.props.accessibilityElementsHidden).toBe(true);
  });

  it("never loops: it fades in once with a spring and uses no repeat or shimmer", async () => {
    const repeat = jest.spyOn(Reanimated, "withRepeat");
    const spring = jest.spyOn(Reanimated, "withSpring");
    await renderApp(<Skeleton />);
    expect(spring).toHaveBeenCalled();
    expect(repeat).not.toHaveBeenCalled();
  });

  it("shows immediately without a spring under Reduce Motion", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const spring = jest.spyOn(Reanimated, "withSpring");
    await renderApp(<Skeleton />);
    await waitFor(() =>
      expect(screen.getByTestId("skeleton", { includeHiddenElements: true })).toBeTruthy(),
    );
    spring.mockClear();
    await waitFor(() => expect(spring).not.toHaveBeenCalled());
  });
});
