import { fireEvent, screen } from "@testing-library/react-native";
import { readParentIds } from "../../family/parentIds";
import { renderApp } from "../../test-utils";
import { RedeemScreen } from "./RedeemScreen";

type FunctionsMock = {
  httpsCallable: jest.Mock;
  __callables: Record<string, jest.Mock>;
};
const fnsMock = jest.requireMock("@react-native-firebase/functions") as FunctionsMock;

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const route = { key: "redeem", name: "Redeem" as const, params: undefined } as never;

const callable = (name: string): jest.Mock => {
  fnsMock.httpsCallable(undefined as never, name);
  return fnsMock.__callables[name];
};

const renderRedeem = async () =>
  renderApp(<RedeemScreen route={route} navigation={navigation as never} />);

const typeCode = (value: string) => fireEvent.changeText(screen.getByTestId("redeem-code"), value);
const pressJoin = () => fireEvent.press(screen.getByTestId("redeem-join"));

describe("RedeemScreen", () => {
  beforeEach(() => {
    navigation.goBack.mockClear();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the title, hint and disclaimer", async () => {
    await renderRedeem();
    expect(screen.getByText("Enter invite code")).toBeTruthy();
    expect(screen.getByText("8 letters and numbers, for example K7M2P9XA")).toBeTruthy();
    expect(screen.getByText("This app does not provide medical advice.")).toBeTruthy();
  });

  it("rejects a malformed code without calling Firebase", async () => {
    const redeemInvite = callable("redeemInvite");
    await renderRedeem();
    await typeCode("abc");
    await pressJoin();
    expect(await screen.findByText("That code is not valid. It is 8 letters and numbers.")).toBeTruthy();
    expect(redeemInvite).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it("normalises the code and joins the family", async () => {
    const redeemInvite = callable("redeemInvite");
    redeemInvite.mockResolvedValue({ data: { parentId: "p7", role: "editor" } });
    await renderRedeem();
    await typeCode("k7m2p9xa");
    await pressJoin();
    expect(redeemInvite).toHaveBeenCalledWith({ code: "K7M2P9XA" });
    expect(await readParentIds()).toEqual(["p7"]);
    expect(navigation.goBack).toHaveBeenCalled();
    expect(screen.queryByTestId("redeem-error")).toBeNull();
  });

  it("de-duplicates a parent id that is already stored", async () => {
    const redeemInvite = callable("redeemInvite");
    redeemInvite.mockResolvedValue({ data: { parentId: "p7", role: "editor" } });
    const AsyncStorage = jest.requireMock("@react-native-async-storage/async-storage") as {
      setItem: (k: string, v: string) => Promise<void>;
    };
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p7"]));
    await renderRedeem();
    await typeCode("k7m2p9xa");
    await pressJoin();
    expect(await readParentIds()).toEqual(["p7"]);
  });

  const rejections: Array<{
    error: { code: string; message?: string };
    message: string;
    logged: string;
  }> = [
    { error: { code: "functions/invalid-argument" }, message: "That code is not valid. It is 8 letters and numbers.", logged: "functions/invalid-argument" },
    { error: { code: "functions/not-found" }, message: "This invite code is not valid.", logged: "functions/not-found" },
    { error: { code: "functions/failed-precondition", message: "This invite code has expired." }, message: "This invite code has expired.", logged: "functions/failed-precondition" },
    { error: { code: "functions/failed-precondition", message: "This invite code was already used." }, message: "This invite code was already used.", logged: "functions/failed-precondition" },
    { error: { code: "functions/failed-precondition", message: "You are already a member of this family." }, message: "You are already a member of this family.", logged: "functions/failed-precondition" },
    { error: { code: "functions/unavailable" }, message: "Could not join the family. Please try again.", logged: "functions/unavailable" },
  ];

  it.each(rejections)("maps $error.code / $error.message to its own message", async ({ error, message, logged }) => {
    const redeemInvite = callable("redeemInvite");
    redeemInvite.mockRejectedValue(error);
    await renderRedeem();
    await typeCode("k7m2p9xa");
    await pressJoin();
    expect(await screen.findByText(message)).toBeTruthy();
    expect(console.warn).toHaveBeenCalledWith(`redeemInvite failed code=${logged}`);
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(await readParentIds()).toEqual([]);
  });
});
