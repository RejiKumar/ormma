import { screen } from "@testing-library/react-native";
import App from "./App";
import { renderApp } from "./src/test-utils";

const DISCLAIMER = "This app does not provide medical advice.";

const authMock = jest.requireMock("@react-native-firebase/auth") as {
  __setUser: (user: { uid: string; phoneNumber: string } | null) => void;
};

describe("App", () => {
  it("shows the sign-in screen when signed out, with the disclaimer visible", async () => {
    await renderApp(<App />);
    expect(await screen.findByText("Sign in")).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("starts on the Today tab when signed in, with the disclaimer visible", async () => {
    authMock.__setUser({ uid: "member_1", phoneNumber: "+919876543210" });
    await renderApp(<App />);
    expect(await screen.findByText("Nothing here yet")).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });
});
