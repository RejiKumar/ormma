import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Card } from "../components/Card";
import { Icon, type IconName } from "../components/Icon";
import { ListItem } from "../components/ListItem";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import type { ChecklistItem, ChecklistKey } from "./useFirstParentChecklist";

const ICON: Record<ChecklistKey, IconName> = { parent: "user", medicine: "pill", invite: "people" };

/** The three first steps with their done state. Each row opens the screen where it is done. */
export function FirstParentChecklistCard({
  items,
  onOpen,
}: {
  items: ChecklistItem[];
  onOpen: (key: ChecklistKey) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <Card testID="first-parent-checklist" tone="tinted" style={{ gap: theme.spacing.xs }}>
      <Text variant="title" accessibilityRole="header">
        {t("checklist.title")}
      </Text>
      {items.map((item) => {
        const label = t(`checklist.${item.key}`);
        return (
          <ListItem
            key={item.key}
            testID={`checklist-${item.key}`}
            title={label}
            accessibilityLabel={`${label}, ${item.done ? t("checklist.done") : t("checklist.notDone")}`}
            onPress={() => onOpen(item.key)}
            leading={
              <View
                testID={`checklist-${item.key}-${item.done ? "done" : "todo"}`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: theme.radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.colors.surface,
                }}
              >
                <Icon name={item.done ? "check" : ICON[item.key]} size={20} color={theme.colors.primary} />
              </View>
            }
          />
        );
      })}
    </Card>
  );
}
