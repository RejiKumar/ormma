import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

/** Device storage key that remembers the welcome intro was shown. */
export const WELCOME_SEEN_KEY = "ormma.welcomeSeen";

/** True when the intro was seen. A storage failure counts as not seen, so the intro shows once. */
export async function readWelcomeSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(WELCOME_SEEN_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function markWelcomeSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch {
    // Not remembered: the intro may show again on the next launch, which is harmless.
  }
}

/** `seen` is null while the stored value loads, so the caller shows nothing instead of flashing sign-in. */
export function useWelcomeSeen(): { seen: boolean | null; markSeen: () => void } {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void readWelcomeSeen().then((value) => {
      if (active) setSeen(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const markSeen = useCallback(() => {
    setSeen(true);
    void markWelcomeSeen();
  }, []);

  return { seen, markSeen };
}
