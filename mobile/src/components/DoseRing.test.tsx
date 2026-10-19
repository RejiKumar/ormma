import { act, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import * as Reanimated from "react-native-reanimated";
import { lightColors } from "../design/tokens";
import { renderApp } from "../test-utils";
import { DoseRing, ringFraction, ringOffset } from "./DoseRing";

/** Colour as the 0xAARRGGBB number react-native-svg passes to the native view. */
const argb = (hex: string) => (0xff000000 | parseInt(hex.slice(1), 16)) >>> 0;

afterEach(() => jest.restoreAllMocks());

describe("ring maths", () => {
  it("computes the share of doses taken, clamped to 0..1, and 0 when there are no doses", () => {
    expect(ringFraction(0, 4)).toBe(0);
    expect(ringFraction(1, 4)).toBe(0.25);
    expect(ringFraction(4, 4)).toBe(1);
    expect(ringFraction(5, 4)).toBe(1);
    expect(ringFraction(-1, 4)).toBe(0);
    expect(ringFraction(0, 0)).toBe(0);
    expect(ringFraction(3, 0)).toBe(0);
  });

  it("offsets the dash so that the visible arc equals the fraction of the circumference", () => {
    const c = 200;
    expect(ringOffset(0, c)).toBe(200);
    expect(ringOffset(0.25, c)).toBe(150);
    expect(ringOffset(1, c)).toBe(0);
  });
});

describe("DoseRing", () => {
  it("shows the count and exposes it as an accessible progress value with a label", async () => {
    await renderApp(<DoseRing taken={2} total={3} />);
    const ring = screen.getByTestId("dose-ring");
    expect(ring.props.accessibilityRole).toBe("progressbar");
    expect(ring.props.accessibilityLabel).toBe("2 of 3 doses taken");
    expect(ring.props.accessibilityValue).toEqual({ min: 0, max: 3, now: 2 });
    expect(screen.getByText("2/3", { includeHiddenElements: true })).toBeTruthy();
  });

  it("says there are no doses when the total is 0", async () => {
    await renderApp(<DoseRing taken={0} total={0} />);
    expect(screen.getByTestId("dose-ring").props.accessibilityLabel).toBe("No doses today");
  });

  it("never reports more taken than the total", async () => {
    await renderApp(<DoseRing taken={5} total={3} />);
    expect(screen.getByTestId("dose-ring").props.accessibilityValue).toEqual({
      min: 0,
      max: 3,
      now: 3,
    });
  });

  it("draws the arc in the primary colour and hides it when nothing is taken", async () => {
    const view = await renderApp(<DoseRing taken={0} total={3} />);
    expect(
      screen.getByTestId("dose-ring-arc", { includeHiddenElements: true }).props.strokeOpacity,
    ).toBe(0);
    await view.unmount();
    await renderApp(<DoseRing taken={1} total={3} />);
    const arc = screen.getByTestId("dose-ring-arc", { includeHiddenElements: true });
    expect(arc.props.strokeOpacity).toBe(1);
    expect((arc.props.stroke as { payload: number }).payload).toBe(argb(lightColors.primary));
  });

  it("fills with a spring", async () => {
    const spring = jest.spyOn(Reanimated, "withSpring");
    await renderApp(<DoseRing taken={1} total={3} />);
    expect(spring).toHaveBeenCalled();
    expect(spring.mock.calls[0][0]).toBeCloseTo(1 / 3, 5);
    expect(spring.mock.calls[0][1]).toMatchObject({ reduceMotion: "system" });
  });

  it("changes without a spring once Reduce Motion is known to be on", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const view = await renderApp(<DoseRing taken={1} total={3} />);
    await act(async () => undefined);
    const spring = jest.spyOn(Reanimated, "withSpring");
    await act(async () => view.rerenderApp(<DoseRing taken={2} total={3} />));
    expect(spring).not.toHaveBeenCalled();
  });
});
