import { fireEvent, screen } from "@testing-library/react-native";
import { renderApp } from "../../test-utils";
import { InviteScreen } from "./InviteScreen";

type FunctionsMock = {
  httpsCallable: jest.Mock;
  __callables: Record<string, jest.Mock>;
};
const fnsMock = jest.requireMock("@react-native-firebase/functions") as FunctionsMock;

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as never;
const route = {
  key: "invite",
  name: "Invite" as const,
  params: { parentId: "p1", parentName: "Amma" },
} as never;

const callable = (name: string): jest.Mock => {
  fnsMock.httpsCallable(undefined as never, name);
  return fnsMock.__callables[name];
};

const renderInvite = async () => renderApp(<InviteScreen route={route} navigation={navigation} />);

describe("InviteScreen", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("names the parent in the subtitle and shows both roles with editor selected", async () => {
    await renderInvite();
    expect(screen.getByText("Invite a sibling to help care for Amma.")).toBeTruthy();
    expect(screen.getByTestId("invite-role-editor").props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId("invite-role-viewer").props.accessibilityState.selected).toBe(false);
    expect(screen.getByText("Can add medicines and record doses.")).toBeTruthy();
    expect(screen.getByText("Can see progress but not change anything.")).toBeTruthy();
    expect(screen.getByText("This app does not provide medical advice.")).toBeTruthy();
  });

  it("creates an editor invite by default and shows the code", async () => {
    const createInvite = callable("createInvite");
    createInvite.mockResolvedValue({ data: { code: "K7M2P9XA", expiresAt: "2026-01-01" } });
    await renderInvite();
    await fireEvent.press(screen.getByTestId("invite-create"));
    expect(await screen.findByTestId("invite-code")).toHaveTextContent("K7M2P9XA");
    expect(createInvite).toHaveBeenCalledWith({ parentId: "p1", role: "editor" });
    expect(screen.queryByTestId("invite-create")).toBeNull();
  });

  it("sends the viewer role when selected", async () => {
    const createInvite = callable("createInvite");
    createInvite.mockResolvedValue({ data: { code: "ABCD2345", expiresAt: "2026-01-01" } });
    await renderInvite();
    await fireEvent.press(screen.getByTestId("invite-role-viewer"));
    expect(screen.getByTestId("invite-role-viewer").props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByTestId("invite-create"));
    expect(createInvite).toHaveBeenCalledWith({ parentId: "p1", role: "viewer" });
  });

  it("explains that only the owner can create invites", async () => {
    const createInvite = callable("createInvite");
    createInvite.mockRejectedValue({ code: "functions/permission-denied" });
    await renderInvite();
    await fireEvent.press(screen.getByTestId("invite-create"));
    expect(await screen.findByText("Only the family owner can create invite codes.")).toBeTruthy();
    expect(console.warn).toHaveBeenCalledWith("createInvite failed code=functions/permission-denied");
    expect(screen.queryByTestId("invite-code")).toBeNull();
  });

  it("shows a generic failure for other errors", async () => {
    const createInvite = callable("createInvite");
    createInvite.mockRejectedValue({ code: "functions/internal" });
    await renderInvite();
    await fireEvent.press(screen.getByTestId("invite-create"));
    expect(await screen.findByText("Could not create the invite code. Please try again.")).toBeTruthy();
    expect(console.warn).toHaveBeenCalledWith("createInvite failed code=functions/internal");
  });
});
