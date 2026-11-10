import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, renderHook, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "../test-utils";
import en from "../i18n/locales/en.json";
import { WelcomeScreen } from "./WelcomeScreen";
import { markWelcomeSeen, readWelcomeSeen, useWelcomeSeen, WELCOME_SEEN_KEY } from "./welcomeSeen";

describe("WelcomeScreen", () => {
  it("shows step 1 of 3 with the disclaimer", async () => {
    await renderApp(<WelcomeScreen onDone={jest.fn()} />);
    expect(screen.getByText(en.welcome.calls.title)).toBeTruthy();
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
    expect(screen.getByText("This app does not provide medical advice.")).toBeTruthy();
    expect(screen.getByText("Next")).toBeTruthy();
  });

  it("moves through all three steps and finishes with Get started", async () => {
    const onDone = jest.fn();
    await renderApp(<WelcomeScreen onDone={onDone} />);
    await fireEvent.press(screen.getByTestId("welcome-next"));
    expect(screen.getByText(en.welcome.replies.title)).toBeTruthy();
    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("welcome-next"));
    expect(screen.getByText(en.welcome.family.title)).toBeTruthy();
    expect(screen.getByText("Get started")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("welcome-next"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can be skipped on any step", async () => {
    const onDone = jest.fn();
    await renderApp(<WelcomeScreen onDone={onDone} />);
    await fireEvent.press(screen.getByTestId("welcome-next"));
    await fireEvent.press(screen.getByTestId("welcome-skip"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("hides its illustration from screen readers and lists title, text, then Next and Skip", async () => {
    await renderApp(<WelcomeScreen onDone={jest.fn()} />);
    const frame = screen.getByTestId("welcome-illustration-0", { includeHiddenElements: true });
    expect(frame.props.importantForAccessibility).toBe("no-hide-descendants");
    const json = JSON.stringify(screen.toJSON());
    const title = json.indexOf(en.welcome.calls.title);
    const text = json.indexOf(en.welcome.calls.text.slice(0, 20));
    const skip = json.indexOf("welcome-skip");
    const next = json.indexOf("welcome-next");
    expect(title).toBeLessThan(text);
    expect(text).toBeLessThan(next);
    expect(next).toBeLessThan(skip);
  });

  it("keeps Next and Skip at least 48 dp tall", async () => {
    await renderApp(<WelcomeScreen onDone={jest.fn()} />);
    for (const id of ["welcome-next", "welcome-skip"]) {
      const flat = ([] as Array<Record<string, unknown>>).concat(screen.getByTestId(id).props.style ?? []).flat(5);
      const minHeight = flat.map((s) => (s as { minHeight?: number }).minHeight).find((v) => v !== undefined);
      expect(minHeight ?? 48).toBeGreaterThanOrEqual(48);
    }
  });

  it("has no medical advice or health claims in its text", () => {
    const text = JSON.stringify(en.welcome).toLowerCase();
    for (const word of ["advice", "should", "recommend", "safe", "normal", "healthy", "cure", "diagnos"]) {
      expect(text).not.toContain(word);
    }
  });
});

describe("welcome seen storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("is not seen on a fresh device, then seen once marked", async () => {
    expect(await readWelcomeSeen()).toBe(false);
    await markWelcomeSeen();
    expect(await AsyncStorage.getItem(WELCOME_SEEN_KEY)).toBe("1");
    expect(await readWelcomeSeen()).toBe(true);
  });

  it("treats a storage read failure as not seen", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("denied"));
    expect(await readWelcomeSeen()).toBe(false);
  });

  it("useWelcomeSeen is null while loading, then reports the stored value, and markSeen flips it", async () => {
    let release!: (value: string | null) => void;
    jest.spyOn(AsyncStorage, "getItem").mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          release = resolve;
        }),
    );
    const { result } = await renderHook(() => useWelcomeSeen());
    expect(result.current.seen).toBeNull();
    await act(async () => release(null));
    await waitFor(() => expect(result.current.seen).toBe(false));
    result.current.markSeen();
    await waitFor(() => expect(result.current.seen).toBe(true));
    await waitFor(async () => expect(await AsyncStorage.getItem(WELCOME_SEEN_KEY)).toBe("1"));
  });
});
