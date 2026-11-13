import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/Button";
import { LoadingState } from "../../components/LoadingState";
import { Screen } from "../../components/Screen";
import { Text } from "../../design/Text";
import { useTheme } from "../../design/ThemeProvider";
import { confirmPrescriptionMedicine } from "../../family/callables";
import { useParents } from "../../family/useParents";
import { localDateKey } from "../../family/visibility";
import type { MedicineStackParamList } from "../../navigation/MedicineStack";
import {
  deletePage,
  loadReviewMedicines,
  readFailureOf,
  readPrescription,
  rejectPrescription,
  scanOnePage,
  uploadPage,
  type ReviewMedicine,
} from "../../prescription/prescriptionFlow";
import {
  PrescriptionReviewCard,
  type ReviewDraft,
  type ReviewStatus,
} from "./PrescriptionReviewCard";

type Props = NativeStackScreenProps<MedicineStackParamList, "ScanPrescription">;

type Phase =
  | "scanning"
  | "working"
  | "review"
  | "unavailable"
  | "none"
  | "failed"
  | "uploadFailed"
  | "noPermission";

interface CardState {
  item: ReviewMedicine;
  draft: ReviewDraft;
  status: ReviewStatus;
  saving: boolean;
  failed: boolean;
}

/**
 * Scan a prescription, then check each medicine on screen. Nothing is scheduled until a person
 * confirms that medicine here (medical-safety, prescription-capture "Review before anything is scheduled").
 */
