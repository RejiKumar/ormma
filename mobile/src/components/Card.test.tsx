import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { darkColors, lightColors, MIN_TOUCH_TARGET } from "../design/tokens";
import { renderApp } from "../test-utils";
import { Card } from "./Card";

const flat = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

describe("Card", () => {
  it("renders children on the surface colour with rounded geometry and a soft shadow in light mode", async () => {
    await renderApp(
      <Card testID="c">
        <Text>inside</Text>
      </Card>,
    );
    expect(screen.getByText("inside")).toBeTruthy();
    expect(flat("c").backgroundColor).toBe(lightColors.surface);
    expect(flat("c").borderRadius).toBeGreaterThanOrEqual(16);
    expect(flat("c").shadowOpacity).toBeGreaterThan(0);
  });

  it("uses a hairline instead of a shadow in dark mode", async () => {
    await renderApp(
      <Card testID="c">
        <Text>inside</Text>
      </Card>,
      { theme: "dark" },
    );
    expect(flat("c").backgroundColor).toBe(darkColors.surface);
    expect(flat("c").borderWidth).toBe(1);
    expect(flat("c").shadowOpacity).toBeUndefined();
  });

  it("supports the alt and tinted tones", async () => {
    await renderApp(
      <>
        <Card testID="alt" tone="alt">
          <Text>a</Text>
        </Card>
        <Card testID="tint" tone="tinted">
          <Text>t</Text>
        </Card>
      </>,
    );
    expect(flat("alt").backgroundColor).toBe(lightColors.surfaceAlt);
    expect(flat("tint").backgroundColor).toBe(lightColors.primaryTint);
  });

  it("becomes a button of at least 48 dp when it has onPress", async () => {
    const onPress = jest.fn();
    await renderApp(
      <Card onPress={onPress} accessibilityLabel="Open parent">
        <Text>inside</Text>
      </Card>,
    );
    const button = screen.getByRole("button", { name: "Open parent" });
    expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET,
    );
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is not a button without onPress", async () => {
    await renderApp(
      <Card>
        <Text>inside</Text>
      </Card>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
