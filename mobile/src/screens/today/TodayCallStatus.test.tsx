import { screen, waitFor } from "@testing-library/react-native";
import { resetCallStatusCache } from "../../family/useCallStatus";
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

const fnsMock = jest.requireMock("@react-native-firebase/functions") as { __callables: Record<string, jest.Mock> };
const answerWith = (value: unknown) => {
  fnsMock.__callables.getCallStatus = jest.fn(() => Promise.resolve({ data: value }));
};

describe("Today: calls-not-active note", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockParents = [];
    mockMedicines = [];
    mockMembers = [];
    resetCallStatusCache();
  });

  it("shows one calm note while calling is off, in plain wording", async () => {
    answerWith({ callsEnabled: false });
    await renderApp(<TodayDashboardScreen />);
    expect(await screen.findByTestId("today-calls-soon")).toBeTruthy();
    expect(screen.getByText("Check-in calls will start soon.")).toBeTruthy();
    const text = JSON.stringify(screen.toJSON()).toLowerCase();
    for (const word of ["warning", "urgent", "missed", "problem", "error", "failed"]) {
      expect(text).not.toContain(word);
    }
  });

  it("shows no note when calling is on", async () => {
    answerWith({ callsEnabled: true });
    await renderApp(<TodayDashboardScreen />);
    await waitFor(() => expect(fnsMock.__callables.getCallStatus).toHaveBeenCalled());
    expect(screen.queryByTestId("today-calls-soon")).toBeNull();
  });

  it("shows no note when the status cannot be read", async () => {
    fnsMock.__callables.getCallStatus = jest.fn(() => Promise.reject({ code: "unavailable" }));
    await renderApp(<TodayDashboardScreen />);
    await waitFor(() => expect(fnsMock.__callables.getCallStatus).toHaveBeenCalled());
    expect(screen.queryByTestId("today-calls-soon")).toBeNull();
  });

  it("shows no note when the answer is not a boolean", async () => {
    answerWith({ callsEnabled: "no" });
    await renderApp(<TodayDashboardScreen />);
    await waitFor(() => expect(fnsMock.__callables.getCallStatus).toHaveBeenCalled());
    expect(screen.queryByTestId("today-calls-soon")).toBeNull();
  });

  it("asks only once per app start", async () => {
    answerWith({ callsEnabled: false });
    await renderApp(<TodayDashboardScreen />);
    await screen.findByTestId("today-calls-soon");
    await renderApp(<TodayDashboardScreen />);
    expect(fnsMock.__callables.getCallStatus).toHaveBeenCalledTimes(1);
  });
});
