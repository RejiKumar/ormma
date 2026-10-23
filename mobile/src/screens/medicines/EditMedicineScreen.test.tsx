import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider } from "../../auth/AuthProvider";
import { EditMedicineScreen } from "./EditMedicineScreen";
import { renderApp } from "../../test-utils";
import type { Medicine } from "../../family/useMedicines";

type AuthMock = { __setUser: (user: { uid: string; phoneNumber: string | null }) => void };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

const fsMock = jest.requireMock("@react-native-firebase/firestore") as {
  onSnapshot: jest.Mock;
  getDoc: jest.Mock;
  updateDoc: jest.Mock;
  deleteDoc: jest.Mock;
};

const docSnap = (data: Record<string, unknown> | undefined) => ({
  exists: () => data !== undefined,
  data: () => data,
});

const medicine: Medicine = {
  id: "m1",
  name: "Metformin",
  doseText: "1 tablet",
  times: ["08:00", "20:00"],
  startDate: "2026-10-01",
  endDate: null,
  active: true,
  source: "manual",
  confirmedByHuman: true,
  prescriptionId: null,
  createdBy: "u1",
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

const renderEdit = async (overrides: Partial<Medicine> = {}) => {
  await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
  fsMock.onSnapshot.mockImplementation((_q: unknown, next: (s: unknown) => void) => {
    next({
      docs: [
        {
          id: "p1",
          data: () => ({ name: "Amma", language: "ml-IN", timezone: "Asia/Kolkata", consent: { status: "granted" } }),
        },
      ],
    });
    return jest.fn();
  });
  await renderApp(
    <AuthProvider>
      <EditMedicineScreen
        navigation={navigation as never}
        route={{
          key: "EditMedicine",
          name: "EditMedicine",
          params: { parentId: "p1", medicine: { ...medicine, ...overrides } },
        } as never}
      />
    </AuthProvider>,
  );
};

describe("EditMedicineScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
    navigation.goBack.mockClear();
    fsMock.getDoc.mockImplementation((ref: unknown) => {
      const path = typeof ref === "object" && ref !== null && "path" in ref ? String((ref as { path: string }).path) : "";
      if (path.includes("users/u1")) return Promise.resolve(docSnap({}));
      if (path === "parents/p1/members/u1") return Promise.resolve(docSnap({ role: "editor" }));
      return Promise.resolve(docSnap(undefined));
    });
  });

  it("pre-fills the form from the medicine", async () => {
    await renderEdit();
    expect(await screen.findByTestId("medicine-name")).toBeTruthy();
    expect(screen.getByTestId("medicine-name").props.value).toBe("Metformin");
    expect(screen.getByTestId("medicine-dose").props.value).toBe("1 tablet");
    expect(screen.getByTestId("medicine-time-0").props.value).toBe("08:00");
    expect(screen.getByTestId("medicine-time-1").props.value).toBe("20:00");
    expect(screen.getByTestId("medicine-start").props.value).toBe("2026-10-01");
  });

  it("saves only the editable fields", async () => {
    await renderEdit();
    await fireEvent.changeText(await screen.findByTestId("medicine-name"), "Metformin SR");
    await fireEvent.press(screen.getByTestId("medicine-save"));

    await waitFor(() => expect(fsMock.updateDoc).toHaveBeenCalledTimes(1));
    const [ref, patch] = fsMock.updateDoc.mock.calls[0];
    expect(String((ref as { path: string }).path)).toBe("parents/p1/medicines/m1");
    expect(patch).toEqual({
      name: "Metformin SR",
      doseText: "1 tablet",
      times: ["08:00", "20:00"],
      startDate: "2026-10-01",
    });
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("deactivates only after confirmation and never deletes the document", async () => {
    await renderEdit();
    await fireEvent.press(await screen.findByTestId("medicine-toggle-active"));
    expect(screen.getByTestId("medicine-deactivate-confirm")).toBeTruthy();
    expect(fsMock.updateDoc).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText("Yes, deactivate"));
    await waitFor(() => expect(fsMock.updateDoc).toHaveBeenCalledTimes(1));
    expect(fsMock.updateDoc).toHaveBeenCalledWith(expect.anything(), { active: false });
    expect(fsMock.deleteDoc).not.toHaveBeenCalled();
  });

  it("reactivates an inactive medicine without a confirmation", async () => {
    await renderEdit({ active: false });
    await fireEvent.press(await screen.findByTestId("medicine-toggle-active"));
    await waitFor(() => expect(fsMock.updateDoc).toHaveBeenCalledWith(expect.anything(), { active: true }));
  });

  it("keeps a viewer read-only with no save or deactivate actions", async () => {
    fsMock.getDoc.mockImplementation((ref: unknown) => {
      const path = typeof ref === "object" && ref !== null && "path" in ref ? String((ref as { path: string }).path) : "";
      if (path.includes("users/u1")) return Promise.resolve(docSnap({}));
      if (path === "parents/p1/members/u1") return Promise.resolve(docSnap({ role: "viewer" }));
      return Promise.resolve(docSnap(undefined));
    });
    await renderEdit();
    expect(await screen.findByTestId("medicine-readonly")).toBeTruthy();
    expect(screen.queryByTestId("medicine-save")).toBeNull();
    expect(screen.queryByTestId("medicine-toggle-active")).toBeNull();
  });
});
