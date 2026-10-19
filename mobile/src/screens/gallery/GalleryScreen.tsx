// Development-only component gallery. Not registered in production builds (see navigation/routes.ts).
// Strings here are literal on purpose: this screen is not part of the shipped UI.
import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Avatar } from "../../components/Avatar";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ConfirmCheck } from "../../components/ConfirmCheck";
import { DoseRing } from "../../components/DoseRing";
import { EmptyState } from "../../components/EmptyState";
import { Icon, ICONS, type IconName } from "../../components/Icon";
import { ListItem } from "../../components/ListItem";
import { ParentCard } from "../../components/ParentCard";
import { ReadingValue } from "../../components/ReadingValue";
import { Screen } from "../../components/Screen";
import { Skeleton } from "../../components/Skeleton";
import { StatusChip } from "../../components/StatusChip";
import { Text } from "../../design/Text";
import { useTheme, type ThemePreference } from "../../design/ThemeProvider";
import type { StatusKey, TextVariant } from "../../design/tokens";
import { initI18n, SUPPORTED_LANGUAGES, type AppLanguage } from "../../i18n";

const STATUSES: StatusKey[] = ["taken", "pending", "missed", "unclear", "calling"];
const VARIANTS: TextVariant[] = [
  "display",
  "headline",
  "title",
  "bodyLarge",
  "bodyStrong",
  "body",
  "label",
  "caption",
];
const SAMPLES: Record<AppLanguage, string> = {
  en: "Did you take your medicine today?",
  ml: "ഇന്ന് മരുന്ന് കഴിച്ചോ?",
  ta: "இன்று மருந்து சாப்பிட்டீர்களா?",
  hi: "क्या आपने आज दवा ली?",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text variant="title">{title}</Text>
      {children}
    </View>
  );
}

export function GalleryScreen() {
  const { theme, preference, setPreference } = useTheme();
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusKey>("pending");
  const [showCheck, setShowCheck] = useState(false);
  const row = { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: theme.spacing.sm };

  return (
    <Screen
      insideTabs
      primaryAction={
        <Button label="Primary action (one per screen)" onPress={() => setShowCheck(true)} />
      }
    >
      <Section title="Theme">
        <View style={row}>
          {(["light", "dark", "system"] as ThemePreference[]).map((p) => (
            <Button
              key={p}
              label={`${p}${preference === p ? " (current)" : ""}`}
              variant={preference === p ? "secondary" : "quiet"}
              onPress={() => setPreference(p)}
            />
          ))}
        </View>
      </Section>

      <Section title="Language and script">
        <View style={row}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <Button
              key={l}
              label={l}
              variant={i18n.language === l ? "secondary" : "quiet"}
              onPress={() => initI18n(l)}
            />
          ))}
        </View>
        {SUPPORTED_LANGUAGES.map((l) => (
          <Card key={l} tone="alt">
            <Text variant="bodyLarge">{SAMPLES[l]}</Text>
          </Card>
        ))}
      </Section>

      <Section title="Type scale">
        {VARIANTS.map((v) => (
          <Text key={v} variant={v}>
            {v}: Medicine today
          </Text>
        ))}
      </Section>

      <Section title="Status chips">
        <View style={row}>
          {STATUSES.map((s) => (
            <StatusChip key={s} status={s} />
          ))}
        </View>
        <Text variant="caption" tone="muted">
          Morph: tap to cycle the chip below
        </Text>
        <Button
          variant="secondary"
          label={`Next status (now ${status})`}
          onPress={() => setStatus(STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length])}
        />
        <StatusChip status={status} testID="gallery-morph-chip" />
      </Section>

      <Section title="Dose rings">
        <View style={row}>
          <DoseRing taken={0} total={3} />
          <DoseRing taken={2} total={3} />
          <DoseRing taken={3} total={3} />
          <DoseRing taken={0} total={0} size={80} strokeWidth={8} />
        </View>
      </Section>

      <Section title="Buttons">
        <Button label="Primary" onPress={() => undefined} />
        <Button label="Secondary" variant="secondary" onPress={() => undefined} />
        <Button label="Quiet" variant="quiet" onPress={() => undefined} />
        <Button label="With icon" icon="plus" variant="secondary" onPress={() => undefined} />
        <Button label="Loading" loading onPress={() => undefined} />
        <Button label="Disabled" disabled onPress={() => undefined} />
      </Section>

      <Section title="Cards and parents">
        <ParentCard
          name="Amma"
          summary="Next dose 8:00 PM"
          status="pending"
          taken={1}
          total={3}
          onPress={() => undefined}
        />
        <ParentCard
          name="അമ്മ"
          lang="ml"
          summary="Next dose 8:00 PM"
          status="missed"
          taken={2}
          total={3}
          onPress={() => undefined}
        />
        <Card tone="tinted">
          <Text>Tinted card</Text>
        </Card>
      </Section>

      <Section title="Avatars">
        <View style={row}>
          {["Amma Kumar", "Appa", "Lakshmi Devi", "அம்மா", "माँ"].map((n) => (
            <Avatar key={n} name={n} />
          ))}
        </View>
      </Section>

      <Section title="List items">
        <Card>
          <ListItem title="Metformin" subtitle="Morning and evening" onPress={() => undefined} />
          <ListItem
            title="Amlodipine"
            subtitle="Morning"
            trailing={<StatusChip status="taken" />}
          />
        </Card>
      </Section>

      <Section title="Banners">
        <Banner title="Waiting for consent" message="Calls start after your parent agrees." />
        <Banner
          variant="urgent"
          message="Amma mentioned something urgent. Please call her now."
          actionLabel="Call emergency services"
          onAction={() => undefined}
        />
      </Section>

      <Section title="Health readings (neutral style)">
        <View style={row}>
          <ReadingValue label="Blood pressure" value="150/90" unit="mmHg" />
          <ReadingValue label="Sugar" value="180" unit="mg/dL" />
        </View>
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon="pill"
          title="No medicines yet"
          description="Medicines you add are listed here."
        />
      </Section>

      <Section title="Skeletons">
        <Button
          label={loading ? "Show content" : "Show skeletons"}
          variant="quiet"
          onPress={() => setLoading(!loading)}
        />
        {loading ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Skeleton height={20} width="60%" />
            <Skeleton height={16} />
            <Skeleton height={16} width="80%" />
          </View>
        ) : (
          <Text>Loaded content</Text>
        )}
      </Section>

      <Section title="Confirmation">
        {showCheck ? <ConfirmCheck /> : <Text tone="muted">Tap the primary action below</Text>}
      </Section>

      <Section title="Icons">
        <View style={row}>
          {(Object.keys(ICONS) as IconName[]).map((n) => (
            <Icon key={n} name={n} color={theme.colors.ink} />
          ))}
        </View>
      </Section>
    </Screen>
  );
}
