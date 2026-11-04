import { fireEvent, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import { renderApp } from "../test-utils";
import { groupCards } from "../family/cards";
import type { TodayDoseEvent } from "../family/useTodayEvents";
import { DoseCardView } from "./DoseCardView";

const TZ = "Asia/Kolkata";
const ist = (hour: number, minute = 0) => Date.UTC(2026, 9, 19, hour, minute) - 330 * 60_000;
const ev = (id: string, at: number, status: TodayDoseEvent["status"], over: Partial<TodayDoseEvent> = {}): TodayDoseEvent => ({
  id,
  medicineId: "m1",
  scheduledFor: at,
  status,
  resolvedAt: null,
  confirmationNote: null,
  seenBy: {},
  ...over,
});
const info = {
  m1: { label: "Metformin 500mg", pill: "Small round white tablet in silver strip" },
  m2: { label: "Amlodipine 5mg", pill: "" },
};

const render = (events: TodayDoseEvent[], props: Partial<ComponentProps<typeof DoseCardView>> = {}) =>
  renderApp(
    <DoseCardView
      card={groupCards(events, info)[0]}
      timezone={TZ}
      last
      names={{ rahul: "Rahul", meera: "Meera", me: "Me" }}
      viewerUid="me"
      canMarkTaken
      onMarkTaken={jest.fn()}
      testID="card"
      {...props}
    />,
  );

describe("DoseCardView", () => {
  it("shows period, time, on-time badge, combined medicines, pill tag, note and read receipts", async () => {
    const note = "Amma confirmed taking sugar medicine (kazhichu mole) after morning tea.";
    await render([
      ev("a", ist(8, 30), "taken", {
        resolvedAt: ist(8, 34),
        confirmationNote: note,
        seenBy: { rahul: ist(8, 42), meera: ist(9, 10), me: ist(9, 11) },
      }),
      ev("b", ist(8, 30), "taken", { resolvedAt: ist(8, 33), medicineId: "m2", confirmationNote: note }),
    ]);
    expect(screen.getByText("Morning")).toBeTruthy();
    expect(screen.getByTestId("card-time")).toHaveTextContent("8:30 AM");
    expect(screen.getByTestId("card-badge")).toHaveTextContent("Taken on time · 8:34 AM");
    expect(screen.getByText("Metformin 500mg + Amlodipine 5mg")).toBeTruthy();
    expect(screen.getByText("Small round white tablet in silver strip")).toBeTruthy();
    expect(screen.getByText(note)).toBeTruthy();
    expect(screen.getByText("Confirmation note")).toBeTruthy();
    expect(screen.getByTestId("card-seen")).toHaveTextContent("Seen by Rahul 8:42 AM · Meera 9:10 AM");
  });

  it("shows no note label when there is no note", async () => {
    await render([ev("a", ist(8, 30), "taken", { resolvedAt: ist(8, 34) })]);
    expect(screen.queryByText("Confirmation note")).toBeNull();
  });

  it("reads Taken with the later time when it was not on time", async () => {
    await render([ev("a", ist(13, 30), "taken", { resolvedAt: ist(14, 20) })]);
    expect(screen.getByTestId("card-badge")).toHaveTextContent("Taken · 2:20 PM");
    expect(screen.getByText("Afternoon")).toBeTruthy();
  });

  it("reads Not confirmed for a missed dose and offers no Mark as taken", async () => {
    await render([ev("a", ist(8, 30), "missed")]);
    expect(screen.getByTestId("card-badge")).toHaveTextContent("Not confirmed");
    expect(screen.queryByTestId("card-mark")).toBeNull();
  });

  it("offers Mark as taken on a scheduled card", async () => {
    const onMarkTaken = jest.fn();
    await render([ev("c", ist(21), "pending", { medicineId: "m2" })], { onMarkTaken });
    expect(screen.getByTestId("card-badge")).toHaveTextContent("Scheduled for 9:00 PM");
    expect(screen.getByText("Night")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("card-mark"));
    expect(onMarkTaken).toHaveBeenCalledTimes(1);
  });

  it("hides Mark as taken from a viewer", async () => {
    await render([ev("c", ist(21), "pending")], { canMarkTaken: false });
    expect(screen.queryByTestId("card-mark")).toBeNull();
  });
});
