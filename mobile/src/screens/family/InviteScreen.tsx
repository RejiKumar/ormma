import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Share, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FormError } from "../../components/FormError";
import { planLimitReason } from "../../family/planErrors";
import { Icon } from "../../components/Icon";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { createInvite } from "../../family/callables";
import type { FamilyStackParamList } from "../../navigation/FamilyStack";

type Props = NativeStackScreenProps<FamilyStackParamList, "Invite">;
type InviteRole = "editor" | "viewer";

const ROLE_KEY = {
  editor: "screens.invite.roleEditor",
  viewer: "screens.invite.roleViewer",
} as const;

const ROLE_DESC_KEY = {
  editor: "screens.invite.roleEditorDescription",
  viewer: "screens.invite.roleViewerDescription",
} as const;

/** Owner-only: pick a role, create a 7-day invite code, then show it with the instructions. */
export function InviteScreen({ route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { parentId, parentName } = route.params;
  const [role, setRole] = useState<InviteRole>("editor");
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [planLimit, setPlanLimit] = useState(false);

  const create = async () => {
    setError(undefined);
    setCreating(true);
    try {
      const result = await createInvite({ parentId, role });
      setCode(result.code);
    } catch (err) {
      const errorCode = (err as { code?: string } | null)?.code ?? "unknown";
      console.warn(`createInvite failed code=${errorCode}`);
      const limited = planLimitReason(err) === "plan_member_limit";
      setPlanLimit(limited);
      setError(
        limited
          ? t("subscription.limitMember")
          : errorCode.includes("permission-denied")
            ? t("screens.invite.errors.notOwner")
            : t("screens.invite.errors.failed"),
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen
      belowHeader
      primaryAction={
        code ? undefined : (
          <Button
            label={t("screens.invite.create")}
            testID="invite-create"
            loading={creating}
            onPress={() => void create()}
          />
        )
      }
    >
      <Text variant="headline">{t("screens.invite.title")}</Text>
      <Text tone="muted">{t("screens.invite.subtitle", { name: parentName })}</Text>
      {code ? (
        <Card style={{ gap: theme.spacing.md }}>
          <Text variant="label">{t("screens.invite.codeLabel")}</Text>
          <Text variant="headline" testID="invite-code" style={{ letterSpacing: 4 }}>
            {code}
          </Text>
          <Text tone="muted">{t("screens.invite.codeInstructions")}</Text>
          <Button
            variant="secondary"
            icon="people"
            label={t("screens.invite.share")}
            testID="invite-share"
            onPress={() =>
              void Share.share({ message: t("screens.invite.shareMessage", { name: parentName, code }) })
            }
          />
        </Card>
      ) : (
        <>
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="label">{t("screens.invite.roleLabel")}</Text>
            <View style={{ gap: theme.spacing.sm }}>
              {(["editor", "viewer"] as const).map((value) => {
                const selected = role === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(ROLE_KEY[value])}
                    testID={`invite-role-${value}`}
                    onPress={() => setRole(value)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: theme.spacing.md,
                      minHeight: 48,
                      borderRadius: theme.radius.lg,
                      borderWidth: 1.5,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                      backgroundColor: theme.colors.surface,
                      paddingHorizontal: theme.spacing.lg,
                      paddingVertical: theme.spacing.md,
                    }}
                  >
                    <View style={{ width: 20 }}>{selected ? <Icon name="check" color={theme.colors.primary} size={20} /> : null}</View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="body">{t(ROLE_KEY[value])}</Text>
                      <Text variant="caption" tone="muted">
                        {t(ROLE_DESC_KEY[value])}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {error ? <FormError message={error} testID="invite-error" /> : null}
          {planLimit ? (
            <Button
              variant="secondary"
              label={t("subscription.seePlans")}
              testID="invite-see-plans"
              onPress={() => navigation.navigate("Subscription")}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
