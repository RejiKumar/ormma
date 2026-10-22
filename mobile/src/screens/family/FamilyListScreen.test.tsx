import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "../../auth/AuthProvider";
import { FamilyStack } from "../../navigation/FamilyStack";
import { renderApp } from "../../test-utils";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthMock = { __setUser: (user: { uid: string; phoneNumber: string | null }) => void };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

type FirestoreMock = {
  onSnapshot: jest.Mock;
  getDoc: jest.Mock;
  collection: jest.Mock;
  query: jest.Mock;
  where: jest.Mock;
  documentId: jest.Mock;
};
const fsMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;

const DISCLAIMER = "This app does not provide medical advice.";

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

const parentSnap = (id: string, name: string, status: "pending" | "granted", language = "ml-IN") => ({
  docs: [{ id, data: () => ({ name, language, consent: { status } }) }],
});

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

const renderFamily = async () =>
  renderApp(
    <NavigationContainer>
      <AuthProvider>
        <FamilyStack />
      </AuthProvider>
    </NavigationContainer>,
  );

describe("FamilyListScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
    stubGetDoc(null);
  });

  it("shows empty state with add and redeem actions and disclaimer", async () => {
    captureListeners();
    await renderFamily();
    expect(await screen.findByTestId("family-empty")).toBeTruthy();
    expect(screen.getByTestId("family-add")).toBeTruthy();
    expect(screen.getByTestId("family-redeem")).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("lists a pending owner parent with invite button and consent banner", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    const { listeners } = captureListeners();
    stubGetDoc("owner");

    await renderFamily();
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    await waitFor(() => {
      const last = listeners[listeners.length - 1];
      last.next(parentSnap("p1", "Amma", "pending"));
    });
    expect(await screen.findByTestId("parent-p1")).toBeTruthy();
    expect(screen.getByTestId("consent-p1")).toBeTruthy();
    expect(screen.getByTestId("invite-p1")).toBeTruthy();
  });

  it("does not show the consent banner when granted", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    const { listeners } = captureListeners();
    stubGetDoc("owner");

    await renderFamily();
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    await waitFor(() => {
      const last = listeners[listeners.length - 1];
      last.next(parentSnap("p1", "Amma", "granted"));
    });
    expect(await screen.findByTestId("parent-p1")).toBeTruthy();
    expect(screen.queryByTestId("consent-p1")).toBeNull();
  });

  it("hides the invite button for a non-owner member", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    const { listeners } = captureListeners();
    stubGetDoc("viewer");

    await renderFamily();
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    await waitFor(() => {
      const last = listeners[listeners.length - 1];
      last.next(parentSnap("p1", "Amma", "pending"));
    });
    expect(await screen.findByTestId("parent-p1")).toBeTruthy();
    expect(screen.queryByTestId("invite-p1")).toBeNull();
  });

  it("navigates to AddParent when pressing add", async () => {
    captureListeners();
    await renderFamily();
    await screen.findByTestId("family-empty");
    await fireEvent.press(screen.getByTestId("family-add"));
    expect(await screen.findByTestId("add-name")).toBeTruthy();
  });

  it("navigates to Redeem when pressing redeem in empty state", async () => {
    captureListeners();
    await renderFamily();
    await screen.findByTestId("family-empty");
    await fireEvent.press(screen.getByTestId("family-redeem"));
    expect(await screen.findByTestId("redeem-code")).toBeTruthy();
  });

  it("navigates to Invite for an owner", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    const { listeners } = captureListeners();
    stubGetDoc("owner");

    await renderFamily();
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    await waitFor(() => {
      const last = listeners[listeners.length - 1];
      last.next(parentSnap("p1", "Amma", "pending"));
    });
    await fireEvent.press(await screen.findByTestId("invite-p1"));
    expect(await screen.findByTestId("invite-create")).toBeTruthy();
  });
});
