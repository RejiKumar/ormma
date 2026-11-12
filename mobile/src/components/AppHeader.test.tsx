import { fireEvent, screen } from "@testing-library/react-native";
import { renderApp } from "../test-utils";
import { AppHeader } from "./AppHeader";

describe("AppHeader sign-out icon", () => {
  it("is not shown when no handler is given", async () => {
    await renderApp(<AppHeader parentName="Amma" alert={false} />);
    expect(screen.queryByTestId("app-header-signout")).toBeNull();
  });

  it("is an icon button at the right end of the bar, named Sign out, at least 48 dp", async () => {
    const onSignOut = jest.fn();
    await renderApp(<AppHeader parentName="Amma" alert={false} onSignOut={onSignOut} />);
    const button = screen.getByTestId("app-header-signout");
    expect(button).toHaveProp("accessibilityLabel", "Sign out");
    expect(button).toHaveProp("accessibilityRole", "button");
    const flat = Object.assign({}, ...[button.props.style].flat());
    expect(flat.width).toBeGreaterThanOrEqual(48);
    expect(flat.height).toBeGreaterThanOrEqual(48);
    expect(screen.getByTestId("icon-logout", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText("Sign out")).toBeNull();
    await fireEvent.press(button);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("is shown even when there is no parent yet", async () => {
    await renderApp(<AppHeader parentName={null} alert={false} onSignOut={() => undefined} />);
    expect(screen.getByTestId("app-header-signout")).toBeTruthy();
  });
});
