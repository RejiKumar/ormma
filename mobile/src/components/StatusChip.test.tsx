import { act, screen } from "@testing-library/react-native";
import { AccessibilityInfo, StyleSheet } from "react-native";
import * as Reanimated from "react-native-reanimated";
import { darkColors, lightColors, type StatusKey } from "../design/tokens";
import { renderApp } from "../test-utils";
import { ConfirmCheck } from "./ConfirmCheck";
import { DoseRing } from "./DoseRing";
import { Skeleton } from "./Skeleton";
import { STATUS_ICON, StatusChip } from "./StatusChip";

const STATUSES: StatusKey[] = ["taken", "pending", "missed", "unclear", "calling", "not_taken", "no_answer"];
const LABELS: Record<StatusKey, string> = {
  taken: "Taken",
  pending: "Pending",
  missed: "Missed",
  unclear: "Unclear",
  calling: "Calling now",
  not_taken: "Not taken",
  no_answer: "No answer",
};
const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never);

afterEach(() => jest.restoreAllMocks());

describe("StatusChip", () => {
  it.each(STATUSES)("%s shows an icon, a text label and its status colours", async (status) => {
    await renderApp(<StatusChip status={status} />);
    const chip = screen.getByTestId(`status-chip-${status}`);
    // icon (decorative, so queried including hidden elements) and label
    expect(
      screen.getByTestId(`icon-${STATUS_ICON[status]}`, { includeHiddenElements: true }),
    ).toBeTruthy();
    const label = screen.getByText(LABELS[status]);
    expect(flat(label).color).toBe(lightColors.status[status].fg);
    expect(flat(chip).backgroundColor).toBe(lightColors.status[status].bg);
  });

  it("gives every status a different icon, so colour is never the only signal", () => {
    expect(new Set(Object.values(STATUS_ICON)).size).toBe(STATUSES.length);
  });

  it("gives every status a different label", () => {
    expect(new Set(Object.values(LABELS)).size).toBe(STATUSES.length);
  });

  it.each(STATUSES)("%s is announced by its label text", async (status) => {
    await renderApp(<StatusChip status={status} />);
    const chip = screen.getByLabelText(LABELS[status]);
    expect(chip.props.accessibilityRole).toBe("text");
    expect(chip.props.accessible).toBe(true);
  });

  it("uses the dark status colours in dark mode", async () => {
    await renderApp(<StatusChip status="missed" />, { theme: "dark" });
    expect(flat(screen.getByTestId("status-chip-missed")).backgroundColor).toBe(
      darkColors.status.missed.bg,
    );
    expect(flat(screen.getByText("Missed")).color).toBe(darkColors.status.missed.fg);
  });

  it("morphs when the status changes: the previous colour fades into the new one", async () => {
    const view = await renderApp(<StatusChip status="pending" />);
    expect(flat(screen.getByTestId("status-chip-pending")).backgroundColor).toBe(
      lightColors.status.pending.bg,
    );
    const spring = jest.spyOn(Reanimated, "withSpring");
    await act(async () => view.rerenderApp(<StatusChip status="taken" />));
    expect(spring).toHaveBeenCalled();
    expect(flat(screen.getByTestId("status-chip-taken")).backgroundColor).toBe(
      lightColors.status.taken.bg,
    );
    expect(screen.getByTestId("status-chip-morph")).toBeTruthy();
  });

  it("does not animate the morph under Reduce Motion", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const view = await renderApp(<StatusChip status="pending" />);
    await act(async () => undefined);
    const spring = jest.spyOn(Reanimated, "withSpring");
    await act(async () => view.rerenderApp(<StatusChip status="taken" />));
    expect(spring).not.toHaveBeenCalled();
  });
});

describe("the calling pulse is the only repeating animation", () => {
  it("repeats for 'calling now'", async () => {
    const repeat = jest.spyOn(Reanimated, "withRepeat");
    await renderApp(<StatusChip status="calling" />);
    expect(repeat).toHaveBeenCalledTimes(1);
    expect(repeat.mock.calls[0][1]).toBe(-1);
    expect(screen.getByTestId("calling-ring")).toBeTruthy();
  });

  it.each(STATUSES.filter((s) => s !== "calling"))("does not repeat for %s", async (status) => {
    const repeat = jest.spyOn(Reanimated, "withRepeat");
    await renderApp(<StatusChip status={status} />);
    expect(repeat).not.toHaveBeenCalled();
    expect(screen.queryByTestId("calling-ring")).toBeNull();
  });

  it("is a static ring, with no repeat, under Reduce Motion", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const view = await renderApp(<StatusChip status="pending" />);
    await act(async () => undefined); // the OS setting is now known
    const repeat = jest.spyOn(Reanimated, "withRepeat");
    await act(async () => view.rerenderApp(<StatusChip status="calling" />));
    expect(repeat).not.toHaveBeenCalled();
    const ring = screen.getByTestId("calling-ring");
    expect(flat(ring).opacity).toBe(0.55); // static, not animated
  });

  it("no other component repeats: DoseRing, ConfirmCheck and Skeleton never call withRepeat", async () => {
    const repeat = jest.spyOn(Reanimated, "withRepeat");
    await renderApp(
      <>
        <DoseRing taken={1} total={3} />
        <ConfirmCheck />
        <Skeleton />
        <StatusChip status="taken" />
        <StatusChip status="missed" />
      </>,
    );
    expect(repeat).not.toHaveBeenCalled();
  });
});
