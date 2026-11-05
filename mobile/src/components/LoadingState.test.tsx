import { screen } from "@testing-library/react-native";
import { renderApp } from "../test-utils";
import { AppHeader } from "./AppHeader";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("is announced as Loading and shows content-shaped placeholders instead of text", async () => {
    await renderApp(<LoadingState variant="cards" count={3} testID="l" />);
    const group = screen.getByTestId("l");
    expect(group.props.accessibilityLabel).toBe("Loading");
    expect(group.props.accessibilityRole).toBe("progressbar");
    expect(screen.getAllByTestId(/^l-block-/, { includeHiddenElements: true })).toHaveLength(3);
    expect(screen.queryByText("Loading")).toBeNull();
  });

  it("has a Today layout (hero, presence, two cards) and a lines layout", async () => {
    await renderApp(<LoadingState variant="today" testID="t" />);
    expect(screen.getAllByTestId(/^t-block-/, { includeHiddenElements: true })).toHaveLength(4);
    await renderApp(<LoadingState variant="lines" testID="x" />);
    expect(screen.getByTestId("x")).toBeTruthy();
  });
});

describe("brand text", () => {
  it("writes the app name as Ormma", async () => {
    await renderApp(<AppHeader parentName="Amma" alert={false} />);
    expect(screen.getByText("Ormma")).toBeTruthy();
    expect(screen.queryByText("ormma")).toBeNull();
  });
});
