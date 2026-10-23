import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AuthProvider } from "../auth/AuthProvider";
import { useTodayEvents } from "./useTodayEvents";
import type { DatedParent } from "./useParents";

type FirestoreMock = {
  onSnapshot: jest.Mock;
  where: jest.Mock;
  query: jest.Mock;
  orderBy: jest.Mock;
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
const T0 = Date.UTC(2026, 9, 21, 18, 30); // 2026-10-22 00:00 IST
const NOW = T0 + 8 * HOUR; // 08:00 IST on 2026-10-22

const owner: DatedParent = {
  id: "p1",
  timezone: "Asia/Kolkata",
  consent: { status: "granted", revokedAt: null, regrantedAt: null },
  role: "owner",
};
const revokedViewer: DatedParent = {
  id: "p1",
  timezone: "Asia/Kolkata",
  consent: { status: "revoked", revokedAt: T0 + 6 * HOUR, regrantedAt: null },
  role: "viewer",
};
const noConsentViewer: DatedParent = { id: "p1", timezone: "Asia/Kolkata", consent: null, role: "viewer" };

const eventSnap = (events: Array<{ id: string; ms: number; medicineId?: string; status?: string }>) => ({
  docs: events.map((e) => ({
    id: e.id,
    data: () => ({
      medicineId: e.medicineId ?? "m1",
      scheduledFor: { toMillis: () => e.ms },
      status: e.status ?? "pending",
    }),
  })),
});

describe("useTodayEvents", () => {
  beforeEach(async () => {
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
  });

  it("owner gets one window-bounded query per parent and maps the events sorted asc", async () => {
    const listeners = captureListeners();
    const { result } = await renderHook(() => useTodayEvents([owner], NOW), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    expect(fsMock.collection).toHaveBeenCalledWith(expect.anything(), "parents", "p1", "doseEvents");
    expect(fsMock.where).toHaveBeenCalledWith("scheduledFor", ">=", T0);
    expect(fsMock.where).toHaveBeenCalledWith("scheduledFor", "<", T0 + 24 * HOUR);
    expect(fsMock.orderBy).toHaveBeenCalledWith("scheduledFor", "asc");

    await act(async () => {
      listeners[0].next(
        eventSnap([
          { id: "e2", ms: T0 + 20 * HOUR, status: "taken" },
          { id: "e1", ms: T0 + 8 * HOUR, status: "missed" },
        ]),
      );
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.byParent.p1.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(result.current.byParent.p1[1]).toMatchObject({ medicineId: "m1", status: "taken" });
  });

  it("viewer with revoked consent issues the strict-< bounded query, not an unbounded one", async () => {
    captureListeners();
    await renderHook(() => useTodayEvents([revokedViewer], NOW), { wrapper });
    await waitFor(() => expect(fsMock.onSnapshot).toHaveBeenCalledTimes(1));
    expect(fsMock.where).toHaveBeenCalledWith("scheduledFor", "<", T0 + 6 * HOUR);
    expect(fsMock.where).toHaveBeenCalledWith("scheduledFor", ">=", T0);
    expect(fsMock.where).not.toHaveBeenCalledWith("scheduledFor", "<=", expect.anything());
  });

  it("viewer with re-granted consent merges a pair of queries without duplicates", async () => {
    const listeners = captureListeners();
    const regranted: DatedParent = {
      id: "p1",
      timezone: "Asia/Kolkata",
      consent: { status: "granted", revokedAt: T0 + 6 * HOUR, regrantedAt: T0 + 18 * HOUR },
      role: "viewer",
    };
    const { result } = await renderHook(() => useTodayEvents([regranted], NOW), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(2));
    expect(fsMock.where).toHaveBeenCalledWith("scheduledFor", "<", T0 + 6 * HOUR);
    expect(fsMock.where).toHaveBeenCalledWith("scheduledFor", ">=", T0 + 18 * HOUR);

    await act(async () => {
      listeners[0].next(eventSnap([{ id: "e1", ms: T0 + 2 * HOUR }]));
      listeners[1].next(eventSnap([{ id: "e2", ms: T0 + 19 * HOUR }]));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.byParent.p1.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("viewer whose parent has no consent map never queries and returns empty (fail closed)", async () => {
    captureListeners();
    const { result } = await renderHook(() => useTodayEvents([noConsentViewer], NOW), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fsMock.onSnapshot).not.toHaveBeenCalled();
    expect(result.current.byParent).toEqual({ p1: [] });
  });

  it("revocation covering the whole window collapses to no query", async () => {
    captureListeners();
    const fullyRevoked: DatedParent = {
      id: "p1",
      timezone: "Asia/Kolkata",
      consent: { status: "revoked", revokedAt: T0, regrantedAt: null },
      role: "viewer",
    };
    const { result } = await renderHook(() => useTodayEvents([fullyRevoked], NOW), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fsMock.onSnapshot).not.toHaveBeenCalled();
    expect(result.current.byParent.p1).toEqual([]);
  });

  it("groups events per parent across several parents", async () => {
    const listeners = captureListeners();
    const second: DatedParent = { ...owner, id: "p2" };
    const { result } = await renderHook(() => useTodayEvents([owner, second], NOW), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(2));

    await act(async () => {
      listeners[0].next(eventSnap([{ id: "a1", ms: T0 + 8 * HOUR }]));
      listeners[1].next(eventSnap([{ id: "b1", ms: T0 + 9 * HOUR }]));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.byParent.p1.map((e) => e.id)).toEqual(["a1"]);
    expect(result.current.byParent.p2.map((e) => e.id)).toEqual(["b1"]);
  });

  it("uses each parent's own timezone for its today window", async () => {
    captureListeners();
    const utcParent: DatedParent = { ...owner, timezone: "UTC" };
    await renderHook(() => useTodayEvents([utcParent], NOW), { wrapper });
    await waitFor(() => expect(fsMock.onSnapshot).toHaveBeenCalledTimes(1));
    expect(fsMock.where).toHaveBeenCalledWith("scheduledFor", ">=", Date.UTC(2026, 9, 22, 0, 0));
    expect(fsMock.where).toHaveBeenCalledWith("scheduledFor", "<", Date.UTC(2026, 9, 23, 0, 0));
  });

  it("stops loading on error, logs only the code, and unsubscribes on unmount", async () => {
    const listeners = captureListeners();
    const unsubscribe = jest.fn();
    fsMock.onSnapshot.mockImplementation(
      (_q: unknown, next: (s: unknown) => void, error: (e: unknown) => void) => {
        listeners.push({ next, error });
        return unsubscribe;
      },
    );
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { result, unmount } = await renderHook(() => useTodayEvents([owner], NOW), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => {
      listeners[0].error({ code: "permission-denied" });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(warn).toHaveBeenCalledWith("todayEvents snapshot failed code=permission-denied");
    await act(async () => {
      await unmount();
    });
    expect(unsubscribe).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("no parents means no queries and an empty result", async () => {
    captureListeners();
    const { result } = await renderHook(() => useTodayEvents([], NOW), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fsMock.onSnapshot).not.toHaveBeenCalled();
    expect(result.current.byParent).toEqual({});
  });
});
