import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/Button";
import { FormError } from "../../components/FormError";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Text } from "../../design/Text";
import { redeemInvite } from "../../family/callables";
import { addParentId } from "../../family/parentIds";
import { redeemErrorKey, type RedeemErrorKey } from "../../family/redeemErrors";
import type { FamilyStackParamList } from "../../navigation/FamilyStack";

type Props = NativeStackScreenProps<FamilyStackParamList, "Redeem">;

const REDEEM_ERROR_MESSAGE = {
  invalidFormat: "screens.redeem.errors.invalidFormat",
  unknown: "screens.redeem.errors.unknown",
  expired: "screens.redeem.errors.expired",
  used: "screens.redeem.errors.used",
  alreadyMember: "screens.redeem.errors.alreadyMember",
  failed: "screens.redeem.errors.failed",
} as const;

/** Same alphabet as functions/src/validation.ts: no 0/O/1/I, upper case. */
const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/;

/** Accept an invite: enter the 8-character code → redeemInvite → the parent joins the list. */
export function RedeemScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [errorKey, setErrorKey] = useState<RedeemErrorKey | undefined>(undefined);

  const join = async () => {
    const normalized = code.trim().toUpperCase();
    if (!CODE_PATTERN.test(normalized)) {
      setErrorKey("invalidFormat");
      return;
    }
    setErrorKey(undefined);
    setJoining(true);
    try {
      const result = await redeemInvite({ code: normalized });
      await addParentId(result.parentId);
      navigation.goBack();
    } catch (err) {
      const errorCode = (err as { code?: string } | null)?.code ?? "unknown";
      console.warn(`redeemInvite failed code=${errorCode}`);
      setErrorKey(redeemErrorKey(err));
    } finally {
      setJoining(false);
    }
  };

  const errorMessage = errorKey ? t(REDEEM_ERROR_MESSAGE[errorKey]) : undefined;

  return (
    <Screen
      primaryAction={
        <Button
          label={t("screens.redeem.join")}
          testID="redeem-join"
          loading={joining}
          onPress={() => void join()}
        />
      }
    >
      <Text variant="headline">{t("screens.redeem.title")}</Text>
      <Text tone="muted">{t("screens.redeem.subtitle")}</Text>
      <TextField
        testID="redeem-code"
        label={t("screens.redeem.codeLabel")}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        hint={t("screens.redeem.codeHint")}
        onSubmitEditing={() => void join()}
      />
      {errorMessage ? <FormError message={errorMessage} testID="redeem-error" /> : null}
    </Screen>
  );
}
