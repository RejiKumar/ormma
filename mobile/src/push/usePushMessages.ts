import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
} from "@react-native-firebase/messaging";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { navigationRef } from "../navigation/navigationRef";
import { bannerFromMessage, pushTargetTab, type PushBannerContent, type PushTab } from "./pushTarget";

// Push messages after registration: shows a banner for one that arrives while the app is open
// (Android draws nothing for a foreground message), and opens the right tab when a notification is
// tapped, from the background or from a cold start. Never logs titles, bodies or data (hard rule 6).

export interface PushMessagesState {
  banner: PushBannerContent | null;
  dismiss: () => void;
  open: () => void;
}

export function usePushMessages(): PushMessagesState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [banner, setBanner] = useState<PushBannerContent | null>(null);
  // A tap that arrives before sign-in or before the tabs exist waits here.
  const pending = useRef<PushTab | null>(null);

  const go = useCallback((tab: PushTab) => {
    if (navigationRef.isReady()) {
      pending.current = null;
      navigationRef.navigate(tab);
    } else {
      pending.current = tab;
    }
  }, []);

  useEffect(() => {
    if (!uid) return;
    const messaging = getMessaging();
    let cancelled = false;

    const unsubscribeForeground = onMessage(messaging, async (message) => {
      setBanner(bannerFromMessage(message));
    });
    const unsubscribeOpened = onNotificationOpenedApp(messaging, (message) => {
      go(pushTargetTab(message.data));
    });
    void getInitialNotification(messaging)
      .then((message) => {
        if (!cancelled && message) go(pushTargetTab(message.data));
      })
      .catch(() => undefined);

    // The tabs mount in the same commit as the sign-in, so give them a moment before a waiting tap.
    const flush = setTimeout(() => {
      if (pending.current) go(pending.current);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(flush);
      unsubscribeForeground();
      unsubscribeOpened();
    };
  }, [uid, go]);

  const dismiss = useCallback(() => setBanner(null), []);
  const open = useCallback(() => {
    if (banner) go(pushTargetTab(banner.data));
    setBanner(null);
  }, [banner, go]);

  return { banner, dismiss, open };
}
