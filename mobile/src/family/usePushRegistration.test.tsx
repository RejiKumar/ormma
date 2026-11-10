import React from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { act, renderHook, waitFor } from "@testing-library/react-native";

const mockUpdateDoc = jest.fn(async () => undefined);
jest.mock("@react-native-firebase/firestore", () => ({
  arrayUnion: (...values: unknown[]) => ({ arrayUnion: values }),
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  getFirestore: () => ({}),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...(args as [])),
}));

let mockUser: { uid: string } | null = null;
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ user: mockUser, initialising: false }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const messagingMock = require("@react-native-firebase/messaging");
import { usePushRegistration } from "./usePushRegistration";

describe("usePushRegistration", () => {
  beforeEach(() => {
    mockUser = null;
    mockUpdateDoc.mockClear();
    messagingMock.__resetMessaging();
    messagingMock.requestPermission.mockClear();
  });

  it("does nothing while signed out", async () => {
    await renderHook(() => usePushRegistration());
    await act(async () => {});
    expect(messagingMock.requestPermission).not.toHaveBeenCalled();
  });

  it("asks for permission and saves the token once the user signs in after mounting", async () => {
    const { rerender } = await renderHook(() => usePushRegistration());
    expect(messagingMock.requestPermission).not.toHaveBeenCalled();

    mockUser = { uid: "u1" };
    await rerender({});

    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalledTimes(1));
    expect(messagingMock.requestPermission).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: "users/u1" },
      { fcmTokens: { arrayUnion: ["test-fcm-token"] } },
    );
  });

  it("saves nothing when permission is denied", async () => {
    mockUser = { uid: "u1" };
    messagingMock.__setPermissionStatus("denied");
    await renderHook(() => usePushRegistration());
    await act(async () => {});
    expect(messagingMock.requestPermission).toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  describe("on Android 13+", () => {
    const originalOS = Platform.OS;
    const originalVersion = Platform.Version;
    beforeEach(() => {
      Object.defineProperty(Platform, "OS", { configurable: true, get: () => "android" });
      Object.defineProperty(Platform, "Version", { configurable: true, get: () => 36 });
      mockUser = { uid: "u1" };
    });
    afterEach(() => {
      Object.defineProperty(Platform, "OS", { configurable: true, get: () => originalOS });
      Object.defineProperty(Platform, "Version", {
        configurable: true,
        get: () => originalVersion,
      });
      jest.restoreAllMocks();
    });

    it("asks Android for the notification permission and saves the token when granted", async () => {
      const request = jest.spyOn(PermissionsAndroid, "request").mockResolvedValue("granted");
      await renderHook(() => usePushRegistration());
      await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalledTimes(1));
      expect(request).toHaveBeenCalledWith("android.permission.POST_NOTIFICATIONS");
    });

    it("saves no token when the user declines the Android permission", async () => {
      jest.spyOn(PermissionsAndroid, "request").mockResolvedValue("denied");
      await renderHook(() => usePushRegistration());
      await act(async () => {});
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });
});

void React;
