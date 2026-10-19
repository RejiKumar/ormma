import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { darkColors, lightColors } from "../design/tokens";
import { renderApp } from "../test-utils";
import { Banner } from "./Banner";

const bg = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style).backgroundColor;

describe("Banner", () => {
  it("shows title and message in the calm info style by default", async () => {
    await renderApp(<Banner testID="b" title="Heads up" message="Calls start after consent." />);
    expect(screen.getByText("Heads up")).toBeTruthy();
    expect(screen.getByText("Calls start after consent.")).toBeTruthy();
    expect(bg("b")).toBe(lightColors.primaryTint);
    expect(screen.getByTestId("icon-info", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("b").props.accessibilityRole).toBeUndefined();
  });

  it("uses coral and an alert role only for the urgent variant", async () => {
    await renderApp(
      <Banner
        testID="b"
        variant="urgent"
        message="Amma mentioned something urgent. Please call her now."
      />,
    );
    expect(bg("b")).toBe(lightColors.urgent.bg);
    expect(screen.getByTestId("b").props.accessibilityRole).toBe("alert");
    expect(screen.getByTestId("b").props.accessibilityLiveRegion).toBe("assertive");
    expect(screen.getByTestId("icon-alert", { includeHiddenElements: true })).toBeTruthy();
  });

  it("uses the dark urgent colours in dark mode", async () => {
    await renderApp(<Banner testID="b" variant="urgent" message="m" />, { theme: "dark" });
    expect(bg("b")).toBe(darkColors.urgent.bg);
  });

  it("does not use any coral token for the info variant", async () => {
    await renderApp(<Banner testID="b" message="m" />);
    expect(bg("b")).not.toBe(lightColors.urgent.bg);
    expect(bg("b")).not.toBe(lightColors.status.missed.bg);
  });

  it("renders an action as a secondary button and calls it", async () => {
    const onAction = jest.fn();
    await renderApp(<Banner message="m" actionLabel="Learn more" onAction={onAction} />);
    fireEvent.press(screen.getByRole("button", { name: "Learn more" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("shows no action without both a label and a handler", async () => {
    await renderApp(<Banner message="m" actionLabel="Learn more" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
