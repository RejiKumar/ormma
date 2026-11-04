import { useState } from "react";
import { View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../design/ThemeProvider";

/**
 * Radial gradient from the primary colour to the hero end colour, drawn behind the hero content.
 * It measures its own box so it always fills the card.
 */
export function HeroGradient() {
  const { theme } = useTheme();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  return (
    <View
      pointerEvents="none"
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.primary }}
    >
      {size ? (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <RadialGradient
              id="hero-gradient"
              cx={size.width * 0.2}
              cy={0}
              rx={size.width * 1.2}
              ry={size.height * 1.4}
              fx={size.width * 0.2}
              fy={0}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={theme.colors.primary} />
              <Stop offset="1" stopColor={theme.colors.heroEnd} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill="url(#hero-gradient)" />
        </Svg>
      ) : null}
    </View>
  );
}
