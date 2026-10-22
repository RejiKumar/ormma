import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getAuth, signInWithPhoneNumber } from "@react-native-firebase/auth";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { authErrorMessage } from "../../auth/authErrorMessage";
import { getPendingConfirmation, setPendingConfirmation } from "../../auth/pendingConfirmation";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Text } from "../../design/Text";
import type { AuthStackParamList } from "../../navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "Otp">;

export const RESEND_COOLDOWN_SECONDS = 30;

export function OtpScreen({ route }: Props) {
  const { t } = useTranslation();
  const { phoneNumber } = route.params;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError(t("auth.errors.incompleteCode"));
      return;
    }
    const confirmation = getPendingConfirmation();
    if (!confirmation) {
      setError(t("auth.errors.sessionExpired"));
      return;
    }
    setError(undefined);
    setVerifying(true);
    try {
      await confirmation.confirm(trimmed);
      setPendingConfirmation(null);
    } catch (err) {
      setError(authErrorMessage(err, t));
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setError(undefined);
    setCode("");
    setResending(true);
    try {
      // The modular API has no forceResend; the screen's own cooldown is the resend guard.
      const confirmation = await signInWithPhoneNumber(getAuth(), phoneNumber);
      setPendingConfirmation(confirmation);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(authErrorMessage(err, t));
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen
      primaryAction={
        <Button
          label={t("auth.otp.verify")}
          onPress={() => void verify()}
          loading={verifying}
          testID="otp-verify"
        />
      }
    >
      <Text variant="headline">{t("auth.otp.title")}</Text>
      <Text variant="body" tone="muted">
        {t("auth.otp.subtitle", { phone: phoneNumber })}
      </Text>
      <TextField
        testID="otp-code"
        label={t("auth.otp.codeLabel")}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        autoCapitalize="none"
        maxLength={6}
        error={error}
        onSubmitEditing={() => void verify()}
      />
      <View>
        <Button
          variant="secondary"
          label={
            cooldown > 0 ? t("auth.otp.resendIn", { seconds: cooldown }) : t("auth.otp.resend")
          }
          onPress={() => void resend()}
          loading={resending}
          disabled={cooldown > 0}
          testID="otp-resend"
        />
      </View>
    </Screen>
  );
}
