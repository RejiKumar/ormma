import { render, screen } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import { StyleSheet } from "react-native";
import i18n, { initI18n, type AppLanguage } from "../i18n";
import { LINE_HEIGHT_MULTIPLIER, fontFamilyFor, lineHeightFor, scriptFor } from "./fonts";
import { Text } from "./Text";
import { ThemeProvider } from "./ThemeProvider";
import { MAX_FONT_SCALE, typeScale, type TextVariant } from "./tokens";

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

async function renderText(
  language: AppLanguage,
  variant: TextVariant = "body",
  lang?: string,
  content = "x",
) {
  initI18n(language);
  await i18n.changeLanguage(language);
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <Text testID="t" variant={variant} lang={lang}>
          {content}
        </Text>
      </ThemeProvider>
    </I18nextProvider>,
  );
}

afterEach(async () => {
  if (i18n.isInitialized) await i18n.changeLanguage("en");
});

describe("script and font helpers", () => {
  it("maps language codes to scripts", () => {
    expect(scriptFor("en")).toBe("latin");
    expect(scriptFor("ml-IN")).toBe("malayalam");
    expect(scriptFor("ta")).toBe("tamil");
    expect(scriptFor("hi_IN")).toBe("devanagari");
    expect(scriptFor(undefined)).toBe("latin");
  });

  it("picks Inter for Latin and the Noto Sans of the script for ml, ta and hi", () => {
    expect(fontFamilyFor("latin", "400")).toBe("Inter_400Regular");
    expect(fontFamilyFor("latin", "600")).toBe("Inter_600SemiBold");
    expect(fontFamilyFor("malayalam", "400")).toBe("NotoSansMalayalam_400Regular");
    expect(fontFamilyFor("tamil", "500")).toBe("NotoSansTamil_500Medium");
    expect(fontFamilyFor("devanagari", "700")).toBe("NotoSansDevanagari_700Bold");
    expect(fontFamilyFor("devanagari", "600")).toBe("NotoSansDevanagari_700Bold"); // semibold uses the bold file
  });

  it("gives Indic scripts a taller line height than Latin, at every size of the type scale", () => {
    for (const { size } of Object.values(typeScale)) {
      const latin = lineHeightFor("latin", size);
      for (const script of ["malayalam", "tamil", "devanagari"] as const) {
        expect(lineHeightFor(script, size)).toBeGreaterThan(latin);
      }
    }
    expect(LINE_HEIGHT_MULTIPLIER.latin).toBeLessThan(LINE_HEIGHT_MULTIPLIER.devanagari);
    expect(LINE_HEIGHT_MULTIPLIER.malayalam).toBeGreaterThanOrEqual(LINE_HEIGHT_MULTIPLIER.tamil);
  });
});

describe("Text", () => {
  it.each([
    ["en", "Inter_400Regular", "latin", "Medicine"],
    ["ml", "NotoSansMalayalam_400Regular", "malayalam", "മരുന്ന്"],
    ["ta", "NotoSansTamil_400Regular", "tamil", "மருந்து"],
    ["hi", "NotoSansDevanagari_400Regular", "devanagari", "दवा"],
  ] as const)("uses the %s font family and line height", async (language, family, script, text) => {
    await renderText(language, "body", undefined, text);
    expect(flat("t").fontFamily).toBe(family);
    expect(flat("t").fontSize).toBe(typeScale.body.size);
    expect(flat("t").lineHeight).toBe(lineHeightFor(script, typeScale.body.size));
  });

  it("renders English fallback strings with Inter even when the app language is ml, ta or hi", async () => {
    for (const language of ["ml", "ta", "hi"] as const) {
      const view = await renderText(language, "body", undefined, "Missed");
      expect(flat("t").fontFamily).toBe("Inter_400Regular");
      expect(flat("t").lineHeight).toBe(lineHeightFor("latin", typeScale.body.size));
      await view.unmount();
    }
  });

  it("uses the script of the content, for example a Malayalam name in an English app", async () => {
    await renderText("en", "body", undefined, "അമ്മ");
    expect(flat("t").fontFamily).toBe("NotoSansMalayalam_400Regular");
  });

  it("uses a script font when a string mixes script letters with Latin letters or digits", async () => {
    await renderText("en", "body", undefined, "അമ്മ 8:00 Amma");
    expect(flat("t").fontFamily).toBe("NotoSansMalayalam_400Regular");
  });

  it("falls back to the app language's script for digits and punctuation only", async () => {
    await renderText("ta", "body", undefined, "8:00");
    expect(flat("t").fontFamily).toBe("NotoSansTamil_400Regular");
    await renderText("en", "body", undefined, "8:00");
    expect(flat("t").fontFamily).toBe("Inter_400Regular");
  });

  it("allows OS font scaling up to the maximum multiplier", async () => {
    await renderText("en");
    const props = screen.getByTestId("t").props;
    expect(props.allowFontScaling).toBe(true);
    expect(props.maxFontSizeMultiplier).toBe(MAX_FONT_SCALE);
    expect(MAX_FONT_SCALE).toBeGreaterThanOrEqual(1.5);
  });

  it("follows the type scale for each variant", async () => {
    await renderText("en", "headline");
    expect(flat("t").fontSize).toBe(28);
    expect(flat("t").fontFamily).toBe("Inter_700Bold");
  });

  it("lets the lang prop override the content script", async () => {
    await renderText("en", "body", "ml-IN");
    expect(flat("t").fontFamily).toBe("NotoSansMalayalam_400Regular");
  });
});
