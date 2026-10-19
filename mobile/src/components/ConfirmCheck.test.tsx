import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import * as Reanimated from "react-native-reanimated";
import { lightColors } from "../design/tokens";
import { renderApp } from "../test-utils";
import { ConfirmCheck } from "./ConfirmCheck";

afterEach(() => jest.restoreAllMocks());
beforeEach(() => (Haptics.impactAsync as jest.Mock).mockClear());

describe("ConfirmCheck", () => {
  it("shows a check in the taken colours, named by the taken label", async () => {
    await renderApp(<ConfirmCheck />);
    const el = screen.getByTestId("confirm-check");
    expect(StyleSheet.flatten(el.props.style).backgroundColor).toBe(lightColors.status.taken.bg);
    expect(screen.getByLabelText("Taken")).toBeTruthy();
    expect(screen.getByTestId("icon-check", { includeHiddenElements: true })).toBeTruthy();
  });

  it("pops in with a spring and gives one light haptic tap", async () => {
    const spring = jest.spyOn(Reanimated, "withSpring");
    await renderApp(<ConfirmCheck />);
    expect(spring).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith("light");
  });

  it("calls onShown once", async () => {
    const onShown = jest.fn();
    await renderApp(<ConfirmCheck onShown={onShown} />);
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it("does not loop", async () => {
    const repeat = jest.spyOn(Reanimated, "withRepeat");
    await renderApp(<ConfirmCheck />);
    expect(repeat).not.toHaveBeenCalled();
  });

  it("lets the system Reduce Motion setting turn the spring into an immediate change", async () => {
    const spring = jest.spyOn(Reanimated, "withSpring");
    await renderApp(<ConfirmCheck />);
    expect(spring.mock.calls[0][1]).toMatchObject({ reduceMotion: "system" });
  });
});
