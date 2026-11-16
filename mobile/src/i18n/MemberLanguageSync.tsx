import { doc, getFirestore, updateDoc } from "@react-native-firebase/firestore";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { pickLanguage } from "./index";

/**
 * Keeps the signed-in member's own record (`users/{uid}.language`) equal to the language the app is showing,
 * so the server can send their notifications in it. Renders nothing. A failed write is ignored: the record
 * keeps its earlier value (or none, which means English) and the next change or start tries again. Only the
 * language code is written, never anything about the person's health.
 */
export function MemberLanguageSync() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const uid = user?.uid ?? null;
  const language = pickLanguage(i18n.language);

  useEffect(() => {
    if (!uid) return;
    void updateDoc(doc(getFirestore(), "users", uid), { language }).catch(() => undefined);
  }, [uid, language]);

  return null;
}
