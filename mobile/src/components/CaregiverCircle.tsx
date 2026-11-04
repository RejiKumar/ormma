import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { presenceBadge } from "../family/cards";
import type { MemberInfo } from "../family/useMembers";
import { Avatar } from "./Avatar";
import { Card } from "./Card";

/**
 * The people caring for one parent, as in the prototype: avatar, name, "Son · Bengaluru · Primary" and a
 * presence badge (Viewing, Seen 9:10 AM, Seen yesterday). The badge is shown only while consent is
 * granted and was never revoked, the same rule as the presence bar.
 */
export function CaregiverCircle({
  parentId,
  timezone,
  members,
  showPresence,
}: {
  parentId: string;
  timezone: string;
  members: MemberInfo[];
  showPresence: boolean;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const now = Date.now();

  return (
    <View style={{ gap: theme.spacing.sm }} testID={`circle-${parentId}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text variant="title">{t("screens.family.circleTitle")}</Text>
        <Text variant="caption" tone="muted" testID={`circle-count-${parentId}`}>
          {t("screens.family.memberCount", { count: members.length })}
        </Text>
      </View>
      <Card style={{ gap: theme.spacing.md }}>
        {members.map((member, index) => {
          const detail = [
            member.relationship,
            member.city,
            member.role === "owner" ? t("screens.family.primary") : "",
          ]
            .filter((part) => part.length > 0)
            .join(" · ");
          const badge = showPresence ? presenceBadge(timezone, member.lastSeenAt, now) : null;
          const badgeText =
            badge === null
              ? ""
              : badge.kind === "viewing"
                ? t("screens.family.badgeViewing")
                : badge.kind === "time"
                  ? t("screens.family.badgeSeenTime", { time: badge.time })
                  : badge.kind === "yesterday"
                    ? t("screens.family.badgeSeenYesterday")
                    : t("screens.family.badgeSeenDate", { date: badge.date });
          return (
            <View
              key={member.uid}
              testID={`circle-member-${member.uid}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.md,
                ...(index > 0
                  ? { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md }
                  : {}),
              }}
            >
              <Avatar name={member.name || "?"} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{member.name}</Text>
                {detail.length > 0 ? (
                  <Text variant="caption" tone="muted" testID={`circle-detail-${member.uid}`}>
                    {detail}
                  </Text>
                ) : null}
              </View>
              {badgeText.length > 0 ? (
                <View
                  style={{
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: theme.spacing.sm + 2,
                    paddingVertical: 4,
                    backgroundColor:
                      badge?.kind === "viewing" ? theme.colors.status.taken.bg : theme.colors.status.pending.bg,
                  }}
                >
                  <Text
                    variant="caption"
                    testID={`circle-badge-${member.uid}`}
                    style={{
                      fontWeight: "600",
                      color: badge?.kind === "viewing" ? theme.colors.status.taken.fg : theme.colors.status.pending.fg,
                    }}
                  >
                    {badgeText}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>
    </View>
  );
}
