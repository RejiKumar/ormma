import { screen } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { renderApp } from "../test-utils";
import { Icon } from "./Icon";
import { Screen } from "./Screen";

describe("Screen", () => {
  it("shows its content and the medical disclaimer", async () => {
    await renderApp(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );
    expect(screen.getByText("content")).toBeTruthy();
    expect(screen.getByText("This app does not provide medical advice.")).toBeTruthy();
  });

  it("shows the disclaimer even when there is a primary action and when it does not scroll", async () => {
    await renderApp(
      <Screen scroll={false} primaryAction={<View testID="cta" />}>
        <Text>content</Text>
      </Screen>,
    );
    expect(screen.getByTestId("cta")).toBeTruthy();
    expect(screen.getByTestId("disclaimer-footer")).toBeTruthy();
  });

  it("places the primary action in the bottom area, above the disclaimer", async () => {
    await renderApp(
      <Screen primaryAction={<View testID="cta" />}>
        <Text>content</Text>
      </Screen>,
    );
    const bottom = screen.getByTestId("screen-bottom");
    const kids = bottom.children as unknown as Array<{ props: { testID?: string } }>;
    expect(kids[0].props.testID).toBe("screen-primary-action");
    expect(kids[1].props.testID).toBe("disclaimer-footer");
    // and the content sits in the scrolling area, not in the bottom area
    expect(screen.getByTestId("screen-scroll")).toBeTruthy();
  });

  it("renders without a primary action slot when none is given", async () => {
    await renderApp(
      <Screen>
        <Text>content</Text>
      </Screen>,
    );
    expect(screen.queryByTestId("screen-primary-action")).toBeNull();
  });
});

describe("Icon", () => {
  it("is hidden from screen readers unless it has a label", async () => {
    await renderApp(
      <>
        <Icon name="check" color="#000000" testID="deco" />
        <Icon name="check" color="#000000" accessibilityLabel="Done" testID="named" />
      </>,
    );
    expect(
      screen.getByTestId("deco", { includeHiddenElements: true }).props.accessibilityElementsHidden,
    ).toBe(true);
    expect(screen.getByTestId("named").props.accessibilityLabel).toBe("Done");
    expect(screen.getByTestId("named").props.accessible).toBe(true);
  });
});
