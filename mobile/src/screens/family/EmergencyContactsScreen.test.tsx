import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "../../test-utils";
import type { FamilyParent } from "../../family/useParents";
import { EmergencyContactsScreen } from "./EmergencyContactsScreen";

const mockParents: { parents: FamilyParent[] } = { parents: [] };
jest.mock("../../family/useParents", () => ({
  useParents: () => ({ parents: mockParents.parents, loading: false, reload: jest.fn() }),
}));

type FirestoreMock = { updateDoc: jest.Mock; doc: jest.Mock };
const fsMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;

const base: FamilyParent = {
  id: "p1",
  name: "Amma",
  phone: "+919812345678",
  language: "ml-IN",
  timezone: "Asia/Kolkata",
  consent: { status: "granted", revokedAt: null, regrantedAt: null },
  emergencyContacts: [{ label: "Sreeja", kind: "neighbour", phone: "+919876500001" }],
  role: "owner",
};

const goBack = jest.fn();
const navigation = { goBack, navigate: jest.fn() } as never;
const route = {
  key: "c",
  name: "EmergencyContacts" as const,
  params: { parentId: "p1", parentName: "Amma" },
} as never;

const renderScreen = () => renderApp(<EmergencyContactsScreen navigation={navigation} route={route} />);

beforeEach(() => {
  fsMock.updateDoc.mockReset();
  fsMock.updateDoc.mockResolvedValue(undefined);
  goBack.mockClear();
  mockParents.parents = [base];
});

describe("EmergencyContactsScreen", () => {
  it("starts from the stored contacts and saves edits through a parent update", async () => {
    await renderScreen();
    expect(screen.getByTestId("contact-label-0").props.value).toBe("Sreeja");
    await fireEvent.changeText(screen.getByTestId("contact-label-0"), "Sreeja K");
    await fireEvent.press(screen.getByTestId("contact-kind-0-clinic"));
    await fireEvent.press(screen.getByTestId("contacts-save"));
    await waitFor(() => expect(fsMock.updateDoc).toHaveBeenCalled());
    expect(fsMock.updateDoc.mock.calls[0][1]).toEqual({
      emergencyContacts: [{ label: "Sreeja K", kind: "clinic", phone: "+919876500001" }],
    });
    expect(goBack).toHaveBeenCalled();
  });

  it("rejects a phone that is not in E.164 format and stores nothing", async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId("contact-phone-0"), "98765");
    await fireEvent.press(screen.getByTestId("contacts-save"));
    expect(await screen.findByTestId("contacts-error")).toHaveTextContent(/country code/);
    expect(fsMock.updateDoc).not.toHaveBeenCalled();
  });

  it("requires a name for every contact", async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId("contacts-add"));
    await fireEvent.changeText(screen.getByTestId("contact-phone-1"), "+919876500009");
    await fireEvent.press(screen.getByTestId("contacts-save"));
    expect(await screen.findByTestId("contacts-error")).toHaveTextContent(/Enter a name/);
    expect(fsMock.updateDoc).not.toHaveBeenCalled();
  });

  it("allows at most 3 contacts", async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId("contacts-add"));
    await fireEvent.press(screen.getByTestId("contacts-add"));
    expect(screen.queryByTestId("contacts-add")).toBeNull();
    expect(screen.getByTestId("contact-2")).toBeTruthy();
  });

  it("removes a contact", async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId("contact-remove-0"));
    await fireEvent.press(screen.getByTestId("contacts-save"));
    await waitFor(() => expect(fsMock.updateDoc).toHaveBeenCalled());
    expect(fsMock.updateDoc.mock.calls[0][1]).toEqual({ emergencyContacts: [] });
  });

  it("is read-only for an editor: no save, add or remove", async () => {
    mockParents.parents = [{ ...base, role: "editor" }];
    await renderScreen();
    expect(screen.getByTestId("contacts-readonly")).toBeTruthy();
    expect(screen.queryByTestId("contacts-save")).toBeNull();
    expect(screen.queryByTestId("contacts-add")).toBeNull();
    expect(screen.queryByTestId("contact-remove-0")).toBeNull();
  });
});
