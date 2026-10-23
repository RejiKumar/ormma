import { act, screen, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider } from "../../auth/AuthProvider";
import { renderApp } from "../../test-utils";
import { TodayDashboardScreen } from "./TodayDashboardScreen";

type AuthMock = { __setUser: (user: { uid: string; phoneNumber: string | null }) => void };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

type FirestoreMock = {
  onSnapshot: jest.Mock;
  getDoc: jest.Mock;
  collection: jest.Mock;
  query: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
};
const fsMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;

const DISCLAIMER = "This app does not provide medical advice.";

/** 2026-10-22T04:30:00Z. +8h is 18:00 in Asia/Kolkata. */
const T0 = Date.UTC(2026, 9, 22, 4, 30);
const HOUR = 60 * 60 * 1000;

interface Listener {
  next: (snap: unknown) => void;
  error: (err: unknown) => void;
}

function captureListeners(): { listeners: Listener[]; unsub: jest.Mock } {
  const listeners: Listener[] = [];
  const unsub = jest.fn();
  fsMock.onSnapshot.mockImplementation((_q: unknown, next: (s: unknown) => void, err: (e: unknown) => void) => {
    listeners.push({ next, error: err });
    return unsub;
  });
  return { listeners, unsub };
}

const pathOf = (ref: unknown): string =>
  typeof ref === "object" && ref !== null && "path" in ref && typeof (ref as { path?: unknown }).path === "string"
    ? (ref as { path: string }).path
    : "";

const docSnap = (data: Record<string, unknown> | undefined) => ({
  exists: () => data !== undefined,
  data: () => data,
});

/** Satisfy AuthProvider.ensureUserDoc and map parents/p1/members/u1 to the given role. */
const stubGetDoc = (role: "owner" | "viewer" | null) =>
  fsMock.getDoc.mockImplementation((ref: unknown) => {
    const path = pathOf(ref);
    if (path.includes("users/u1")) return Promise.resolve(docSnap({}));
    if (path === "parents/p1/members/u1" && role) return Promise.resolve(docSnap({ role }));
    return Promise.resolve(docSnap(undefined));
  });

const ts = (ms: number) => ({ toMillis: () => ms });

const parentSnap = (data: Record<string, unknown>) => ({ docs: [{ id: "p1", data: () => data }] });

const grantedParent = { name: "Amma", language: "ml-IN", consent: { status: "granted" } };

const eventSnap = (rows: Array<{ id: string; ms: number; status: string }>) => ({
  docs: rows.map((row) => ({
    id: row.id,
    data: () => ({ medicineId: "m1", scheduledFor: ts(row.ms), status: row.status }),
  })),
});

const alertSnap = (rows: Array<{ id: string; type: string; message: string; ms: number }>) => ({
  docs: rows.map((row) => ({
    id: row.id,
    data: () => ({ type: row.type, message: row.message, createdAt: ts(row.ms), readBy: [] }),
  })),
});

const renderDashboard = async () =>
  renderApp(
    <NavigationContainer>
      <AuthProvider>
        <TodayDashboardScreen />
      </AuthProvider>
    </NavigationContainer>,
  );

