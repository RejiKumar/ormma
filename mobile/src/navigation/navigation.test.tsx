import { NavigationContainer } from "@react-navigation/native";
import { fireEvent, screen } from "@testing-library/react-native";
import { AuthProvider } from "../auth/AuthProvider";
import { MIN_TOUCH_TARGET, darkTheme, lightTheme } from "../design/tokens";
import { renderApp } from "../test-utils";
import { AppTabs, tabBarStyles } from "./AppTabs";
import { getTabRoutes } from "./routes";

const renderTabs = (opts?: Parameters<typeof renderApp>[1]) =>
  renderApp(
    <NavigationContainer>
      <AuthProvider>
        <AppTabs />
      </AuthProvider>
    </NavigationContainer>,
    opts,
  );

describe("tab routes", () => {
  it("has Today, Medicines and Family in production", () => {
    expect(getTabRoutes(false).map((r) => r.name)).toEqual(["Today", "Medicines", "Family"]);
  });

  it("adds the component gallery only in development", () => {
    expect(getTabRoutes(true).map((r) => r.name)).toEqual([
      "Today",
      "Medicines",
      "Family",
      "Gallery",
    ]);
    expect(getTabRoutes(false).some((r) => r.name === "Gallery")).toBe(false);
  });

  it("labels the production tabs from the translation catalogue", () => {
    for (const route of getTabRoutes(false)) expect(route.labelKey).not.toBeNull();
  });
});

describe("tab bar styles", () => {
  it("makes every tab item at least 48 dp high and wide, in both themes", () => {
    for (const theme of [lightTheme, darkTheme]) {
      const { item } = tabBarStyles(theme);
      expect(item.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(item.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
  });

  it("uses the surface colour from the theme", () => {
    expect(tabBarStyles(lightTheme).bar.backgroundColor).toBe(lightTheme.colors.surface);
    expect(tabBarStyles(darkTheme).bar.backgroundColor).toBe(darkTheme.colors.surface);
  });
});

describe("AppTabs", () => {
  it("shows the Today tab first, with the tab labels from the catalogue and the disclaimer", async () => {
    await renderTabs();
    expect(screen.getByTestId("today-no-parents")).toBeTruthy();
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
    for (const label of ["Today", "Medicines", "Family"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("This app does not provide medical advice.")).toBeTruthy();
  });

  it("switches to the Medicines and Family tabs", async () => {
    await renderTabs();
    await fireEvent.press(screen.getByRole("button", { name: "Medicines" }));
    expect(await screen.findByTestId("medicines-empty")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Family" }));
    expect(await screen.findByTestId("family-empty")).toBeTruthy();
  });

  it("registers the gallery tab in development builds", async () => {
    await renderTabs();
    expect(screen.getAllByText("Gallery").length).toBeGreaterThan(0);
  });

  it("does not register the gallery tab when __DEV__ is false", async () => {
    const g = globalThis as unknown as { __DEV__: boolean };
    const original = g.__DEV__;
    g.__DEV__ = false;
    try {
      await renderTabs();
      expect(screen.queryByText("Gallery")).toBeNull();
      expect(screen.getAllByText("Medicines").length).toBeGreaterThan(0);
    } finally {
      g.__DEV__ = original;
    }
  });

  it("renders in dark mode", async () => {
    await renderTabs({ theme: "dark" });
    expect(screen.getByTestId("today-no-parents")).toBeTruthy();
  });
});
