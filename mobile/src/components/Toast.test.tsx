import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { lightColors } from "../design/tokens";
import { renderApp } from "../test-utils";
import { Toast } from "./Toast";

describe("Toast", () => {
  it("shows the message on the ink colour with a 16 px radius and 12 by 16 padding, as a polite alert", async () => {
    await renderApp(<Toast message="Copied." testID="toast" />);
    expect(screen.getByText("Copied.")).toBeTruthy();
    const view = screen.getByTestId("toast");
    const style = StyleSheet.flatten(view.props.style);
    expect(style.backgroundColor).toBe(lightColors.ink);
    expect(style.borderRadius).toBe(16);
    expect(style.paddingVertical).toBe(12);
    expect(style.paddingHorizontal).toBe(16);
    expect(view.props.accessibilityLiveRegion).toBe("polite");
    expect(view.props.accessibilityRole).toBe("alert");
  });
});
