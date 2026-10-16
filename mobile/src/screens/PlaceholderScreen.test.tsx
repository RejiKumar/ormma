import { render, screen } from "@testing-library/react-native";
import { DISCLAIMER, PlaceholderScreen } from "./PlaceholderScreen";

describe("PlaceholderScreen", () => {
  it("shows the medical disclaimer", async () => {
    await render(<PlaceholderScreen />);
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });
});
