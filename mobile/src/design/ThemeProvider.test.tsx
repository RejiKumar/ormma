import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import { darkColors, lightColors } from "./tokens";

let mockScheme: "light" | "dark" = "light";
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: () => mockScheme,
}));

let api: ReturnType<typeof useTheme>;
function Probe() {
  api = useTheme();
  return (
    <Text testID="probe">
      {api.name}|{api.theme.colors.background}
    </Text>
  );
}

beforeEach(() => {
  mockScheme = "light";
});

describe("ThemeProvider", () => {
  it("follows the phone: light when the phone is light", async () => {
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe").props.children.join("")).toBe(`light|${lightColors.background}`);
    expect(api.ready).toBe(true);
  });

  it("follows the phone: dark when the phone is dark, and changes when the phone changes", async () => {
    mockScheme = "dark";
    const view = await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(api.name).toBe("dark");
    expect(api.theme.colors.background).toBe(darkColors.background);
    mockScheme = "light";
    await view.rerender(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(api.name).toBe("light");
  });

  it("can be pinned for tests", async () => {
    mockScheme = "light";
    await render(
      <ThemeProvider initialPreference="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(api.name).toBe("dark");
  });

  it("throws outside a provider", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(Promise.resolve(render(<Probe />))).rejects.toThrow("useTheme must be used inside <ThemeProvider>");
    spy.mockRestore();
  });
});
