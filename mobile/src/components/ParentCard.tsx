import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import type { StatusKey } from "../design/tokens";
import { Avatar } from "./Avatar";
import { Card } from "./Card";
import { DoseRing } from "./DoseRing";
import { StatusChip } from "./StatusChip";

export interface ParentCardProps {
  name: string;
  /** Language of the name (the parent's language), so Indic names use the right font. */
  lang?: string;
  /** One line under the name, for example the next dose. Pass text from the catalogue. */
  summary?: string;
  /** Status of the next or latest dose. */
  status?: StatusKey;
  taken: number;
  total: number;
  onPress: () => void;
  testID?: string;
}

/** A parent at a glance: avatar, name, next dose summary, status chip and today's dose ring. */
export function ParentCard({
  name,
  lang,
  summary,
  status,
  taken,
  total,
  onPress,
  testID,
}: ParentCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <Card onPress={onPress} accessibilityLabel={t("parentCard.open", { name })} testID={testID}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
        <Avatar name={name} lang={lang} size={56} />
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text variant="title" lang={lang}>
            {name}
          </Text>
          {summary ? (
            <Text variant="body" tone="muted">
              {summary}
            </Text>
          ) : null}
          {status ? <StatusChip status={status} /> : null}
        </View>
        <DoseRing taken={taken} total={total} size={64} strokeWidth={8} />
      </View>
    </Card>
  );
}
