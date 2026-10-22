import { fireEvent, screen } from "@testing-library/react-native";
import { readParentIds } from "../../family/parentIds";
import { renderApp } from "../../test-utils";
import { AddParentScreen } from "./AddParentScreen";

type FunctionsMock = {
  httpsCallable: jest.Mock;
  __callables: Record<string, jest.Mock>;
  __resetCallables: () => void;
};
const fnsMock = jest.requireMock("@react-native-firebase/functions") as FunctionsMock;

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const route = { key: "add", name: "AddParent" as const, params: undefined } as never;

/** Ensure the callable exists on __callables and return it for per-test configuration. */
const callable = (name: string): jest.Mock => {
  fnsMock.httpsCallable(undefined as never, name);
  return fnsMock.__callables[name];
};

const renderAddParent = async () =>
  renderApp(<AddParentScreen route={route} navigation={navigation as never} />);

const typeName = (value: string) => fireEvent.changeText(screen.getByTestId("add-name"), value);
const typePhone = (value: string) => fireEvent.changeText(screen.getByTestId("add-phone"), value);
const pressSave = () => fireEvent.press(screen.getByTestId("add-save"));

describe("AddParentScreen", () => {
  beforeEach(() => {
    navigation.goBack.mockClear();
    navigation.navigate.mockClear();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the title, disclaimer, and prefilled +91 phone", async () => {
    await renderAddParent();
    expect(screen.getByText("Add a parent")).toBeTruthy();
    expect(screen.getByText("This app does not provide medical advice.")).toBeTruthy();
    expect(screen.getByTestId("add-phone").props.value).toBe("+91");
  });

  it("requires a name before calling Firebase", async () => {
    const createParent = callable("createParent");
    await renderAddParent();
    await typePhone("+919876543210");
    await pressSave();
    expect(await screen.findByText("Enter the parent's name.")).toBeTruthy();
    expect(createParent).not.toHaveBeenCalled();
  });

  it("rejects an invalid phone number", async () => {
    const createParent = callable("createParent");
    await renderAddParent();
    await typeName("Amma");
    await typePhone("123");
    await pressSave();
    expect(
      await screen.findByText(
        "That phone number is not valid. Use international format, for example +919876543210.",
      ),
    ).toBeTruthy();
    expect(createParent).not.toHaveBeenCalled();
  });

  it("creates the parent, stores the id, and goes back", async () => {
    const createParent = callable("createParent");
    createParent.mockResolvedValue({ data: { parentId: "p9" } });
    await renderAddParent();
    await typeName("Amma");
    await typePhone("+919876543210");
    await pressSave();
    expect(await readParentIds()).toEqual(["p9"]);
    expect(createParent).toHaveBeenCalledWith({
      name: "Amma",
      phone: "+919876543210",
      language: "en-IN",
    });
    expect(navigation.goBack).toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("sends the selected language as an xx-IN tag", async () => {
    const createParent = callable("createParent");
    createParent.mockResolvedValue({ data: { parentId: "p10" } });
    await renderAddParent();
    await typeName("Amma");
    await typePhone("+919876543210");
    await fireEvent.press(screen.getByTestId("lang-ml"));
    expect(screen.getByTestId("lang-ml").props.accessibilityState.selected).toBe(true);
    await pressSave();
    expect(createParent).toHaveBeenCalledWith({
      name: "Amma",
      phone: "+919876543210",
      language: "ml-IN",
    });
  });

  it("shows a failure message and logs only the code when createParent rejects", async () => {
    const createParent = callable("createParent");
    createParent.mockRejectedValue({ code: "functions/internal" });
    await renderAddParent();
    await typeName("Amma");
    await typePhone("+919876543210");
    await pressSave();
    expect(await screen.findByText("Could not add the parent. Please try again.")).toBeTruthy();
    expect(console.warn).toHaveBeenCalledWith("createParent failed code=functions/internal");
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(await readParentIds()).toEqual([]);
  });

  it("does not persist anything when validation fails", async () => {
    callable("createParent");
    await renderAddParent();
    await pressSave();
    await screen.findByTestId("add-error");
    expect(await readParentIds()).toEqual([]);
  });
});
