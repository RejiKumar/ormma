import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useStackTransition } from "./transitions";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { OtpScreen } from "../screens/auth/OtpScreen";

export type AuthStackParamList = {
  Login: undefined;
  Otp: { phoneNumber: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/** Shown while signed out: phone sign-in, then the code screen. */
export function AuthStack() {
  const transition = useStackTransition();
  return (
    <Stack.Navigator screenOptions={{ ...transition, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
    </Stack.Navigator>
  );
}
