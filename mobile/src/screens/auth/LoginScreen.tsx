import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getAuth, signInWithPhoneNumber } from "@react-native-firebase/auth";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { authErrorMessage } from "../../auth/authErrorMessage";
import { setPendingConfirmation } from "../../auth/pendingConfirmation";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Text } from "../../design/Text";
import type { AuthStackParamList } from "../../navigation/AuthStack";
import { DEFAULT_COUNTRY_CODE, isValidE164 } from "../../utils/phone";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState(DEFAULT_COUNTRY_CODE);
  const [error, setError] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);

  const sendCode = async () => {
    const trimmed = phone.trim();
    if (!isValidE164(trimmed)) {
      setError(t("auth.errors.invalidPhone"));
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      const confirmation = await signInWithPhoneNumber(getAuth(), trimmed);
      setPendingConfirmation(confirmation);
      navigation.navigate("Otp", { phoneNumber: trimmed });
    } catch (err) {
      setError(authErrorMessage(err, t));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen
      primaryAction={
        <Button
          label={t("auth.login.sendCode")}
          onPress={() => void sendCode()}
          loading={sending}
          testID="login-send"
        />
      }
    >
      <Text variant="headline">{t("auth.login.title")}</Text>
      <Text variant="body" tone="muted">
        {t("auth.login.subtitle")}
      </Text>
      <TextField
        testID="login-phone"
        label={t("auth.login.phoneLabel")}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        autoCapitalize="none"
        error={error}
        onSubmitEditing={() => void sendCode()}
      />
    </Screen>
  );
}
