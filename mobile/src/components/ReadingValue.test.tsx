import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { darkColors, lightColors } from "../design/tokens";
import { renderApp } from "../test-utils";
import { ReadingValue } from "./ReadingValue";

const bg = () => StyleSheet.flatten(screen.getByTestId("r").props.style).backgroundColor;

describe("ReadingValue", () => {
  it("shows the label and the value exactly as recorded, with its unit", async () => {
    await renderApp(<ReadingValue testID="r" label="Blood pressure" value="150/90" unit="mmHg" />);
    expect(screen.getByText("Blood pressure")).toBeTruthy();
    expect(screen.getByText("150/90 mmHg")).toBeTruthy();
    expect(screen.getByTestId("r").props.accessibilityLabel).toBe("Blood pressure 150/90 mmHg");
  });

  it("uses the neutral reading colours in light and dark, never a status or coral colour", async () => {
    await renderApp(<ReadingValue testID="r" label="Sugar" value="180" unit="mg/dL" />);
    expect(bg()).toBe(lightColors.reading.bg);
    const forbidden = new Set<string>([
      ...Object.values(lightColors.status).flatMap((s) => [s.bg, s.fg, s.icon]),
      lightColors.urgent.bg,
      lightColors.urgent.fg,
      lightColors.urgent.icon,
    ]);
    expect(forbidden.has(bg() as string)).toBe(false);
    await renderApp(<ReadingValue testID="r" label="Sugar" value="180" />, { theme: "dark" });
    expect(bg()).toBe(darkColors.reading.bg);
  });

  it("has no icon, so it carries no judgement", async () => {
    await renderApp(<ReadingValue testID="r" label="Sugar" value="180" />);
    expect(screen.queryByTestId(/^icon-/, { includeHiddenElements: true })).toBeNull();
  });

  it("looks the same whatever the value is (a very high value is not styled differently)", async () => {
    await renderApp(<ReadingValue testID="r" label="Blood pressure" value="150/90" />);
    const normalStyle = JSON.stringify(screen.getByTestId("r").props.style);
    await renderApp(<ReadingValue testID="r" label="Blood pressure" value="1500/90" />);
    expect(JSON.stringify(screen.getByTestId("r").props.style)).toBe(normalStyle);
  });
});
