import { Children } from "react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { fontFamilyFor, lineHeightFor, scriptFor, scriptOfText, type Script } from "./fonts";
import { useTheme } from "./ThemeProvider";
import { MAX_FONT_SCALE, type TextVariant, type ThemeColors } from "./tokens";

export type TextTone = "ink" | "muted" | "onPrimary" | "onAccent" | "primary";

const toneColor = (c: ThemeColors, tone: TextTone): string =>
  ({
    ink: c.ink,
    muted: c.inkMuted,
    onPrimary: c.inkOnPrimary,
    onAccent: c.inkOnAccent,
    primary: c.primary,
  })[tone];

/** The text content when it is plain strings and numbers, else undefined. */
function plainText(children: ReactNode): string | undefined {
  const parts = Children.toArray(children);
  if (parts.length === 0) return undefined;
  return parts.every((p) => typeof p === "string" || typeof p === "number")
    ? parts.join("")
    : undefined;
}

/** An explicit `lang` wins; otherwise the script of the content; otherwise the app language's script. */
function resolveScript(lang: string | undefined, children: ReactNode, appScript: Script): Script {
  if (lang) return scriptFor(lang);
  const text = plainText(children);
  return text === undefined ? appScript : scriptOfText(text, appScript);
}

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Force the script of this text (for example a parent's language). By default it follows the content. */
  lang?: string;
}

/**
 * Themed text. Picks the font of the text's script (Inter, or Noto Sans for ml, ta, hi), the line
 * height for that script, and respects the OS font scale up to MAX_FONT_SCALE.
 */
export function Text({ variant = "body", tone = "ink", lang, style, ...rest }: TextProps) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const script = resolveScript(lang, rest.children, scriptFor(i18n.language));
  const token = theme.typeScale[variant];
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[
        {
          color: toneColor(theme.colors, tone),
          fontFamily: fontFamilyFor(script, token.weight),
          fontSize: token.size,
          lineHeight: lineHeightFor(script, token.size),
        },
        style,
      ]}
      {...rest}
    />
  );
}
