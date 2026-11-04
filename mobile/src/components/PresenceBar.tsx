import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { logFamilyCall } from "../family/callables";
import type { FamilyParent } from "../family/useParents";
import { pickPresenceMember, relativeAgo, usePresence } from "../family/usePresence";
import { formatLocalClock, localDateKey } from "../family/visibility";
import { Avatar } from "./Avatar";

/** Clock time in the parent's zone for a call today, otherwise the day and month first. */
function lastCallLabel(timezone: string, ms: number, now: number): string {
  const clock = formatLocalClock(timezone, ms);
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
    <View
      testID={`presence-${parent.id}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
        <View style={{ flexDirection: "row" }}>
          {presence.members.slice(0, 4).map((m, index) => (
            <View key={m.uid} style={{ marginLeft: index === 0 ? 0 : -10 }}>
              <Avatar name={m.name || "?"} size={32} />
            </View>
          ))}
        </View>
        <Text variant="caption" style={{ flex: 1 }} testID={`presence-line-${parent.id}`}>
          {line}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        testID={`presence-called-${parent.id}`}
        disabled={busy || logged}
        onPress={() => void onCalled()}
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          minHeight: 44,
          justifyContent: "center",
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.lg,
          backgroundColor: logged ? theme.colors.primaryTint : theme.colors.surfaceAlt,
          opacity: pressed || busy ? 0.7 : 1,
        })}
      >
        <Text variant="label" tone="primary">
          {logged ? t("presence.callLogged") : t("presence.called", { name: parent.name })}
        </Text>
      </Pressable>
      {failed ? (
        <Text variant="caption" tone="muted" testID={`presence-error-${parent.id}`}>
          {t("presence.callFailed")}
        </Text>
      ) : null}
    </View>
  );
}
