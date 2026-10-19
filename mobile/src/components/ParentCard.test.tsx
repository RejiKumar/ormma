import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { MIN_TOUCH_TARGET } from "../design/tokens";
import { renderApp } from "../test-utils";
import { ParentCard } from "./ParentCard";

describe("ParentCard", () => {
  it("shows the name, summary, status chip and dose ring", async () => {
    await renderApp(
      <ParentCard
        name="Amma"
        summary="Next dose 8:00 PM"
        status="pending"
        taken={1}
        total={3}
        onPress={() => undefined}
      />,
    );
    expect(screen.getAllByText("Amma").length).toBeGreaterThan(0);
    expect(screen.getByText("Next dose 8:00 PM")).toBeTruthy();
    expect(screen.getByTestId("status-chip-pending")).toBeTruthy();
    expect(screen.getByTestId("dose-ring").props.accessibilityLabel).toBe("1 of 3 doses taken");
  });

  it("is one button of at least 48 dp named 'Open <name>'", async () => {
    const onPress = jest.fn();
    await renderApp(<ParentCard name="Amma" taken={0} total={0} onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Open Amma" });
    expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET,
    );
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("omits the chip and summary when not given", async () => {
    await renderApp(<ParentCard name="Amma" taken={0} total={2} onPress={() => undefined} />);
    expect(screen.queryByTestId("status-chip-pending")).toBeNull();
    expect(screen.queryByText("Next dose 8:00 PM")).toBeNull();
  });

  it("renders a Malayalam name with the Malayalam font", async () => {
    await renderApp(
      <ParentCard name="അമ്മ" lang="ml" taken={0} total={0} onPress={() => undefined} />,
    );
    const nameNodes = screen.getAllByText("അമ്മ");
    const families = nameNodes.map((n) => StyleSheet.flatten(n.props.style).fontFamily);
    // title weight 600 uses the bold file of the script
    expect(families).toContain("NotoSansMalayalam_700Bold");
  });
});
