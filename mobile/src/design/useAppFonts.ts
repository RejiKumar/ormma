import { useFonts } from "expo-font";
import { fontAssets } from "./fonts";

/** Load the bundled fonts. Returns true once they are ready (or failed, so the app is never blocked). */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(fontAssets);
  return loaded || error != null;
}
