import { contrastRatio, isLargeText, relativeLuminance } from "./contrast";
import {
  contrastPairs,
  foregroundTokenNames,
  lightColors,
  minRatio,
  themes,
  typeScale,
  type ThemeColors,
  type ThemeName,
} from "./tokens";

describe("WCAG helpers", () => {
  it("matches the reference values for black, white and mid grey", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1); // the classic #777 on white
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5); // order does not matter
  });

  it("treats 24 px or larger, or 18.67 px or larger and bold, as large text, and nothing else", () => {
    expect(isLargeText(24, 400)).toBe(true);
    expect(isLargeText(18.67, 700)).toBe(true);
    expect(isLargeText(18.67, 600)).toBe(false);
    expect(isLargeText(18, 700)).toBe(false);
    expect(isLargeText(16, 400)).toBe(false);
    expect(isLargeText(23.9, 400)).toBe(false);
  });

  it("classifies the type scale: headline and display are large, the rest are not", () => {
    const large = Object.entries(typeScale)
      .filter(([, s]) => isLargeText(s.size, Number(s.weight)))
      .map(([name]) => name);
    expect(large.sort()).toEqual(["display", "headline"]);
  });
});

describe.each(Object.keys(themes) as ThemeName[])("contrast in the %s theme", (name) => {
  const colors = themes[name].colors;
  const pairs = contrastPairs(colors);

  it("declares pairs", () => {
    expect(pairs.length).toBeGreaterThan(30);
  });

  it.each(pairs.map((p) => [p.name, p] as const))(
    "%s meets WCAG AA (4.5:1 text, 3:1 large text and graphics)",
    (_label, pair) => {
      const ratio = contrastRatio(pair.fg, pair.bg);
      expect(`${pair.name}: ${ratio.toFixed(2)}`).toBeTruthy();
      expect(ratio).toBeGreaterThanOrEqual(minRatio(pair.kind));
    },
  );

  it("covers every foreground colour token in at least one declared pair", () => {
    const covered = new Set(pairs.map((p) => p.fgToken));
    const missing = foregroundTokenNames(colors).filter((t) => !covered.has(t));
    expect(missing).toEqual([]);
  });

  it("uses a different icon colour and label colour check for each of the seven statuses", () => {
    for (const key of [
      "taken",
      "pending",
      "missed",
      "unclear",
      "calling",
      "not_taken",
      "no_answer",
    ] as const) {
      expect(pairs.some((p) => p.fgToken === `status.${key}.fg`)).toBe(true);
      expect(pairs.some((p) => p.fgToken === `status.${key}.icon`)).toBe(true);
    }
  });
});

describe("the test really fails below the thresholds", () => {
  it("flags a deliberately lowered text colour", () => {
    const bad: ThemeColors = { ...lightColors, inkMuted: "#B5B0A8" };
    const failing = contrastPairs(bad).filter((p) => contrastRatio(p.fg, p.bg) < minRatio(p.kind));
    expect(failing.map((p) => p.name)).toEqual(
      expect.arrayContaining(["inkMuted on background", "inkMuted on surface"]),
    );
  });

  it("flags a deliberately lowered icon colour at 3:1", () => {
    const bad: ThemeColors = {
      ...lightColors,
      status: {
        ...lightColors.status,
        pending: { ...lightColors.status.pending, icon: "#C9CED1" },
      },
    };
    const failing = contrastPairs(bad).filter((p) => contrastRatio(p.fg, p.bg) < minRatio(p.kind));
    expect(failing.map((p) => p.name)).toContain("status pending icon");
  });
});
