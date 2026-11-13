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
async function feedParent(role = "editor", existing: Array<Record<string, unknown>> = []) {
  memberRole = role;
  await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
  fsMock.onSnapshot.mockImplementation(
    (q: { path?: string }, next: (s: unknown) => void) => {
      if (String(q?.path ?? "").endsWith("/medicines")) {
        next({
          docs: existing.map((data, index) => ({
            id: `m${index}`,
            data: () => ({ ...data, createdAt: { toMillis: () => (data.createdMs as number) ?? 0 } }),
          })),
        });
      } else {
        next(parentsSnap());
      }
      return jest.fn();
    },
  );
}

const lastMedicine = {
  name: "Dolo 650",
  doseText: "500mg",
  times: ["08:00", "20:00"],
  startDate: "2020-01-01",
  frequencyText: "Twice daily",
  pillDescription: "Small white round",
  purpose: "Sugar",
  createdMs: 2000,
};

describe("AddMedicineScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
    navigation.goBack.mockClear();
    fsMock.getDoc.mockImplementation((ref: unknown) => {
      const path = typeof ref === "object" && ref !== null && "path" in ref ? String((ref as { path: string }).path) : "";
      if (path.includes("users/u1"))
        return Promise.resolve(docSnap({ displayName: "", phone: "+919876543210", fcmTokens: [], createdAt: {} }));
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
    expect(screen.queryByTestId("medicine-scan")).toBeNull();
  });

  it("offers Scan prescription to an editor and opens the scan screen for that parent", async () => {
    await feedParent("editor");
    await renderAdd();
    await fireEvent.press(await screen.findByTestId("medicine-scan"));
    expect(navigation.navigate).toHaveBeenCalledWith("ScanPrescription", { parentId: "p1" });
  });
  it("opens prefilled from the last medicine except the name, with a note", async () => {
    await feedParent("editor", [
      { ...lastMedicine, name: "Older", doseText: "1 tablet", purpose: "BP", createdMs: 1000 },
      lastMedicine,
    ]);
    await renderAdd();
    expect(await screen.findByTestId("medicine-prefill-note")).toBeTruthy();
    expect(screen.getByText("Filled from the last medicine. Check before saving.")).toBeTruthy();
    expect(screen.getByTestId("medicine-name").props.value).toBe("");
    expect(screen.getByTestId("medicine-dose").props.value).toBe("500mg");
    expect(screen.getByTestId("medicine-time-0").props.value).toBe("08:00");
    expect(screen.getByTestId("medicine-time-1").props.value).toBe("20:00");
    expect(screen.getByTestId("medicine-purpose").props.value).toBe("Sugar");
    // A start date in the past is not copied.
    expect(screen.getByTestId("medicine-start").props.value).not.toBe("2020-01-01");
    expect(fsMock.setDoc).not.toHaveBeenCalled();
  });

  it("Clear empties the copied fields and removes the note", async () => {
    await feedParent("editor", [lastMedicine]);
    await renderAdd();
    await fireEvent.press(await screen.findByText("Clear"));
    expect(screen.queryByTestId("medicine-prefill-note")).toBeNull();
    expect(screen.getByTestId("medicine-dose").props.value).toBe("");
    expect(screen.getByTestId("medicine-purpose").props.value).toBe("");
  });

  it("opens empty with no note for the first medicine", async () => {
    await feedParent("editor", []);
    await renderAdd();
    await waitFor(() => expect(screen.getByTestId("medicine-name")).toBeTruthy());
    expect(screen.queryByTestId("medicine-prefill-note")).toBeNull();
    expect(screen.getByTestId("medicine-dose").props.value).toBe("");
  });
});
