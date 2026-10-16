import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import type { Language } from "../shared/types";
import { PlaceholderScreen } from "./src/screens/PlaceholderScreen";

type RootStackParamList = { Placeholder: undefined };

const Stack = createNativeStackNavigator<RootStackParamList>();

// Placeholder: proves the shared/ type import is erased by Metro. No features yet.
export const DEFAULT_LANGUAGE: Language = "en-IN";

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Placeholder"
          component={PlaceholderScreen}
          options={{ title: "Ormma" }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
