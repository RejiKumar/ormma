import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Linking, View } from "react-native";
import { useState } from "react";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { LEGAL_URLS } from "../../legal/legalConfig";
import { privacyPolicy, termsAndConditions } from "../../legal/legalText.generated";
import type { FamilyStackParamList } from "../../navigation/FamilyStack";

type Props = NativeStackScreenProps<FamilyStackParamList, "Legal">;

/** In-app reader for the privacy policy and the terms, with the published text bundled for offline use. */
export function LegalScreen({ route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [failed, setFailed] = useState(false);
  const name = route.params.doc;
  const doc = name === "privacy" ? privacyPolicy : termsAndConditions;
  const url = LEGAL_URLS[name];

  const openOnline = () => {
    setFailed(false);
    Linking.openURL(url).catch(() => setFailed(true));
  };

  return (
    <Screen belowHeader>
      <Text variant="headline" accessibilityRole="header" testID="legal-title">
        {doc.title}
      </Text>
      <Text variant="caption" tone="muted">
        {t("settings.updatedOn", { date: doc.updated })}
      </Text>
      {doc.sections.map((section) => (
        <View key={section.heading} style={{ gap: theme.spacing.sm }}>
          <Text variant="section" accessibilityRole="header">
            {section.heading}
          </Text>
          {section.blocks.map((block, index) => (
            <Text key={index} variant="body">
              {block}
            </Text>
          ))}
        </View>
      ))}
      {url.length > 0 ? (
        <Button variant="secondary" label={t("settings.openOnline")} testID="legal-open-online" onPress={openOnline} />
      ) : null}
      {failed ? (
        <Text variant="caption" tone="muted" testID="legal-open-failed">
          {t("settings.openFailed")}
        </Text>
      ) : null}
    </Screen>
  );
}
