import { useMemo } from "react";
import { View } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { useCallHistory } from "../family/useCallHistory";
import { useMembers } from "../family/useMembers";
import type { FamilyParent } from "../family/useParents";
import { presenceEnabled } from "../family/usePresence";
import { CallHistoryCard } from "./CallHistoryCard";
import { CaregiverCircle } from "./CaregiverCircle";
import { MemberDetailsEditor } from "./MemberDetailsEditor";
import { NotificationsCard } from "./NotificationsCard";

/** Everything the prototype's Family tab shows for one parent: the circle, notifications and history. */
export function ParentCircle({ parent }: { parent: FamilyParent }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { members } = useMembers(parent.id);
  const { entries, loading } = useCallHistory(parent.id);
  const me = members.find((m) => m.uid === uid) ?? null;
  const names = useMemo(() => Object.fromEntries(members.map((m) => [m.uid, m.name])), [members]);

  return (
    <View testID={`parent-circle-${parent.id}`} style={{ gap: theme.spacing.lg }}>
      <Text variant="title" lang={parent.language}>
        {parent.name}
      </Text>
      <CaregiverCircle
        parentId={parent.id}
        timezone={parent.timezone}
        members={members}
        showPresence={presenceEnabled(parent)}
      />
      {me ? <MemberDetailsEditor parentId={parent.id} me={me} /> : null}
      <NotificationsCard parentId={parent.id} current={me ? me.notify : null} />
      <CallHistoryCard
        parentId={parent.id}
        parentName={parent.name}
        timezone={parent.timezone}
        entries={entries}
        names={names}
        loading={loading}
      />
    </View>
  );
}
