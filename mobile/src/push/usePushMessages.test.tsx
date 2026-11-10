import { act, renderHook } from "@testing-library/react-native";

const mockNavigate = jest.fn();
let mockReady = true;
jest.mock("../navigation/navigationRef", () => ({
  navigationRef: {
    isReady: () => mockReady,
    navigate: (...args: unknown[]) => mockNavigate(...args),
  },
}));

let mockUser: { uid: string } | null = null;
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ user: mockUser, initialising: false }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const messagingMock = require("@react-native-firebase/messaging");
import { usePushMessages } from "./usePushMessages";

type Handler = (message: unknown) => unknown;
const handlerOf = (fn: jest.Mock): Handler => fn.mock.calls[0][1] as Handler;

describe("usePushMessages", () => {
  beforeEach(() => {
    mockUser = { uid: "u1" };
    mockReady = true;
    mockNavigate.mockClear();
    messagingMock.__resetMessaging();
  });

  it("registers nothing while signed out", async () => {
    mockUser = null;
    await renderHook(() => usePushMessages());
    expect(messagingMock.onMessage).not.toHaveBeenCalled();
    expect(messagingMock.onNotificationOpenedApp).not.toHaveBeenCalled();
  });

  it("shows a banner for a message that arrives while the app is open", async () => {
    const { result } = await renderHook(() => usePushMessages());
    await act(async () => {
      await handlerOf(messagingMock.onMessage)({
        notification: { title: "Missed dose", body: "Dose not taken" },
        data: { type: "missed_dose" },
      });
    });
    expect(result.current.banner).toEqual({
      title: "Missed dose",
      body: "Dose not taken",
      data: { type: "missed_dose" },
    });
  });

  it("opens the Alerts tab and clears the banner when the banner is tapped", async () => {
    const { result } = await renderHook(() => usePushMessages());
    await act(async () => {
      await handlerOf(messagingMock.onMessage)({
        notification: { title: "Urgent", body: "Please check" },
        data: { type: "urgent" },
      });
    });
    await act(async () => result.current.open());
    expect(mockNavigate).toHaveBeenCalledWith("Alerts");
    expect(result.current.banner).toBeNull();
  });

  it("dismisses the banner without navigating", async () => {
    const { result } = await renderHook(() => usePushMessages());
    await act(async () => {
      await handlerOf(messagingMock.onMessage)({ notification: { title: "Hi", body: "x" }, data: {} });
    });
    await act(async () => result.current.dismiss());
    expect(result.current.banner).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("opens the tab when a background notification is tapped", async () => {
    await renderHook(() => usePushMessages());
    await act(async () => {
      handlerOf(messagingMock.onNotificationOpenedApp)({ data: { type: "evening_digest" } });
    });
    expect(mockNavigate).toHaveBeenCalledWith("Today");
  });

  it("opens the tab for the notification that launched the app", async () => {
    messagingMock.getInitialNotification.mockResolvedValue({ data: { type: "missed_dose" } });
    await renderHook(() => usePushMessages());
    await act(async () => {});
    expect(mockNavigate).toHaveBeenCalledWith("Alerts");
  });

  it("holds a tap until the navigator is ready", async () => {
    jest.useFakeTimers();
    try {
      mockReady = false;
      await renderHook(() => usePushMessages());
      await act(async () => {
        handlerOf(messagingMock.onNotificationOpenedApp)({ data: { type: "urgent" } });
      });
      expect(mockNavigate).not.toHaveBeenCalled();
      mockReady = true;
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(mockNavigate).toHaveBeenCalledWith("Alerts");
    } finally {
      jest.useRealTimers();
    }
  });
});
