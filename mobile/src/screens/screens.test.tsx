import { screen } from "@testing-library/react-native";
import { renderApp } from "../test-utils";
import { GalleryScreen } from "./gallery/GalleryScreen";
import { MedicinesScreen, TodayScreen } from "./TabPlaceholders";

const DISCLAIMER = "This app does not provide medical advice.";

describe.each([
  ["Today", TodayScreen, "Nothing here yet"],
  ["Medicines", MedicinesScreen, "No medicines yet"],
] as const)("%s placeholder", (_name, Component, title) => {
  it("shows its empty state from the catalogue and the disclaimer", async () => {
    await renderApp(<Component />);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("has no primary action and so no competing buttons", async () => {
    await renderApp(<Component />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("keeps the English text when the language is ml, ta or hi (no reviewed translation yet)", async () => {
    await renderApp(<Component />, { language: "ml" });
    expect(screen.getByText(title)).toBeTruthy();
  });
});

describe("GalleryScreen", () => {
  it("shows every component and exactly one primary action (the screen's CTA)", async () => {
    await renderApp(<GalleryScreen />);
    for (const section of [
      "Theme",
      "Language and script",
      "Type scale",
      "Status chips",
      "Dose rings",
      "Buttons",
      "Cards and parents",
      "Avatars",
      "List items",
      "Banners",
      "Health readings (neutral style)",
      "Empty state",
      "Skeletons",
      "Confirmation",
      "Icons",
    ]) {
      expect(screen.getByText(section)).toBeTruthy();
    }
    expect(screen.getAllByText(DISCLAIMER).length).toBe(1);
    expect(screen.getByTestId("screen-primary-action")).toBeTruthy();
  });

  it("shows all five status chips and both sample scripts", async () => {
    await renderApp(<GalleryScreen />);
    for (const s of ["taken", "pending", "missed", "unclear", "calling"]) {
      expect(screen.getAllByTestId(`status-chip-${s}`).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("ഇന്ന് മരുന്ന് കഴിച്ചോ?")).toBeTruthy();
    expect(screen.getByText("क्या आपने आज दवा ली?")).toBeTruthy();
  });
});
