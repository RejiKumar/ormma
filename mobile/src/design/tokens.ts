// Design tokens: the single source of colours, type scale, spacing, radius, elevation and motion.
// Screens and components read these through useTheme(); they never use literal values.
// Direction: fresh, calm clarity: mint-white canvas, vivid teal, a teal-to-ocean hero. The dark theme is designed separately, not inverted.
import { MIN_LARGE_OR_GRAPHIC_RATIO, MIN_TEXT_RATIO } from "./contrast";

export type ThemeName = "light" | "dark";
/** Dose statuses shown in the UI — the seven dose-event-lifecycle states. "calling" is the live "calling now" state. */
export type StatusKey = "taken" | "pending" | "missed" | "unclear" | "calling" | "not_taken" | "no_answer";

export interface StatusColors {
  /** Label text colour on `bg`. */
  fg: string;
  bg: string;
  /** Icon colour on `bg`. */
  icon: string;
}

export interface ThemeColors {
  background: string;
  surface: string;
  /** Tinted surface for nested bento tiles and the neutral reading style. */
  surfaceAlt: string;
  /** Decorative hairlines only. Never carries meaning on its own. */
  border: string;
  /** Dims the screen behind a bottom sheet. */
  scrim: string;
  ink: string;
  inkMuted: string;
  /** Muted grey for graphics that are not text (dashed borders). */
  mutedGraphic: string;
  inkOnPrimary: string;
  inkOnAccent: string;
  primary: string;
  primaryTint: string;
  /** End colour of the hero gradient. */
  heroEnd: string;
  /** Amber. Used for fills and highlights, with `inkOnAccent` text on top; never as text on the background. */
  accent: string;
  /** Keyboard and screen-reader focus outline. */
  focus: string;
  status: Record<StatusKey, StatusColors>;
  /** Coral urgent banner. Coral is used only for the missed status and urgent alerts. */
  urgent: StatusColors;
  /** Neutral style for health readings: never a status or judgement colour. */
  reading: { fg: string; bg: string };
  /** Warm neutral backgrounds for initials avatars, with `ink` text. */
  avatars: string[];
  shadow: string;
}

export const lightColors: ThemeColors = {
  background: "#F1F8F7",
  surface: "#FFFFFF",
  /** Neutral chip: a pale mint. */
  surfaceAlt: "#E1EEEC",
  border: "#D3E4E1",
  scrim: "#00000066",
  ink: "#0B2522",
  /** Muted text. Reaches 4.5:1 on every light surface, chip included. */
  inkMuted: "#44605C",
  /** Muted graphic colour, for dashed borders and other graphics only. */
  mutedGraphic: "#587672",
  inkOnPrimary: "#FFFFFF",
  inkOnAccent: "#1F2A2E",
  primary: "#067266",
  primaryTint: "#D6F0EB",
  /** End colour of the hero gradient (starts at `primary`): teal into ocean blue. */
  heroEnd: "#0A5C8C",
  accent: "#FFB020",
  focus: "#064A42",
  status: {
    taken: { fg: "#06593F", bg: "#D5F2E4", icon: "#0A8559" },
    pending: { fg: "#44605C", bg: "#E1EEEC", icon: "#44605C" },
    missed: { fg: "#B04E28", bg: "#FCEEE8", icon: "#C85A32" },
    unclear: { fg: "#5A3F8C", bg: "#ECE6F8", icon: "#6F4DB5" },
    calling: { fg: "#08568F", bg: "#D9EAF9", icon: "#0A66AC" },
    not_taken: { fg: "#7A5210", bg: "#FBEFCF", icon: "#8F6415" },
    no_answer: { fg: "#374F66", bg: "#E4EBF3", icon: "#425E78" },
  },
  urgent: { fg: "#9F3326", bg: "#FCEEE8", icon: "#C85A32" },
  reading: { fg: "#0B2522", bg: "#E9F3F1" },
  avatars: ["#FFD8C2", "#BDE8DE", "#DDD1F8", "#FFE7A3", "#C5DFFA", "#F8CFE2"],
  shadow: "#0B2522",
};

