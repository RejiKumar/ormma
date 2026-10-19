import { screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { renderApp } from "../test-utils";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("shows the title and description", async () => {
    await renderApp(
      <EmptyState title="No medicines yet" description="Medicines you add are listed here." />,
    );
    expect(screen.getByText("No medicines yet")).toBeTruthy();
    expect(screen.getByText("Medicines you add are listed here.")).toBeTruthy();
  });

  it("renders an action node when given", async () => {
    await renderApp(<EmptyState title="t" action={<Text>do it</Text>} />);
    expect(screen.getByText("do it")).toBeTruthy();
  });

  it("works with only a title and shows an icon by default", async () => {
    await renderApp(<EmptyState title="Only title" />);
    expect(screen.getByText("Only title")).toBeTruthy();
    expect(screen.getByTestId("icon-info", { includeHiddenElements: true })).toBeTruthy();
  });

  it("uses the icon it is given", async () => {
    await renderApp(<EmptyState title="t" icon="pill" />);
    expect(screen.getByTestId("icon-pill", { includeHiddenElements: true })).toBeTruthy();
  });
});
