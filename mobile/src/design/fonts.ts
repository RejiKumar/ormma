// Fonts: Inter (Latin) and Noto Sans Malayalam, Tamil and Devanagari for ml, ta, hi.
// @expo-google-fonts ships one static TTF per weight (React Native does not apply variable axes
// reliably), so only the weights the type scale uses are bundled, imported by file so Metro does not
// pull in every weight of the package.
import Inter400 from "@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf";
import Inter500 from "@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf";
import Inter600 from "@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf";
import Inter700 from "@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf";
import Dev400 from "@expo-google-fonts/noto-sans-devanagari/400Regular/NotoSansDevanagari_400Regular.ttf";
import Dev500 from "@expo-google-fonts/noto-sans-devanagari/500Medium/NotoSansDevanagari_500Medium.ttf";
import Dev700 from "@expo-google-fonts/noto-sans-devanagari/700Bold/NotoSansDevanagari_700Bold.ttf";
import Mal400 from "@expo-google-fonts/noto-sans-malayalam/400Regular/NotoSansMalayalam_400Regular.ttf";
import Mal500 from "@expo-google-fonts/noto-sans-malayalam/500Medium/NotoSansMalayalam_500Medium.ttf";
import Mal700 from "@expo-google-fonts/noto-sans-malayalam/700Bold/NotoSansMalayalam_700Bold.ttf";
import Tam400 from "@expo-google-fonts/noto-sans-tamil/400Regular/NotoSansTamil_400Regular.ttf";
import Tam500 from "@expo-google-fonts/noto-sans-tamil/500Medium/NotoSansTamil_500Medium.ttf";
import Tam700 from "@expo-google-fonts/noto-sans-tamil/700Bold/NotoSansTamil_700Bold.ttf";
import type { FontWeight } from "./tokens";

export type Script = "latin" | "malayalam" | "tamil" | "devanagari";

/** Font assets keyed by the family name used in styles. Passed to expo-font. */
export const fontAssets = {
  Inter_400Regular: Inter400,
  Inter_500Medium: Inter500,
  Inter_600SemiBold: Inter600,
  Inter_700Bold: Inter700,
  NotoSansMalayalam_400Regular: Mal400,
  NotoSansMalayalam_500Medium: Mal500,
  NotoSansMalayalam_700Bold: Mal700,
  NotoSansTamil_400Regular: Tam400,
  NotoSansTamil_500Medium: Tam500,
  NotoSansTamil_700Bold: Tam700,
  NotoSansDevanagari_400Regular: Dev400,
  NotoSansDevanagari_500Medium: Dev500,
  NotoSansDevanagari_700Bold: Dev700,
} as const;

export type FontFamily = keyof typeof fontAssets;

const LATIN: Record<FontWeight, FontFamily> = {
  "400": "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
};

// The scripts bundle 400, 500 and 700; semibold (600) uses the bold file.
const SCRIPT_PREFIX: Record<Exclude<Script, "latin">, string> = {
  malayalam: "NotoSansMalayalam",
  tamil: "NotoSansTamil",
  devanagari: "NotoSansDevanagari",
};
const SCRIPT_WEIGHT: Record<FontWeight, string> = {
  "400": "400Regular",
  "500": "500Medium",
  "600": "700Bold",
  "700": "700Bold",
};

/** Script of a language code: "ml", "ml-IN" -> malayalam; ta -> tamil; hi -> devanagari; else latin. */
export function scriptFor(language: string | null | undefined): Script {
  const base = (language ?? "").toLowerCase().split(/[-_]/)[0];
  if (base === "ml") return "malayalam";
  if (base === "ta") return "tamil";
  if (base === "hi") return "devanagari";
  return "latin";
}

/**
 * Script a string is written in, so mixed content renders with the right font: any Malayalam, Tamil
 * or Devanagari letter selects that script; otherwise a Latin letter selects Latin; digits and
 * punctuation alone use `fallback` (the app language's script).
 */
export function scriptOfText(text: string, fallback: Script): Script {
  if (/[\u0D00-\u0D7F]/.test(text)) return "malayalam"; // Malayalam block
  if (/[\u0B80-\u0BFF]/.test(text)) return "tamil"; // Tamil block
  if (/[\u0900-\u097F]/.test(text)) return "devanagari"; // Devanagari block
  if (/[A-Za-z]/.test(text)) return "latin";
  return fallback;
}

/** Font family name for a script and weight. */
export function fontFamilyFor(script: Script, weight: FontWeight): FontFamily {
  if (script === "latin") return LATIN[weight];
  return `${SCRIPT_PREFIX[script]}_${SCRIPT_WEIGHT[weight]}` as FontFamily;
}

/** Latin family used when a string in a script font contains Latin digits or names. */
export const latinFamilyFor = (weight: FontWeight): FontFamily => LATIN[weight];

/** Line-height multipliers per script. Indic scripts stack marks above and below the line. */
export const LINE_HEIGHT_MULTIPLIER: Record<Script, number> = {
  latin: 1.4,
  devanagari: 1.6,
  tamil: 1.65,
  malayalam: 1.75,
};

export function lineHeightFor(script: Script, fontSize: number): number {
  return Math.round(fontSize * LINE_HEIGHT_MULTIPLIER[script]);
}
