import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "../test-utils";
import type { CallHistoryEntry } from "../family/callables";
import type { MemberInfo } from "../family/useMembers";
import { CallHistoryCard } from "./CallHistoryCard";
import { CaregiverCircle } from "./CaregiverCircle";
import { MemberDetailsEditor } from "./MemberDetailsEditor";
import { NotificationsCard } from "./NotificationsCard";

type FunctionsMock = { httpsCallable: jest.Mock; __callables: Record<string, jest.Mock> };
const fnsMock = jest.requireMock("@react-native-firebase/functions") as FunctionsMock;
const callable = (name: string): jest.Mock => {
  fnsMock.httpsCallable(undefined as never, name);
  return fnsMock.__callables[name];
};

const TZ = "Asia/Kolkata";
const NOW = Date.now();
const member = (uid: string, name: string, over: Partial<MemberInfo> = {}): MemberInfo => ({
  uid,
  name,
  role: "viewer",
  relationship: "",
  city: "",
  notify: { missed: true, summary: true, quiet: false },
  lastSeenAt: null,
  ...over,
});

describe("CaregiverCircle", () => {
  it("lists members with the count, relationship, city, Primary and a presence badge", async () => {
    await renderApp(
      <CaregiverCircle
        parentId="p1"
        timezone={TZ}
        showPresence
        members={[
          member("r", "Rahul", { role: "owner", relationship: "Son", city: "Bengaluru", lastSeenAt: NOW - 30_000 }),
          member("m", "Meera", { relationship: "Daughter", city: "Dubai", lastSeenAt: NOW - 36 * 3600_000 }),
          member("y", "Yadav"),
        ]}
      />,
    );
    expect(screen.getByTestId("circle-count-p1")).toHaveTextContent("3 members");
    expect(screen.getByTestId("circle-detail-r")).toHaveTextContent("Son · Bengaluru · Primary");
    expect(screen.getByTestId("circle-badge-r")).toHaveTextContent("Viewing");
    expect(screen.getByTestId("circle-detail-m")).toHaveTextContent("Daughter · Dubai");
    expect(screen.getByTestId("circle-badge-m")).toHaveTextContent(/Seen/);
    expect(screen.queryByTestId("circle-badge-y")).toBeNull();
  });

  it("shows no presence badge when presence is off", async () => {
    await renderApp(
      <CaregiverCircle parentId="p1" timezone={TZ} showPresence={false} members={[member("r", "Rahul", { lastSeenAt: NOW })]} />,
    );
    expect(screen.queryByTestId("circle-badge-r")).toBeNull();
  });
});

describe("NotificationsCard", () => {
  it("shows the three toggles and saves a change through the function", async () => {
    callable("setNotifyPrefs").mockResolvedValue({ data: { ok: true } });
    await renderApp(<NotificationsCard parentId="p1" current={{ missed: true, summary: true, quiet: false }} />);
    expect(screen.getByText("Missed-dose alerts")).toBeTruthy();
    expect(screen.getByText("Evening summary")).toBeTruthy();
    expect(screen.getByText("Quiet hours")).toBeTruthy();
    expect(screen.getByText("Pause non-urgent alerts 10 PM to 6 AM")).toBeTruthy();
    await fireEvent(screen.getByTestId("notify-quiet"), "valueChange", true);
    await waitFor(() =>
      expect(callable("setNotifyPrefs")).toHaveBeenCalledWith({ parentId: "p1", missed: true, summary: true, quiet: true }),
    );
  });

  it("rolls the toggle back and says so when saving fails", async () => {
    callable("setNotifyPrefs").mockRejectedValue({ code: "unavailable" });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    await renderApp(<NotificationsCard parentId="p1" current={{ missed: true, summary: true, quiet: false }} />);
    await fireEvent(screen.getByTestId("notify-missed"), "valueChange", false);
    await waitFor(() => expect(screen.getByTestId("notify-error")).toBeTruthy());
    expect(screen.getByTestId("notify-missed").props.value).toBe(true);
    warn.mockRestore();
  });

  it("uses the defaults (missed on, summary on, quiet off) with no stored value", async () => {
    await renderApp(<NotificationsCard parentId="p1" current={null} />);
    expect(screen.getByTestId("notify-missed").props.value).toBe(true);
    expect(screen.getByTestId("notify-summary").props.value).toBe(true);
    expect(screen.getByTestId("notify-quiet").props.value).toBe(false);
  });
});

describe("CallHistoryCard", () => {
  const entries: CallHistoryEntry[] = [
    { kind: "family", atMs: NOW - 26 * 3600_000, byUid: "r" },
    { kind: "ormma", atMs: NOW - 3600_000, outcome: "answered", durationSec: 72 },
    { kind: "ormma", atMs: NOW - 2 * 3600_000, outcome: "no_answer" },
  ];

  it("lists Ormma calls with outcome and length, and family calls with who", async () => {
    await renderApp(
      <CallHistoryCard parentId="p1" parentName="Amma" timezone={TZ} entries={entries} names={{ r: "Rahul" }} loading={false} />,
    );
    expect(screen.getByText("Rahul called Amma")).toBeTruthy();
    expect(screen.getByText("Answered · 1 min 12 s")).toBeTruthy();
    expect(screen.getByText("Unanswered")).toBeTruthy();
  });

  it("says there are no calls yet when empty", async () => {
    await renderApp(
      <CallHistoryCard parentId="p1" parentName="Amma" timezone={TZ} entries={[]} names={{}} loading={false} />,
    );
    expect(screen.getByText("No calls yet")).toBeTruthy();
  });
});

describe("MemberDetailsEditor", () => {
  it("saves the member's own relationship and city through the function", async () => {
    callable("setMemberProfile").mockResolvedValue({ data: { ok: true } });
    await renderApp(<MemberDetailsEditor parentId="p1" me={member("me", "Meera")} />);
    await fireEvent.press(screen.getByTestId("details-open-p1"));
    await fireEvent.changeText(screen.getByTestId("details-relationship-p1"), "Daughter");
    await fireEvent.changeText(screen.getByTestId("details-city-p1"), "Dubai");
    await fireEvent.press(screen.getByTestId("details-save-p1"));
    await waitFor(() =>
      expect(callable("setMemberProfile")).toHaveBeenCalledWith({ parentId: "p1", relationship: "Daughter", city: "Dubai" }),
    );
  });
});
