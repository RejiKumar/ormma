// Glyph coverage: real strings in ml, ta, hi and en must be renderable with the bundled fonts.
// Each character must have a glyph in a font of the language's script or in Inter (the pair the
// platform would fall back between), and shaping each run must not produce the .notdef glyph.
// The strings are test fixtures (not shipped UI text).
import * as fontkit from "fontkit";
import { readFileSync } from "node:fs";
import { fontAssets, fontFamilyFor, latinFamilyFor, scriptFor, type FontFamily } from "./fonts";
import type { FontWeight } from "./tokens";

const PACKAGES: Record<string, string> = {
  Inter: "inter",
  NotoSansMalayalam: "noto-sans-malayalam",
  NotoSansTamil: "noto-sans-tamil",
  NotoSansDevanagari: "noto-sans-devanagari",
};

function fontFile(family: FontFamily): string {
  const [name, weight] = family.split("_");
  return require.resolve(`@expo-google-fonts/${PACKAGES[name]}/${weight}/${family}.ttf`);
}

const cache = new Map<string, fontkit.Font>();
function open(family: FontFamily): fontkit.Font {
  if (!cache.has(family))
    cache.set(family, fontkit.create(readFileSync(fontFile(family))) as fontkit.Font);
  return cache.get(family)!;
}

const WEIGHTS: FontWeight[] = ["400", "500", "600", "700"];

/** Every font file the app can use for a language: its script font weights plus Inter. */
function fontsFor(language: string): { script: FontFamily[]; latin: FontFamily[] } {
  const script = scriptFor(language);
  const latin = WEIGHTS.map(latinFamilyFor);
  if (script === "latin") return { script: [], latin };
  return { script: [...new Set(WEIGHTS.map((w) => fontFamilyFor(script, w)))], latin };
}

// Joiners and variation selectors are default-ignorable: shaping uses them but fonts need no glyph.
const IGNORABLE = new Set([0x200c, 0x200d, 0xfe0e, 0xfe0f]);

/** Characters of `text` that no font in `families` covers. */
export function uncovered(text: string, families: FontFamily[]): string[] {
  const fonts = families.map(open);
  const missing: string[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (/\s/.test(ch) || IGNORABLE.has(cp)) continue;
    if (
      !fonts.every((f) => f.hasGlyphForCodePoint(cp)) &&
      !fonts.some((f) => f.hasGlyphForCodePoint(cp))
    ) {
      missing.push(ch);
    }
  }
  return missing;
}

// fontkit throws inside GPOS mark positioning for some Malayalam sequences. Coverage only needs the
// substitution (GSUB) shaping, so glyph positioning features are switched off.
const NO_POSITIONING = {
  mark: false,
  mkmk: false,
  kern: false,
  dist: false,
  abvm: false,
  blwm: false,
};

/**
 * Split `text` into runs of script font glyphs and Latin font glyphs, shape each run with its font and
 * return the runs whose shaping produced the .notdef glyph (glyph id 0).
 */
function notdefRuns(
  text: string,
  scriptFamily: FontFamily | null,
  latinFamily: FontFamily,
): string[] {
  const latin = open(latinFamily);
  const script = scriptFamily ? open(scriptFamily) : null;
  const runs: Array<{ font: fontkit.Font; text: string }> = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const useScript = script !== null && script.hasGlyphForCodePoint(cp) && cp > 0x7f;
    const font = useScript ? script! : latin;
    const last = runs[runs.length - 1];
    if (last && last.font === font) last.text += ch;
    else runs.push({ font, text: ch });
  }
  return runs
    .filter((r) =>
      r.font.layout(r.text.replace(/\s+/g, " "), NO_POSITIONING).glyphs.some((g) => g.id === 0),
    )
    .map((r) => r.text);
}

/** Real strings per language: phrases the app will speak and show, with conjuncts, matras and digits. */
const SAMPLES: Record<string, string[]> = {
  en: [
    "Did you take your medicine today?",
    "Next dose at 8:00 PM",
    "Amma has not confirmed the tablets. Please check.",
    "This app does not provide medical advice.",
    "Please share with the doctor.",
  ],
  ml: [
    "ഇന്ന് മരുന്ന് കഴിച്ചോ?",
    "അമ്മയുടെ ഗുളിക",
    "ഡോക്ടറെ കാണിക്കുക",
    "ക്ഷമിക്കണം",
    "സന്തോഷം ചികിത്സ",
    "അവൻ വിൽക്കുന്നു",
    "രാവിലെ 8:00 മണി",
  ],
  ta: [
    "இன்று மருந்து சாப்பிட்டீர்களா?",
    "அம்மாவின் மாத்திரை",
    "மருத்துவரிடம் காட்டுங்கள்",
    "காலை 8:00 மணி",
    "நன்றி ஸ்ரீ",
    "பக்கம் தொடரும்",
  ],
  hi: [
    "क्या आपने आज दवा ली?",
    "माँ की गोली",
    "डॉक्टर को दिखाइए",
    "सुबह 8:00 बजे",
    "धन्यवाद",
    "क्षमा करें श्रीमती ज्ञान द्वार",
  ],
};

describe("bundled font files", () => {
  it("exist for every family in fontAssets", () => {
    for (const family of Object.keys(fontAssets) as FontFamily[]) {
      expect(open(family).numGlyphs).toBeGreaterThan(100);
    }
  });
});

describe.each(Object.keys(SAMPLES))("glyph coverage for %s", (language) => {
  const { script, latin } = fontsFor(language);
  const families = [...script, ...latin];

  it.each(SAMPLES[language].map((s) => [s]))("covers: %s", (text) => {
    // every character has a glyph in the script font or in Inter
    const covered = (ch: string) =>
      families.some((f) => open(f).hasGlyphForCodePoint(ch.codePointAt(0)!)) ||
      /\s/.test(ch) ||
      IGNORABLE.has(ch.codePointAt(0)!);
    expect([...text].filter((c) => !covered(c))).toEqual([]);
    // and shaping each run in its font never falls back to .notdef
    const scriptFamily = script.length ? script[0] : null;
    expect(notdefRuns(text, scriptFamily, latin[0])).toEqual([]);
  });

  it("covers the same strings in every weight the type scale uses", () => {
    for (const weight of WEIGHTS) {
      const family = fontFamilyFor(scriptFor(language), weight);
      const text = SAMPLES[language].join(" ");
      const miss = uncovered(text, [family, ...latin]);
      expect(miss).toEqual([]);
    }
  });
});

describe("the check detects missing glyphs", () => {
  it("reports characters that neither the script font nor Inter has", () => {
    const { script, latin } = fontsFor("ml");
    expect(uncovered("അമ്മ 漢", [...script, ...latin])).toEqual(["漢"]);
    expect(uncovered("😀", [...fontsFor("hi").script, ...fontsFor("hi").latin])).toEqual(["😀"]);
  });

  it("reports Malayalam text rendered with the Tamil font only", () => {
    const tamilOnly = fontsFor("ta").script;
    expect(uncovered("മരുന്ന്", tamilOnly).length).toBeGreaterThan(0);
  });

  it("finds .notdef when text is shaped with a font that lacks the script", () => {
    // Malayalam shaped with Inter only: the run has no glyphs, so shaping yields .notdef.
    expect(notdefRuns("മരുന്ന്", null, "Inter_400Regular")).toEqual(["മരുന്ന്"]);
    // The same text shaped with its own script font has none.
    expect(notdefRuns("മരുന്ന്", "NotoSansMalayalam_400Regular", "Inter_400Regular")).toEqual([]);
  });
});
