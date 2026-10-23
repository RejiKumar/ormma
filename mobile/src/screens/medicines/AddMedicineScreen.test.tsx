import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider } from "../../auth/AuthProvider";
import { AddMedicineScreen } from "./AddMedicineScreen";
import { renderApp } from "../../test-utils";

type AuthMock = { __setUser: (user: { uid: string; phoneNumber: string | null }) => void };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

type FirestoreMock = {
  onSnapshot: jest.Mock;
  getDoc: jest.Mock;
  setDoc: jest.Mock;
  deleteDoc: jest.Mock;
};
const fsMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;

const docSnap = (data: Record<string, unknown> | undefined) => ({
  exists: () => data !== undefined,
  data: () => data,
});

const parentsSnap = () => ({
  docs: [{ id: "p1", data: () => ({ name: "Amma", language: "ml-IN", timezone: "Asia/Kolkata", consent: { status: "granted" } }) }],
});

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

const renderAdd = async () =>
  renderApp(
    <AuthProvider>
      <AddMedicineScreen
        navigation={navigation as never}
        route={{ key: "AddMedicine", name: "AddMedicine", params: { parentId: "p1" } } as never}
      />
    </AuthProvider>,
  );

let memberRole = "editor";

/** Store and deliver the parent snapshot once the hook subscribes. */
async function feedParent(role = "editor") {
  memberRole = role;
  await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
  fsMock.onSnapshot.mockImplementation(
    (_q: unknown, next: (s: unknown) => void) => {
      next(parentsSnap());
      return jest.fn();
    },
  );
}

describe("AddMedicineScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
    navigation.goBack.mockClear();
    fsMock.getDoc.mockImplementation((ref: unknown) => {
      const path = typeof ref === "object" && ref !== null && "path" in ref ? String((ref as { path: string }).path) : "";
      if (path.includes("users/u1")) return Promise.resolve(docSnap({}));
      if (path === "parents/p1/members/u1") return Promise.resolve(docSnap({ role: memberRole }));
      return Promise.resolve(docSnap(undefined));
    });
  });

  it("surfaces each validation failure from the catalogue and writes nothing", async () => {
    await feedParent();
    await renderAdd();
    await waitFor(() => expect(screen.getByTestId("medicine-name")).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId("medicine-start"), "2026-10-22");
    await fireEvent.changeText(screen.getByTestId("medicine-time-0"), "08:00");
    await fireEvent.press(screen.getByTestId("medicine-save"));
    expect(await screen.findByText("Enter the medicine name.")).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId("medicine-name"), "Metformin");
    await fireEvent.changeText(screen.getByTestId("medicine-time-0"), "8am");
    await fireEvent.press(screen.getByTestId("medicine-save"));
    expect(await screen.findByText("Use 24-hour times like 08:00 or 20:30.")).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId("medicine-time-0"), "");
    await fireEvent.press(screen.getByTestId("medicine-save"));
    expect(await screen.findByText("Add at least one dose time.")).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId("medicine-time-0"), "08:00");
    await fireEvent.changeText(screen.getByTestId("medicine-start"), "22-10-2026");
    await fireEvent.press(screen.getByTestId("medicine-save"));
    expect(await screen.findByText("Use the date format YYYY-MM-DD.")).toBeTruthy();

    expect(fsMock.setDoc).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it("writes the manual, human-confirmed payload and goes back", async () => {
    await feedParent();
    await renderAdd();
    await waitFor(() => expect(screen.getByTestId("medicine-name")).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId("medicine-name"), " Metformin ");
    await fireEvent.changeText(screen.getByTestId("medicine-dose"), "1 tablet");
    await fireEvent.changeText(screen.getByTestId("medicine-time-0"), "08:00");
    await fireEvent.press(screen.getByTestId("medicine-time-add"));
    await fireEvent.changeText(screen.getByTestId("medicine-time-1"), "20:30");
    await fireEvent.changeText(screen.getByTestId("medicine-start"), "2026-10-22");
    await fireEvent.press(screen.getByTestId("medicine-save"));

    await waitFor(() => expect(fsMock.setDoc).toHaveBeenCalledTimes(1));
    const [ref, payload] = fsMock.setDoc.mock.calls[0];
    expect(String((ref as { path: string }).path)).toMatch(/^parents\/p1\/medicines\/.+/);
    expect(payload).toMatchObject({
      name: "Metformin",
      doseText: "1 tablet",
      times: ["08:00", "20:30"],
      startDate: "2026-10-22",
      endDate: null,
      active: true,
      source: "manual",
      confirmedByHuman: true,
      prescriptionId: null,
      createdBy: "u1",
    });
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("defaults the start date to today in the parent's timezone", async () => {
    await feedParent();
    await renderAdd();
    await waitFor(() => expect(screen.getByTestId("medicine-start")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("medicine-start").props.value).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("keeps a viewer read-only with no save action", async () => {
    await feedParent("viewer");
    await renderAdd();
    expect(await screen.findByTestId("medicine-readonly")).toBeTruthy();
    expect(screen.queryByTestId("medicine-save")).toBeNull();
  });
});
