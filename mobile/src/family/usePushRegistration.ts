import { useEffect, useState } from "react";
import { getAuth } from "@react-native-firebase/auth";
import { arrayUnion, doc, getFirestore, updateDoc } from "@react-native-firebase/firestore";
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
} from "@react-native-firebase/messaging";

// Registers the device token for the signed-in user and keeps it up to date. No health data logged.

export interface PushRegistrationState {
  token: string | null;
  error: string | null;
}

export function usePushRegistration(): PushRegistrationState {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uid = getAuth().currentUser?.uid ?? null;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const messaging = getMessaging();

    const register = async () => {
      try {
        const status = await requestPermission(messaging);
        if (status !== AuthorizationStatus.AUTHORIZED) return;
        const fcmToken = await getToken(messaging);
        if (cancelled || !fcmToken) return;
        setToken(fcmToken);
        await updateDoc(doc(getFirestore(), "users", uid), {
          fcmTokens: arrayUnion(fcmToken),
        });
      } catch {
        if (!cancelled) setError("push_registration_failed");
        console.info("push: registration failed", { code: "error" });
      }
    };

    void register();

    const unsubscribe = onTokenRefresh(messaging, async (refreshed) => {
      try {
        setToken(refreshed);
        await updateDoc(doc(getFirestore(), "users", uid), {
          fcmTokens: arrayUnion(refreshed),
        });
      } catch {
        console.info("push: token refresh failed", { code: "error" });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  return { token, error };
}
