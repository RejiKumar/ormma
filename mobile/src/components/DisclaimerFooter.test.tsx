import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { contrastRatio } from "../design/contrast";
import { darkColors, lightColors } from "../design/tokens";
import i18n from "../i18n";
import { renderApp } from "../test-utils";
import { DisclaimerFooter } from "./DisclaimerFooter";

const DISCLAIMER = "This app does not provide medical advice.";

describe("DisclaimerFooter", () => {
  it("shows the disclaimer from the translation catalogue", async () => {
    await renderApp(<DisclaimerFooter />);
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
    expect(i18n.t("disclaimer.medical")).toBe(DISCLAIMER);
  });

  it("keeps the English text when the language is ml, ta or hi until a reviewed translation exists", async () => {
    for (const language of ["ml", "ta", "hi"] as const) {
      const view = await renderApp(<DisclaimerFooter />, { language });
      expect(screen.getByText(DISCLAIMER)).toBeTruthy();
      await view.unmount();
    }
  });

  it("is readable in both themes (text colour passes 4.5:1 on the background)", async () => {
    for (const [theme, colors] of [
      ["light", lightColors],
      ["dark", darkColors],
    ] as const) {
      const view = await renderApp(<DisclaimerFooter />, { theme });
      const color = StyleSheet.flatten(screen.getByText(DISCLAIMER).props.style).color as string;
      expect(color).toBe(colors.inkMuted);
      expect(contrastRatio(color, colors.background)).toBeGreaterThanOrEqual(4.5);
      await view.unmount();
    }
  });

  it("uses a scalable text style, not a fixed height", async () => {
    await renderApp(<DisclaimerFooter />);
    expect(screen.getByText(DISCLAIMER).props.allowFontScaling).toBe(true);
    expect(
      StyleSheet.flatten(screen.getByTestId("disclaimer-footer").props.style).height,
    ).toBeUndefined();
  });
});
