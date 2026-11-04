import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { renderApp } from "../test-utils";
import { PRESS_SCALE, PRESS_SHADOW_MS, PRESS_TRANSFORM_MS, PressableScale, pressDuration } from "./PressableScale";

describe("PressableScale", () => {
  it("uses 0.97 scale with 150 ms transform and 200 ms shadow timings", () => {
    expect(PRESS_SCALE).toBe(0.97);
    expect(PRESS_TRANSFORM_MS).toBe(150);
    expect(PRESS_SHADOW_MS).toBe(200);
  });

  it("picks 150 ms in, 200 ms out, and no animation under Reduce Motion", () => {
    expect(pressDuration(1, false)).toBe(150);
    expect(pressDuration(0, false)).toBe(200);
    expect(pressDuration(1, true)).toBe(0);
    expect(pressDuration(0, true)).toBe(0);
  });

  it("is a button that calls onPress and merges the given style", async () => {
    const onPress = jest.fn();
    await renderApp(
      <PressableScale accessibilityRole="button" accessibilityLabel="Go" onPress={onPress} style={{ minHeight: 48 }} />,
    );
    const button = screen.getByRole("button", { name: "Go" });
    expect(StyleSheet.flatten(button.props.style).minHeight).toBe(48);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("calls the press in and out handlers it is given", async () => {
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    await renderApp(
      <PressableScale accessibilityRole="button" accessibilityLabel="Go" onPress={() => undefined} onPressIn={onPressIn} onPressOut={onPressOut} />,
    );
    await fireEvent(screen.getByRole("button"), "pressIn");
    await fireEvent(screen.getByRole("button"), "pressOut");
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPressOut).toHaveBeenCalledTimes(1);
  });

  it("does not react to presses when disabled", async () => {
    const onPress = jest.fn();
    await renderApp(<PressableScale disabled onPress={onPress}><Text>Go</Text></PressableScale>);
    await fireEvent.press(screen.getByText("Go"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
