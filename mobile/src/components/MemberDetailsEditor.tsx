import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Text } from "../design/Text";
import { useTheme } from "../design/ThemeProvider";
import { setMemberProfile } from "../family/callables";
import type { MemberInfo } from "../family/useMembers";
import { Button } from "./Button";
import { Card } from "./Card";
import { TextField } from "./TextField";

const MAX_RELATIONSHIP = 30;
const MAX_CITY = 40;

/** The signed-in member edits their own relationship and city; the server writes only their own row. */
export function MemberDetailsEditor({ parentId, me }: { parentId: string; me: MemberInfo }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [relationship, setRelationship] = useState(me.relationship);
  const [city, setCity] = useState(me.city);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setRelationship(me.relationship);
    setCity(me.city);
  }, [me.relationship, me.city]);

  if (!open) {
    return (
      <Button
        variant="quiet"
        label={t("screens.family.yourDetails")}
        testID={`details-open-${parentId}`}
        onPress={() => setOpen(true)}
      />
    );
  }

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await setMemberProfile({ parentId, relationship: relationship.trim(), city: city.trim() });
      setMessage(t("screens.family.detailsSaved"));
      setOpen(false);
    } catch (err) {
      // Ids and statuses only in logs (hard rule 6).
      console.warn(`memberProfile failed code=${(err as { code?: string } | null)?.code ?? "unknown"}`);
      setMessage(t("screens.family.detailsFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card testID={`details-${parentId}`} style={{ gap: theme.spacing.md }}>
      <Text variant="label">{t("screens.family.yourDetails")}</Text>
      <TextField
        testID={`details-relationship-${parentId}`}
        label={t("screens.family.relationshipLabel")}
        value={relationship}
        onChangeText={setRelationship}
        maxLength={MAX_RELATIONSHIP}
        autoCapitalize="words"
      />
      <TextField
        testID={`details-city-${parentId}`}
        label={t("screens.family.cityLabel")}
        value={city}
        onChangeText={setCity}
        maxLength={MAX_CITY}
        autoCapitalize="words"
      />
      <View style={{ gap: theme.spacing.sm }}>
        <Button
          label={t("screens.family.saveDetails")}
          testID={`details-save-${parentId}`}
          loading={saving}
          onPress={() => void save()}
        />
        {message ? (
          <Text variant="caption" tone="muted" testID={`details-message-${parentId}`}>
            {message}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
