import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { darkColors, lightColors, MIN_TOUCH_TARGET } from "../design/tokens";
import { renderApp } from "../test-utils";
import { Button } from "./Button";

const style = () => StyleSheet.flatten(screen.getByRole("button").props.style);

describe("Button", () => {
  it("renders its label as a button with that accessible name", async () => {
    await renderApp(<Button label="Save" onPress={() => undefined} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.getByText("Save")).toBeTruthy();
  });

  it("calls onPress", async () => {
    const onPress = jest.fn();
    await renderApp(<Button label="Save" onPress={onPress} />);
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is at least 48 dp high in every variant, and the primary button is 56 dp", async () => {
    for (const variant of ["primary", "secondary", "quiet"] as const) {
      const view = await renderApp(
        <Button label="Go" variant={variant} onPress={() => undefined} />,
      );
      expect(style().minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(style().minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      if (variant === "primary") expect(style().minHeight).toBe(56);
      await view.unmount();
    }
  });

  it("uses a minHeight, never a fixed height, so large text grows the button", async () => {
    await renderApp(<Button label="Go" onPress={() => undefined} />);
    expect(style().height).toBeUndefined();
  });

  it("does not call onPress and reports disabled when disabled", async () => {
    const onPress = jest.fn();
    await renderApp(<Button label="Save" disabled onPress={onPress} />);
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole("button").props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("shows a spinner, reports busy and ignores presses while loading", async () => {
    const onPress = jest.fn();
    await renderApp(<Button label="Save" loading onPress={onPress} />);
    expect(screen.getByTestId("button-spinner")).toBeTruthy();
    expect(screen.getByRole("button").props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("uses the theme tokens: primary fill and on-primary text, in light and dark", async () => {
    await renderApp(<Button label="Go" onPress={() => undefined} />);
    expect(style().backgroundColor).toBe(lightColors.primary);
    expect(StyleSheet.flatten(screen.getByText("Go").props.style).color).toBe(
      lightColors.inkOnPrimary,
    );
    await renderApp(<Button label="Go" onPress={() => undefined} />, { theme: "dark" });
    expect(style().backgroundColor).toBe(darkColors.primary);
  });

  it("styles secondary with an outline and quiet without a fill", async () => {
    await renderApp(<Button label="Go" variant="secondary" onPress={() => undefined} />);
    expect(style().borderWidth).toBeGreaterThan(0);
    expect(style().backgroundColor).toBe(lightColors.surface);
    await renderApp(<Button label="Go" variant="quiet" onPress={() => undefined} />);
    expect(style().backgroundColor).toBe("transparent");
  });
});
