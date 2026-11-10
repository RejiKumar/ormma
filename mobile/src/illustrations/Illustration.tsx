import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useTheme } from "../design/ThemeProvider";

// Simple geometric illustrations drawn with theme tokens only, so they follow the light and dark
// theme. No text, no medical imagery, no coral. Meaningful shapes are `primary` on a tint or
// `inkOnPrimary` on `primary`, the pairs the contrast test already declares at 3:1.

export type IllustrationName =
  | "welcomeCalls"
  | "welcomeReplies"
  | "welcomeFamily"
  | "emptyParents"
  | "emptyPlanner";

export const ILLUSTRATION_NAMES: IllustrationName[] = [
  "welcomeCalls",
  "welcomeReplies",
  "welcomeFamily",
  "emptyParents",
  "emptyPlanner",
];

export function Illustration({ name, size = 160 }: { name: IllustrationName; size?: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const line = { stroke: c.primary, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Circle cx={80} cy={80} r={72} fill={c.primaryTint} />
      {name === "welcomeCalls" ? (
        <>
          <Rect x={52} y={32} width={52} height={96} rx={12} fill={c.primary} />
          <Rect x={59} y={44} width={38} height={62} rx={5} fill={c.surface} />
          <Circle cx={78} cy={75} r={15} {...line} strokeWidth={4} />
          <Path d="M78 75 V65 M78 75 L85 79" {...line} strokeWidth={4} />
          <Circle cx={78} cy={117} r={4} fill={c.inkOnPrimary} />
          <Path d="M113 62 Q124 80 113 98" {...line} strokeWidth={5} />
          <Path d="M123 52 Q141 80 123 108" {...line} strokeWidth={5} />
        </>
      ) : null}
      {name === "welcomeReplies" ? (
        <>
          <Rect x={32} y={42} width={96} height={66} rx={20} fill={c.primary} />
          <Path d="M56 106 L48 130 L80 106 Z" fill={c.primary} />
          <Path d="M58 76 L74 91 L104 60" stroke={c.inkOnPrimary} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Circle cx={124} cy={38} r={9} fill={c.surface} stroke={c.primary} strokeWidth={4} />
        </>
      ) : null}
      {name === "welcomeFamily" ? (
        <>
          <Path d="M28 126 A21 21 0 0 1 70 126 Z" fill={c.avatars[0]} stroke={c.primary} strokeWidth={3} />
          <Circle cx={49} cy={86} r={13} fill={c.avatars[0]} stroke={c.primary} strokeWidth={3} />
          <Path d="M90 126 A21 21 0 0 1 132 126 Z" fill={c.avatars[1]} stroke={c.primary} strokeWidth={3} />
          <Circle cx={111} cy={86} r={13} fill={c.avatars[1]} stroke={c.primary} strokeWidth={3} />
          <Path d="M54 128 A26 26 0 0 1 106 128 Z" fill={c.primary} />
          <Circle cx={80} cy={76} r={16} fill={c.primary} />
          <Circle cx={122} cy={36} r={14} fill={c.primary} />
          <Rect x={115} y={34} width={14} height={11} rx={2} fill={c.inkOnPrimary} />
          <Path d="M118 34 V30 A4 4 0 0 1 126 30 V34" stroke={c.inkOnPrimary} strokeWidth={3} strokeLinecap="round" fill="none" />
        </>
      ) : null}
      {name === "emptyParents" ? (
        <>
          <Path d="M36 86 L80 46 L124 86" {...line} strokeWidth={7} />
          <Rect x={50} y={84} width={60} height={44} rx={8} fill={c.primary} />
          <Rect x={72} y={98} width={16} height={30} rx={4} fill={c.surface} />
          <Circle cx={122} cy={40} r={15} fill={c.primary} />
          <Path d="M122 32 V48 M114 40 H130" stroke={c.inkOnPrimary} strokeWidth={4} strokeLinecap="round" fill="none" />
        </>
      ) : null}
      {name === "emptyPlanner" ? (
        <>
          <Rect x={36} y={38} width={88} height={88} rx={16} fill={c.surface} stroke={c.primary} strokeWidth={5} />
          <Path d="M38.5 62 V54 A14 14 0 0 1 52.5 40.5 H107.5 A14 14 0 0 1 121.5 54 V62 Z" fill={c.primary} />
          <Circle cx={58} cy={80} r={8} fill={c.primaryTint} stroke={c.primary} strokeWidth={3} />
          <Path d="M54 80 L57 83 L62 77" stroke={c.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Rect x={74} y={77} width={36} height={6} rx={3} fill={c.surfaceAlt} />
          <Circle cx={58} cy={104} r={8} fill={c.primaryTint} stroke={c.primary} strokeWidth={3} />
          <Rect x={74} y={101} width={28} height={6} rx={3} fill={c.surfaceAlt} />
        </>
      ) : null}
    </Svg>
  );
}
