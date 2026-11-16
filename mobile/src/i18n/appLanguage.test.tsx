import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { renderApp } from "../test-utils";
import { AppLanguageCard } from "../screens/settings/AppLanguageCard";
import i18n from "./index";
import { AppLanguageProvider, useAppLanguage } from "./AppLanguageProvider";
import {
  LANGUAGE_PREFERENCE_KEY,
  isLanguagePreference,
  loadLanguagePreference,
  resolveLanguage,
  saveLanguagePreference,
} from "./appLanguage";

const mockLocales = jest.fn();
jest.mock("expo-localization", () => ({ getLocales: () => mockLocales() }));

describe("resolveLanguage", () => {
  it("follows the phone's language when it is supported, else English", () => {
    expect(resolveLanguage("system", "ml")).toBe("ml");
    expect(resolveLanguage("system", "hi-IN")).toBe("hi");
    expect(resolveLanguage("system", "fr")).toBe("en");
    expect(resolveLanguage("system", undefined)).toBe("en");
  });

  it("uses the chosen language whatever the phone says", () => {
    expect(resolveLanguage("ta", "ml")).toBe("ta");
    expect(resolveLanguage("en", "hi")).toBe("en");
  });
});

describe("stored preference", () => {
  beforeEach(() => AsyncStorage.clear());

  it("defaults to the phone's language, and ignores a value it does not know", async () => {
    expect(await loadLanguagePreference()).toBe("system");
    await AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, "klingon");
    expect(await loadLanguagePreference()).toBe("system");
  });

  it("round-trips each valid value", async () => {
    for (const value of ["system", "en", "ml", "ta", "hi"] as const) {
      await saveLanguagePreference(value);
      expect(await loadLanguagePreference()).toBe(value);
      expect(isLanguagePreference(value)).toBe(true);
    }
    expect(isLanguagePreference("fr")).toBe(false);
  });
});

function Probe() {
  const { preference, ready } = useAppLanguage();
  return <Text testID="probe">{`${preference}:${ready}`}</Text>;
}

describe("AppLanguageProvider", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockLocales.mockReturnValue([{ languageCode: "en" }]);
  });

  it("follows the phone when no choice was made", async () => {
    mockLocales.mockReturnValue([{ languageCode: "ml" }]);
    await render(
      <AppLanguageProvider>
        <Probe />
      </AppLanguageProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("system:true"));
    expect(i18n.language).toBe("ml");
  });

  it("uses English when the phone's language is not one of the four", async () => {
    mockLocales.mockReturnValue([{ languageCode: "fr" }]);
    await render(
      <AppLanguageProvider>
        <Probe />
      </AppLanguageProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("system:true"));
    expect(i18n.language).toBe("en");
  });

  it("restores a saved choice after a restart, whatever the phone says", async () => {
    await saveLanguagePreference("ta");
    mockLocales.mockReturnValue([{ languageCode: "ml" }]);
    await render(
      <AppLanguageProvider>
        <Probe />
      </AppLanguageProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent("ta:true"));
    expect(i18n.language).toBe("ta");
  });
});

describe("AppLanguageCard", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockLocales.mockReturnValue([{ languageCode: "hi" }]);
  });

  it("lists Phone language and the four languages in their own scripts, with the active one marked", async () => {
    await renderApp(<AppLanguageCard />, { language: "en" });
    for (const id of ["system", "en", "ml", "ta", "hi"]) expect(screen.getByTestId(`app-language-${id}`)).toBeTruthy();
    expect(screen.getByText("Phone language")).toBeTruthy();
    expect(screen.getByText("മലയാളം")).toBeTruthy();
    expect(screen.getByText("தமிழ்")).toBeTruthy();
    expect(screen.getByText("हिन्दी")).toBeTruthy();
    expect(screen.getByTestId("app-language-en").props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId("app-language-ta").props.accessibilityState.selected).toBe(false);
  });

  it("choosing a language changes the app at once, marks it and remembers it", async () => {
    await renderApp(<AppLanguageCard />, { language: "en" });
    await act(async () => {
      fireEvent.press(screen.getByTestId("app-language-ta"));
    });
    expect(i18n.language).toBe("ta");
    expect(screen.getByTestId("app-language-ta").props.accessibilityState.selected).toBe(true);
    expect(await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY)).toBe("ta");
  });

  it("Phone language goes back to following the phone", async () => {
    await renderApp(<AppLanguageCard />, { language: "ta" });
    await act(async () => {
      fireEvent.press(screen.getByTestId("app-language-system"));
    });
    expect(i18n.language).toBe("hi");
    expect(await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY)).toBe("system");
  });
});
