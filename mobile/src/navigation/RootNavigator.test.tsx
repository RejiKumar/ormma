import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { AuthProvider } from "../auth/AuthProvider";
import { WELCOME_SEEN_KEY } from "../onboarding/welcomeSeen";
import { renderApp } from "../test-utils";
import { RootNavigator } from "./RootNavigator";

type AuthMock = { __setUser: (user: { uid: string; phoneNumber: string | null } | null) => void };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

const renderRoot = () =>
  renderApp(
    <NavigationContainer>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </NavigationContainer>,
  );

describe("RootNavigator", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    authMock.__setUser(null);
  });

  it("shows the welcome intro first on a device that has not seen it, then sign-in after Skip, and remembers it", async () => {
    await renderRoot();
    expect(await screen.findByText("Ormma checks in by phone")).toBeTruthy();
    expect(screen.queryByText("Sign in")).toBeNull();
    await fireEvent.press(screen.getByTestId("welcome-skip"));
    expect(await screen.findByText("Sign in")).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem(WELCOME_SEEN_KEY)).toBe("1"));
  });

  it("goes straight to sign-in once the intro was seen", async () => {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, "1");
    await renderRoot();
    expect(await screen.findByText("Sign in")).toBeTruthy();
    expect(screen.queryByText("Ormma checks in by phone")).toBeNull();
  });

  it("never forces the intro on a signed-in user", async () => {
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
    await renderRoot();
    expect(await screen.findByTestId("today-no-parents")).toBeTruthy();
    expect(screen.queryByText("Ormma checks in by phone")).toBeNull();
  });

  it("shows the intro once when storage cannot be read", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("denied"));
    await renderRoot();
    expect(await screen.findByText("Ormma checks in by phone")).toBeTruthy();
  });
});
