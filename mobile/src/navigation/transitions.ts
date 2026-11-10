import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useReducedMotion } from "../design/motion";
import { motion } from "../design/tokens";

/** Stack transition: a short fade of the `base` motion token, or none under Reduce Motion. */
export function stackTransition(reduceMotion: boolean): NativeStackNavigationOptions {
  return reduceMotion
    ? { animation: "none" }
    : { animation: "fade", animationDuration: motion.duration.base };
}

/** `screenOptions` for a native stack that follows the Reduce Motion setting. */
export function useStackTransition(): NativeStackNavigationOptions {
  return stackTransition(useReducedMotion());
}
