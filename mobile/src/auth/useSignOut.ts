import { getAuth, signOut } from "@react-native-firebase/auth";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

/** Asks for confirmation, then signs out. AuthProvider sees the change and the app returns to sign-in. */
export function useSignOut(): () => void {
  const { t } = useTranslation();
  return useCallback(() => {
    Alert.alert(t("settings.signOut"), t("settings.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.signOut"),
        style: "destructive",
        onPress: () => void signOut(getAuth()).catch(() => Alert.alert(t("common.error"))),
      },
    ]);
  }, [t]);
}
