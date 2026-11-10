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

const signIn = () => authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });

describe("RootNavigator", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    authMock.__setUser(null);
  });

  it("goes straight to sign-in when signed out, even on a device that has not seen the intro", async () => {
    await renderRoot();
    expect(await screen.findByText("Sign in")).toBeTruthy();
    expect(screen.queryByText("Ormma checks in by phone")).toBeNull();
  });

  it("shows the intro the first time a signed-in user reaches Today, then Today after Skip, and remembers it", async () => {
    signIn();
    await renderRoot();
    expect(await screen.findByText("Ormma checks in by phone")).toBeTruthy();
    expect(screen.queryByTestId("today-no-parents")).toBeNull();
    await fireEvent.press(screen.getByTestId("welcome-skip"));
    expect(await screen.findByTestId("today-no-parents")).toBeTruthy();
    await waitFor(async () => expect(await AsyncStorage.getItem(WELCOME_SEEN_KEY)).toBe("1"));
  });

  it("goes straight to Today once the intro was seen", async () => {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, "1");
    signIn();
    await renderRoot();
    expect(await screen.findByTestId("today-no-parents")).toBeTruthy();
    expect(screen.queryByText("Ormma checks in by phone")).toBeNull();
  });

  it("shows the intro once when storage cannot be read", async () => {
    signIn();
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("denied"));
    await renderRoot();
    expect(await screen.findByText("Ormma checks in by phone")).toBeTruthy();
  });
});
