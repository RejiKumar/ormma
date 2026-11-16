import { act, waitFor } from "@testing-library/react-native";
import { renderApp } from "../test-utils";
import i18n from "./index";

const mockUpdateDoc = jest.fn(async () => undefined);
jest.mock("@react-native-firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  getFirestore: () => ({}),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...(args as [])),
}));

let mockUser: { uid: string } | null = null;
jest.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ user: mockUser, initialising: false }),
}));

import { MemberLanguageSync } from "./MemberLanguageSync";

describe("MemberLanguageSync", () => {
  beforeEach(() => {
    mockUser = null;
    mockUpdateDoc.mockClear();
    mockUpdateDoc.mockImplementation(async () => undefined);
  });

  it("writes nothing while signed out", async () => {
    await renderApp(<MemberLanguageSync />, { language: "ml" });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it("saves the language the app shows on the member's own record, and again when it changes", async () => {
    mockUser = { uid: "u1" };
    await renderApp(<MemberLanguageSync />, { language: "ml" });
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalledWith({ path: "users/u1" }, { language: "ml" }));
    await act(async () => {
      await i18n.changeLanguage("hi");
    });
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenLastCalledWith({ path: "users/u1" }, { language: "hi" }));
  });

  it("ignores a failed write and never throws", async () => {
    mockUser = { uid: "u1" };
    mockUpdateDoc.mockImplementation(async () => {
      throw new Error("denied");
    });
    await renderApp(<MemberLanguageSync />, { language: "ta" });
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
  });
});
