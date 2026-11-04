import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "../../test-utils";
import type { FamilyParent } from "../../family/useParents";
import { ParentDetailsScreen } from "./ParentDetailsScreen";

const mockParents: { parents: FamilyParent[] } = { parents: [] };
jest.mock("../../family/useParents", () => ({
  useParents: () => ({ parents: mockParents.parents, loading: false, reload: jest.fn() }),
}));

type FirestoreMock = { updateDoc: jest.Mock };
const fsMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;

const base: FamilyParent = {
  id: "p1",
  name: "Amma",
  phone: "+919812345678",
  language: "ml-IN",
  timezone: "Asia/Kolkata",
  consent: { status: "granted", revokedAt: null, regrantedAt: null },
  emergencyContacts: [],
  city: "Thrissur",
  prescriber: "Dr. Nair",
  refillDue: "2026-11-02",
  callPolicy: { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60 },
  role: "owner",
};

const goBack = jest.fn();
const navigation = { goBack, navigate: jest.fn() } as never;
const route = { key: "d", name: "ParentDetails" as const, params: { parentId: "p1" } } as never;
const renderScreen = () => renderApp(<ParentDetailsScreen navigation={navigation} route={route} />);

beforeEach(() => {
  fsMock.updateDoc.mockReset();
  fsMock.updateDoc.mockResolvedValue(undefined);
  goBack.mockClear();
  mockParents.parents = [base];
});

describe("ParentDetailsScreen", () => {
  it("starts from the stored details and saves city, prescriber and refill date", async () => {
    await renderScreen();
    expect(screen.getByTestId("parent-city").props.value).toBe("Thrissur");
    await fireEvent.changeText(screen.getByTestId("parent-city"), "Kochi");
    await fireEvent.changeText(screen.getByTestId("parent-refill"), "2026-12-01");
    await fireEvent.press(screen.getByTestId("details-save"));
    await waitFor(() => expect(fsMock.updateDoc).toHaveBeenCalled());
    expect(fsMock.updateDoc.mock.calls[0][1]).toEqual({ city: "Kochi", prescriber: "Dr. Nair", refillDue: "2026-12-01" });
    expect(goBack).toHaveBeenCalled();
  });

  it("clears the refill date to null when left empty", async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId("parent-refill"), "");
    await fireEvent.press(screen.getByTestId("details-save"));
    await waitFor(() => expect(fsMock.updateDoc).toHaveBeenCalled());
    expect(fsMock.updateDoc.mock.calls[0][1]).toMatchObject({ refillDue: null });
  });

  it("rejects a date that is not YYYY-MM-DD and stores nothing", async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId("parent-refill"), "2 Nov");
    await fireEvent.press(screen.getByTestId("details-save"));
    expect(await screen.findByTestId("details-error")).toHaveTextContent(/YYYY-MM-DD/);
    expect(fsMock.updateDoc).not.toHaveBeenCalled();
  });

  it("is read-only for an editor", async () => {
    mockParents.parents = [{ ...base, role: "editor" }];
    await renderScreen();
    expect(screen.getByTestId("details-readonly")).toBeTruthy();
    expect(screen.queryByTestId("details-save")).toBeNull();
  });
});
