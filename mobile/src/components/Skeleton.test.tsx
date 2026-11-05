import { AccessibilityInfo, StyleSheet } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
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

  it("sweeps a highlight across the block on a repeating 1.5 s timing", async () => {
    const repeat = jest.spyOn(Reanimated, "withRepeat");
    await renderApp(<Skeleton testID="s" width={120} height={20} />);
    expect(repeat).toHaveBeenCalled();
    fireEvent(screen.getByTestId("s", { includeHiddenElements: true }), "layout", { nativeEvent: { layout: { width: 120, height: 20 } } });
    await waitFor(() => expect(screen.getByTestId("skeleton-shimmer", { includeHiddenElements: true })).toBeTruthy());
  });

  it("is a still block under Reduce Motion: no repeat, no shimmer layer", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    await renderApp(<Skeleton testID="s" />);
    const el = screen.getByTestId("s", { includeHiddenElements: true });
    await waitFor(() => fireEvent(el, "layout", { nativeEvent: { layout: { width: 100, height: 16 } } }));
    expect(screen.queryByTestId("skeleton-shimmer", { includeHiddenElements: true })).toBeNull();
  });
});
