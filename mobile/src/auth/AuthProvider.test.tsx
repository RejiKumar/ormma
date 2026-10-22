import { screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthProvider, useAuth } from "./AuthProvider";
import { renderApp } from "../test-utils";

type AuthMock = {
  __setUser: (user: { uid: string; phoneNumber: string | null } | null) => void;
};
type FirestoreMock = {
  getDoc: jest.Mock;
  setDoc: jest.Mock;
};

const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;
const firestoreMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;

function Probe() {
  const { user, initialising } = useAuth();
  return (
    <Text testID="probe">{initialising ? "initialising" : user ? `in:${user.uid}` : "signedOut"}</Text>
  );
}

const renderProvider = () =>
  renderApp(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe("AuthProvider", () => {
  beforeEach(() => {
    firestoreMock.getDoc.mockReset();
    firestoreMock.setDoc.mockReset();
    firestoreMock.getDoc.mockResolvedValue({ exists: () => false });
    firestoreMock.setDoc.mockResolvedValue(undefined);
  });

  it("reports signed out and writes nothing when signed out", async () => {
    await renderProvider();
    expect(await screen.findByText("signedOut")).toBeTruthy();
    expect(firestoreMock.setDoc).not.toHaveBeenCalled();
  });

  it("creates users/{uid} on first sign-in with the E.164 phone", async () => {
    authMock.__setUser({ uid: "u_new", phoneNumber: "+919876543210" });
    await renderProvider();
    expect(await screen.findByText("in:u_new")).toBeTruthy();
    await waitFor(() => expect(firestoreMock.setDoc).toHaveBeenCalledTimes(1));
    const [ref, data] = firestoreMock.setDoc.mock.calls[0] as [
      { path: string },
      { displayName: string; phone: string; fcmTokens: string[]; createdAt: unknown },
    ];
    expect(ref.path).toBe("users/u_new");
    expect(data.phone).toBe("+919876543210");
    expect(data.displayName).toBe("");
    expect(data.fcmTokens).toEqual([]);
    expect(data.createdAt).toBeDefined();
  });

  it("does not overwrite an existing users doc", async () => {
    firestoreMock.getDoc.mockResolvedValue({ exists: () => true });
    authMock.__setUser({ uid: "u_existing", phoneNumber: "+919876543211" });
    await renderProvider();
    expect(await screen.findByText("in:u_existing")).toBeTruthy();
    await waitFor(() => expect(firestoreMock.getDoc).toHaveBeenCalled());
    expect(firestoreMock.setDoc).not.toHaveBeenCalled();
  });

  it("stays signed in when provisioning fails, logging only the status code", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    firestoreMock.setDoc.mockRejectedValue({ code: "unavailable" });
    authMock.__setUser({ uid: "u_offline", phoneNumber: "+919876543212" });
    try {
      await renderProvider();
      expect(await screen.findByText("in:u_offline")).toBeTruthy();
      await waitFor(() => expect(warn).toHaveBeenCalledWith("users doc provisioning failed code=unavailable"));
    } finally {
      warn.mockRestore();
    }
  });

  it("ignores a user without a usable phone number", async () => {
    authMock.__setUser({ uid: "u_nophone", phoneNumber: null });
    await renderProvider();
    expect(await screen.findByText("in:u_nophone")).toBeTruthy();
    await waitFor(() => expect(firestoreMock.getDoc).not.toHaveBeenCalled());
  });
});
