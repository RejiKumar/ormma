import { useTranslation } from "react-i18next";
import { Modal, Pressable, View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { Button } from "./Button";

export interface UpgradeSheetProps {
  visible: boolean;
  /** The fixed message naming the limit that stopped the action. */
  message: string;
  onSeePlans: () => void;
  onClose: () => void;
}

/**
 * A short, calm sheet shown when a plan limit stops an action: the limit, one line on what Ormma Family
 * includes, See plans and Not now. It blocks nothing else and uses no urgency, countdown or coral.
 */
export function UpgradeSheet({ visible, message, onSeePlans, onClose }: UpgradeSheetProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }} testID="upgrade-sheet">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("subscription.notNow")}
          onPress={onClose}
          style={{ ...absoluteFill, backgroundColor: theme.colors.scrim }}
          testID="upgrade-sheet-scrim"
        />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <Text variant="cardTitle" testID="upgrade-sheet-message">
            {message}
          </Text>
          <Text variant="body" tone="muted">
            {t("subscription.sheetBenefit")}
          </Text>
          <Button label={t("subscription.seePlans")} testID="upgrade-see-plans" onPress={onSeePlans} />
          <Button label={t("subscription.notNow")} variant="quiet" testID="upgrade-not-now" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const absoluteFill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