export function ScanPrescriptionScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { parentId } = route.params;
  const { parents } = useParents();
  const parent = parents.find((p) => p.id === parentId) ?? null;
  const todayKey = localDateKey(parent?.timezone ?? "Asia/Kolkata", Date.now());

  const [phase, setPhase] = useState<Phase>("scanning");
  const [cards, setCards] = useState<CardState[]>([]);
  const storagePathRef = useRef<string | null>(null);
  const prescriptionIdRef = useRef<string | null>(null);
  const finished = useRef(false);
  const started = useRef(false);

  const cleanUp = useCallback(
    async (anyConfirmed: boolean) => {
      const path = storagePathRef.current;
      storagePathRef.current = null;
      if (path) await deletePage(path);
      if (!anyConfirmed && prescriptionIdRef.current) {
        await rejectPrescription(parentId, prescriptionIdRef.current);
      }
    },
    [parentId],
  );

  const run = useCallback(async () => {
    setPhase("scanning");
    const outcome = await scanOnePage();
    if (outcome.kind === "cancelled") {
      finished.current = true;
      navigation.goBack();
      return;
    }
    if (outcome.kind === "unavailable") {
      setPhase("unavailable");
      return;
    }
    setPhase("working");
    let path: string;
    try {
      path = await uploadPage(parentId, outcome.filePath);
      storagePathRef.current = path;
    } catch {
      setPhase("uploadFailed");
      return;
    }
    try {
      const read = await readPrescription(parentId, path);
      prescriptionIdRef.current = read.prescriptionId;
      // The server could not read the page at all: say so, rather than claiming nothing was on it.
      if (!read.hasExtract) {
        await cleanUp(false);
        setPhase("failed");
        return;
      }
      const items = read.medicineCount > 0 ? await loadReviewMedicines(parentId, read.prescriptionId) : [];
      if (items.length === 0) {
        await cleanUp(false);
        setPhase("none");
        return;
      }
      setCards(
        items.map((item) => ({
          item,
          draft: {
            name: item.name,
            doseText: item.doseText,
            frequencyText: item.frequencyText,
            times: item.times.length > 0 ? item.times : [""],
            startDate: "",
          },
          status: "open",
          saving: false,
          failed: false,
        })),
      );
      setPhase("review");
    } catch (error) {
      await cleanUp(false);
      setPhase(readFailureOf(error) === "permission" ? "noPermission" : "failed");
    }
  }, [cleanUp, navigation, parentId]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  // Leaving with open cards asks first; leaving creates nothing for them.
  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      const open = phase === "review" && cards.some((card) => card.status === "open");
      if (finished.current || !open) return;
      event.preventDefault();
      Alert.alert(t("screens.scan.leaveTitle"), t("screens.scan.leaveBody"), [
        { text: t("screens.scan.stay"), style: "cancel" },
        {
          text: t("screens.scan.leave"),
          style: "destructive",
          onPress: () => {
            finished.current = true;
            void cleanUp(cards.some((card) => card.status === "confirmed"));
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });
  }, [cards, cleanUp, navigation, phase, t]);

  // The review ends when every card is confirmed or discarded.
  useEffect(() => {
    if (phase !== "review" || finished.current) return;
    if (cards.length > 0 && cards.every((card) => card.status !== "open")) {
      finished.current = true;
      void cleanUp(cards.some((card) => card.status === "confirmed"));
      navigation.goBack();
    }
  }, [cards, cleanUp, navigation, phase]);

  const update = (key: string, patch: Partial<CardState>) =>
    setCards((current) => current.map((card) => (card.item.key === key ? { ...card, ...patch } : card)));

  const confirm = async (card: CardState) => {
    if (!prescriptionIdRef.current) return;
    update(card.item.key, { saving: true, failed: false });
    try {
      await confirmPrescriptionMedicine({
        parentId,
        prescriptionId: prescriptionIdRef.current,
        medicine: {
          name: card.draft.name.trim(),
          doseText: card.draft.doseText.trim(),
          frequencyText: card.draft.frequencyText.trim(),
          times: card.draft.times.map((time) => time.trim()).filter((time) => time.length > 0),
        },
        startDate: card.draft.startDate.trim(),
      });
      update(card.item.key, { saving: false, status: "confirmed" });
    } catch (error) {
      // Status code only: never the medicine (hard rule 6).
      console.warn(
        `confirmPrescriptionMedicine failed code=${(error as { code?: string } | null)?.code ?? "unknown"}`,
      );
      update(card.item.key, { saving: false, failed: true });
    }
  };

  const enterByHand = () => {
    finished.current = true;
    navigation.replace("AddMedicine", { parentId });
  };

  const problems: Partial<Record<Phase, string>> = {
    unavailable: t("screens.scan.unavailable"),
    none: t("screens.scan.none"),
    failed: t("screens.scan.readFailed"),
    uploadFailed: t("screens.scan.uploadFailed"),
    noPermission: t("screens.scan.noPermission"),
  };
  const problem = problems[phase];
  const retryLabel =
    phase === "none"
      ? t("screens.scan.scanAgain")
      : phase === "unavailable" || phase === "noPermission"
        ? null
        : t("screens.scan.tryAgain");

  return (
    <Screen
      belowHeader
      primaryAction={
        problem && retryLabel ? (
          <Button label={retryLabel} testID="scan-retry" onPress={() => void run()} />
        ) : null
      }
    >
      {phase === "scanning" || phase === "working" ? (
        <View style={{ gap: theme.spacing.md }}>
          <LoadingState variant="lines" testID="scan-working" />
          <Text variant="body" tone="muted" testID="scan-working-text">
            {phase === "working" ? t("screens.scan.working") : t("screens.scan.opening")}
          </Text>
        </View>
      ) : null}

      {problem ? (
        <View style={{ gap: theme.spacing.md }}>
          <Banner variant="info" message={problem} testID={`scan-${phase}`} />
          <Button
            label={t("screens.scan.enterByHand")}
            variant={retryLabel ? "secondary" : "primary"}
            testID="scan-enter-by-hand"
            onPress={enterByHand}
          />
        </View>
      ) : null}

      {phase === "review" ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="body" tone="muted" testID="scan-review-intro">
            {t("screens.scan.reviewIntro")}
          </Text>
          {cards.map((card) => (
            <PrescriptionReviewCard
              key={card.item.key}
              id={card.item.key}
              draft={card.draft}
              status={card.status}
              needsCheck={card.item.needsCheck}
              saving={card.saving}
              failed={card.failed}
              todayKey={todayKey}
              onChange={(draft) => update(card.item.key, { draft })}
              onConfirm={() => void confirm(card)}
              onDiscard={() => update(card.item.key, { status: "discarded" })}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
