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
  it("has Today, Medicines, Alerts and Family in production", () => {
    expect(getTabRoutes().map((r) => r.name)).toEqual([
      "Today",
      "Medicines",
      "Alerts",
      "Family",
    ]);
  });

  it("labels the production tabs from the translation catalogue", () => {
    for (const route of getTabRoutes()) expect(route.labelKey).not.toBeNull();
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
    expect(tabBarStyles(lightTheme).bar.height).toBe(64);
    expect(tabBarStyles(lightTheme, 20).bar.height).toBe(84);
    expect(tabBarStyles(darkTheme).bar.backgroundColor).toBe(darkTheme.colors.surface);
  });
});

describe("AppTabs", () => {
  it("shows the Today tab first, with the tab labels from the catalogue and the disclaimer", async () => {
    await renderTabs();
    expect(screen.getByTestId("today-no-parents")).toBeTruthy();
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
    for (const label of ["Today", "Medicines", "Escalation", "Family"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("This app does not provide medical advice.")).toBeTruthy();
  });

  it("switches to the Medicines, Alerts and Family tabs", async () => {
    await renderTabs();
    await fireEvent.press(screen.getByRole("button", { name: "Medicines" }));
    expect(await screen.findByTestId("medicines-no-parents")).toBeTruthy();
    await fireEvent.press(screen.getAllByRole("button", { name: "Escalation" })[0]);
    expect(await screen.findByText("No alerts yet")).toBeTruthy();
    await fireEvent.press(screen.getAllByRole("button", { name: "Family" })[0]);
    expect(await screen.findByTestId("family-empty")).toBeTruthy();
  });

  it("renders in dark mode", async () => {
    await renderTabs({ theme: "dark" });
    expect(screen.getByTestId("today-no-parents")).toBeTruthy();
  });
});
