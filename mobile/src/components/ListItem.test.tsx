import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { renderApp } from "../test-utils";
import { ListItem } from "./ListItem";

describe("ListItem", () => {
  it("shows the title and subtitle", async () => {
    await renderApp(<ListItem title="Metformin" subtitle="Morning and evening" />);
    expect(screen.getByText("Metformin")).toBeTruthy();
    expect(screen.getByText("Morning and evening")).toBeTruthy();
  });

  it("is a button of at least 56 dp with the title as its name when pressable", async () => {
    const onPress = jest.fn();
    await renderApp(<ListItem title="Metformin" onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Metformin" });
    expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(56);
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("icon-chevronRight", { includeHiddenElements: true })).toBeTruthy();
  });

  it("hides the chevron on request and is not a button without onPress", async () => {
    await renderApp(<ListItem title="Plain" testID="row" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId("row").props.style).minHeight,
    ).toBeGreaterThanOrEqual(56);
    await renderApp(<ListItem title="Tap" onPress={() => undefined} chevron={false} />);
    expect(screen.queryByTestId("icon-chevronRight", { includeHiddenElements: true })).toBeNull();
  });

  it("renders leading and trailing content", async () => {
    await renderApp(
      <ListItem title="Row" leading={<Text>lead</Text>} trailing={<Text>trail</Text>} />,
    );
    expect(screen.getByText("lead")).toBeTruthy();
    expect(screen.getByText("trail")).toBeTruthy();
  });

  it("uses a custom accessibility label when given", async () => {
    await renderApp(
      <ListItem title="Row" accessibilityLabel="Open row" onPress={() => undefined} />,
    );
    expect(screen.getByRole("button", { name: "Open row" })).toBeTruthy();
  });
});
