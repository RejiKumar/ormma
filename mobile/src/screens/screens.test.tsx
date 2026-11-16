import { screen } from "@testing-library/react-native";
import { renderApp } from "../test-utils";
import i18n from "../i18n";
import { MedicinesScreen } from "./TabPlaceholders";

const DISCLAIMER = "This app does not provide medical advice.";

describe.each([["Medicines", MedicinesScreen, "No medicines yet"]] as const)(
  "%s placeholder",
  (_name, Component, title) => {
    it("shows its empty state from the catalogue and the disclaimer", async () => {
      await renderApp(<Component />);
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByText(DISCLAIMER)).toBeTruthy();
    });

    it("has no primary action and so no competing buttons", async () => {
      await renderApp(<Component />);
      expect(screen.queryAllByRole("button")).toHaveLength(0);
    });

    it("still shows the medical disclaimer when the language is ml, ta or hi", async () => {
      await renderApp(<Component />, { language: "ml" });
      expect(screen.getByText(i18n.t("disclaimer.medical"))).toBeTruthy();
    });
  },
);