describe("TodayDashboardScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
    stubGetDoc(null);
  });

  it("shows the empty state and the disclaimer when the member has no parents", async () => {
    captureListeners();
    await renderDashboard();
    expect(await screen.findByTestId("today-no-parents")).toBeTruthy();
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
    expect(screen.queryByText("Recent alerts")).toBeNull();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("lists today's events per parent with clock time and status, and updates chips in realtime", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    stubGetDoc("owner");
    const { listeners } = captureListeners();

    await renderDashboard();
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    await act(async () => {
      listeners[0].next(parentSnap(grantedParent));
    });
    await waitFor(() => expect(listeners.length).toBeGreaterThanOrEqual(3));

    const events = listeners[1];
    await act(async () => {
      events.next(eventSnap([{ id: "a1", ms: T0 + 8 * HOUR, status: "pending" }]));
    });
    await act(async () => {
      listeners[2].next(alertSnap([]));
    });

    expect(await screen.findByTestId("today-section-p1")).toBeTruthy();
    expect(screen.getByText("Amma")).toBeTruthy();
    expect(screen.getByText("18:00")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.getByText("No recent alerts")).toBeTruthy();

    await act(async () => {
      events.next(eventSnap([{ id: "a1", ms: T0 + 8 * HOUR, status: "taken" }]));
    });
    expect(await screen.findByText("Taken")).toBeTruthy();
    expect(screen.queryByText("Pending")).toBeNull();
  });

  it("shows a per-parent empty state when that parent has no doses today", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    stubGetDoc("owner");
    const { listeners } = captureListeners();

    await renderDashboard();
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    await act(async () => {
      listeners[0].next(parentSnap(grantedParent));
    });
    await waitFor(() => expect(listeners.length).toBeGreaterThanOrEqual(3));

    await act(async () => {
      listeners[1].next(eventSnap([]));
    });
    await act(async () => {
      listeners[2].next(alertSnap([]));
    });

    expect(await screen.findByTestId("today-empty-p1")).toBeTruthy();
    expect(screen.getByText("No doses scheduled today")).toBeTruthy();
  });

  it("shows recent alerts newest first with their neutral type labels", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    stubGetDoc("owner");
    const { listeners } = captureListeners();

    await renderDashboard();
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    await act(async () => {
      listeners[0].next(parentSnap(grantedParent));
    });
    await waitFor(() => expect(listeners.length).toBeGreaterThanOrEqual(3));

    await act(async () => {
      listeners[1].next(eventSnap([]));
    });
    await act(async () => {
      listeners[2].next(
        alertSnap([
          { id: "old", type: "missed_dose", message: "A dose was missed at 8pm.", ms: T0 - 2 * HOUR },
          { id: "new", type: "no_answer", message: "A call was not answered at 9pm.", ms: T0 - HOUR },
        ]),
      );
    });

    expect(await screen.findByText("Missed dose")).toBeTruthy();
    expect(screen.getByText("No answer")).toBeTruthy();
    const rows = screen.getAllByTestId(/^today-alert-/);
    expect(rows.map((row) => row.props.testID)).toEqual(["today-alert-new", "today-alert-old"]);
  });

  it("keeps the parent section visible and empty for a viewer whose consent was revoked", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    stubGetDoc("viewer");
    const revokedAt = Date.now() - HOUR;
    const { listeners } = captureListeners();

    await renderDashboard();
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    await act(async () => {
      listeners[0].next(
        parentSnap({
          name: "Amma",
          language: "ml-IN",
          consent: { status: "revoked", revokedAt, regrantedAt: null },
        }),
      );
    });
    await waitFor(() => expect(listeners.length).toBeGreaterThanOrEqual(3));

    expect(fsMock.where).toHaveBeenCalledWith("scheduledFor", "<", revokedAt);
    expect(fsMock.where).not.toHaveBeenCalledWith("scheduledFor", ">=", revokedAt);

    await act(async () => {
      listeners[1].next(eventSnap([]));
    });
    await act(async () => {
      listeners[2].next(alertSnap([]));
    });
    expect(await screen.findByTestId("today-empty-p1")).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("fails soft to the empty state when an event snapshot errors, logging only the code", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    stubGetDoc("owner");
    const { listeners } = captureListeners();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    await renderDashboard();
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    await act(async () => {
      listeners[0].next(parentSnap(grantedParent));
    });
    await waitFor(() => expect(listeners.length).toBeGreaterThanOrEqual(3));

    await act(async () => {
      listeners[1].error({ code: "permission-denied" });
    });
    await act(async () => {
      listeners[2].next(alertSnap([]));
    });

    expect(await screen.findByTestId("today-empty-p1")).toBeTruthy();
    expect(warn).toHaveBeenCalledWith("todayEvents snapshot failed code=permission-denied");
    warn.mockRestore();
  });
});
