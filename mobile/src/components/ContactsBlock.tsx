import { useTranslation } from "react-i18next";
import { Linking, View } from "react-native";
import type { EmergencyContact } from "../../../shared/types";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { PressableScale } from "../design/PressableScale";
import { Icon } from "./Icon";

/**
 * The people who can check in, as in the prototype: an initial avatar, the label, a short note (or the
 * type when there is none) and a Call button that opens the dialer. The buttons are disabled while
 * nothing is missed; the app never places a call itself.
 */
export function ContactsBlock({
  contacts,
  disabled = false,
}: {
  contacts: EmergencyContact[];
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  if (contacts.length === 0) return null;
  return (
    <View style={{ gap: theme.spacing.sm }} testID="contacts-block">
      <Text variant="label" tone="muted">
        {t("escalation.contactsTitle")}
      </Text>
      {contacts.map((contact, index) => (
        <View
          key={`${contact.phone}-${index}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            backgroundColor: theme.colors.background,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.md,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primaryTint,
            }}
          >
            <Text variant="bodyStrong" tone="primary">
              {contact.label.trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">{contact.label}</Text>
            <Text variant="small" tone="muted">
              {contact.note && contact.note.length > 0
                ? contact.note
                : t(contact.kind === "clinic" ? "escalation.kindClinic" : "escalation.kindNeighbour")}
            </Text>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t("escalation.contactCall", { label: contact.label })}
            accessibilityState={{ disabled }}
            testID={`escalation-contact-${index}`}
            disabled={disabled}
            onPress={() => void Linking.openURL(`tel:${contact.phone}`).catch(() => undefined)}
            style={{
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.sm,
              borderRadius: theme.radius.pill,
              borderWidth: 1.5,
              borderColor: theme.colors.primary,
              paddingHorizontal: theme.spacing.md,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Icon name="phone" color={theme.colors.primary} size={16} />
            <Text variant="chipStrong" tone="primary">
              {t("escalation.contactCall", { label: contact.label })}
            </Text>
          </PressableScale>
        </View>
      ))}
    </View>
  );
}
