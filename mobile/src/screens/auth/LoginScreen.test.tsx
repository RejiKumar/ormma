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

  it("shows a fixed +91 prefix, an empty 10-digit field and the disclaimer", async () => {
    await renderLogin();
    expect(screen.getByTestId("login-phone-prefix")).toHaveTextContent("+91");
    expect(screen.getByTestId("login-phone").props.value).toBe("");
    expect(screen.getByText("Sign in")).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("does not call Firebase for an invalid number and explains why", async () => {
    await renderLogin();
    await fireEvent.changeText(screen.getByTestId("login-phone"), "123");
    await fireEvent.press(screen.getByTestId("login-send"));
    expect(
      await screen.findByText(
        "Enter a 10-digit mobile number.",
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

describe("LoginScreen look", () => {
  it("shows the Ormma mark and a decorative illustration above the heading", async () => {
    await renderLogin();
    expect(screen.getByText("Ormma")).toBeTruthy();
    const art = screen.getByTestId("auth-illustration", { includeHiddenElements: true });
    expect(art.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(screen.getByText("Sign in")).toBeTruthy();
  });
});

describe("LoginScreen phone field", () => {
  beforeEach(() => {
    setPendingConfirmation(null);
    authMock.signInWithPhoneNumber.mockReset();
  });

  it("accepts at most 10 digits and ignores other characters", async () => {
    await renderLogin();
    await fireEvent.changeText(screen.getByTestId("login-phone"), "98765432109");
    expect(screen.getByTestId("login-phone").props.value).toBe("9876543210");
    await fireEvent.changeText(screen.getByTestId("login-phone"), "98a76");
    expect(screen.getByTestId("login-phone").props.value).toBe("9876");
  });

  it("cleans a pasted number that has +91 or a leading 0", async () => {
    await renderLogin();
    await fireEvent.changeText(screen.getByTestId("login-phone"), "+91 98765 43210");
    expect(screen.getByTestId("login-phone").props.value).toBe("9876543210");
    await fireEvent.changeText(screen.getByTestId("login-phone"), "");
    await fireEvent.changeText(screen.getByTestId("login-phone"), "09876543210");
    expect(screen.getByTestId("login-phone").props.value).toBe("9876543210");
  });

  it("refuses 9 digits and a number that cannot be a mobile number", async () => {
    await renderLogin();
    await fireEvent.changeText(screen.getByTestId("login-phone"), "987654321");
    await fireEvent.press(screen.getByTestId("login-send"));
    expect(await screen.findByText("Enter a 10-digit mobile number.")).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId("login-phone"), "1234567890");
    await fireEvent.press(screen.getByTestId("login-send"));
    expect(await screen.findByText("Enter a 10-digit mobile number.")).toBeTruthy();
    expect(authMock.signInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it("sends the code to +91 and the 10 digits", async () => {
    authMock.signInWithPhoneNumber.mockResolvedValue({ confirm: jest.fn() });
    await renderLogin();
    await fireEvent.changeText(screen.getByTestId("login-phone"), "8157807124");
    await fireEvent.press(screen.getByTestId("login-send"));
    await screen.findByText("Enter the code");
    expect(authMock.signInWithPhoneNumber).toHaveBeenCalledWith(expect.anything(), "+918157807124");
  });
});
