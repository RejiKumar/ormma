import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import * as Haptics from "expo-haptics";
import { ReduceMotion, withSpring } from "react-native-reanimated";

/**
 * Spring presets (mass 1). Each is tuned so that, by Reanimated's own termination rule (remaining
 * energy at most 6e-9 of the start), it settles within 150 to 300 ms: snappy about 160 ms, standard
 * about 220 ms, soft about 285 ms. springSettleMs() computes the time and a test pins the range.
 */
export const springs = {
  snappy: { stiffness: 5302, damping: 131.1, mass: 1 },
  standard: { stiffness: 2514, damping: 85.2, mass: 1 },
  soft: { stiffness: 1497, damping: 65.8, mass: 1 },
} as const;

export type SpringPreset = keyof typeof springs;
export interface SpringParams {
  stiffness: number;
  damping: number;
  mass: number;
}

/** Fraction of the initial energy below which Reanimated 4 treats a spring as finished (default). */
export const ENERGY_THRESHOLD = 6e-9;

/**
 * Time in ms for a spring starting at rest, one unit from its target, to settle. Mirrors
 * Reanimated 4's closed-form spring and its energy-based termination test.
 */
export function springSettleMs({ stiffness, damping, mass }: SpringParams): number {
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const initialEnergy = 0.5 * stiffness;
  const at = (t: number): [number, number] => {
    if (zeta >= 1 - 1e-9) {
      const envelope = Math.exp(-omega0 * t);
      return [
        envelope * (1 + omega0 * t),
        envelope * -omega0 * (1 + omega0 * t) + envelope * omega0,
      ];
    }
    const omega1 = omega0 * Math.sqrt(1 - zeta * zeta);
    const envelope = Math.exp(-zeta * omega0 * t);
    const frag =
      envelope * (Math.sin(omega1 * t) * ((zeta * omega0) / omega1) + Math.cos(omega1 * t));
    const velocity =
      -zeta * omega0 * frag +
      envelope * (Math.cos(omega1 * t) * zeta * omega0 - omega1 * Math.sin(omega1 * t));
    return [frag, velocity];
  };
  for (let t = 0; t < 5; t += 0.0005) {
    const [x, v] = at(t);
    const energy = 0.5 * stiffness * x * x + 0.5 * mass * v * v;
    if (energy / initialEnergy <= ENERGY_THRESHOLD) return t * 1000;
  }
  return Infinity;
}

/** True when the operating system Reduce Motion setting is on. Updates when the setting changes. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

/**
 * Motion helpers for a component: `reduceMotion` and `springTo`, which returns an animated value
 * (a Reanimated spring) normally and the plain target value under Reduce Motion, so the state
 * changes immediately.
 */
export function useMotion() {
  const reduceMotion = useReducedMotion();
  const springTo = useCallback(
    (target: number, preset: SpringPreset = "standard") =>
      reduceMotion
        ? target
        : withSpring(target, { ...springs[preset], reduceMotion: ReduceMotion.System }),
    [reduceMotion],
  );
  return { reduceMotion, springTo };
}

/** Light haptic tap, used on confirmation only. Failures are ignored. */
export function lightHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
