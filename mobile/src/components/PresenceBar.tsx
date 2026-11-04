import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { PressableScale } from "../design/PressableScale";
import { useAuth } from "../auth/AuthProvider";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { logFamilyCall } from "../family/callables";
import type { FamilyParent } from "../family/useParents";
import { pickPresenceMember, relativeAgo, usePresence } from "../family/usePresence";
import { clock12 } from "../family/cards";
import { localDateKey } from "../family/visibility";
import { Avatar } from "./Avatar";
import { Card } from "./Card";

/** Clock time in the parent's zone for a call today, otherwise the day and month first. */
function lastCallLabel(timezone: string, ms: number, now: number): string {
  const clock = clock12(timezone, ms);
  if (localDateKey(timezone, ms) === localDateKey(timezone, now)) return clock;
  const day = new Date(ms).toLocaleDateString("en-IN", { timeZone: timezone, day: "numeric", month: "short" });
  return `${day} ${clock}`;
}

/**
 * Family presence for one parent: initials avatars, who is viewing (or was last seen) and the latest
 * family call, with an "I called" action that logs a manual call. Hidden unless consent is granted.
 */
export function PresenceBar({ parent }: { parent: FamilyParent }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const presence = usePresence(parent);
  const [logged, setLogged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!presence.enabled) return null;

  const now = Date.now();
  const pick = pickPresenceMember(presence.members, now);
  let line = t("presence.justYou");
  if (pick) {
    line = pick.viewing
      ? t("presence.viewing", { name: pick.member.name })
      : t("presence.seen", {
          name: pick.member.name,
          when: (() => {
            const ago = relativeAgo(now, pick.member.lastSeenAt ?? now);
            return t(`presence.${ago.unit}`, { count: ago.count });
          })(),
        });
  }
  if (presence.lastFamilyCallAt !== null) {
    line += ` · ${t("presence.lastCall", { time: lastCallLabel(parent.timezone, presence.lastFamilyCallAt, now) })}`;
  }

  const onCalled = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await logFamilyCall({ parentId: parent.id });
      setLogged(true);
    } catch (error) {
      console.warn(`familyCall failed code=${(error as { code?: string } | null)?.code ?? "unknown"}`);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      testID={`presence-${parent.id}`}
      style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
        <View style={{ flexDirection: "row" }}>
          {presence.members.slice(0, 4).map((m, index) => (
            <View key={m.uid} style={{ marginLeft: index === 0 ? 0 : -10 }}>
              <Avatar name={m.name || "?"} size={32} tone={m.uid === user?.uid ? "primary" : "tint"} />
            </View>
          ))}
        </View>
        <Text variant="receipt" tone="muted" numeric style={{ flex: 1, lineHeight: 15 }} testID={`presence-line-${parent.id}`}>
          {line}
        </Text>
      </View>
      <PressableScale
        accessibilityRole="button"
        testID={`presence-called-${parent.id}`}
        disabled={busy || logged}
        onPress={() => void onCalled()}
        style={{
          alignSelf: "flex-start",
          minHeight: 44,
          justifyContent: "center",
          borderRadius: theme.radius.pill,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: 14,
          backgroundColor: logged ? theme.colors.primaryTint : theme.colors.surfaceAlt,
          opacity: busy ? 0.7 : 1,
        }}
      >
        <Text variant="chipStrong" tone="primary">
          {logged ? t("presence.callLogged") : t("presence.called", { name: parent.name })}
        </Text>
      </PressableScale>
      {failed ? (
        <Text variant="caption" tone="muted" testID={`presence-error-${parent.id}`}>
          {t("presence.callFailed")}
        </Text>
      ) : null}
    </Card>
  );
}
