import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";

export interface ReadingValueProps {
  /** What was measured, for example "Blood pressure". Pass text from the catalogue. */
  label: string;
  /** The reading exactly as recorded, for example "150/90". */
  value: string;
  unit?: string;
  testID?: string;
}

/**
 * A health reading in the neutral style. It has no status colour, no icon and no judgement: the app
 * records and relays, it never calls a reading good, bad, normal, safe or dangerous.
 */
export function ReadingValue({ label, value, unit, testID }: ReadingValueProps) {
  const { theme } = useTheme();
  const { reading } = theme.colors;
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={unit ? `${label} ${value} ${unit}` : `${label} ${value}`}
      style={{
        backgroundColor: reading.bg,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        gap: theme.spacing.xs,
      }}
    >
      <Text variant="caption" style={{ color: reading.fg }}>
        {label}
      </Text>
      <Text variant="headline" style={{ color: reading.fg }}>
        {unit ? `${value} ${unit}` : value}
      </Text>
    </View>
  );
}
