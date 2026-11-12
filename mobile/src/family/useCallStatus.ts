import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { getCallStatus } from "./callables";

// The answer is asked once per app start. `null` means not known (loading, offline, or an error):
// the app then shows nothing, because it must never show a claim it cannot support.
let cached: boolean | null = null;

/** Test helper: forget the answer remembered for this app run. */
export function resetCallStatusCache(): void {
  cached = null;
}

export function useCallStatus(): { callsEnabled: boolean | null } {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [callsEnabled, setCallsEnabled] = useState<boolean | null>(cached);

  useEffect(() => {
    if (!uid || cached !== null) return;
    let active = true;
    getCallStatus()
      .then((result) => {
        const value = typeof result?.callsEnabled === "boolean" ? result.callsEnabled : null;
        cached = value;
        if (active) setCallsEnabled(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [uid]);

  return { callsEnabled };
}