export const darkColors: ThemeColors = {
  background: "#091618",
  surface: "#10262A",
  surfaceAlt: "#183439",
  border: "#27474C",
  scrim: "#000000A6",
  ink: "#E7F6F3",
  inkMuted: "#9FBEBA",
  mutedGraphic: "#7A9C98",
  inkOnPrimary: "#032019",
  inkOnAccent: "#1B1406",
  primary: "#3ED0B3",
  primaryTint: "#12332F",
  heroEnd: "#45AEE0",
  accent: "#FFB020",
  focus: "#8DE6D2",
  status: {
    taken: { fg: "#7FE3B0", bg: "#10392A", icon: "#7FE3B0" },
    pending: { fg: "#B6CDCA", bg: "#1E383C", icon: "#B6CDCA" },
    missed: { fg: "#FFA79A", bg: "#4A2420", icon: "#FF8E7E" },
    unclear: { fg: "#CDB8F2", bg: "#34294B", icon: "#CDB8F2" },
    calling: { fg: "#8CCBFF", bg: "#12324B", icon: "#8CCBFF" },
    not_taken: { fg: "#F2D18A", bg: "#3B2F1C", icon: "#EFC36E" },
    no_answer: { fg: "#A9C6E2", bg: "#26333F", icon: "#9CBFE0" },
  },
  urgent: { fg: "#FFB3A7", bg: "#55231D", icon: "#FF8E7E" },
  reading: { fg: "#E7F6F3", bg: "#183439" },
  avatars: ["#5E4636", "#2B5A52", "#4E4268", "#665A2C", "#355278", "#68415A"],
  shadow: "#000000",
};

// ---------- type ----------
export type FontWeight = "400" | "500" | "600" | "700";
export type TextVariant =
  | "caption"
  | "label"
  | "body"
  | "bodyStrong"
  | "bodyLarge"
  | "title"
  | "headline"
  | "display"
  | "tag"
  | "receipt"
  | "badge"
  | "small"
  | "heading"
  | "bodyMedium"
  | "micro"
  | "chip"
  | "chipStrong"
  | "meta"
  | "note"
  | "cardTitle"
  | "section"
  | "brand";

export interface TextStyleToken {
  /** Font size in dp before the OS font scale. */
  size: number;
  weight: FontWeight;
}

export const typeScale: Record<TextVariant, TextStyleToken> = {
  caption: { size: 13, weight: "400" },
  label: { size: 14, weight: "600" },
  body: { size: 16, weight: "400" },
  bodyStrong: { size: 16, weight: "600" },
  bodyLarge: { size: 18, weight: "400" },
  title: { size: 22, weight: "600" },
  headline: { size: 28, weight: "700" },
  display: { size: 36, weight: "700" },
  /** 10 uppercase tag, e.g. the confirmation note label. */
  tag: { size: 10, weight: "600" },
  /** 11 read receipts, badges and presence text. */
  receipt: { size: 11, weight: "400" },
  /** 18 semibold tab headings. */
  heading: { size: 18, weight: "600" },
  /** 14 medium names. */
  bodyMedium: { size: 14, weight: "500" },
  /** 11 medium chips and tab labels. */
  micro: { size: 11, weight: "500" },
  /** 12 regular captions on the hero. */
  small: { size: 12, weight: "400" },
  /** 11 semibold status badges. */
  badge: { size: 11, weight: "600" },
  /** 12 medium chips. */
  chip: { size: 12, weight: "500" },
  /** 12 semibold action pills. */
  chipStrong: { size: 12, weight: "600" },
  /** 13 medicine line. */
  meta: { size: 13, weight: "500" },
  /** 14 note body. */
  note: { size: 14, weight: "400" },
  /** 15 card heading. */
  cardTitle: { size: 15, weight: "600" },
  /** 16 section heading. */
  section: { size: 16, weight: "600" },
  /** 18 bold brand mark. */
  brand: { size: 18, weight: "700" },
};

/** Maximum OS font scale applied to text. Components grow instead of clipping. */
export const MAX_FONT_SCALE = 2;

// ---------- layout ----------
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, hero: 20, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 14, chip: 16, lg: 24, xl: 28, pill: 999 } as const;
/** Minimum touch target in dp. */
export const MIN_TOUCH_TARGET = 48;

