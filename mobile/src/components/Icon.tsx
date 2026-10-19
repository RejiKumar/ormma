import Svg, { Circle, G, Path, Rect } from "react-native-svg";

type El =
  | { t: "path"; d: string }
  | { t: "circle"; cx: number; cy: number; r: number; filled?: boolean }
  | { t: "rect"; x: number; y: number; w: number; h: number; rx: number };

interface IconDef {
  els: El[];
  /** SVG transform applied to all elements. */
  transform?: string;
}

const ring = (r = 9): El => ({ t: "circle", cx: 12, cy: 12, r });
const dot = (cx: number, cy: number): El => ({ t: "circle", cx, cy, r: 0.4, filled: true });

/** A small fixed set of 24 x 24 stroke icons. Stroke colour and size come from the caller. */
export const ICONS = {
  check: { els: [{ t: "path", d: "M5 12.5l4.5 4.5L19 7" }] },
  clock: { els: [ring(), { t: "path", d: "M12 7v5l3.2 2" }] },
  xCircle: { els: [ring(), { t: "path", d: "M9 9l6 6" }, { t: "path", d: "M15 9l-6 6" }] },
  question: {
    els: [
      ring(),
      { t: "path", d: "M9.6 9.3a2.5 2.5 0 1 1 3.6 2.2c-.9.5-1.2 1-1.2 1.9" },
      dot(12, 16.6),
    ],
  },
  phone: {
    els: [
      {
        t: "path",
        d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
      },
    ],
  },
  info: { els: [ring(), { t: "path", d: "M12 11v5" }, dot(12, 8)] },
  plus: {
    els: [
      { t: "path", d: "M12 5v14" },
      { t: "path", d: "M5 12h14" },
    ],
  },
  chevronRight: { els: [{ t: "path", d: "M9 6l6 6-6 6" }] },
  home: {
    els: [
      { t: "path", d: "M4 11l8-7 8 7" },
      { t: "path", d: "M6 10v9a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1v-9" },
    ],
  },
  pill: {
    transform: "rotate(-45 12 12)",
    els: [
      { t: "rect", x: 3, y: 8.5, w: 18, h: 7, rx: 3.5 },
      { t: "path", d: "M12 8.5v7" },
    ],
  },
  bell: {
    els: [
      { t: "path", d: "M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" },
      { t: "path", d: "M10 19.5a2 2 0 0 0 4 0" },
    ],
  },
  people: {
    els: [
      { t: "circle", cx: 9, cy: 8, r: 3.2 },
      { t: "path", d: "M3.5 19a5.5 5.5 0 0 1 11 0" },
      { t: "circle", cx: 17, cy: 9, r: 2.5 },
      { t: "path", d: "M16 14.2a4.5 4.5 0 0 1 5 4.3" },
    ],
  },
  user: {
    els: [
      { t: "circle", cx: 12, cy: 8, r: 4 },
      { t: "path", d: "M4.5 20a7.5 7.5 0 0 1 15 0" },
    ],
  },
  alert: {
    els: [{ t: "path", d: "M12 4l9 16H3z" }, { t: "path", d: "M12 10v4" }, dot(12, 17)],
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  /** Stroke colour from the theme. */
  color: string;
  strokeWidth?: number;
  /** Accessible name. Icons are decorative (hidden from screen readers) when omitted. */
  accessibilityLabel?: string;
  testID?: string;
}

export function Icon({
  name,
  size = 24,
  color,
  strokeWidth = 2,
  accessibilityLabel,
  testID,
}: IconProps) {
  const def: IconDef = ICONS[name];
  const decorative = accessibilityLabel === undefined;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      testID={testID ?? `icon-${name}`}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : "image"}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={decorative ? "no-hide-descendants" : "yes"}
      accessibilityElementsHidden={decorative}
    >
      <G transform={def.transform}>
        {def.els.map((el, i) => {
          const common = {
            stroke: color,
            strokeWidth,
            strokeLinecap: "round" as const,
            strokeLinejoin: "round" as const,
          };
          if (el.t === "path") return <Path key={i} d={el.d} {...common} />;
          if (el.t === "circle")
            return (
              <Circle
                key={i}
                cx={el.cx}
                cy={el.cy}
                r={el.r}
                {...common}
                fill={el.filled ? color : "none"}
              />
            );
          return (
            <Rect key={i} x={el.x} y={el.y} width={el.w} height={el.h} rx={el.rx} {...common} />
          );
        })}
      </G>
    </Svg>
  );
}
