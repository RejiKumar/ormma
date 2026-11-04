// Dev-only emulator wiring: the app talks to the local Firebase emulators when the host env var
// is set in a development build. Never active under Jest or in production builds.
// Auth's emulator method takes a URL, Firestore and Functions take host + port
// (react-native-firebase module APIs), so the connect helpers are shaped accordingly.
import { getAuth } from "@react-native-firebase/auth";
import { getFirestore } from "@react-native-firebase/firestore";
import { getFunctions } from "@react-native-firebase/functions";
import { getApp } from "@react-native-firebase/app";

import { FUNCTIONS_REGION } from "./region";

export interface EmulatorFlags {
  /** __DEV__ in the app; false in production builds. */
  dev: boolean;
  /** True under Jest, where emulator wiring must never run. */
  isJest: boolean;
  /** EXPO_PUBLIC_FIREBASE_EMULATOR_HOST, for example 10.0.2.2 on the Android emulator. */
  host: string | undefined;
}

export const EMULATOR_PORTS = { auth: 9099, firestore: 8080, functions: 5001 } as const;

export interface EmulatorTarget {
  useEmulator?: (host: string, port: number) => void;
}

export interface AuthEmulatorTarget {
  useEmulator?: (url: string) => void;
}

/** The host to connect to, or null when emulator wiring is disabled. */
export function emulatorHost(flags: EmulatorFlags): string | null {
  if (!flags.dev || flags.isJest) return null;
  return flags.host !== undefined && flags.host.length > 0 ? flags.host : "localhost";
}

/** Firestore/Functions: connects one module when all flags line up; returns whether it connected. */
export function connectModuleEmulator(
  target: EmulatorTarget | null | undefined,
  port: number,
  flags: EmulatorFlags,
): boolean {
  const host = emulatorHost(flags);
  if (host === null || !target || typeof target.useEmulator !== "function") return false;
  target.useEmulator(host, port);
  return true;
}

/** Auth: the module expects a URL, not host+port. */
export function connectAuthEmulator(
  target: AuthEmulatorTarget | null | undefined,
  port: number,
  flags: EmulatorFlags,
): boolean {
  const host = emulatorHost(flags);
  if (host === null || !target || typeof target.useEmulator !== "function") return false;
  target.useEmulator(`http://${host}:${port}`);
  return true;
}

export function currentEmulatorFlags(): EmulatorFlags {
  const dev = typeof __DEV__ !== "undefined" ? __DEV__ : false;
  const isJest = typeof process !== "undefined" && typeof process.env?.JEST_WORKER_ID === "string";
  return { dev, isJest, host: process.env?.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST };
}

/** Points Auth, Firestore and Functions at the emulators when running a dev client. */
export function connectEmulators(flags: EmulatorFlags = currentEmulatorFlags()): void {
  const auth = connectAuthEmulator(
    getAuth() as unknown as AuthEmulatorTarget,
    EMULATOR_PORTS.auth,
    flags,
  );
  const firestore = connectModuleEmulator(
    getFirestore() as unknown as EmulatorTarget,
    EMULATOR_PORTS.firestore,
    flags,
  );
  // Callables run in the `asia-south1` instance (see firebase/region.ts); connecting the default
  // instance would leave every call pointed at production.
  const functions = connectModuleEmulator(
    getFunctions(getApp(), FUNCTIONS_REGION) as unknown as EmulatorTarget,
    EMULATOR_PORTS.functions,
    flags,
  );
  // A module that silently fails to connect is the usual cause of an "unknown" callable error, so
  // say which ones are wired (visible in Metro and `adb logcat`).
  if (flags.dev && !flags.isJest) {
    console.log(
      `[emulators] ${flags.host ?? "localhost"} auth=${auth} firestore=${firestore} functions=${functions}`,
    );
  }
}