export interface Elevation {
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  /** Android elevation. */
  elevation: number;
}
/** Five levels: none, card (1), hero (2, tinted by the theme shadow colour), toast (3), modal (4). */
export const elevation: Record<"none" | "card" | "hero" | "toast" | "modal", Elevation> = {
  none: { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  card: { shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  hero: { shadowOpacity: 0.18, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  toast: { shadowOpacity: 0.18, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  modal: { shadowOpacity: 0.25, shadowRadius: 25, shadowOffset: { width: 0, height: 25 }, elevation: 12 },
};

// ---------- motion ----------
export const motion = {
  duration: { instant: 0, fast: 150, base: 220, slow: 300 },
  /** Pulse period for the "calling now" indicator. The only repeating animation. */
  pulseMs: 1600,
} as const;

// ---------- theme ----------
export interface Theme {
  name: ThemeName;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  motion: typeof motion;
  typeScale: typeof typeScale;
}

const base = { spacing, radius, elevation, motion, typeScale };
export const lightTheme: Theme = { name: "light", colors: lightColors, ...base };
export const darkTheme: Theme = { name: "dark", colors: darkColors, ...base };
export const themes: Record<ThemeName, Theme> = { light: lightTheme, dark: darkTheme };

// ---------- declared contrast pairs ----------
export type PairKind = "text" | "large" | "graphic";
export interface ContrastPair {
  /** Human-readable name, e.g. "ink on surface". */
  name: string;
  /** Token name of the foreground, e.g. "status.missed.fg". */
  fgToken: string;
  fg: string;
  bg: string;
  kind: PairKind;
}

/** Minimum ratio for a pair kind. */
export const minRatio = (kind: PairKind): number =>
  kind === "text" ? MIN_TEXT_RATIO : MIN_LARGE_OR_GRAPHIC_RATIO;

const STATUS_KEYS: StatusKey[] = ["taken", "pending", "missed", "unclear", "calling", "not_taken", "no_answer"];

/** Every text/background and icon/background combination the components use, per theme. */
export function contrastPairs(c: ThemeColors): ContrastPair[] {
  const pairs: ContrastPair[] = [];
  const add = (name: string, fgToken: string, fg: string, bg: string, kind: PairKind) =>
    pairs.push({ name, fgToken, fg, bg, kind });

  for (const [bgName, bg] of [
    ["background", c.background],
    ["surface", c.surface],
    ["surfaceAlt", c.surfaceAlt],
    ["primaryTint", c.primaryTint],
  ] as const) {
    add(`ink on ${bgName}`, "ink", c.ink, bg, "text");
  }
  for (const [bgName, bg] of [
    ["background", c.background],
    ["surface", c.surface],
    ["surfaceAlt", c.surfaceAlt],
    ["primaryTint", c.primaryTint],
  ] as const) {
    add(`inkMuted on ${bgName}`, "inkMuted", c.inkMuted, bg, "text");
    add(`primary text on ${bgName}`, "primary", c.primary, bg, "text");
  }
  add("inkOnPrimary on primary", "inkOnPrimary", c.inkOnPrimary, c.primary, "text");
  add("inkOnPrimary on hero end", "inkOnPrimary", c.inkOnPrimary, c.heroEnd, "text");
  add("mutedGraphic on surface", "mutedGraphic", c.mutedGraphic, c.surface, "graphic");
  add("toast text on ink", "background", c.background, c.ink, "text");
  add("timeline check on primary", "inkOnPrimary", c.inkOnPrimary, c.primary, "graphic");
  add("timeline alert on missed dot", "inkOnPrimary", c.inkOnPrimary, c.status.missed.icon, "graphic");
  add("inkOnAccent on accent", "inkOnAccent", c.inkOnAccent, c.accent, "text");

  for (const key of STATUS_KEYS) {
    const s = c.status[key];
    add(`status ${key} label`, `status.${key}.fg`, s.fg, s.bg, "text");
    add(`status ${key} icon`, `status.${key}.icon`, s.icon, s.bg, "graphic");
  }
  add("urgent label", "urgent.fg", c.urgent.fg, c.urgent.bg, "text");
  add("urgent icon", "urgent.icon", c.urgent.icon, c.urgent.bg, "graphic");
  add("reading value", "reading.fg", c.reading.fg, c.reading.bg, "text");

  c.avatars.forEach((bg, i) => add(`ink on avatar ${i}`, "ink", c.ink, bg, "text"));

  add("primary icon on primaryTint", "primary", c.primary, c.primaryTint, "graphic");
  add("inkMuted icon on background", "inkMuted", c.inkMuted, c.background, "graphic");
  add("DoseRing progress on surface", "primary", c.primary, c.surface, "graphic");
  add("tab icon active on surface", "primary", c.primary, c.surface, "graphic");
  add("tab icon inactive on surface", "inkMuted", c.inkMuted, c.surface, "graphic");
  add("focus outline on background", "focus", c.focus, c.background, "graphic");
  add("focus outline on surface", "focus", c.focus, c.surface, "graphic");
  return pairs;
}

/** Names of every foreground colour token that must appear in a declared contrast pair. */
export function foregroundTokenNames(c: ThemeColors): string[] {
  return [
    "ink",
    "inkMuted",
    "background",
    "mutedGraphic",
    "inkOnPrimary",
    "inkOnAccent",
    "primary",
    "focus",
    ...STATUS_KEYS.flatMap((k) => [`status.${k}.fg`, `status.${k}.icon`]),
    "urgent.fg",
    "urgent.icon",
    "reading.fg",
  ].filter((name) => resolveToken(c, name) !== undefined);
}

function resolveToken(c: ThemeColors, name: string): string | undefined {
  const parts = name.split(".");
  let cur: unknown = c;
  for (const p of parts) cur = (cur as Record<string, unknown> | undefined)?.[p];
  return typeof cur === "string" ? cur : undefined;
}
