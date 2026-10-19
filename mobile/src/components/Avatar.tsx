import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";

/** First letter (with its combining marks, so Indic letters stay whole) of up to two words, uppercased. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return words
    .map((w) => (w.match(/\p{L}\p{M}*/u)?.[0] ?? w[0] ?? "").toLocaleUpperCase())
    .join("");
}

/** Stable index from a name, so a person keeps the same avatar colour. */
export function hashName(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return h;
}

export interface AvatarProps {
  name: string;
  /** Language of the name, so Indic initials use the right font. */
  lang?: string;
  size?: number;
  testID?: string;
}

/** Initials on a warm neutral tint. Avatar colours are never status colours. */
export function Avatar({ name, lang, size = 48, testID }: AvatarProps) {
  const { theme } = useTheme();
  const palette = theme.colors.avatars;
  const bg = palette[hashName(name) % palette.length];
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text variant="bodyStrong" lang={lang} style={{ fontSize: Math.round(size * 0.38) }}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}
