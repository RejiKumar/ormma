import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { THEME_STORAGE_KEY, ThemeProvider, useTheme } from "./ThemeProvider";
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
      {api.name}|{api.preference}|{api.theme.colors.background}
    </Text>
  );
}

const renderProvider = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );

beforeEach(async () => {
  mockScheme = "light";
  await AsyncStorage.clear();
});

describe("ThemeProvider", () => {
  it("uses the light theme by default on first launch", async () => {
    await renderProvider();
    await waitFor(() => expect(api.ready).toBe(true));
    expect(screen.getByTestId("probe").props.children.join("")).toBe(
      `light|light|${lightColors.background}`,
    );
  });

  it("applies the dark theme immediately when chosen", async () => {
    await renderProvider();
    await waitFor(() => expect(api.ready).toBe(true));
    await act(async () => api.setPreference("dark"));
    expect(api.name).toBe("dark");
    expect(api.theme.colors.background).toBe(darkColors.background);
  });

  it('follows the operating system when the option is "system"', async () => {
    mockScheme = "dark";
    const view = await renderProvider();
    await waitFor(() => expect(api.ready).toBe(true));
    await act(async () => api.setPreference("system"));
    expect(api.name).toBe("dark");
    mockScheme = "light";
    await view.rerender(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(api.preference).toBe("system");
    expect(api.name).toBe("light");
  });

  it("keeps the light theme under the light option even when the system is dark", async () => {
    mockScheme = "dark";
    await renderProvider();
    await waitFor(() => expect(api.ready).toBe(true));
    expect(api.name).toBe("light");
  });

  it("remembers the chosen option across a restart (remount)", async () => {
    const first = await renderProvider();
    await waitFor(() => expect(api.ready).toBe(true));
    await act(async () => api.setPreference("dark"));
    expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    await first.unmount();

    await renderProvider();
    await waitFor(() => expect(api.preference).toBe("dark"));
    expect(api.name).toBe("dark");
  });

  it("ignores a corrupt stored value and stays on light", async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, "purple");
    await renderProvider();
    await waitFor(() => expect(api.ready).toBe(true));
    expect(api.preference).toBe("light");
  });

  it("throws when used outside the provider", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(render(<Probe />)).rejects.toThrow(/ThemeProvider/);
    spy.mockRestore();
  });
});
