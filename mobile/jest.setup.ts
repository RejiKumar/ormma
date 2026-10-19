// Jest setup for the mobile app: native modules that need mocks in a Node test environment.
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

// Every component test runs with i18n initialised in English; tests that need another language switch it.
import { initI18n } from "./src/i18n";
initI18n("en");

// Fonts: the real files are checked by the glyph test; component tests treat them as loaded.
jest.mock("expo-font", () => ({
  ...jest.requireActual("expo-font"),
  useFonts: () => [true, null],
}));
