import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderApp } from "../test-utils";
import { PUSH_BANNER_MS, PushBanner } from "./PushBanner";

const content = { title: "Missed dose", body: "Dose not taken", data: { type: "missed_dose" } };

describe("PushBanner", () => {
  it("renders nothing without a banner", async () => {
    await renderApp(<PushBanner banner={null} onOpen={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.queryByTestId("push-banner")).toBeNull();
  });

  it("shows the server's title and body and opens on tap", async () => {
    const onOpen = jest.fn();
    await renderApp(<PushBanner banner={content} onOpen={onOpen} onDismiss={jest.fn()} />);
    expect(screen.getByText("Missed dose")).toBeTruthy();
    expect(screen.getByText("Dose not taken")).toBeTruthy();
    expect(screen.getByLabelText("Missed dose. Dose not taken")).toBeTruthy();
    fireEvent.press(screen.getByTestId("push-banner"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("hides itself after a few seconds", async () => {
    jest.useFakeTimers();
    try {
      const onDismiss = jest.fn();
      await renderApp(<PushBanner banner={content} onOpen={jest.fn()} onDismiss={onDismiss} />);
      expect(onDismiss).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(PUSH_BANNER_MS + 100);
      });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
