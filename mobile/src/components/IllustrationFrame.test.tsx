import { screen } from "@testing-library/react-native";
import { contrastRatio, MIN_LARGE_OR_GRAPHIC_RATIO } from "../design/contrast";
import { darkColors, lightColors } from "../design/tokens";
import { ILLUSTRATION_NAMES } from "../illustrations/Illustration";
import { renderApp } from "../test-utils";
import { IllustrationFrame } from "./IllustrationFrame";

describe("IllustrationFrame", () => {
  const cases = ILLUSTRATION_NAMES.flatMap((name) => (["light", "dark"] as const).map((theme) => [name, theme] as const));
  it.each(cases)("%s renders in the %s theme", async (name, theme) => {
    await renderApp(<IllustrationFrame name={name} testID="ill" />, { theme });
    expect(screen.getByTestId("ill", { includeHiddenElements: true })).toBeTruthy();
  });

  it("is a described image when a description is given", async () => {
    await renderApp(<IllustrationFrame name="emptyParents" description="A house with a plus sign" testID="ill" />);
    const frame = screen.getByTestId("ill", { includeHiddenElements: true });
    expect(frame.props.accessibilityRole).toBe("image");
    expect(frame.props.accessibilityLabel).toBe("A house with a plus sign");
    expect(frame.props.importantForAccessibility).toBe("yes");
  });

  it("is hidden from screen readers when decorative", async () => {
    await renderApp(<IllustrationFrame name="welcomeCalls" testID="ill" />);
    const frame = screen.getByTestId("ill", { includeHiddenElements: true });
    expect(frame.props.accessibilityElementsHidden).toBe(true);
    expect(frame.props.importantForAccessibility).toBe("no-hide-descendants");
  });

  it("uses only graphic pairs that reach 3:1 in both themes", () => {
    for (const c of [lightColors, darkColors]) {
      const pairs: Array<[string, string, string]> = [
        ["primary on tint", c.primary, c.primaryTint],
        ["primary on surface", c.primary, c.surface],
        ["inkOnPrimary on primary", c.inkOnPrimary, c.primary],
      ];
      for (const [name, fg, bg] of pairs)
        expect({ name, ok: contrastRatio(fg, bg) >= MIN_LARGE_OR_GRAPHIC_RATIO }).toEqual({ name, ok: true });
    }
  });
});
