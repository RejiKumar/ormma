import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider } from "../../auth/AuthProvider";
import { MedicineStack } from "../../navigation/MedicineStack";
import { renderApp } from "../../test-utils";

type AuthMock = { __setUser: (user: { uid: string; phoneNumber: string | null }) => void };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

type FirestoreMock = {
  onSnapshot: jest.Mock;
  getDoc: jest.Mock;
};
const fsMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;

interface Listener {
  next: (snap: unknown) => void;
  error: (err: unknown) => void;
}

function captureListeners(): { listeners: Listener[] } {
  const listeners: Listener[] = [];
  fsMock.onSnapshot.mockImplementation((_q: unknown, next: (s: unknown) => void, err: (e: unknown) => void) => {
    listeners.push({ next, error: err });
    return jest.fn();
  });
  return { listeners };
}

const pathOf = (ref: unknown): string =>
  typeof ref === "object" && ref !== null && "path" in ref && typeof (ref as { path?: unknown }).path === "string"
    ? (ref as { path: string }).path
    : "";

const docSnap = (data: Record<string, unknown> | undefined) => ({
  exists: () => data !== undefined,
  data: () => data,
});

const stubGetDoc = (roles: Record<string, "owner" | "editor" | "viewer">) =>
  fsMock.getDoc.mockImplementation((ref: unknown) => {
    const path = pathOf(ref);
    if (path.includes("users/u1")) return Promise.resolve(docSnap({}));
    const match = /^parents\/([^/]+)\/members\/u1$/.exec(path);
    if (match && roles[match[1]]) return Promise.resolve(docSnap({ role: roles[match[1]] }));
    return Promise.resolve(docSnap(undefined));
  });

const parentsSnap = (rows: Array<{ id: string; name: string; consent?: Record<string, unknown> }>) => ({
  docs: rows.map((row) => ({
    id: row.id,
    data: () => ({
      name: row.name,
      language: "ml-IN",
      consent: row.consent ?? { status: "granted" },
    }),
  })),
});

const medicineSnap = (rows: Array<{ id: string; name: string; dose: string; times: string[]; active: boolean }>) => ({
  docs: rows.map((row) => ({
    id: row.id,
    data: () => ({
      name: row.name,
      doseText: row.dose,
      times: row.times,
      startDate: "2026-10-01",
      endDate: null,
      active: row.active,
      source: "manual",
      confirmedByHuman: true,
      prescriptionId: null,
      createdBy: "u1",
    }),
  })),
});

const renderStack = async () =>
  renderApp(
    <NavigationContainer>
      <AuthProvider>
        <MedicineStack />
      </AuthProvider>
    </NavigationContainer>,
  );

describe("MedicinesListScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
  });

  it("shows the empty state with the disclaimer when the member has no parents", async () => {
    stubGetDoc({});
    captureListeners();
    await renderStack();
    expect(await screen.findByTestId("medicines-empty")).toBeTruthy();
    expect(screen.queryByTestId("medicine-add")).toBeNull();
  });

  it("lists the selected parent's medicines with dose, times and inactive state", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    stubGetDoc({ p1: "owner" });
    const { listeners } = captureListeners();

    await renderStack();
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    await waitFor(() => listeners[0].next(parentsSnap([{ id: "p1", name: "Amma" }])));
    await waitFor(() => expect(listeners.length).toBeGreaterThan(1));
    await waitFor(() =>
      listeners[1].next(
        medicineSnap([
          { id: "m1", name: "Metformin", dose: "1 tablet", times: ["08:00", "20:00"], active: true },
          { id: "m2", name: "Amlodipine", dose: "5 mg", times: ["09:00"], active: false },
        ]),
      ),
    );

    expect(await screen.findByText("Metformin")).toBeTruthy();
    expect(screen.getByText("1 tablet · 08:00, 20:00")).toBeTruthy();
    expect(screen.getByText("Amlodipine")).toBeTruthy();
    expect(screen.getByText("Inactive")).toBeTruthy();
    expect(screen.getByTestId("medicine-add")).toBeTruthy();
  });

  it("hides the add button and row taps from a viewer", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    stubGetDoc({ p1: "viewer" });
    const { listeners } = captureListeners();

    await renderStack();
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    await waitFor(() => listeners[0].next(parentsSnap([{ id: "p1", name: "Amma" }])));
    await waitFor(() => expect(listeners.length).toBeGreaterThan(1));
    await waitFor(() =>
      listeners[1].next(
        medicineSnap([{ id: "m1", name: "Metformin", dose: "1 tablet", times: ["08:00"], active: true }]),
      ),
    );

    expect(await screen.findByText("Metformin")).toBeTruthy();
    expect(screen.queryByTestId("medicine-add")).toBeNull();
    await fireEvent.press(screen.getByTestId("medicine-m1"));
    expect(screen.queryByText("Edit medicine")).toBeNull();
  });

  it("opens the edit screen for an editor and switches the list when another parent is chosen", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1", "p2"]));
    stubGetDoc({ p1: "owner", p2: "editor" });
    const { listeners } = captureListeners();

    await renderStack();
    await waitFor(() => expect(listeners.length).toBeGreaterThanOrEqual(1));
    await waitFor(() =>
      listeners[0].next(parentsSnap([
        { id: "p1", name: "Amma" },
        { id: "p2", name: "Appa" },
      ])),
    );
    await waitFor(() => expect(listeners.length).toBeGreaterThanOrEqual(2));
    const firstMedicines = listeners[1];
    await waitFor(() =>
      firstMedicines.next(
        medicineSnap([{ id: "m1", name: "Metformin", dose: "1 tablet", times: ["08:00"], active: true }]),
      ),
    );
    expect(await screen.findByText("Metformin")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("medicine-parent-p2"));
    await waitFor(() => expect(listeners.length).toBeGreaterThanOrEqual(3));
    const secondMedicines = listeners[2];
    await waitFor(() =>
      secondMedicines.next(
        medicineSnap([{ id: "m2", name: "Amlodipine", dose: "5 mg", times: ["09:00"], active: true }]),
      ),
    );
    expect(await screen.findByText("Amlodipine")).toBeTruthy();
    expect(screen.queryByText("Metformin")).toBeNull();

    await fireEvent.press(screen.getByTestId("medicine-m2"));
    expect(await screen.findByText("Edit medicine")).toBeTruthy();
  });
});
