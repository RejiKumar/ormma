import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { getPendingConfirmation, setPendingConfirmation } from "../../auth/pendingConfirmation";
import { renderApp } from "../../test-utils";
import { OtpScreen, RESEND_COOLDOWN_SECONDS } from "./OtpScreen";

const DISCLAIMER = "This app does not provide medical advice.";

type AuthMock = { signInWithPhoneNumber: jest.Mock };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

const route = {
  key: "otp",
  name: "Otp",
  params: { phoneNumber: "+919876543210" },
} as never;

const renderOtp = async () => renderApp(<OtpScreen route={route} navigation={undefined as never} />);

const pressVerify = async () => await fireEvent.press(screen.getByTestId("otp-verify"));
const typeCode = async (code: string) =>
  await fireEvent.changeText(screen.getByTestId("otp-code"), code);

describe("OtpScreen", () => {
  beforeEach(() => {
    setPendingConfirmation(null);
    authMock.signInWithPhoneNumber.mockReset();
  });

  it("shows the phone number, disclaimer, and a disabled resend inside the cooldown", async () => {
    await renderOtp();
    expect(screen.getByText("We sent a 6-digit code to +919876543210.")).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
    expect(screen.getByText(`Resend in ${RESEND_COOLDOWN_SECONDS}s`)).toBeTruthy();
    expect(screen.getByTestId("otp-resend").props.accessibilityState.disabled).toBe(true);
  });

  it("asks for all six digits before touching Firebase", async () => {
    await renderOtp();
    await typeCode("1234");
    await pressVerify();
    expect(await screen.findByText("Enter all 6 digits of the code.")).toBeTruthy();
    expect(authMock.signInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it("reports an expired session when the pending confirmation is gone", async () => {
    await renderOtp();
    await typeCode("123456");
    await pressVerify();
    expect(
      await screen.findByText("That code can no longer be used. Send a new code and try again."),
    ).toBeTruthy();
  });

  it("shows the wrong-code message when confirm rejects", async () => {
    const confirm = jest.fn().mockRejectedValue({ code: "auth/invalid-verification-code" });
    setPendingConfirmation({ confirm } as never);
    await renderOtp();
    await typeCode("000000");
    await pressVerify();
    expect(
      await screen.findByText("That code is not correct. Check the message and try again."),
    ).toBeTruthy();
    expect(confirm).toHaveBeenCalledWith("000000");
  });

  it("clears the pending confirmation after a successful verify", async () => {
    const confirm = jest.fn().mockResolvedValue({ user: { uid: "u1" } });
    setPendingConfirmation({ confirm } as never);
    await renderOtp();
    await typeCode("123456");
    await pressVerify();
    await waitFor(() => expect(confirm).toHaveBeenCalledWith("123456"));
    await waitFor(() => expect(getPendingConfirmation()).toBeNull());
  });

  it("enables resend after the cooldown and re-requests the code", async () => {
    jest.useFakeTimers();
    authMock.signInWithPhoneNumber.mockResolvedValue({ confirm: jest.fn() });
    try {
      await renderOtp();
      for (let second = 0; second < RESEND_COOLDOWN_SECONDS; second += 1) {
        await act(async () => {
          jest.advanceTimersByTime(1000);
        });
      }
      expect(screen.getByText("Resend code")).toBeTruthy();
      expect(screen.getByTestId("otp-resend").props.accessibilityState.disabled).toBe(false);
      await fireEvent.press(screen.getByTestId("otp-resend"));
      expect(authMock.signInWithPhoneNumber).toHaveBeenCalledWith(
        expect.anything(),
        "+919876543210",
      );
      expect(screen.getByText(`Resend in ${RESEND_COOLDOWN_SECONDS}s`)).toBeTruthy();
      expect(screen.getByTestId("otp-resend").props.accessibilityState.disabled).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
