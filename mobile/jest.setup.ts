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

// Firebase: force the manual mocks in __mocks__/@react-native-firebase on every import
// (without jest.mock the source would load a second, real instance in the test registry).
jest.mock("@react-native-firebase/app");
jest.mock("@react-native-firebase/auth");
jest.mock("@react-native-firebase/firestore");
jest.mock("@react-native-firebase/functions");

// Firebase mocks: reset per test so auth state and callable history never leak between tests.
afterEach(async () => {
  const auth = jest.requireMock("@react-native-firebase/auth") as { __resetAuth?: () => void };
  auth.__resetAuth?.();
  const functions = jest.requireMock("@react-native-firebase/functions") as {
    __resetCallables?: () => void;
  };
  functions.__resetCallables?.();
  const firestore = jest.requireMock("@react-native-firebase/firestore") as {
    __resetFirestore?: () => void;
  };
  firestore.__resetFirestore?.();
  // The parent-id store is device-local state; never carry it between tests.
  const AsyncStorage = jest.requireMock("@react-native-async-storage/async-storage") as {
    clear?: () => Promise<void>;
  };
  await AsyncStorage.clear?.();
});
