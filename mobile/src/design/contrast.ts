// WCAG 2.x contrast helpers. Used by the design tokens' declared pairs and by the contrast test.

/** Parse "#RRGGBB" into 0..255 channels. */
function parseHex(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Expected #RRGGBB, got "${hex}"`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance of an sRGB colour. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Minimum ratios: 4.5:1 for text, 3:1 for large text and for icons and meaningful graphics. */
export const MIN_TEXT_RATIO = 4.5;
export const MIN_LARGE_OR_GRAPHIC_RATIO = 3;

/** Large text is 24 px or larger, or 18.67 px (14 pt) or larger and bold (weight 700 or more). */
export function isLargeText(fontSize: number, fontWeight: number): boolean {
  return fontSize >= 24 || (fontSize >= 18.67 && fontWeight >= 700);
}
