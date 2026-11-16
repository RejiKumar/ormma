// The person's choice of app language: follow the phone, or one of the four languages. Kept on the device
// (the member's own record is updated separately for notifications). Every read and write is guarded: the
// app must still start in the phone's language when storage is unavailable.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pickLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from "./index";

export type LanguagePreference = "system" | AppLanguage;

export const LANGUAGE_PREFERENCE_KEY = "ormma.appLanguage";

export const isLanguagePreference = (value: unknown): value is LanguagePreference =>
  value === "system" || (typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value));

/** The language to show: the chosen one, or the phone's (English when the phone's is not supported). */
export function resolveLanguage(preference: LanguagePreference, deviceLanguageCode: string | null | undefined): AppLanguage {
  return preference === "system" ? pickLanguage(deviceLanguageCode) : preference;
}

export async function loadLanguagePreference(): Promise<LanguagePreference> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY);
    return isLanguagePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export async function saveLanguagePreference(preference: LanguagePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, preference);
  } catch {
    // The choice still applies for this session.
  }
}
