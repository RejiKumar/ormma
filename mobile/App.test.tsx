import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, screen } from "@testing-library/react-native";
import App from "./App";
import { renderApp } from "./src/test-utils";

const DISCLAIMER = "This app does not provide medical advice.";

const authMock = jest.requireMock("@react-native-firebase/auth") as {
  __setUser: (user: { uid: string; phoneNumber: string } | null) => void;
};

describe("App", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    authMock.__setUser(null);
  });

  it("shows the sign-in screen straight away when signed out, with the disclaimer visible", async () => {
    await renderApp(<App />);
    expect(await screen.findByText("Sign in")).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
    expect(screen.queryByText("Ormma checks in by phone")).toBeNull();
  });

  it("shows the welcome intro the first time a signed-in user reaches Today, then Today", async () => {
    authMock.__setUser({ uid: "member_1", phoneNumber: "+919876543210" });
    await renderApp(<App />);
    expect(await screen.findByText("Ormma checks in by phone")).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
    await fireEvent.press(screen.getByTestId("welcome-skip"));
    expect(await screen.findByText("Nothing here yet")).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("starts on the Today tab when signed in and the intro was already seen", async () => {
    await AsyncStorage.setItem("ormma.welcomeSeen", "1");
    authMock.__setUser({ uid: "member_1", phoneNumber: "+919876543210" });
    await renderApp(<App />);
    expect(await screen.findByText("Nothing here yet")).toBeTruthy();
    expect(screen.queryByText("Ormma checks in by phone")).toBeNull();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });
});
