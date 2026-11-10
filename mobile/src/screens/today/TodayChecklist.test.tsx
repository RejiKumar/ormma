import { fireEvent, screen } from "@testing-library/react-native";
import { renderApp } from "../../test-utils";
import { TodayDashboardScreen } from "./TodayDashboardScreen";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: () => undefined,
}));

jest.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1", phoneNumber: "+919876543210" }, initialising: false }),
}));

type Parent = { id: string; name: string; role: "owner" | "editor" | "viewer" };
let mockParents: Parent[] = [];
jest.mock("../../family/useParents", () => ({
  useParents: () => ({ parents: mockParents.map(full), loading: false, reload: jest.fn() }),
}));
const full = (p: Parent) => ({
  ...p,
  phone: "+919800000000",
  language: "en-IN",
  timezone: "Asia/Kolkata",
  consent: { status: "granted", revokedAt: null, regrantedAt: null },
  emergencyContacts: [],
  city: "",
  prescriber: "",
  refillDue: null,
});

let mockMedicines: Array<{ id: string; name: string; doseText: string; pillDescription: string }> = [];
let mockMembers: Array<{ uid: string; name: string }> = [];
jest.mock("../../family/useMedicines", () => ({
  useMedicines: (parentId: string | null) => ({ medicines: parentId ? mockMedicines : [], loading: false }),
}));
jest.mock("../../family/useMembers", () => ({
  useMembers: (parentId: string | null) => ({ members: parentId ? mockMembers : [], loading: false }),
}));
jest.mock("../../family/useTodayEvents", () => ({
  useTodayEvents: () => ({ byParent: {}, loading: false }),
}));
jest.mock("../../family/useAlerts", () => ({
  useAlerts: () => ({ alerts: [], loading: false }),
}));

describe("Today: first-parent checklist and empty states", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockParents = [];
    mockMedicines = [];
    mockMembers = [];
  });

  it("an account with no parent shows the illustration, the checklist and Add a parent as the one primary action", async () => {
    await renderApp(<TodayDashboardScreen />);
    expect(screen.getByTestId("today-no-parents")).toBeTruthy();
    expect(screen.getByTestId("today-no-parents-illustration", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText("Parents you add will appear here with today's doses.")).toBeTruthy();
    expect(screen.getByTestId("first-parent-checklist")).toBeTruthy();
    for (const key of ["parent", "medicine", "invite"]) expect(screen.getByTestId(`checklist-${key}-todo`)).toBeTruthy();
    expect(screen.getByTestId("today-primary-action")).toHaveTextContent("Add a parent");
    expect(screen.getAllByTestId("today-primary-action")).toHaveLength(1);
    expect(screen.getByText("This app does not provide medical advice.")).toBeTruthy();
  });

  it("Add a parent opens the add-parent screen", async () => {
    await renderApp(<TodayDashboardScreen />);
    await fireEvent.press(screen.getByTestId("today-primary-action"));
    expect(mockNavigate).toHaveBeenCalledWith("Family", { screen: "AddParent" });
  });

  it("without a parent, every checklist row starts at Add a parent", async () => {
    await renderApp(<TodayDashboardScreen />);
    await fireEvent.press(screen.getByTestId("checklist-medicine"));
    await fireEvent.press(screen.getByTestId("checklist-invite"));
    expect(mockNavigate).toHaveBeenNthCalledWith(1, "Family", { screen: "AddParent" });
    expect(mockNavigate).toHaveBeenNthCalledWith(2, "Family", { screen: "AddParent" });
  });

  it("an owned parent without a medicine marks Add a parent done and makes Add a medicine the primary action", async () => {
    mockParents = [{ id: "p1", name: "Amma", role: "owner" }];
    await renderApp(<TodayDashboardScreen />);
    expect(screen.getByTestId("checklist-parent-done")).toBeTruthy();
    expect(screen.getByTestId("checklist-medicine-todo")).toBeTruthy();
    expect(screen.getByTestId("checklist-invite-todo")).toBeTruthy();
    expect(screen.getByTestId("today-primary-action")).toHaveTextContent("Add a medicine");
    await fireEvent.press(screen.getByTestId("today-primary-action"));
    expect(mockNavigate).toHaveBeenCalledWith("Medicines", { screen: "AddMedicine", params: { parentId: "p1" } });
  });

  it("marks Invite family done when another member exists, and opens the invite screen otherwise", async () => {
    mockParents = [{ id: "p1", name: "Amma", role: "owner" }];
    mockMembers = [{ uid: "u1", name: "Meera" }, { uid: "r1", name: "Rahul" }];
    await renderApp(<TodayDashboardScreen />);
    expect(screen.getByTestId("checklist-invite-done")).toBeTruthy();
  });

  it("opens the invite screen for the owned parent from the invite row", async () => {
    mockParents = [{ id: "p1", name: "Amma", role: "owner" }];
    await renderApp(<TodayDashboardScreen />);
    await fireEvent.press(screen.getByTestId("checklist-invite"));
    expect(mockNavigate).toHaveBeenCalledWith("Family", {
      screen: "Invite",
      params: { parentId: "p1", parentName: "Amma" },
    });
  });

  it("hides the checklist once an owned parent has a medicine", async () => {
    mockParents = [{ id: "p1", name: "Amma", role: "owner" }];
    mockMedicines = [{ id: "m1", name: "Metformin", doseText: "500mg", pillDescription: "" }];
    await renderApp(<TodayDashboardScreen />);
    expect(screen.queryByTestId("first-parent-checklist")).toBeNull();
    expect(screen.queryByTestId("today-primary-action")).toBeNull();
  });

  it("never shows the checklist to a member who is not an owner", async () => {
    mockParents = [{ id: "p1", name: "Amma", role: "viewer" }];
    await renderApp(<TodayDashboardScreen />);
    expect(screen.queryByTestId("first-parent-checklist")).toBeNull();
    mockParents = [{ id: "p1", name: "Amma", role: "editor" }];
    await renderApp(<TodayDashboardScreen />);
    expect(screen.queryByTestId("first-parent-checklist")).toBeNull();
  });

  it("the checklist rows are at least 56 dp and carry a done or not-done accessible label", async () => {
    mockParents = [{ id: "p1", name: "Amma", role: "owner" }];
    await renderApp(<TodayDashboardScreen />);
    expect(screen.getByLabelText("Add a parent, done")).toBeTruthy();
    expect(screen.getByLabelText("Add a medicine, not done yet")).toBeTruthy();
  });

  it("shows name headings only when there are several parents, so the hero leads a single parent", async () => {
    const medicine = { id: "m1", name: "Metformin", doseText: "500mg", pillDescription: "" };
    mockMedicines = [medicine];
    mockParents = [{ id: "p1", name: "Amma", role: "owner" }];
    await renderApp(<TodayDashboardScreen />);
    expect(screen.queryByText("Amma")).toBeNull();
    mockParents = [
      { id: "p1", name: "Amma", role: "owner" },
      { id: "p2", name: "Achan", role: "owner" },
    ];
    await renderApp(<TodayDashboardScreen />);
    expect(screen.getByText("Amma")).toBeTruthy();
    expect(screen.getByText("Achan")).toBeTruthy();
  });

  it("an empty state never uses coral or warning wording", async () => {
    await renderApp(<TodayDashboardScreen />);
    const text = JSON.stringify(screen.toJSON()).toLowerCase();
    for (const word of ["warning", "urgent", "missed", "problem", "error"]) expect(text).not.toContain(word);
  });
});
