// Design tokens: the single source of colours, type scale, spacing, radius, elevation and motion.
// Screens and components read these through useTheme(); they never use literal values.
// Direction: warm, calm clarity. The dark theme is designed separately, not inverted.
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
  background: "#F8F7F4",
  surface: "#FFFFFF",
  /** Neutral chip. */
  surfaceAlt: "#EDEAE4",
  border: "#E5E2DC",
  ink: "#1A2421",
  /** Muted text. A shade of #6B7470 that reaches 4.5:1 on every light surface, chip included. */
  inkMuted: "#626B67",
  /** The supplied muted grey, for dashed borders and other graphics only. */
  mutedGraphic: "#6B7470",
  inkOnPrimary: "#FFFFFF",
  inkOnAccent: "#1F2A2E",
  primary: "#2D5A4C",
  primaryTint: "#EBF1EE",
  /** End colour of the hero gradient (starts at `primary`). */
  heroEnd: "#204237",
  accent: "#F2A93B",
  focus: "#1C3B31",
  status: {
    taken: { fg: "#1C3B32", bg: "#EBF1EE", icon: "#2D5A4C" },
    pending: { fg: "#626B67", bg: "#EDEAE4", icon: "#626B67" },
    missed: { fg: "#B04E28", bg: "#FCEEE8", icon: "#C85A32" },
    unclear: { fg: "#5E4388", bg: "#EFE9F7", icon: "#7452B0" },
    calling: { fg: "#0F6B6B", bg: "#DDEFEE", icon: "#0F6B6B" },
    not_taken: { fg: "#7A5210", bg: "#F7EDD4", icon: "#8F6415" },
    no_answer: { fg: "#38536E", bg: "#E8EEF5", icon: "#46617D" },
  },
  urgent: { fg: "#9F3326", bg: "#FCEEE8", icon: "#C85A32" },
  reading: { fg: "#1A2421", bg: "#F1EFEA" },
  avatars: ["#F6D9C7", "#D3E6E3", "#E2D8EF", "#F2E3B3", "#D6E2F0", "#E2DED2"],
  shadow: "#1A2421",
};

export const darkColors: ThemeColors = {
  background: "#121819",
  surface: "#1A2224",
  surfaceAlt: "#222C2F",
  border: "#333D39",
  ink: "#E8EFF0",
  inkMuted: "#A6B5BA",
  mutedGraphic: "#7F8E93",
  inkOnPrimary: "#082626",
  inkOnAccent: "#1B1406",
  primary: "#8FBEA4",
  primaryTint: "#233029",
  heroEnd: "#7AAA92",
  accent: "#F2A93B",
  focus: "#A3D0B5",
  status: {
    taken: { fg: "#86D9A8", bg: "#1B3A2A", icon: "#86D9A8" },
    pending: { fg: "#B9C5CA", bg: "#2A3438", icon: "#B9C5CA" },
    missed: { fg: "#FFA79A", bg: "#4A2420", icon: "#FF8E7E" },
    unclear: { fg: "#CDB8F2", bg: "#34294B", icon: "#CDB8F2" },
    calling: { fg: "#7FD9D6", bg: "#1B3A3A", icon: "#7FD9D6" },
    not_taken: { fg: "#F2D18A", bg: "#3B2F1C", icon: "#EFC36E" },
    no_answer: { fg: "#A9C6E2", bg: "#26333F", icon: "#9CBFE0" },
  },
  urgent: { fg: "#FFB3A7", bg: "#55231D", icon: "#FF8E7E" },
  reading: { fg: "#E8EFF0", bg: "#222C2F" },
  avatars: ["#5A4636", "#2F4A47", "#493D5C", "#5C512A", "#34475C", "#4A463C"],
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
