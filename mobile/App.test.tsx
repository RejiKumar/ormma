import { screen } from "@testing-library/react-native";
import App from "./App";
import { renderApp } from "./src/test-utils";

describe("App", () => {
  it("starts on the Today tab in the light theme, with the disclaimer visible", async () => {
    await renderApp(<App />);
    expect(await screen.findByText("Nothing here yet")).toBeTruthy();
    expect(screen.getByText("This app does not provide medical advice.")).toBeTruthy();
  });
});
