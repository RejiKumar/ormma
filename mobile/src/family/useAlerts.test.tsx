import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AuthProvider } from "../auth/AuthProvider";
import { ALERTS_LIMIT, useAlerts } from "./useAlerts";
import type { DatedParent } from "./useParents";

type FirestoreMock = {
  onSnapshot: jest.Mock;
  where: jest.Mock;
  query: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  collection: jest.Mock;
};
const fsMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;

type AuthMock = { __setUser: (user: { uid: string; phoneNumber: string | null }) => void };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

interface SnapshotListener {
  next: (snap: unknown) => void;
  error: (err: unknown) => void;
}

function captureListeners(): SnapshotListener[] {
  const captured: SnapshotListener[] = [];
  fsMock.onSnapshot.mockImplementation((_q: unknown, next: (s: unknown) => void, error: (e: unknown) => void) => {
    captured.push({ next, error });
    return jest.fn();
  });
  return captured;
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const NOW = Date.UTC(2026, 9, 22, 12, 0);
const window = { start: NOW - 30 * 24 * HOUR, end: NOW + MIN };

const owner: DatedParent = {
  id: "p1",
  timezone: "Asia/Kolkata",
  consent: { status: "granted", revokedAt: null, regrantedAt: null },
  role: "owner",
};
const second: DatedParent = { ...owner, id: "p2" };

const alertSnap = (alerts: Array<{ id: string; ms: number; type?: string; message?: string }>) => ({
  docs: alerts.map((a) => ({
    id: a.id,
    data: () => ({
      type: a.type ?? "missed_dose",
      message: a.message ?? "template",
      relatedEventId: null,
      createdAt: { toMillis: () => a.ms },
      readBy: [],
    }),
  })),
});

describe("useAlerts", () => {
  beforeEach(async () => {
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
  });

  it("owner gets one desc-limited query per parent and merges alerts newest first", async () => {
    const listeners = captureListeners();
    const { result } = await renderHook(() => useAlerts([owner, second], window), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(2));
    expect(fsMock.collection).toHaveBeenCalledWith(expect.anything(), "parents", "p1", "alerts");
    expect(fsMock.orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(fsMock.limit).toHaveBeenCalledWith(ALERTS_LIMIT);
    expect(fsMock.where).toHaveBeenCalledWith("createdAt", ">=", window.start);
    expect(fsMock.where).toHaveBeenCalledWith("createdAt", "<", window.end);

    await act(async () => {
      listeners[0].next(alertSnap([{ id: "aOld", ms: NOW - 2 * HOUR, message: "Missed dose" }]));
      listeners[1].next(alertSnap([{ id: "aNew", ms: NOW - 1 * HOUR, message: "Missed dose 2" }]));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.alerts.map((a) => a.id)).toEqual(["aNew", "aOld"]);
    expect(result.current.alerts[0]).toMatchObject({ type: "missed_dose", message: "Missed dose 2" });
  });

  it("viewer with revoked consent issues only the strict-< bounded query", async () => {
    captureListeners();
    const revoked: DatedParent = {
      id: "p1",
      timezone: "Asia/Kolkata",
      consent: { status: "revoked", revokedAt: NOW - 10 * HOUR, regrantedAt: null },
      role: "viewer",
    };
    await renderHook(() => useAlerts([revoked], window), { wrapper });
    await waitFor(() => expect(fsMock.onSnapshot).toHaveBeenCalledTimes(1));
    expect(fsMock.where).toHaveBeenCalledWith("createdAt", "<", NOW - 10 * HOUR);
    expect(fsMock.where).not.toHaveBeenCalledWith("createdAt", "<=", expect.anything());
  });

  it("viewer with re-granted consent merges both eras newest first", async () => {
    const listeners = captureListeners();
    const regranted: DatedParent = {
      id: "p1",
      timezone: "Asia/Kolkata",
      consent: { status: "granted", revokedAt: NOW - 20 * HOUR, regrantedAt: NOW - 4 * HOUR },
      role: "viewer",
    };
    const { result } = await renderHook(() => useAlerts([regranted], window), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(2));
    expect(fsMock.where).toHaveBeenCalledWith("createdAt", "<", NOW - 20 * HOUR);
    expect(fsMock.where).toHaveBeenCalledWith("createdAt", ">=", NOW - 4 * HOUR);

    await act(async () => {
      listeners[0].next(alertSnap([{ id: "before", ms: NOW - 25 * HOUR }]));
      listeners[1].next(alertSnap([{ id: "after", ms: NOW - 2 * HOUR }]));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.alerts.map((a) => a.id)).toEqual(["after", "before"]);
  });

  it("viewer whose parent has no consent map never queries and returns empty (fail closed)", async () => {
    captureListeners();
    const missingMap: DatedParent = { id: "p1", timezone: "Asia/Kolkata", consent: null, role: "viewer" };
    const { result } = await renderHook(() => useAlerts([missingMap], window), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fsMock.onSnapshot).not.toHaveBeenCalled();
    expect(result.current.alerts).toEqual([]);
  });

  it("no parents means no queries and an empty result", async () => {
    captureListeners();
    const { result } = await renderHook(() => useAlerts([], window), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fsMock.onSnapshot).not.toHaveBeenCalled();
    expect(result.current.alerts).toEqual([]);
  });

  it("an alert whose createdAt is missing is skipped, not rendered", async () => {
    const listeners = captureListeners();
    const { result } = await renderHook(() => useAlerts([owner], window), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => {
      listeners[0].next({
        docs: [
          { id: "a1", data: () => ({ type: "missed_dose", message: "x", createdAt: null, readBy: [] }) },
          { id: "a2", data: () => ({ type: "no_answer", message: "y", createdAt: { toMillis: () => NOW }, readBy: ["u1"] }) },
        ],
      });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.alerts.map((a) => a.id)).toEqual(["a2"]);
    expect(result.current.alerts[0].readBy).toEqual(["u1"]);
  });

  it("stops loading on error and logs only the code", async () => {
    const listeners = captureListeners();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = await renderHook(() => useAlerts([owner], window), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => {
      listeners[0].error({ code: "unavailable" });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.alerts).toEqual([]);
    expect(warn).toHaveBeenCalledWith("alerts snapshot failed code=unavailable");
    warn.mockRestore();
  });
});
