import { act, render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Text } from "react-native";
import * as Haptics from "expo-haptics";
import * as Reanimated from "react-native-reanimated";
import {
  ENERGY_THRESHOLD,
  lightHaptic,
  springSettleMs,
  springs,
  useMotion,
  useReducedMotion,
  type SpringPreset,
} from "./motion";
import { motion } from "./tokens";

describe("spring presets", () => {
  it.each(Object.keys(springs) as SpringPreset[])(
    "%s settles within 150 to 300 ms by Reanimated's termination rule",
    (preset) => {
      const ms = springSettleMs(springs[preset]);
      expect(ms).toBeGreaterThanOrEqual(150);
      expect(ms).toBeLessThanOrEqual(300);
    },
  );

  it("orders the presets snappy < standard < soft", () => {
    expect(springSettleMs(springs.snappy)).toBeLessThan(springSettleMs(springs.standard));
    expect(springSettleMs(springs.standard)).toBeLessThan(springSettleMs(springs.soft));
  });

  it("uses the same termination threshold as Reanimated 4's default", () => {
    expect(ENERGY_THRESHOLD).toBe(6e-9);
  });

  it("the helper itself reports a slow spring as slower than 300 ms", () => {
    expect(springSettleMs({ stiffness: 200, damping: 20, mass: 1 })).toBeGreaterThan(300);
  });

  it("keeps the duration tokens in the same 150 to 300 ms range", () => {
    expect(motion.duration.fast).toBe(150);
    expect(motion.duration.slow).toBe(300);
    expect(motion.duration.base).toBeGreaterThanOrEqual(150);
    expect(motion.duration.base).toBeLessThanOrEqual(300);
  });
});

function Probe({ onValue }: { onValue: (v: number) => void }) {
  const { reduceMotion, springTo } = useMotion();
  onValue(springTo(1) as number);
  return <Text testID="rm">{String(reduceMotion)}</Text>;
}

describe("Reduce Motion", () => {
  afterEach(() => jest.restoreAllMocks());

  it("is off by default", async () => {
    let reduced = true;
    function Hook() {
      reduced = useReducedMotion();
      return null;
    }
    await render(<Hook />);
    expect(reduced).toBe(false);
  });

  it("returns the target value immediately when the OS setting is on", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const spring = jest.spyOn(Reanimated, "withSpring");
    let last: unknown;
    await render(<Probe onValue={(v) => (last = v)} />);
    await waitFor(() => expect(screen.getByTestId("rm").props.children).toBe("true"));
    spring.mockClear();
    await act(async () => undefined);
    expect(last).toBe(1);
    expect(spring).not.toHaveBeenCalled();
  });

  it("animates with a spring when the OS setting is off", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const spring = jest.spyOn(Reanimated, "withSpring");
    await render(<Probe onValue={() => undefined} />);
    expect(spring).toHaveBeenCalled();
    const [, config] = spring.mock.calls[0];
    expect(config).toMatchObject({
      stiffness: springs.standard.stiffness,
      damping: springs.standard.damping,
    });
  });

  it("follows a change of the setting while the app runs", async () => {
    let handler: (value: boolean) => void = () => undefined;
    jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((
      _event: string,
      cb: (value: boolean) => void,
    ) => {
      handler = cb;
      return { remove: jest.fn() };
    }) as never);
    await render(<Probe onValue={() => undefined} />);
    expect(screen.getByTestId("rm").props.children).toBe("false");
    await act(async () => handler(true));
    expect(screen.getByTestId("rm").props.children).toBe("true");
  });
});

describe("haptics", () => {
  it("plays a light impact", () => {
    lightHaptic();
    expect(Haptics.impactAsync).toHaveBeenCalledWith("light");
  });

  it("never throws when haptics fail", () => {
    (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error("no haptics"));
    expect(() => lightHaptic()).not.toThrow();
  });
});
