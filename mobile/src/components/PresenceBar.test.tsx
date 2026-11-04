import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "../test-utils";
import type { FamilyParent } from "../family/useParents";
import { PresenceBar } from "./PresenceBar";

jest.mock("../auth/AuthProvider", () => ({ useAuth: () => ({ user: { uid: "me" } }) }));

const mockUsePresence = jest.fn();
jest.mock("../family/usePresence", () => {
  const actual = jest.requireActual("../family/usePresence");
  return { ...actual, usePresence: (...args: unknown[]) => mockUsePresence(...args) };
});

type FunctionsMock = { httpsCallable: jest.Mock; __callables: Record<string, jest.Mock> };
const fnsMock = jest.requireMock("@react-native-firebase/functions") as FunctionsMock;
const callable = (name: string): jest.Mock => {
  fnsMock.httpsCallable(undefined as never, name);
  return fnsMock.__callables[name];
};

const parent: FamilyParent = {
  id: "p1",
  name: "Amma",
  phone: "+919812345678",
  language: "ml-IN",
  timezone: "Asia/Kolkata",
  consent: { status: "granted", revokedAt: null, regrantedAt: null },
  emergencyContacts: [],
  city: "",
  prescriber: "",
  refillDue: null,
  callPolicy: { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60 },
  role: "editor",
};

const member = (uid: string, name: string, lastSeenAt: number | null, isSelf = false) => ({
  uid,
  name,
  isSelf,
  lastSeenAt,
});

describe("PresenceBar", () => {
  it("renders nothing when presence is disabled (consent not granted)", async () => {
    mockUsePresence.mockReturnValue({ members: [], lastFamilyCallAt: null, enabled: false });
    await renderApp(<PresenceBar parent={parent} />);
    expect(screen.queryByTestId("presence-p1")).toBeNull();
  });

  it("says another member is viewing and shows the time of the last family call", async () => {
    const now = Date.now();
    mockUsePresence.mockReturnValue({
      enabled: true,
      lastFamilyCallAt: now - 60_000,
      members: [member("me", "Meera", now, true), member("r", "Rahul", now - 30_000)],
    });
    await renderApp(<PresenceBar parent={parent} />);
    const line = screen.getByTestId("presence-line-p1");
    expect(line).toHaveTextContent(/Rahul is viewing/);
    expect(line).toHaveTextContent(/Last call/);
  });

  it("names the last-seen member with a relative time when nobody is viewing", async () => {
    const now = Date.now();
    mockUsePresence.mockReturnValue({
      enabled: true,
      lastFamilyCallAt: null,
      members: [member("me", "Meera", now, true), member("r", "Rahul", now - 3 * 3600_000)],
    });
    await renderApp(<PresenceBar parent={parent} />);
    expect(screen.getByTestId("presence-line-p1")).toHaveTextContent(/Rahul was last seen 3 h ago/);
  });

  it("logs a family call once and confirms it", async () => {
    mockUsePresence.mockReturnValue({ enabled: true, lastFamilyCallAt: null, members: [member("me", "Meera", null, true)] });
    callable("logFamilyCall").mockResolvedValue({ data: { id: "me_202611030930" } });
    await renderApp(<PresenceBar parent={parent} />);
    await fireEvent.press(screen.getByTestId("presence-called-p1"));
    await waitFor(() => expect(screen.getByText("Call logged")).toBeTruthy());
    expect(callable("logFamilyCall")).toHaveBeenCalledWith({ parentId: "p1" });
  });

  it("shows a short error when logging fails", async () => {
    mockUsePresence.mockReturnValue({ enabled: true, lastFamilyCallAt: null, members: [] });
    callable("logFamilyCall").mockRejectedValue({ code: "unavailable" });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    await renderApp(<PresenceBar parent={parent} />);
    await fireEvent.press(screen.getByTestId("presence-called-p1"));
    await waitFor(() => expect(screen.getByTestId("presence-error-p1")).toBeTruthy());
    warn.mockRestore();
  });
});
