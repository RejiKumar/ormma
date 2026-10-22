import { NavigationContainer } from "@react-navigation/native";
import { fireEvent, screen } from "@testing-library/react-native";
import { getPendingConfirmation, setPendingConfirmation } from "../../auth/pendingConfirmation";
import { AuthStack } from "../../navigation/AuthStack";
import { renderApp } from "../../test-utils";

const DISCLAIMER = "This app does not provide medical advice.";

type AuthMock = { signInWithPhoneNumber: jest.Mock };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

const renderLogin = async () =>
  renderApp(
    <NavigationContainer>
      <AuthStack />
    </NavigationContainer>,
  );

describe("LoginScreen", () => {
  beforeEach(() => {
    setPendingConfirmation(null);
    authMock.signInWithPhoneNumber.mockReset();
  });

  it("defaults to the +91 prefix and shows the disclaimer", async () => {
    await renderLogin();
    expect(screen.getByTestId("login-phone").props.value).toBe("+91");
    expect(screen.getByText("Sign in")).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("does not call Firebase for an invalid number and explains why", async () => {
    await renderLogin();
    await fireEvent.changeText(screen.getByTestId("login-phone"), "123");
    await fireEvent.press(screen.getByTestId("login-send"));
    expect(
      await screen.findByText(
        "That phone number is not valid. Use international format, for example +919876543210.",
      ),
    ).toBeTruthy();
    expect(authMock.signInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it("sends the code, stores the pending confirmation, and moves to the code screen", async () => {
    authMock.signInWithPhoneNumber.mockResolvedValue({ confirm: jest.fn() });
    await renderLogin();
    await fireEvent.changeText(screen.getByTestId("login-phone"), "+919876543210");
    await fireEvent.press(screen.getByTestId("login-send"));
    expect(await screen.findByText("Enter the code")).toBeTruthy();
    expect(authMock.signInWithPhoneNumber).toHaveBeenCalledWith(
      expect.anything(),
      "+919876543210",
    );
    expect(getPendingConfirmation()).not.toBeNull();
  });

  it("surfaces the rate-limit error from Firebase", async () => {
    authMock.signInWithPhoneNumber.mockRejectedValue({ code: "auth/too-many-requests" });
    await renderLogin();
    await fireEvent.changeText(screen.getByTestId("login-phone"), "+919876543210");
    await fireEvent.press(screen.getByTestId("login-send"));
    expect(
      await screen.findByText("Too many attempts. Please wait a few minutes and try again."),
    ).toBeTruthy();
    expect(getPendingConfirmation()).toBeNull();
  });
});
