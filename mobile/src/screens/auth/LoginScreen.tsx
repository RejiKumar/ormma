import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getAuth, signInWithPhoneNumber } from "@react-native-firebase/auth";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { authErrorMessage } from "../../auth/authErrorMessage";
import { setPendingConfirmation } from "../../auth/pendingConfirmation";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { PhoneField } from "../../components/PhoneField";
import { AuthHero } from "./AuthHero";
import { Text } from "../../design/Text";
import type { AuthStackParamList } from "../../navigation/AuthStack";
import { isValidIndiaMobile, toE164India } from "../../utils/phone";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);

  const sendCode = async () => {
    if (!isValidIndiaMobile(phone)) {
      setError(t("auth.errors.invalidPhone"));
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      const confirmation = await signInWithPhoneNumber(getAuth(), toE164India(phone));
      setPendingConfirmation(confirmation);
      navigation.navigate("Otp", { phoneNumber: toE164India(phone) });
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
      <AuthHero illustration="welcomeCalls" />
      <Text variant="headline">{t("auth.login.title")}</Text>
      <Text variant="body" tone="muted">
        {t("auth.login.subtitle")}
      </Text>
      <PhoneField
        testID="login-phone"
        label={t("auth.login.phoneLabel")}
        value={phone}
        onChangeValue={setPhone}
        error={error}
        returnKeyType="done"
        onSubmitEditing={() => void sendCode()}
      />
    </Screen>
  );
}
